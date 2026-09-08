import { ListUsersCommand, CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";
import { jsonResponse, logError, logRequest, requireAdmin } from "./common/security.js";

const cognitoClient = new CognitoIdentityProviderClient({});
const TABLE_NAME = process.env.TABLE_NAME;
const USER_POOL_ID = process.env.USER_POOL_ID;

export const handler = async (event) => {
  logRequest(event, "admin-analytics");

  if (!requireAdmin(event)) {
    return jsonResponse(403, { message: "Administrator access is required" });
  }

  const action = event.queryStringParameters?.action || "summary";
  if (!["summary", "listUsers"].includes(action)) {
    return jsonResponse(400, { message: "Unsupported analytics action" });
  }

  try {
    if (action === "listUsers") {
      const allUsers = [];
      let paginationToken;

      do {
        const usersResponse = await cognitoClient.send(new ListUsersCommand({
          UserPoolId: USER_POOL_ID,
          Limit: 60,
          PaginationToken: paginationToken,
        }));
        allUsers.push(...(usersResponse.Users || []));
        paginationToken = usersResponse.PaginationToken;
      } while (paginationToken);

      const formattedUsers = allUsers.map(user => ({
        id: user.Attributes.find(attribute => attribute.Name === "sub")?.Value,
        email: user.Attributes.find(attribute => attribute.Name === "email")?.Value,
        status: user.UserStatus,
        joined: user.UserCreateDate,
        enabled: user.Enabled,
      }));

      return jsonResponse(200, formattedUsers);
    }

    let totalUsersCount = 0;
    const usersByMonth = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let nextToken;

    do {
      const response = await cognitoClient.send(new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        PaginationToken: nextToken,
        Limit: 60,
      }));
      const users = response.Users || [];
      totalUsersCount += users.length;

      users.forEach(user => {
        if (user.UserCreateDate) {
          const date = new Date(user.UserCreateDate);
          const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
          usersByMonth[monthKey] = (usersByMonth[monthKey] || 0) + 1;
        }
      });
      nextToken = response.PaginationToken;
    } while (nextToken);

    const growth = Object.entries(usersByMonth)
      .map(([month, count]) => ({
        month,
        users: count,
        _sort: new Date(month.split(" ")[1], months.indexOf(month.split(" ")[0])).getTime(),
      }))
      .sort((first, second) => first._sort - second._sort)
      .map(({ month, users }) => ({ month, users }));

    const attemptsResponse = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "#type = :type",
      ExpressionAttributeNames: { "#type": "type" },
      ExpressionAttributeValues: { ":type": "EXAM_ATTEMPT" },
    }));
    const attempts = attemptsResponse.Items || [];

    const performanceMap = {};
    attempts.forEach(attempt => {
      const examName = attempt.examId || "Unknown";
      if (!performanceMap[examName]) performanceMap[examName] = { name: examName, pass: 0, fail: 0 };
      if (attempt.passed) performanceMap[examName].pass += 1;
      else performanceMap[examName].fail += 1;
    });

    let realQuestionCount = 0;
    let questionsNextToken;
    do {
      const response = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "#type = :type",
        ExpressionAttributeNames: { "#type": "type" },
        ExpressionAttributeValues: { ":type": "QUESTION" },
        ExclusiveStartKey: questionsNextToken,
        Select: "COUNT",
      }));
      realQuestionCount += response.Count || 0;
      questionsNextToken = response.LastEvaluatedKey;
    } while (questionsNextToken);

    return jsonResponse(200, {
      overview: [
        { label: "Total Architects", value: totalUsersCount.toLocaleString(), trend: "Live", type: "users" },
        { label: "Exam Questions", value: realQuestionCount.toLocaleString(), trend: "Live", type: "content" },
        { label: "Exam Attempts", value: attempts.length.toLocaleString(), trend: "Live", type: "sessions" },
        { label: "Overall Pass Rate", value: `${attempts.length > 0 ? Math.round((attempts.filter(attempt => attempt.passed).length / attempts.length) * 100) : 0}%`, trend: "Dynamic", type: "health" },
      ],
      details: { growth, performance: Object.values(performanceMap).slice(0, 5) },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError("admin-analytics", error, event?.requestContext?.requestId || null);
    return jsonResponse(500, { message: "Unable to retrieve analytics" });
  }
};
