import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { normalizeAnswerKey } from "./answerKeys.js";

const SECONDS_PER_QUESTION = 120;

/**
 * Creates the server-owned scoring manifest for one delivery of an exam/quiz.
 * The browser receives only the attempt ID and presentation-safe questions.
 */
export async function createAttemptManifest({ docClient, tableName, userId, certId, examId = "DynamicQuiz", questions }) {
  const attemptId = uuidv4();
  const startedAt = new Date().toISOString();
  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(1, questions.length) * SECONDS_PER_QUESTION;
  const manifestQuestions = questions.map(question => ({
    q_id: question.q_id,
    exam_id: question.exam_id,
    domain: question.domain || "Unassigned",
    correct: normalizeAnswerKey(question.correct),
    explanation: question.explanation || "",
    resources: question.resources || [],
  }));

  await docClient.send(new PutCommand({
    TableName: tableName,
    Item: {
      PK: `USER#${userId}`,
      SK: `ATTEMPT#${attemptId}#MANIFEST`,
      type: "ATTEMPT_MANIFEST",
      attemptId,
      certId,
      status: "ACTIVE",
      examId,
      startedAt,
      expiresAt,
      questions: manifestQuestions,
    },
    ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
  }));

  return { attemptId, startedAt, expiresAt };
}

/**
 * Omits answer keys and explanations before a question is delivered to a learner.
 * The correct field is included for client-side study mode feedback — scoring is
 * always performed server-side against the manifest, so exposing this to the
 * authenticated client does not affect exam integrity.
 */
export function toExamSafeQuestion(question) {
  return {
    q_id: question.q_id,
    cert_id: question.cert_id,
    exam_id: question.exam_id,
    text: question.text,
    options: question.options,
    answerCount: normalizeAnswerKey(question.correct).length,
    correct: normalizeAnswerKey(question.correct),
    explanation: question.explanation || "",
    resources: question.resources || [],
    domain: question.domain,
    primary_service: question.primary_service,
  };
}
