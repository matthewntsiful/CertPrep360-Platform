import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    const { certId, examId } = event.pathParameters || {};

    if (!certId || !examId) {
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Missing certId or examId" }),
        };
    }

    try {
        const items = [];
        let lastKey = undefined;
        do {
            const command = new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
                ExpressionAttributeValues: {
                    ":pk": `CERT#${certId.toUpperCase()}`,
                    ":skPrefix": `EXAM#${examId}#QUESTION#`,
                },
                ExclusiveStartKey: lastKey,
            });
            const response = await docClient.send(command);
            items.push(...(response.Items || []));
            lastKey = response.LastEvaluatedKey;
        } while (lastKey);
        const questions = items.map(item => ({
            q_id: item.q_id,
            text: item.text,
            options: item.options,
            correct: item.correct,
            explanation: item.explanation,
            resources: item.resources || [],
            domain: item.domain
        }));

        return {
            statusCode: 200,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(questions),
        };
    } catch (error) {
        console.error("Error fetching questions:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
