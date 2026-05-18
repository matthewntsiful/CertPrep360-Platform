import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
        return {
            statusCode: 401,
            headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
            body: JSON.stringify({ message: "Unauthorized" }),
        };
    }

    try {
        if (event.httpMethod === "POST") {
            const { examId, certId, sessionData } = JSON.parse(event.body || "{}");
            if (!examId || !certId || !sessionData) {
                return {
                    statusCode: 400,
                    headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
                    body: JSON.stringify({ message: "Missing required fields" }),
                };
            }

            const command = new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    PK: `USER#${userId}`,
                    SK: `SESSION#${certId}#${examId}`,
                    sessionData,
                    updatedAt: new Date().toISOString()
                },
            });

            await docClient.send(command);

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
                body: JSON.stringify({ message: "Session saved successfully" }),
            };
        } else if (event.httpMethod === "GET") {
            // examId and certId come from path parameters /session/{certId}/{examId}
            const certId = event.pathParameters?.certId;
            const examId = event.pathParameters?.examId;

            if (!certId || !examId) {
                return {
                    statusCode: 400,
                    headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
                    body: JSON.stringify({ message: "Missing path parameters" }),
                };
            }

            const command = new GetCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: `USER#${userId}`,
                    SK: `SESSION#${certId}#${examId}`
                }
            });

            const result = await docClient.send(command);

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
                body: JSON.stringify({ session: result.Item || null }),
            };
        }
    } catch (error) {
        console.error("Error managing session:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
