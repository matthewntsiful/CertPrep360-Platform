import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";
import { encodeCursor, decodeCursor, clampPageSize } from "./common/pagination.js";

const TABLE_NAME = process.env.TABLE_NAME;
const PASS_THRESHOLD = 72;

/**
 * GET /analytics — returns dashboard summary or paginated history.
 *
 * Query modes:
 *   - ?attemptId=xxx → single attempt detail (existing)
 *   - ?history=true  → paginated history with filtering/sorting
 *   - (default)      → dashboard summary with trendData + weakPoolCount
 *
 * History mode params:
 *   - pageSize (default 20, max 50)
 *   - cursor (opaque base64 cursor)
 *   - certId (filter by certification)
 *   - status (passed | failed)
 *   - sort (date_asc | date_desc | score_asc | score_desc) — default date_desc
 */
export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  const userId =
    event.requestContext?.authorizer?.claims?.sub ||
    event.pathParameters?.userId;

  if (!userId) {
    return respond(400, { message: "Missing userId or unauthorized" });
  }

  const params = event.queryStringParameters || {};

  try {
    // --- Single attempt detail ---
    if (params.attemptId) {
      return await handleSingleAttempt(userId, params.attemptId);
    }

    // --- Paginated history mode ---
    if (params.history === "true") {
      return await handlePaginatedHistory(userId, params);
    }

    // --- Dashboard summary (default) ---
    return await handleDashboardSummary(userId);
  } catch (error) {
    console.error("Error fetching analytics:", error);

    if (error.message === "Invalid cursor format") {
      return respond(400, { message: "Invalid cursor" });
    }

    return respond(500, { message: "Internal Server Error", error: error.message });
  }
};

// ─── Single Attempt Detail ───────────────────────────────────────────────────

async function handleSingleAttempt(userId, attemptId) {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":skPrefix": `ATTEMPT#${attemptId}`,
    },
  });

  const response = await docClient.send(command);
  const item = response.Items?.[0];

  if (!item) {
    return respond(404, { message: "Attempt not found" });
  }

  return respond(200, item);
}

// ─── Paginated History Mode ──────────────────────────────────────────────────

async function handlePaginatedHistory(userId, params) {
  const pageSize = clampPageSize(params.pageSize);
  const cursor = params.cursor ? decodeCursor(params.cursor) : undefined;
  const certIdFilter = params.certId || null;
  const statusFilter = params.status || null; // "passed" | "failed"
  const sort = params.sort || "date_desc";

  // Determine if we need in-memory sorting (score-based sorts)
  const isScoreSort = sort === "score_asc" || sort === "score_desc";

  // Build filter expressions
  const { filterExpression, expressionAttributeValues, expressionAttributeNames } =
    buildFilterExpressions(certIdFilter, statusFilter);

  // Get total count (with filters applied)
  const totalCount = await getTotalCount(userId, filterExpression, expressionAttributeValues, expressionAttributeNames);

  let attempts;
  let nextCursor = null;

  if (isScoreSort) {
    // For score sorting: fetch all matching items, sort in memory, then paginate
    attempts = await fetchAllAttempts(userId, filterExpression, expressionAttributeValues, expressionAttributeNames);

    // Sort by score
    attempts.sort((a, b) =>
      sort === "score_asc" ? a.score - b.score : b.score - a.score
    );

    // Apply cursor-based pagination on the sorted array
    const startIndex = cursor ? findCursorIndex(attempts, cursor) : 0;
    const page = attempts.slice(startIndex, startIndex + pageSize);

    if (startIndex + pageSize < attempts.length) {
      // Encode the position as a cursor for score-sorted results
      const lastItem = page[page.length - 1];
      nextCursor = encodeCursor({ PK: lastItem.PK, SK: lastItem.SK });
    }

    attempts = page;
  } else {
    // For date sorting: use native DynamoDB SK order
    const scanForward = sort === "date_asc";

    const queryParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":skPrefix": "ATTEMPT#",
        ...expressionAttributeValues,
      },
      ScanIndexForward: scanForward,
      Limit: pageSize,
    };

    if (expressionAttributeNames) {
      queryParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    if (filterExpression) {
      queryParams.FilterExpression = filterExpression;
    }

    if (cursor) {
      queryParams.ExclusiveStartKey = cursor;
    }

    const command = new QueryCommand(queryParams);
    const response = await docClient.send(command);

    attempts = response.Items || [];
    nextCursor = response.LastEvaluatedKey
      ? encodeCursor(response.LastEvaluatedKey)
      : null;
  }

  // Map to AttemptSummary shape
  const mappedAttempts = attempts.map(mapToAttemptSummary);

  return respond(200, {
    attempts: mappedAttempts,
    totalCount,
    nextCursor,
  });
}

// ─── Dashboard Summary ───────────────────────────────────────────────────────

async function handleDashboardSummary(userId) {
  // Fetch all attempts (no limit) for dashboard analytics
  const attempts = await fetchAllAttempts(userId, null, null, null);

  // Fetch Weak Pool count
  const weakPoolCount = await getWeakPoolCount(userId);

  // Calculate analytics
  let totalScore = 0;
  let totalStudyHours = 0;
  const certifications = new Set();
  const domainPerformance = {};

  attempts.forEach((attempt) => {
    totalScore += attempt.score || 0;
    totalStudyHours += (attempt.timeTaken || 0) / 60;
    certifications.add((attempt.certId || "").toUpperCase());

    if (attempt.answers && typeof attempt.answers === "object") {
      Object.values(attempt.answers).forEach((ans) => {
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

  const averageScore =
    attempts.length > 0 ? Math.round(totalScore / attempts.length) : 0;

  let weakestDomain = "N/A";
  let lowestAccuracy = 100;

  Object.keys(domainPerformance).forEach((domain) => {
    const stat = domainPerformance[domain];
    const accuracy = (stat.correct / stat.total) * 100;
    if (accuracy < lowestAccuracy && stat.total > 0) {
      lowestAccuracy = accuracy;
      weakestDomain = domain;
    }
  });

  // Build trend data — all attempts in chronological order (ascending)
  const sortedAttempts = [...attempts].sort((a, b) => {
    const tsA = a.timestamp || a.SK;
    const tsB = b.timestamp || b.SK;
    return tsA < tsB ? -1 : tsA > tsB ? 1 : 0;
  });

  const trendData = sortedAttempts.map((attempt) => ({
    date: attempt.timestamp || extractTimestampFromSK(attempt.SK),
    score: attempt.score || 0,
    certId: (attempt.certId || "").toUpperCase(),
    examId: attempt.examId || "",
    domainScores: attempt.domainScores || computeDomainScoresFromAnswers(attempt.answers),
  }));

  const analytics = {
    examsCompleted: attempts.length,
    averageScore,
    totalStudyHours: Math.round(totalStudyHours * 10) / 10,
    certificationsTracked: Array.from(certifications),
    weakestDomain,
    weakPoolCount,
    trendData,
    recentAttempts: sortedAttempts
      .slice(-10)
      .reverse()
      .map(mapToAttemptSummary),
  };

  return respond(200, analytics);
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Fetch all attempt items for a user, optionally with filter expressions.
 * Handles DynamoDB pagination internally to retrieve all items.
 */
async function fetchAllAttempts(userId, filterExpression, expressionAttributeValues, expressionAttributeNames) {
  const allItems = [];
  let lastEvaluatedKey = undefined;

  do {
    const queryParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":skPrefix": "ATTEMPT#",
        ...expressionAttributeValues,
      },
      ScanIndexForward: true,
    };

    if (expressionAttributeNames) {
      queryParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    if (filterExpression) {
      queryParams.FilterExpression = filterExpression;
    }

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const command = new QueryCommand(queryParams);
    const response = await docClient.send(command);

    allItems.push(...(response.Items || []));
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return allItems;
}

/**
 * Get total count of attempts matching filters using a COUNT query.
 */
async function getTotalCount(userId, filterExpression, expressionAttributeValues, expressionAttributeNames) {
  const queryParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":skPrefix": "ATTEMPT#",
      ...expressionAttributeValues,
    },
    Select: "COUNT",
  };

  if (expressionAttributeNames) {
    queryParams.ExpressionAttributeNames = expressionAttributeNames;
  }

  if (filterExpression) {
    queryParams.FilterExpression = filterExpression;
  }

  let totalCount = 0;
  let lastEvaluatedKey = undefined;

  do {
    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const command = new QueryCommand(queryParams);
    const response = await docClient.send(command);

    totalCount += response.Count || 0;
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return totalCount;
}

/**
 * Get the total count of questions in the user's Weak Pool across all certifications.
 */
async function getWeakPoolCount(userId) {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":skPrefix": "WEAK_POOL#",
    },
  });

  const response = await docClient.send(command);
  const pools = response.Items || [];

  let count = 0;
  for (const pool of pools) {
    if (pool.questions && typeof pool.questions === "object") {
      count += Object.keys(pool.questions).length;
    }
  }

  return count;
}

/**
 * Build DynamoDB FilterExpression for certId and status filters.
 */
function buildFilterExpressions(certIdFilter, statusFilter) {
  const conditions = [];
  const expressionAttributeValues = {};
  let expressionAttributeNames = null;

  if (certIdFilter) {
    conditions.push("certId = :certIdFilter");
    expressionAttributeValues[":certIdFilter"] = certIdFilter;
  }

  if (statusFilter === "passed") {
    conditions.push("score >= :passThreshold");
    expressionAttributeValues[":passThreshold"] = PASS_THRESHOLD;
  } else if (statusFilter === "failed") {
    conditions.push("score < :passThreshold");
    expressionAttributeValues[":passThreshold"] = PASS_THRESHOLD;
  }

  const filterExpression = conditions.length > 0 ? conditions.join(" AND ") : null;

  return {
    filterExpression,
    expressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : null,
    expressionAttributeNames,
  };
}

/**
 * Find the index in a sorted array where the cursor item is located.
 * Used for score-based pagination where we can't use DynamoDB's ExclusiveStartKey.
 */
function findCursorIndex(attempts, cursor) {
  const idx = attempts.findIndex(
    (a) => a.PK === cursor.PK && a.SK === cursor.SK
  );
  // Start after the cursor item
  return idx >= 0 ? idx + 1 : 0;
}

/**
 * Map a DynamoDB attempt item to the AttemptSummary shape.
 */
function mapToAttemptSummary(attempt) {
  return {
    id: extractTimestampFromSK(attempt.SK),
    examId: attempt.examId || "",
    certId: (attempt.certId || "").toUpperCase(),
    score: attempt.score || 0,
    date: attempt.timestamp || extractTimestampFromSK(attempt.SK),
    timeTaken: attempt.timeTaken || 0,
    passed: (attempt.score || 0) >= PASS_THRESHOLD,
  };
}

/**
 * Extract the timestamp portion from an SK like ATTEMPT#2024-01-15T10:30:00Z#EXAM#exam-1
 */
function extractTimestampFromSK(sk) {
  if (!sk) return "";
  const parts = sk.split("#");
  // SK format: ATTEMPT#<timestamp>#EXAM#<examId>
  return parts[1] || "";
}

/**
 * Compute domain scores from answers when domainScores is not pre-computed on the item.
 */
function computeDomainScoresFromAnswers(answers) {
  if (!answers || typeof answers !== "object") return {};

  const domainStats = {};
  for (const answer of Object.values(answers)) {
    const { domain, isCorrect } = answer;
    if (!domain) continue;

    if (!domainStats[domain]) {
      domainStats[domain] = { correct: 0, total: 0 };
    }
    domainStats[domain].total += 1;
    if (isCorrect) {
      domainStats[domain].correct += 1;
    }
  }

  const scores = {};
  for (const [domain, stats] of Object.entries(domainStats)) {
    scores[domain] = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);
  }

  return scores;
}

/**
 * Build a standard API Gateway response.
 */
function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin":
        process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
