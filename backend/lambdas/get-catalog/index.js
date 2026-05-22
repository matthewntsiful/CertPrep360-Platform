import { ScanCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./common/db.js";

const TABLE_NAME = process.env.TABLE_NAME;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

export const handler = async (event) => {
  console.log("Get Catalog Event:", JSON.stringify(event, null, 2));

  try {
    // 1. Try to fetch from pre-calculated metadata (Best Practice)
    const getCmd = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: "METADATA",
        SK: "CATALOG"
      }
    });

    const metadataResp = await docClient.send(getCmd);
    if (metadataResp.Item && metadataResp.Item.data) {
      console.log("Returning cached catalog from metadata");
      return {
        statusCode: 200,
        headers: { 
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(metadataResp.Item.data),
      };
    }

    // 2. Fallback to Scan (Pragmatic fallback for cold starts/new tables)
    console.log("Metadata not found, performing scan...");
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

    const catalog = {};
    items.forEach(item => {
      const cert = item.cert_id;
      const exam = item.exam_id;
      if (!cert || !exam) return;
      if (!catalog[cert]) catalog[cert] = { totalQuestions: 0, exams: new Set() };
      catalog[cert].totalQuestions++;
      catalog[cert].exams.add(exam);
    });

    const result = {};
    Object.entries(catalog).forEach(([cert, data]) => {
      result[cert] = {
        totalQuestions: data.totalQuestions,
        examCount: data.exams.size,
        exams: [...data.exams].sort()
      };
    });

    // 3. (Optional) Update metadata for next time
    // We do this asynchronously to not block the response, or just ignore for now
    // For now, we'll just return. 

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error fetching catalog:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
      body: JSON.stringify({ message: "Failed to fetch catalog", error: error.message }),
    };
  }
};
