import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    const domainName = event.queryStringParameters?.domain;
    const certId = event.queryStringParameters?.certId || "SAA-C03";
    const limit = parseInt(event.queryStringParameters?.limit || "20", 10);

    if (!domainName) {
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
            body: JSON.stringify({ message: "Missing required query string parameter: domain" }),
        };
    }

    try {
        const decodedDomain = decodeURIComponent(domainName);
        
        // Query the existing GSI1 using the DOMAIN as the Partition Key
        const command = new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "GSI1",
            KeyConditionExpression: "#gpk = :pk AND begins_with(#gsk, :skPrefix)",
            ExpressionAttributeNames: {
                "#gpk": "GSI1-PK",
                "#gsk": "GSI1-SK"
            },
            ExpressionAttributeValues: {
                ":pk": `DOMAIN#${decodedDomain}`,
                ":skPrefix": `CERT#${certId}`
            },
            Limit: limit
        });

        const response = await docClient.send(command);
        let questions = response.Items || [];

        // Shuffle questions to ensure randomization for deep practice
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }

        return {
            statusCode: 200,
            headers: { 
                "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                domain: decodedDomain,
                count: questions.length,
                questions: questions
            }),
        };
    } catch (error) {
        console.error("Error fetching dynamic quiz:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
