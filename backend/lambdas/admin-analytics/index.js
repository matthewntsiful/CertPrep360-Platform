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
    let usersByMonth = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let nextToken = undefined;

    do {
      const cmd = new ListUsersCommand({ UserPoolId: USER_POOL_ID, PaginationToken: nextToken, Limit: 60 });
      const resp = await cognitoClient.send(cmd);
      const users = resp.Users || [];
      totalUsersCount += users.length;
      
      users.forEach(u => {
        if (u.UserCreateDate) {
          const date = new Date(u.UserCreateDate);
          const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
          usersByMonth[monthKey] = (usersByMonth[monthKey] || 0) + 1;
        }
      });
      
      nextToken = resp.PaginationToken;
    } while (nextToken);

    // Format growth data (sort by date)
    const growth = Object.entries(usersByMonth)
      .map(([month, count]) => ({ 
        month, 
        users: count, 
        _sort: new Date(month.split(' ')[1], months.indexOf(month.split(' ')[0])).getTime() 
      }))
      .sort((a, b) => a._sort - b._sort)
      .map(({ month, users }) => ({ month, users }));

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
        growth: growth,
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
