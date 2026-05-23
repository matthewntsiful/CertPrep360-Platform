import { PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";
import { computeDomainScores } from "./common/domainScoring.js";
import { truncateSnapshots, estimateSize } from "./common/snapshotTruncation.js";
import { addToBox1, promote, demote, removeFromPool } from "./common/weakPool.js";

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    const headers = {
        "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com",
    };

    // UserId comes from Cognito Authorizer context
    const userId = event.requestContext.authorizer?.claims?.sub;
    const body = JSON.parse(event.body || "{}");
    const { examId, score, timeTaken, answers, questionSnapshots } = body;
    const certId = (body.certId || "").toUpperCase();

    if (!userId || !examId || score === undefined) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: "Missing required fields (auth, examId, or score)" }),
        };
    }

    const timestamp = new Date().toISOString();

    try {
        // Compute per-domain accuracy scores from answers
        const domainScores = answers ? computeDomainScores(answers) : {};

        // Build the attempt item
        const attemptItem = {
            PK: `USER#${userId}`,
            SK: `ATTEMPT#${timestamp}#EXAM#${examId}`,
            certId: certId,
            examId: examId,
            score: score,
            timeTaken: timeTaken,
            answers: answers,
            domainScores: domainScores,
            timestamp: timestamp,
            type: "EXAM_ATTEMPT",
        };

        // Process and store question snapshots if provided
        if (questionSnapshots && questionSnapshots.length > 0) {
            // Estimate the base item size (without snapshots) for truncation budget
            const baseItemSize = estimateSize(attemptItem);
            // Truncate snapshots if needed to stay under 400KB
            attemptItem.questionSnapshots = truncateSnapshots(questionSnapshots, baseItemSize);
        }

        // Write the attempt record
        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: attemptItem,
        }));

        // Update Weak Pool with Leitner box transitions
        if (answers && certId) {
            await updateWeakPool(userId, certId, answers);
        }

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ message: "Result saved successfully", attemptId: timestamp }),
        };
    } catch (error) {
        console.error("Error saving result:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};

/**
 * Update the user's Weak Pool based on answer correctness.
 * - Incorrect answers not in pool → add to Box 1
 * - Correct answers in pool → promote (Box 1→2, 2→3, 3→remove)
 * - Incorrect answers in pool → demote to Box 1
 *
 * Uses DynamoDB UpdateItem with SET for atomic updates.
 * Creates the Weak Pool item if it doesn't exist.
 */
async function updateWeakPool(userId, certId, answers) {
    const pk = `USER#${userId}`;
    const sk = `WEAK_POOL#${certId}`;

    // Fetch the current Weak Pool state
    let currentPool = {};
    let poolExists = false;

    try {
        const getResult = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: pk, SK: sk },
        }));

        if (getResult.Item) {
            currentPool = getResult.Item.questions || {};
            poolExists = true;
        }
    } catch (error) {
        console.error("Error fetching Weak Pool:", error);
        // Continue with empty pool — we'll create it
    }

    // Apply Leitner box transitions based on answer correctness
    let updatedPool = { ...currentPool };

    for (const answer of Object.values(answers)) {
        const { q_id, domain, isCorrect } = answer;
        if (!q_id) continue;

        const isInPool = q_id in updatedPool;

        if (isCorrect && isInPool) {
            // Correct answer on a Weak Pool question → promote
            updatedPool = promote(updatedPool, q_id);
        } else if (!isCorrect && isInPool) {
            // Incorrect answer on a Weak Pool question → demote to Box 1
            updatedPool = demote(updatedPool, q_id);
        } else if (!isCorrect && !isInPool) {
            // New incorrect answer → add to Box 1
            updatedPool = addToBox1(updatedPool, q_id, domain || "", certId);
        }
        // Correct answer not in pool → no action needed
    }

    // Write the updated Weak Pool back to DynamoDB
    const now = new Date().toISOString();

    try {
        if (poolExists) {
            // Update existing item with SET for questions and updatedAt,
            // ADD for sessionCounter (atomic increment)
            await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: pk, SK: sk },
                UpdateExpression: "SET questions = :questions, updatedAt = :now ADD sessionCounter :inc",
                ExpressionAttributeValues: {
                    ":questions": updatedPool,
                    ":now": now,
                    ":inc": 1,
                },
            }));
        } else {
            // Create new Weak Pool item with initial state
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    PK: pk,
                    SK: sk,
                    questions: updatedPool,
                    sessionCounter: 1,
                    updatedAt: now,
                    type: "WEAK_POOL",
                },
            }));
        }
    } catch (error) {
        // Log but don't fail the request — the attempt was already saved
        console.error("Error updating Weak Pool:", error);
    }
}
