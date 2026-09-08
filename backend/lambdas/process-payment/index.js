import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";
import { jsonResponse, logError, logRequest, parseJsonBody, requireAuthenticatedUser } from "./common/security.js";

// DORMANT: CertPrep360 is currently free. This retained implementation is not
// provisioned, routed, packaged, deployed, or supplied with payment secrets.

const ssm = new SSMClient({});
const TABLE_NAME = process.env.TABLE_NAME;
const PAYSTACK_SECRET_PARAM = process.env.PAYSTACK_SECRET_PARAM;
const PAYMENT_TTL_SECONDS = 30 * 60;

// Retained future configuration. Do not activate without product, tax, currency,
// provider-security, and infrastructure approval.
const PRODUCTS = {
  premium_monthly: { amount: 500000, currency: "NGN", entitlement: "premium" },
};

let paystackSecretKey = null;

async function getPaystackSecretKey() {
  if (paystackSecretKey) return paystackSecretKey;
  const response = await ssm.send(new GetParameterCommand({
    Name: PAYSTACK_SECRET_PARAM,
    WithDecryption: true,
  }));
  paystackSecretKey = response.Parameter?.Value;
  if (!paystackSecretKey) throw new Error("Payment provider secret is unavailable");
  return paystackSecretKey;
}

async function verifyWithPaystack(secretKey, reference) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${secretKey}` },
  });
  if (!response.ok) throw new Error("Payment provider verification request failed");
  return response.json();
}

export const handler = async (event) => {
  logRequest(event, "process-payment");
  const userId = requireAuthenticatedUser(event);
  const email = event?.requestContext?.authorizer?.claims?.email;

  if (!userId || !email) return jsonResponse(401, { message: "Unauthorized" });

  try {
    const body = parseJsonBody(event);
    const secretKey = await getPaystackSecretKey();

    if (event.httpMethod === "POST" && event.resource === "/payment/initialize") {
      const productId = typeof body.productId === "string" ? body.productId : "";
      const product = PRODUCTS[productId];
      if (!product) return jsonResponse(400, { message: "A valid productId is required" });

      const providerResponse = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: product.amount,
          currency: product.currency,
          metadata: { userId, productId },
        }),
      });
      const data = await providerResponse.json();
      const reference = data?.data?.reference;
      if (!providerResponse.ok || !data?.status || !reference) {
        throw new Error("Payment provider initialization failed");
      }

      const now = new Date().toISOString();
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `PAYMENT#${reference}`,
          type: "PAYMENT",
          reference,
          userId,
          productId,
          expectedAmount: product.amount,
          currency: product.currency,
          entitlement: product.entitlement,
          status: "PENDING",
          createdAt: now,
          expiresAt: Math.floor(Date.now() / 1000) + PAYMENT_TTL_SECONDS,
        },
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      }));

      return jsonResponse(200, {
        authorization_url: data.data.authorization_url,
        reference,
        productId,
      });
    }

    if (event.httpMethod === "POST" && event.resource === "/payment/verify") {
      const reference = typeof body.reference === "string" ? body.reference.trim() : "";
      if (!reference || reference.length > 128) {
        return jsonResponse(400, { message: "A valid transaction reference is required" });
      }

      const paymentRecord = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: `PAYMENT#${reference}` },
      }));
      const payment = paymentRecord.Item;
      if (!payment) return jsonResponse(404, { message: "Payment transaction was not found" });
      if (payment.status === "FULFILLED") {
        return jsonResponse(200, { message: "Payment already verified", entitlement: payment.entitlement });
      }
      if (payment.expiresAt && Math.floor(Date.now() / 1000) > payment.expiresAt) {
        return jsonResponse(409, { message: "Payment transaction has expired" });
      }
      if (payment.status !== "PENDING") {
        return jsonResponse(409, { message: "Payment transaction is not eligible for verification" });
      }

      const data = await verifyWithPaystack(secretKey, reference);
      const transaction = data?.data;
      const paymentIsValid = data?.status
        && transaction?.status === "success"
        && transaction?.reference === reference
        && transaction?.metadata?.userId === userId
        && transaction?.metadata?.productId === payment.productId
        && transaction?.amount === payment.expectedAmount
        && transaction?.currency === payment.currency;

      if (!paymentIsValid) {
        return jsonResponse(400, { message: "Payment verification failed" });
      }

      const paidAt = new Date().toISOString();
      try {
        await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `USER#${userId}`, SK: `PAYMENT#${reference}` },
          UpdateExpression: "SET #status = :fulfilled, paidAt = :paidAt, providerTransactionId = :providerTransactionId",
          ConditionExpression: "#status = :pending",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":pending": "PENDING",
            ":fulfilled": "FULFILLED",
            ":paidAt": paidAt,
            ":providerTransactionId": String(transaction.id),
          },
        }));
      } catch (error) {
        if (error?.name === "ConditionalCheckFailedException") {
          return jsonResponse(409, { message: "Payment verification is already in progress or completed" });
        }
        throw error;
      }

      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: "PROFILE" },
        UpdateExpression: "SET isPremium = :isPremium, premiumSince = :paidAt, entitlement = :entitlement, paymentReference = :reference",
        ExpressionAttributeValues: {
          ":isPremium": true,
          ":paidAt": paidAt,
          ":entitlement": payment.entitlement,
          ":reference": reference,
        },
      }));

      return jsonResponse(200, { message: "Payment verified successfully", entitlement: payment.entitlement });
    }

    return jsonResponse(404, { message: "Payment route not found" });
  } catch (error) {
    logError("process-payment", error, event?.requestContext?.requestId || null);
    if (error instanceof SyntaxError) return jsonResponse(400, { message: "Request body must be valid JSON" });
    return jsonResponse(500, { message: "Unable to process payment" });
  }
};
