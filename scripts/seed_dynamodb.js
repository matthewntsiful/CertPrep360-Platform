const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");
const fs = require("fs");

const TABLE_NAME = process.argv[2];
const FILE_PATH = process.argv[3] || "data/questions-saa-c03.json";
const certId = process.argv[4] || "SAA-C03";
const examId = process.argv[5] || "01";

if (!TABLE_NAME) {
    console.error("Usage: node scripts/seed_dynamodb.js <tableName> <jsonFilePath> [certId] [examId]");
    process.exit(1);
}

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function seedData() {
    console.log(`Starting seed: ${FILE_PATH} -> ${TABLE_NAME} (Cert: ${certId}, Exam: ${examId})`);
    
    if (!fs.existsSync(FILE_PATH)) {
        console.error(`File not found: ${FILE_PATH}`);
        process.exit(1);
    }

    const questions = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
    const BATCH_SIZE = 25;
    const batches = [];

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        batches.push(questions.slice(i, i + BATCH_SIZE));
    }

    console.log(`Total items: ${questions.length}. Total batches: ${batches.length}`);

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const putRequests = batch.map(q => {
            if (!q.q_id) return null;
            return {
                PutRequest: {
                    Item: {
                        PK: `CERT#${certId.toUpperCase()}`,
                        SK: `EXAM#${examId}#QUESTION#${q.q_id}`,
                        q_id: q.q_id,
                        text: q.text,
                        options: q.options,
                        correct: q.correct,
                        explanation: q.explanation || "Detailed domain analysis.",
                        resources: q.resources || ["https://aws.amazon.com/documentation/"],
                        domain: q.domain || "Uncategorized",
                        type: "QUESTION"
                    }
                }
            };
        }).filter(Boolean);

        if (putRequests.length === 0) continue;

        const command = new BatchWriteCommand({
            RequestItems: { [TABLE_NAME]: putRequests }
        });

        try {
            await docClient.send(command);
            process.stdout.write("."); 
            if ((i + 1) % 10 === 0) console.log(` ${Math.round(((i + 1) / batches.length) * 100)}%`);
        } catch (error) {
            console.error(`\nError writing batch ${i}:`, error.message);
        }
    }

    console.log("\nSeeding complete!");
}

seedData().catch(console.error);
