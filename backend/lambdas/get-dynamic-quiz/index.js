import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    const domainName = event.queryStringParameters?.domain;
    const certId = (event.queryStringParameters?.certId || "SAA-C03").toUpperCase();
    const limit = parseInt(event.queryStringParameters?.limit || "20", 10);
    const excludeIds = event.queryStringParameters?.exclude
        ? event.queryStringParameters.exclude.split(',')
        : [];

    if (!domainName) {
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
            body: JSON.stringify({ message: "Missing required query string parameter: domain" }),
        };
    }

    try {
        const decodedDomain = decodeURIComponent(domainName);
        let questions = [];

        // Strategy 1: Try GSI1 query (fast, indexed)
        try {
            let lastKey;
            do {
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
                    ExclusiveStartKey: lastKey,
                });
                const response = await docClient.send(command);
                questions.push(...(response.Items || []));
                lastKey = response.LastEvaluatedKey;
            } while (lastKey);
        } catch (gsiError) {
            console.warn("GSI1 query failed, falling back to scan:", gsiError.message);
        }

        // Strategy 2: If GSI1 returned nothing, fall back to scanning by domain field
        if (questions.length === 0) {
            let lastKey;
            do {
                const command = new ScanCommand({
                    TableName: TABLE_NAME,
                    FilterExpression: "#type = :qType AND #domain = :domain AND begins_with(PK, :certPrefix)",
                    ExpressionAttributeNames: {
                        "#type": "type",
                        "#domain": "domain"
                    },
                    ExpressionAttributeValues: {
                        ":qType": "QUESTION",
                        ":domain": decodedDomain,
                        ":certPrefix": `CERT#${certId}`
                    },
                    ExclusiveStartKey: lastKey,
                });
                const response = await docClient.send(command);
                questions.push(...(response.Items || []));
                lastKey = response.LastEvaluatedKey;
            } while (lastKey);
        }

        // Deduplicate by q_id (in case of overlapping results)
        const seen = new Set();
        questions = questions.filter(q => {
            const id = q.q_id || q.SK;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        // Exclude previously seen questions (sent by frontend)
        if (excludeIds.length > 0) {
            const excludeSet = new Set(excludeIds);
            questions = questions.filter(q => !excludeSet.has(q.q_id));
        }

        // Fisher-Yates shuffle for true randomization
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }

        // Limit to requested count
        questions = questions.slice(0, limit);

        // Clean response — only send what the frontend needs
        const cleanQuestions = questions.map(q => ({
            q_id: q.q_id,
            cert_id: q.cert_id,
            exam_id: q.exam_id,
            text: q.text,
            options: q.options,
            correct: typeof q.correct === 'string'
                ? q.correct.toUpperCase().split(/[,\s]+/).filter(c => /^[A-Z]$/.test(c)).join('')
                : q.correct,
            explanation: q.explanation,
            resources: q.resources || [],
            domain: q.domain,
            primary_service: q.primary_service,
        }));

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                domain: decodedDomain,
                count: cleanQuestions.length,
                totalAvailable: seen.size,
                questions: cleanQuestions
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
