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
            
            // Extract IDs, prioritizing JSON fields but allowing CLI overrides
            const currentCertId = (q.cert_id || certId).toUpperCase();
            const currentExamId = q.exam_id || examId;
            const domain = q.domain || "General";

            return {
                PutRequest: {
                    Item: {
                        // Main Table Keys
                        PK: `CERT#${currentCertId}`,
                        SK: `EXAM#${currentExamId}#QUESTION#${q.q_id}`,
                        
                        // GSI1 (Domain-scoped queries)
                        "GSI1-PK": `DOMAIN#${domain}`,
                        "GSI1-SK": `CERT#${currentCertId}#QUESTION#${q.q_id}`,

                        // Content Attributes
                        q_id: q.q_id,
                        number: q.number,
                        text: q.text,
                        options: q.options,
                        correct: q.correct,
                        explanation: q.explanation || "Detailed domain analysis.",
                        resources: q.resources || [],
                        domain: domain,
                        cert_id: currentCertId,
                        exam_id: currentExamId,
                        type: "QUESTION",
                        updatedAt: new Date().toISOString()
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
