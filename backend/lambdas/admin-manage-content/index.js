import { PutCommand, DeleteCommand, UpdateCommand, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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
                    // Query by certId + examId using the standard schema
                    command = new QueryCommand({
                        ...params,
                        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
                        ExpressionAttributeValues: {
                            ":pk": `CERT#${certId?.toUpperCase() || examId.split('-EXAM-')[0]}`,
                            ":skPrefix": `EXAM#${examId}#QUESTION#`
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

        if (httpMethod === "PATCH") {
            // Partial update - only updates specified fields, never touches text/options/correct
            const body = JSON.parse(event.body || "{}");
            const { q_id, cert_id, exam_id, fields } = body;

            if (!q_id || !cert_id || !exam_id || !fields) {
                return {
                    statusCode: 400,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ message: "Missing q_id, cert_id, exam_id, or fields." }),
                };
            }

            // Build dynamic update expression from allowed fields only
            const ALLOWED = ['explanation', 'resources', 'text', 'options', 'domain'];
            const updates = Object.entries(fields).filter(([k]) => ALLOWED.includes(k));

            if (updates.length === 0) {
                return {
                    statusCode: 400,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ message: "No valid fields to update." }),
                };
            }

            const UpdateExpression = 'SET ' + updates.map(([k], i) => `#f${i} = :v${i}`).join(', ');
            const ExpressionAttributeNames = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]));
            const ExpressionAttributeValues = Object.fromEntries(updates.map(([k, v], i) => [`:v${i}`, v]));

            const command = new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: `CERT#${cert_id}`,
                    SK: `EXAM#${exam_id}#QUESTION#${q_id}`
                },
                UpdateExpression,
                ExpressionAttributeNames,
                ExpressionAttributeValues
            });

            await docClient.send(command);

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: `Partially updated question: ${q_id}` }),
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
                    PK: `CERT#${cert_id}`,
                    SK: `EXAM#${exam_id}#QUESTION#${q_id}`,
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
                    PK: `CERT#${cert_id}`,
                    SK: `EXAM#${exam_id}#QUESTION#${q_id}`
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
