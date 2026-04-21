import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    const userId = event.requestContext?.authorizer?.claims?.sub || event.pathParameters?.userId;

    if (!userId) {
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Missing userId or unauthorized" }),
        };
    }

    try {
        const command = new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
            ExpressionAttributeValues: {
                ":pk": `USER#${userId}`,
                ":skPrefix": `ATTEMPT#`,
            },
        });

        const response = await docClient.send(command);
        const attempts = response.Items || [];

        // Calculate Analytics
        let totalScore = 0;
        let totalStudyHours = 0;
        let certifications = new Set();
        let domainPerformance = {};

        attempts.forEach(attempt => {
            totalScore += (attempt.score || 0);
            totalStudyHours += ((attempt.timeTaken || 0) / 60); // Assuming timeTaken is in minutes
            certifications.add(attempt.certId);

            // Analyze domain weaknesses if answers were recorded
            if (attempt.answers && typeof attempt.answers === 'object') {
                Object.values(attempt.answers).forEach(ans => {
                    if (ans.domain) {
                        if (!domainPerformance[ans.domain]) {
                            domainPerformance[ans.domain] = { correct: 0, total: 0 };
                        }
                        domainPerformance[ans.domain].total += 1;
                        if (ans.isCorrect) {
                            domainPerformance[ans.domain].correct += 1;
                        }
                    }
                });
            }
        });

        const averageScore = attempts.length > 0 ? Math.round(totalScore / attempts.length) : 0;
        
        let weakestDomain = "N/A";
        let lowestAccuracy = 100;
        
        Object.keys(domainPerformance).forEach(domain => {
             const stat = domainPerformance[domain];
             const accuracy = (stat.correct / stat.total) * 100;
             if (accuracy < lowestAccuracy && stat.total > 5) {
                 lowestAccuracy = accuracy;
                 weakestDomain = domain;
             }
        });

        const analytics = {
            examsCompleted: attempts.length,
            averageScore: averageScore,
            totalStudyHours: Math.round(totalStudyHours * 10) / 10,
            certificationsTracked: Array.from(certifications),
            weakestDomain: weakestDomain,
            recentAttempts: attempts.slice(0, 5).map(a => ({
                examId: a.examId,
                certId: a.certId,
                score: a.score,
                date: a.timestamp
            }))
        };

        return {
            statusCode: 200,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(analytics),
        };
    } catch (error) {
        console.error("Error fetching analytics:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
