import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";

const ssm = new SSMClient({});
const TABLE_NAME = process.env.TABLE_NAME;
const PAYSTACK_SECRET_PARAM = process.env.PAYSTACK_SECRET_PARAM;

let paystackSecretKey = null;

async function getPaystackSecretKey() {
    if (paystackSecretKey) return paystackSecretKey;
    const command = new GetParameterCommand({
        Name: PAYSTACK_SECRET_PARAM,
        WithDecryption: true
    });
    const response = await ssm.send(command);
    paystackSecretKey = response.Parameter.Value;
    return paystackSecretKey;
}

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    const userId = event.requestContext.authorizer?.claims?.sub;
    const email = event.requestContext.authorizer?.claims?.email;

    if (!userId || !email) {
        return {
            statusCode: 401,
            headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*" },
            body: JSON.stringify({ message: "Unauthorized" }),
        };
    }

    try {
        const secretKey = await getPaystackSecretKey();

        // POST /payment/initialize
        if (event.httpMethod === "POST" && event.resource === "/payment/initialize") {
            const body = JSON.parse(event.body || "{}");
            // Assuming amount in Kobo. E.g. 500000 = 5000 NGN. Or we can hardcode for testing.
            const amount = body.amount || 500000;

            const response = await fetch("https://api.paystack.co/transaction/initialize", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${secretKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    amount: amount,
                    metadata: {
                        userId: userId,
                        custom_fields: [
                            {
                                display_name: "User ID",
                                variable_name: "user_id",
                                value: userId
                            }
                        ]
                    }
                })
            });

            const data = await response.json();

            if (!data.status) {
                throw new Error(data.message);
            }

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*" },
                body: JSON.stringify({ authorization_url: data.data.authorization_url, reference: data.data.reference }),
            };
        } 
        
        // POST /payment/verify
        else if (event.httpMethod === "POST" && event.resource === "/payment/verify") {
            const body = JSON.parse(event.body || "{}");
            const reference = body.reference;

            if (!reference) {
                return {
                    statusCode: 400,
                    headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*" },
                    body: JSON.stringify({ message: "Missing transaction reference" }),
                };
            }

            const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${secretKey}`,
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();

            if (data.status && data.data.status === "success") {
                // Verify the transaction was for this user
                if (data.data.metadata?.userId !== userId) {
                    return {
                        statusCode: 403,
                        headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*" },
                        body: JSON.stringify({ message: "Transaction does not belong to this user" }),
                    };
                }

                // Update user status in DynamoDB to premium
                await docClient.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `USER#${userId}`,
                        SK: `PROFILE`
                    },
                    UpdateExpression: "SET isPremium = :isPremium, premiumSince = :timestamp",
                    ExpressionAttributeValues: {
                        ":isPremium": true,
                        ":timestamp": new Date().toISOString()
                    }
                }));

                return {
                    statusCode: 200,
                    headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*" },
                    body: JSON.stringify({ message: "Payment verified successfully, account upgraded to premium." }),
                };
            } else {
                return {
                    statusCode: 400,
                    headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*" },
                    body: JSON.stringify({ message: "Payment verification failed", details: data.data?.gateway_response }),
                };
            }
        }
    } catch (error) {
        console.error("Error processing payment:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*" },
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
