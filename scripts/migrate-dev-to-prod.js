#!/usr/bin/env node
/**
 * Migrates content items from dev DynamoDB table to prod.
 * Copies: CERT#, QUALITY#, EXAM_GUIDE# items
 * Skips:  USER#, JOB# items (dev-only data)
 *
 * Usage:
 *   AWS_PROFILE=BlakkBrotherInc-Startup node scripts/migrate-dev-to-prod.js
 *   AWS_PROFILE=BlakkBrotherInc-Startup node scripts/migrate-dev-to-prod.js --dry-run
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");

const SOURCE_TABLE = "CertPrep360-Dev-Main";
const TARGET_TABLE = "CertPrep360-Prod-Main";
const REGION = "us-east-1";
const BATCH_SIZE = 25;
const CONTENT_PREFIXES = ["CERT#", "QUALITY#", "EXAM_GUIDE#"];
const DRY_RUN = process.argv.includes("--dry-run");

const client = new DynamoDBClient({ region: REGION });
const db = DynamoDBDocumentClient.from(client);

async function scanAll() {
  const items = [];
  let lastKey;

  do {
    const res = await db.send(new ScanCommand({
      TableName: SOURCE_TABLE,
      ExclusiveStartKey: lastKey,
    }));
    items.push(...res.Items);
    lastKey = res.LastEvaluatedKey;
    process.stdout.write(`\rScanned ${items.length} items...`);
  } while (lastKey);

  console.log();
  return items;
}

async function batchWrite(items) {
  let written = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE).map(item => ({ PutRequest: { Item: item } }));

    try {
      const res = await db.send(new BatchWriteCommand({ RequestItems: { [TARGET_TABLE]: batch } }));
      const unprocessed = res.UnprocessedItems?.[TARGET_TABLE]?.length ?? 0;
      written += batch.length - unprocessed;
      failed += unprocessed;
    } catch (err) {
      console.error(`\nBatch ${i / BATCH_SIZE + 1} failed:`, err.message);
      failed += batch.length;
    }

    process.stdout.write(`\rWritten ${written} / ${items.length}...`);
  }

  console.log();
  return { written, failed };
}

async function main() {
  console.log(`Source: ${SOURCE_TABLE}`);
  console.log(`Target: ${TARGET_TABLE}`);
  if (DRY_RUN) console.log("*** DRY RUN — no writes will occur ***\n");

  const all = await scanAll();
  console.log(`Total items in dev: ${all.length}`);

  const content = all.filter(item =>
    CONTENT_PREFIXES.some(prefix => item.PK?.startsWith(prefix))
  );

  const skipped = all.length - content.length;
  console.log(`Items to migrate: ${content.length} (skipping ${skipped} USER/JOB items)\n`);

  // Summary by prefix
  const counts = {};
  for (const item of content) {
    const prefix = item.PK.split("#")[0];
    counts[prefix] = (counts[prefix] || 0) + 1;
  }
  for (const [prefix, count] of Object.entries(counts)) {
    console.log(`  ${prefix}: ${count}`);
  }
  console.log();

  if (DRY_RUN) {
    console.log("Dry run complete. Re-run without --dry-run to migrate.");
    return;
  }

  const { written, failed } = await batchWrite(content);

  console.log("\n--- Migration Complete ---");
  console.log(`✅ Written: ${written}`);
  if (failed > 0) console.log(`❌ Failed:  ${failed}`);
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
