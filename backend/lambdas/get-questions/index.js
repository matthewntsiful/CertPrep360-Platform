import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";
import { createAttemptManifest, toExamSafeQuestion } from "./common/attempts.js";
import { jsonResponse, logError, logRequest, requireAuthenticatedUser } from "./common/security.js";

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  logRequest(event, "get-questions");
  const userId = requireAuthenticatedUser(event);
  if (!userId) return jsonResponse(401, { message: "Unauthorized" });

  const { certId, examId } = event.pathParameters || {};
  if (!certId || !examId) return jsonResponse(400, { message: "Missing certId or examId" });

  try {
    const items = [];
    let lastKey;
    do {
      const response = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `CERT#${certId.toUpperCase()}`,
          ":skPrefix": `EXAM#${examId}#QUESTION#`,
        },
        ExclusiveStartKey: lastKey,
      }));
      items.push(...(response.Items || []));
      lastKey = response.LastEvaluatedKey;
    } while (lastKey);

    if (!items.length) return jsonResponse(404, { message: "No questions were found for this exam" });

    const attempt = await createAttemptManifest({
      docClient,
      tableName: TABLE_NAME,
      userId,
      certId: certId.toUpperCase(),
      examId,
      questions: items,
    });

    return jsonResponse(200, {
      attempt,
      questions: items.map(toExamSafeQuestion),
    });
  } catch (error) {
    logError("get-questions", error, event?.requestContext?.requestId || null);
    return jsonResponse(500, { message: "Unable to load exam questions" });
  }
};
