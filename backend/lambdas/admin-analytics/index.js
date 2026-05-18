import { ListUsersCommand, CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";

const cognitoClient = new CognitoIdentityProviderClient({});
const TABLE_NAME = process.env.TABLE_NAME;
const USER_POOL_ID = process.env.USER_POOL_ID;

export const handler = async (event) => {
  console.log("Admin Analytics Event:", JSON.stringify(event, null, 2));
  
  const action = event.queryStringParameters?.action || 'summary';

  try {
    if (action === 'catalog') {
      // Scan all QUESTION items and aggregate by cert_id and exam_id
      const items = [];
      let lastKey = undefined;
      do {
        const cmd = new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "#type = :t",
          ExpressionAttributeNames: { "#type": "type" },
          ExpressionAttributeValues: { ":t": "QUESTION" },
          ProjectionExpression: "cert_id, exam_id",
          ExclusiveStartKey: lastKey
        });
        const resp = await docClient.send(cmd);
        items.push(...(resp.Items || []));
        lastKey = resp.LastEvaluatedKey;
      } while (lastKey);

      // Build catalog: { certId: { totalQuestions, exams: Set } }
      const catalog = {};
      items.forEach(item => {
        const cert = item.cert_id;
        const exam = item.exam_id;
        if (!cert || !exam) return;
        if (!catalog[cert]) catalog[cert] = { totalQuestions: 0, exams: new Set() };
        catalog[cert].totalQuestions++;
        catalog[cert].exams.add(exam);
      });

      // Serialize Sets to arrays
      const result = {};
      Object.entries(catalog).forEach(([cert, data]) => {
        result[cert] = {
          totalQuestions: data.totalQuestions,
          examCount: data.exams.size,
          exams: [...data.exams].sort()
        };
      });

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com", "Content-Type": "application/json" },
        body: JSON.stringify(result),
      };
    }

    if (action === 'listUsers') {
      let allUsers = [];
      let paginationToken = undefined;
      
      do {
        const listUsersCmd = new ListUsersCommand({
          UserPoolId: USER_POOL_ID,
          Limit: 60,
          PaginationToken: paginationToken
        });
        const usersResponse = await cognitoClient.send(listUsersCmd);
        allUsers.push(...(usersResponse.Users || []));
        paginationToken = usersResponse.PaginationToken;
      } while (paginationToken);
      
      const formattedUsers = allUsers.map(u => ({
        id: u.Attributes.find(a => a.Name === 'sub')?.Value,
        email: u.Attributes.find(a => a.Name === 'email')?.Value,
        status: u.UserStatus,
        joined: u.UserCreateDate,
        enabled: u.Enabled
      }));

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com", "Content-Type": "application/json" },
        body: JSON.stringify(formattedUsers),
      };
    }

    // Default: summary action
    // 1. Fetch real user count
    const listUsersCmd = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 1
    });
    // Cognito doesn't give a total count easily without pagination, so we approximate or scan.
    // For small/medium pools, we can list with Pagination.
    let totalUsersCount = 0;
    let nextToken = undefined;
    do {
      const cmd = new ListUsersCommand({ UserPoolId: USER_POOL_ID, PaginationToken: nextToken, Limit: 60 });
      const resp = await cognitoClient.send(cmd);
      totalUsersCount += (resp.Users?.length || 0);
      nextToken = resp.PaginationToken;
    } while (nextToken);

    // 2. Aggregate EXAM_ATTEMPT records from DynamoDB
    const scanAttemptsCmd = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "#type = :t",
      ExpressionAttributeNames: { "#type": "type" },
      ExpressionAttributeValues: { ":t": "EXAM_ATTEMPT" }
    });

    const attemptsResponse = await docClient.send(scanAttemptsCmd);
    const attempts = attemptsResponse.Items || [];
    
    // Performance aggregation
    const performanceMap = {};
    attempts.forEach(a => {
      const examName = a.examId || 'Unknown';
      if (!performanceMap[examName]) performanceMap[examName] = { name: examName, pass: 0, fail: 0 };
      if (a.score >= 70) performanceMap[examName].pass++;
      else performanceMap[examName].fail++;
    });

    // Content Stats - Paginated Scan for accurate total count
    let realQuestionCount = 0;
    let questionsNextToken = undefined;
    do {
      const scanQuestionsCmd = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "#type = :t",
        ExpressionAttributeNames: { "#type": "type" },
        ExpressionAttributeValues: { ":t": "QUESTION" },
        ExclusiveStartKey: questionsNextToken,
        Select: "COUNT"
      });
      const qResp = await docClient.send(scanQuestionsCmd);
      realQuestionCount += (qResp.Count || 0);
      questionsNextToken = qResp.LastEvaluatedKey;
    } while (questionsNextToken);

    const stats = {
      overview: [
        { label: "Total Architects", value: totalUsersCount.toLocaleString(), trend: "Live", type: "users" },
        { label: "Exam Questions", value: realQuestionCount.toLocaleString(), trend: "Live", type: "content" },
        { label: "Exam Attempts", value: attempts.length.toLocaleString(), trend: "Live", type: "sessions" },
        { label: "Overall Pass Rate", value: `${attempts.length > 0 ? Math.round((attempts.filter(a => a.score >= 70).length / attempts.length) * 100) : 0}%`, trend: "Dynamic", type: "health" },
      ],
      details: {
        growth: [
          { month: "Apr", users: totalUsersCount } // Simplified for now
        ],
        performance: Object.values(performanceMap).slice(0, 5) // Top 5 exams
      },
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com", "Content-Type": "application/json" },
      body: JSON.stringify(stats),
    };
  } catch (err) {
    console.error("Admin Analytics Error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com" },
      body: JSON.stringify({ message: "Internal Server Error", error: err.message }),
    };
  }
};
