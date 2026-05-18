import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    // UserId comes from Cognito Authorizer context
    const userId = event.requestContext.authorizer?.claims?.sub;
    const { examId, certId, score, timeTaken, answers } = JSON.parse(event.body || "{}");

    if (!userId || !examId || score === undefined) {
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
            body: JSON.stringify({ message: "Missing required fields (auth, examId, or score)" }),
        };
    }

    const timestamp = new Date().toISOString();

    try {
        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `USER#${userId}`,
                SK: `ATTEMPT#${timestamp}#EXAM#${examId}`,
                certId: certId,
                examId: examId,
                score: score,
                timeTaken: timeTaken,
                answers: answers, // Storing answers for later review analysis
                timestamp: timestamp,
                type: "EXAM_ATTEMPT"
            },
        });

        await docClient.send(command);

        return {
            statusCode: 201,
            headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
            body: JSON.stringify({ message: "Result saved successfully", attemptId: timestamp }),
        };
    } catch (error) {
        console.error("Error saving result:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
