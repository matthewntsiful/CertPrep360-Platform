import { PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";
import { computeDomainScores } from "./common/domainScoring.js";
import { addToBox1, promote, demote } from "./common/weakPool.js";
import { answerKeysMatch, normalizeAnswerKey } from "./common/answerKeys.js";
import { jsonResponse, logError, logRequest, parseJsonBody, requireAuthenticatedUser } from "./common/security.js";

const TABLE_NAME = process.env.TABLE_NAME;
const DEFAULT_PASSING_SCORE = 72;

export const handler = async (event) => {
  logRequest(event, "submit-results");
  const userId = requireAuthenticatedUser(event);
  if (!userId) return jsonResponse(401, { message: "Unauthorized" });

  try {
    const body = parseJsonBody(event);
    const attemptId = typeof body.attemptId === "string" ? body.attemptId : "";
    const submittedAnswers = body.answers && typeof body.answers === "object" ? body.answers : null;
    if (!attemptId || !submittedAnswers) {
      return jsonResponse(400, { message: "attemptId and answers are required" });
    }

    const manifestResponse = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `ATTEMPT#${attemptId}#MANIFEST` },
    }));
    const manifest = manifestResponse.Item;
    if (!manifest || manifest.type !== "ATTEMPT_MANIFEST") {
      return jsonResponse(404, { message: "Active attempt was not found" });
    }
    if (manifest.status !== "ACTIVE") {
      return jsonResponse(409, { message: "This attempt has already been submitted or is no longer active" });
    }
    if (manifest.expiresAt && Math.floor(Date.now() / 1000) > manifest.expiresAt) {
      return jsonResponse(409, { message: "This attempt has expired" });
    }

    const detailedAnswers = {};
    let correctCount = 0;
    for (const question of manifest.questions || []) {
      const selected = submittedAnswers[question.q_id] ?? null;
      const correct = normalizeAnswerKey(question.correct);
      const isCorrect = answerKeysMatch(selected, correct);
      if (isCorrect) correctCount += 1;
      detailedAnswers[question.q_id] = {
        q_id: question.q_id,
        domain: question.domain || "Unassigned",
        selected,
        isCorrect,
        correct,
        explanation: question.explanation || "",
        resources: question.resources || [],
      };
    }

    const totalQuestions = (manifest.questions || []).length;
    const score = Math.round((correctCount / Math.max(totalQuestions, 1)) * 100);
    const domainScores = computeDomainScores(detailedAnswers);
    const timestamp = new Date().toISOString();
    const timeTaken = Math.max(0, Math.round((Date.now() - Date.parse(manifest.startedAt)) / 60000));
    const passed = score >= (manifest.passingScore || DEFAULT_PASSING_SCORE);

    const attemptItem = {
      PK: `USER#${userId}`,
      SK: `ATTEMPT#${attemptId}`,
      type: "EXAM_ATTEMPT",
      attemptId,
      certId: manifest.certId,
      examId: manifest.examId || "DynamicQuiz",
      score,
      passed,
      passingScore: manifest.passingScore || DEFAULT_PASSING_SCORE,
      timeTaken,
      answers: detailedAnswers,
      domainScores,
      contentVersion: manifest.contentVersion || "unversioned",
      timestamp,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: attemptItem,
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    }));

    try {
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: `ATTEMPT#${attemptId}#MANIFEST` },
        UpdateExpression: "SET #status = :submitted, submittedAt = :timestamp",
        ConditionExpression: "#status = :active",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":active": "ACTIVE", ":submitted": "SUBMITTED", ":timestamp": timestamp },
      }));
    } catch (error) {
      // The result is immutable once written. A retry will safely report it as submitted.
      logError("submit-results-manifest-finalization", error, event?.requestContext?.requestId || null);
    }

    await updateWeakPool(userId, manifest.certId, detailedAnswers);

    return jsonResponse(201, {
      message: "Result saved successfully",
      attemptId,
      score,
      correctCount,
      totalQuestions,
      timeTaken,
      passed,
      passingScore: manifest.passingScore || DEFAULT_PASSING_SCORE,
      domainScores,
      answers: detailedAnswers,
    });
  } catch (error) {
    logError("submit-results", error, event?.requestContext?.requestId || null);
    if (error instanceof SyntaxError) return jsonResponse(400, { message: "Request body must be valid JSON" });
    if (error?.name === "ConditionalCheckFailedException") {
      return jsonResponse(409, { message: "This attempt has already been submitted" });
    }
    return jsonResponse(500, { message: "Unable to save result" });
  }
};

async function updateWeakPool(userId, certId, answers) {
  const pk = `USER#${userId}`;
  const sk = `WEAK_POOL#${certId}`;
  let currentPool = {};
  let poolExists = false;

  try {
    const getResult = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: pk, SK: sk } }));
    if (getResult.Item) {
      currentPool = getResult.Item.questions || {};
      poolExists = true;
    }
  } catch (error) {
    logError("submit-results-weak-pool-read", error);
  }

  let updatedPool = { ...currentPool };
  for (const answer of Object.values(answers)) {
    const { q_id, domain, isCorrect } = answer;
    if (!q_id) continue;
    const isInPool = q_id in updatedPool;
    if (isCorrect && isInPool) updatedPool = promote(updatedPool, q_id);
    else if (!isCorrect && isInPool) updatedPool = demote(updatedPool, q_id);
    else if (!isCorrect) updatedPool = addToBox1(updatedPool, q_id, domain || "", certId);
  }

  const now = new Date().toISOString();
  try {
    if (poolExists) {
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: pk, SK: sk },
        UpdateExpression: "SET questions = :questions, updatedAt = :now",
        ExpressionAttributeValues: { ":questions": updatedPool, ":now": now },
      }));
    } else {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: { PK: pk, SK: sk, questions: updatedPool, sessionCounter: 0, updatedAt: now, type: "WEAK_POOL" },
      }));
    }
  } catch (error) {
    logError("submit-results-weak-pool-write", error);
  }
}
