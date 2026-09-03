import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../common/db.js";

const TABLE_NAME = process.env.TABLE_NAME;
const APP_URL = process.env.APP_URL;
const PRODUCT_CODE = process.env.MARKETPLACE_PRODUCT_CODE;

export const handler = async (event) => {
  console.log("Marketplace register event:", JSON.stringify(event, null, 2));

  const { x_amzn_marketplace_token } = event.queryStringParameters || {};

  if (!x_amzn_marketplace_token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing marketplace token" }),
    };
  }

  try {
    const awsAccountId = Buffer.from(x_amzn_marketplace_token, "base64")
      .toString("utf-8")
      .split(":")[0];

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `MARKETPLACE#${awsAccountId}`,
          SK: "SUBSCRIPTION",
          productCode: PRODUCT_CODE,
          status: "active",
          subscribedAt: new Date().toISOString(),
          token: x_amzn_marketplace_token,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
  } catch (err) {
    if (err.name !== "ConditionalCheckFailedException") {
      console.error("DynamoDB error:", err);
      return { statusCode: 500, body: JSON.stringify({ message: "Internal error" }) };
    }
    // Already registered — still redirect
  }

  return {
    statusCode: 302,
    headers: { Location: `${APP_URL}?source=marketplace` },
    body: "",
  };
};
