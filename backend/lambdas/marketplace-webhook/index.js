import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../common/db.js";

const TABLE_NAME = process.env.TABLE_NAME;

const STATUS_MAP = {
  "subscribe-success": "active",
  "unsubscribe-success": "cancelled",
  "subscribe-fail": "failed",
  "unsubscribe-pending": "pending-cancel",
};

export const handler = async (event) => {
  console.log("Marketplace webhook event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message);
    const { action, "customer-identifier": awsAccountId, "product-code": productCode } = message;

    if (!awsAccountId || !action) {
      console.warn("Missing fields in SNS message:", message);
      continue;
    }

    const status = STATUS_MAP[action];
    if (!status) {
      console.warn("Unknown action:", action);
      continue;
    }

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `MARKETPLACE#${awsAccountId}`, SK: "SUBSCRIPTION" },
        UpdateExpression: "SET #s = :status, updatedAt = :ts, productCode = :pc",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":status": status,
          ":ts": new Date().toISOString(),
          ":pc": productCode,
        },
      })
    );

    console.log(`Updated ${awsAccountId} → ${status}`);
  }

  return { statusCode: 200 };
};
