import { PutCommand, DeleteCommand, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    // Phase 3: RBAC (Role-Based Access Control) verification
    const claims = event.requestContext?.authorizer?.claims;
    const groups = claims ? (claims["cognito:groups"] || "").split(",") : [];
    
    // Ensure the invoking user belongs to the 'Admins' group in Cognito
    if (!groups.includes("Admins")) {
        return {
            statusCode: 403,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Forbidden: Admin privileges required." }),
        };
    }

    const httpMethod = event.httpMethod;

    try {
        if (httpMethod === "GET") {
            // Support listing questions, optionally filtered by cert or exam
            const certId = event.queryStringParameters?.certId;
            const examId = event.queryStringParameters?.examId;

            let items = [];
            let lastEvaluatedKey = undefined;

            do {
                let command;
                const params = {
                    TableName: TABLE_NAME,
                    ExclusiveStartKey: lastEvaluatedKey
                };

                if (examId) {
                    // If we have an examId, we can query by PK
                    command = new QueryCommand({
                        ...params,
                        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
                        ExpressionAttributeValues: {
                            ":pk": `EXAM#${examId}`,
                            ":skPrefix": "QUESTION#"
                        }
                    });
                } else {
                    // Otherwise, perform a Scan (Admin only, low frequency)
                    command = new ScanCommand({
                        ...params,
                        FilterExpression: "#type = :qType",
                        ExpressionAttributeNames: {
                            "#type": "type"
                        },
                        ExpressionAttributeValues: {
                            ":qType": "QUESTION"
                        }
                    });
                }

                const response = await docClient.send(command);
                if (response.Items) {
                    items.push(...response.Items);
                }
                lastEvaluatedKey = response.LastEvaluatedKey;

            } while (lastEvaluatedKey);

            // Post-filter by certId if provided and we did a Scan
            if (certId && !examId) {
                items = items.filter(item => item.cert_id === certId);
            }

            return {
                statusCode: 200,
                headers: { 
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(items),
            };
        }

        if (httpMethod === "POST" || httpMethod === "PUT") {
            const body = JSON.parse(event.body || "{}");
            const { q_id, cert_id, exam_id, text, options, correct, domain, explanation, resources } = body;

            if (!q_id || !cert_id || !exam_id) {
                return {
                    statusCode: 400,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ message: "Missing required core identifiers (q_id, cert_id, exam_id)." }),
                };
            }

            const command = new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    PK: `EXAM#${exam_id}`,
                    SK: `QUESTION#${q_id}`,
                    "GSI1-PK": `DOMAIN#${domain || "Unassigned"}`,
                    "GSI1-SK": `CERT#${cert_id}`,
                    cert_id,
                    exam_id,
                    q_id,
                    text,
                    options,
                    correct,
                    domain,
                    explanation,
                    resources,
                    type: "QUESTION"
                },
            });

            await docClient.send(command);

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: `Successfully upserted question: ${q_id}` }),
            };
        } 
        
        else if (httpMethod === "DELETE") {
            const body = JSON.parse(event.body || "{}");
            const { q_id, exam_id } = body;

            if (!q_id || !exam_id) {
                return {
                    statusCode: 400,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ message: "Missing required core identifiers for deletion (q_id, exam_id)." }),
                };
            }

            const command = new DeleteCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: `EXAM#${exam_id}`,
                    SK: `QUESTION#${q_id}`
                }
            });

            await docClient.send(command);

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: `Successfully deleted question: ${q_id}` }),
            };
        }

        return {
            statusCode: 405,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Method Not Allowed" }),
        };

    } catch (error) {
        console.error("Error managing content:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
