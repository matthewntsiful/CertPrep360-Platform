import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { QueryCommand, BatchWriteCommand, UpdateCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { docClient } from "./common/db.js";
import { getExamGuide } from "./common/examGuideParser.js";
import { buildCoverageState, selectSlot, updateCoverageState, computeSlotDistribution, SCENARIO_TYPES } from "./common/diversityEnforcer.js";
import { DeduplicationEngine } from "./common/deduplicationEngine.js";
import { buildCoverageReport, persistCoverageReport } from "./common/coverageTracker.js";
import { validateExam, persistQualityReport } from "./common/qualityValidator.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const TABLE_NAME = process.env.TABLE_NAME || 'CertPrep360-Dev-Main';
const FUNCTION_NAME = process.env.AWS_LAMBDA_FUNCTION_NAME || 'CertPrep360-Dev-AIGenerateContent';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://aws-exams-dev.matthewntsiful.com";
const TOTAL_SLOTS = 65;
const BATCH_CONCURRENCY = 5;
const MAX_RETRIES = 5;
const DEDUP_THRESHOLD = 0.70;

// ── Bedrock client ────────────────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });
const lambdaClient = new LambdaClient({ region: "us-east-1" });


// ── BLUEPRINTS (unchanged) ────────────────────────────────────────────────────

const BLUEPRINTS = {
  "SAA-C03": {
    name: "Solutions Architect Associate",
    domains: [
      { name: "Design Secure Architectures", weight: 0.30 },
      { name: "Design Resilient Architectures", weight: 0.26 },
      { name: "Design High-Performing Architectures", weight: 0.24 },
      { name: "Design Cost-Optimized Architectures", weight: 0.20 }
    ]
  },
  "CLF-C02": {
    name: "Cloud Practitioner",
    domains: [
      { name: "Cloud Concepts", weight: 0.24 },
      { name: "Security and Compliance", weight: 0.30 },
      { name: "Cloud Technology and Services", weight: 0.34 },
      { name: "Billing, Pricing, and Support", weight: 0.12 }
    ]
  },
  "AIF-C01": {
    name: "AI Practitioner",
    domains: [
      { name: "Fundamentals of AI and ML", weight: 0.20 },
      { name: "Fundamentals of Generative AI", weight: 0.24 },
      { name: "Applications of Foundation Models", weight: 0.28 },
      { name: "Guidelines for Responsible AI", weight: 0.14 },
      { name: "Security, Compliance, and Governance", weight: 0.14 }
    ]
  },
  "DVA-C02": {
    name: "Developer Associate",
    domains: [
      { name: "Development with AWS Services", weight: 0.32 },
      { name: "Security", weight: 0.26 },
      { name: "Deployment", weight: 0.24 },
      { name: "Troubleshooting and Optimization", weight: 0.18 }
    ]
  },
  "SAP-C02": {
    name: "Solutions Architect Professional",
    domains: [
      { name: "Design Solutions for Organizational Complexity", weight: 0.26 },
      { name: "Design for New Solutions", weight: 0.29 },
      { name: "Continuous Improvement for Existing Solutions", weight: 0.25 },
      { name: "Accelerate Workload Migration and Modernization", weight: 0.20 }
    ]
  },
  "DOP-C02": {
    name: "DevOps Engineer Professional",
    domains: [
      { name: "SDLC Automation", weight: 0.22 },
      { name: "Configuration Management and IaC", weight: 0.17 },
      { name: "Resilient Cloud Solutions", weight: 0.15 },
      { name: "Monitoring and Logging", weight: 0.15 },
      { name: "Incident and Event Response", weight: 0.14 },
      { name: "Security and Compliance", weight: 0.17 }
    ]
  },
  "SCS-C02": {
    name: "Security Specialty",
    domains: [
      { name: "Threat Detection and Incident Response", weight: 0.14 },
      { name: "Security Logging and Monitoring", weight: 0.18 },
      { name: "Infrastructure Security", weight: 0.20 },
      { name: "Identity and Access Management", weight: 0.16 },
      { name: "Data Protection", weight: 0.18 },
      { name: "Management and Security Governance", weight: 0.14 }
    ]
  },
  "ANS-C01": {
    name: "Advanced Networking Specialty",
    domains: [
      { name: "Network Design", weight: 0.30 },
      { name: "Network Implementation", weight: 0.26 },
      { name: "Network Management and Operation", weight: 0.20 },
      { name: "Network Security, Compliance, and Governance", weight: 0.24 }
    ]
  },
  "COE-C01": {
    name: "CloudOps Engineer Associate",
    domains: [
      { name: "Monitoring, Logging, and Remediation", weight: 0.20 },
      { name: "Reliability and Business Continuity", weight: 0.16 },
      { name: "Deployment, Provisioning, and Automation", weight: 0.18 },
      { name: "Security and Compliance", weight: 0.16 },
      { name: "Networking and Content Delivery", weight: 0.18 },
      { name: "Cost and Performance Optimization", weight: 0.12 }
    ]
  },
  "DEA-C01": {
    name: "Data Engineer Associate",
    domains: [
      { name: "Data Ingestion and Transformation", weight: 0.34 },
      { name: "Data Store Management", weight: 0.26 },
      { name: "Data Operations and Support", weight: 0.22 },
      { name: "Data Security and Governance", weight: 0.18 }
    ]
  },
  "MLE-C01": {
    name: "Machine Learning Engineer Associate",
    domains: [
      { name: "Data Preparation for ML", weight: 0.28 },
      { name: "ML Model Development", weight: 0.26 },
      { name: "ML Implementation and Operations", weight: 0.28 },
      { name: "AI Solutions and Safety", weight: 0.18 }
    ]
  },
  "GDP-C01": {
    name: "Generative AI Developer Professional",
    domains: [
      { name: "Foundation Model Integration", weight: 0.31 },
      { name: "Implementation and Integration", weight: 0.26 },
      { name: "AI Safety, Security, and Governance", weight: 0.20 },
      { name: "Operational Efficiency", weight: 0.12 },
      { name: "Testing and Validation", weight: 0.11 }
    ]
  }
};


// ── Core Bedrock helper (temperature param added, default 0.7 preserves existing behavior) ──

const MODEL_SONNET = "us.anthropic.claude-sonnet-4-5-20250929-v1:0";  // For generation + fix (quality-critical)
const MODEL_HAIKU = "us.anthropic.claude-3-5-haiku-20241022-v1:0";    // For parsing + enrich + scan (cost-efficient)

const invokeModel = async (prompt, maxTokens = 4000, temperature = 0.7, model = MODEL_SONNET) => {
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
    temperature,
  };
  const command = new InvokeModelCommand({
    modelId: model,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload)
  });
  const response = await bedrockClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content[0].text;
};

// ── Response helper ───────────────────────────────────────────────────────────

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});


// ── Job helpers ───────────────────────────────────────────────────────────────

/**
 * Creates a job record in DynamoDB and returns the new jobId.
 */
const createJob = async (certId, examId) => {
  const jobId = uuidv4();
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7-day TTL

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `JOB#${jobId}`,
      SK: 'METADATA',
      job_id: jobId,
      cert_id: certId,
      exam_id: examId,
      status: 'in_progress',
      questions_generated: 0,
      questions_skipped: 0,
      current_domain: '',
      started_at: now,
      completed_at: null,
      error: null,
      ttl,
    },
  }));

  return jobId;
};

/**
 * Non-blocking DynamoDB UpdateItem for job progress. Silently catches errors.
 */
const updateJobProgress = async (jobId, updates) => {
  try {
    const setExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    for (const [key, value] of Object.entries(updates)) {
      const nameAlias = `#${key}`;
      const valueAlias = `:${key}`;
      setExpressions.push(`${nameAlias} = ${valueAlias}`);
      expressionAttributeNames[nameAlias] = key;
      expressionAttributeValues[valueAlias] = value;
    }

    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `JOB#${jobId}`, SK: 'METADATA' },
      UpdateExpression: `SET ${setExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  } catch (err) {
    console.error(`updateJobProgress error for job ${jobId}:`, err.message);
  }
};

/**
 * Reads a job record from DynamoDB. Returns the item or null.
 */
const getJobRecord = async (jobId) => {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `JOB#${jobId}`, SK: 'METADATA' },
  }));
  return result.Item ?? null;
};

/**
 * Sets job status to 'cancelled'.
 */
const cancelJobRecord = async (jobId) => {
  await updateJobProgress(jobId, {
    status: 'cancelled',
    completed_at: new Date().toISOString(),
  });
};


// ── Question helpers ──────────────────────────────────────────────────────────

/**
 * Queries and batch-deletes all questions for a given exam.
 * Key pattern: PK=CERT#<certId>, SK begins_with EXAM#<examId>#QUESTION#
 */
const deleteExamQuestions = async (certId, examId) => {
  const items = [];
  let lastKey;

  do {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `CERT#${certId.toUpperCase()}`,
        ':skPrefix': `EXAM#${examId}#QUESTION#`,
      },
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(response.Items || []));
    lastKey = response.LastEvaluatedKey;
  } while (lastKey);

  // Batch-delete in groups of 25 (DynamoDB BatchWrite limit)
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    await docClient.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: chunk.map(item => ({
          DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
        })),
      },
    }));
  }

  console.log(`Deleted ${items.length} questions for exam ${examId}`);
};

/**
 * Queries existing questions for an exam (for dedup initialization).
 */
const queryExamQuestions = async (certId, examId) => {
  const items = [];
  let lastKey;

  do {
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `CERT#${certId.toUpperCase()}`,
        ':skPrefix': `EXAM#${examId}#QUESTION#`,
      },
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(response.Items || []));
    lastKey = response.LastEvaluatedKey;
  } while (lastKey);

  return items;
};


// ── Prompt builder ────────────────────────────────────────────────────────────

const buildGeneratePrompt = (certId, certName, domain, taskStatement, service, scenarioType, outOfScopeServices) => {
  return `You are an AWS Certification Psychometrician creating questions for the ${certName} (${certId}) exam.

TASK STATEMENT: ${taskStatement.text}
TARGET SERVICE: ${service}
SCENARIO TYPE: ${scenarioType}

SCENARIO TYPE GUIDANCE:
- migration: A company is moving workloads from on-premises or another service to AWS
- troubleshooting: An existing system has a specific problem that needs diagnosing and fixing
- cost-optimization: A working system needs to reduce costs while maintaining requirements
- security: A system needs to meet specific security, compliance, or access control requirements
- architecture-design: Design a new system to meet stated requirements
- operational: Day-to-day operational tasks, monitoring, automation, maintenance

STRICT RULES:
1. The question MUST test knowledge of ${service} as the primary AWS service
2. The question MUST fit the ${scenarioType} scenario pattern
3. Do NOT mention or test any of these out-of-scope services: ${outOfScopeServices.join(', ')}
4. Include exactly 4 options (A, B, C, D) with one correct answer
5. The correct answer must be unambiguously correct per current AWS documentation
6. Distractors must be plausible but clearly wrong to someone with deep knowledge
7. Do NOT use "three-tier web application" as the scenario unless the scenario type is architecture-design
8. Do NOT repeat scenario patterns used in the last 5 questions

Return ONLY a JSON object:
{
  "text": "Full question text ending with a question",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "correct": "A|B|C|D",
  "explanation": "3-5 sentences explaining why the correct answer is right and why each wrong answer is incorrect.",
  "resources": [{ "type": "📖 AWS Docs", "url": "https://docs.aws.amazon.com/..." }],
  "primary_service": "${service}",
  "scenario_type": "${scenarioType}"
}`;
};

/**
 * Returns true if the primary service is in the out-of-scope list (case-insensitive partial match).
 */
const checkOutOfScope = (questionText, primaryService, outOfScopeServices) => {
  if (!primaryService || !outOfScopeServices || outOfScopeServices.length === 0) return false;
  const svcLower = primaryService.toLowerCase();
  return outOfScopeServices.some(oos => {
    const oosLower = oos.toLowerCase();
    return svcLower.includes(oosLower) || oosLower.includes(svcLower);
  });
};


// ── Single question generator ─────────────────────────────────────────────────

/**
 * Generates one question for a slot, with up to MAX_RETRIES retries for
 * out-of-scope violations and deduplication rejections.
 * Writes accepted questions to DynamoDB immediately.
 */
const generateOneQuestion = async (slot, examGuide, deduplicationEngine, coverageState, certId, certName, examId, questionNumber) => {
  const outOfScopeServices = examGuide.out_of_scope_services ?? [];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let aiText;
    try {
      const prompt = buildGeneratePrompt(
        certId,
        certName,
        slot.domainName,
        slot.taskStatement ?? { text: `Knowledge of ${slot.service}` },
        slot.service ?? 'AWS',
        slot.scenarioType,
        outOfScopeServices,
      );
      aiText = await invokeModel(prompt, 2000, 0.95);
    } catch (err) {
      console.error(`Bedrock error on attempt ${attempt + 1}:`, err.message);
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      continue;
    }

    let question;
    try {
      const jsonStr = aiText.substring(aiText.indexOf('{'), aiText.lastIndexOf('}') + 1);
      question = JSON.parse(jsonStr);
    } catch (err) {
      console.error(`JSON parse error on attempt ${attempt + 1}:`, err.message);
      continue;
    }

    // Check out-of-scope violation
    if (checkOutOfScope(question.text, question.primary_service ?? slot.service, outOfScopeServices)) {
      console.warn(`Out-of-scope violation on attempt ${attempt + 1}: ${question.primary_service}`);
      continue;
    }

    // Check deduplication
    const dedupResult = deduplicationEngine.checkDuplicate(question.text, DEDUP_THRESHOLD);
    if (dedupResult.isDuplicate) {
      console.warn(`Duplicate detected on attempt ${attempt + 1}, score: ${dedupResult.score.toFixed(3)}`);
      continue;
    }

    // Accepted — write to DynamoDB immediately
    const qId = uuidv4();
    const domainName = slot.taskStatement ? slot.domainName : 'Unknown';

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `CERT#${certId.toUpperCase()}`,
        SK: `EXAM#${examId}#QUESTION#${qId}`,
        q_id: qId,
        cert_id: certId,
        exam_id: examId,
        type: 'QUESTION',
        domain: domainName,
        task_statement_id: slot.taskStatement?.id,
        primary_service: slot.service,
        scenario_type: slot.scenarioType,
        text: question.text,
        options: question.options,
        correct: question.correct,
        explanation: question.explanation,
        resources: question.resources || [],
        generated_at: new Date().toISOString(),
      },
    }));

    return { accepted: true, question: { ...question, q_id: qId, domain: domainName, primary_service: slot.service, scenario_type: slot.scenarioType, task_statement_id: slot.taskStatement?.id } };
  }

  return { accepted: false, reason: `Failed after ${MAX_RETRIES} attempts` };
};


// ── Batch orchestration ───────────────────────────────────────────────────────

/**
 * Main orchestration loop: generates a full exam in parallel batches of BATCH_CONCURRENCY.
 */
const runBatchGeneration = async (certId, examId, jobId, examGuide) => {
  const certName = BLUEPRINTS[certId]?.name ?? certId;

  // 1. Query existing questions for dedup initialization
  const existingQuestions = await queryExamQuestions(certId, examId);

  // 2. Calculate how many slots to fill (cap at 65 total)
  const slotsNeeded = Math.max(0, TOTAL_SLOTS - existingQuestions.length);
  if (slotsNeeded === 0) {
    console.log(`Exam ${examId} already has ${existingQuestions.length} questions — nothing to generate`);
    await updateJobProgress(jobId, { status: 'completed', completed_at: new Date().toISOString(), questions_generated: 0, questions_skipped: 0 });
    return;
  }

  // 3. Build CoverageState from existing questions
  const coverageState = buildCoverageState(existingQuestions, examGuide);

  // 4. Compute slot distribution based on slots needed (not always 65)
  const slotDistribution = computeSlotDistribution(examGuide, slotsNeeded);

  // 5. Initialize DeduplicationEngine with existing question texts
  const existingTexts = existingQuestions.map(q => q.text ?? '').filter(Boolean);
  const deduplicationEngine = new DeduplicationEngine(existingTexts);

  // 5. Build flat list of all slots
  const allSlots = [];
  for (const [domainName, slotCount] of slotDistribution) {
    for (let i = 0; i < slotCount; i++) {
      allSlots.push({ domainName });
    }
  }

  let count = 0;
  let skipped = 0;
  const allAcceptedQuestions = [];

  // 6. Process slots in parallel batches of BATCH_CONCURRENCY
  for (let batchStart = 0; batchStart < allSlots.length; batchStart += BATCH_CONCURRENCY) {
    // Check for cancellation before each batch
    const jobRecord = await getJobRecord(jobId);
    if (jobRecord?.status === 'cancelled') {
      console.log(`Job ${jobId} cancelled — stopping batch generation`);
      return;
    }

    const batchSlots = allSlots.slice(batchStart, batchStart + BATCH_CONCURRENCY);

    // Resolve each slot's task statement, service, and scenario type before parallel execution
    // (selectSlot mutates coverageState, so we do it sequentially here)
    const resolvedSlots = batchSlots.map(rawSlot => {
      const selected = selectSlot(rawSlot.domainName, examGuide, coverageState);
      return { ...rawSlot, ...selected };
    });

    // Generate questions in parallel
    const results = await Promise.all(
      resolvedSlots.map((slot, idx) =>
        generateOneQuestion(
          slot,
          examGuide,
          deduplicationEngine,
          coverageState,
          certId,
          certName,
          examId,
          batchStart + idx + 1,
        )
      )
    );

    // Process results sequentially to keep coverageState consistent
    for (const result of results) {
      if (result.accepted) {
        const q = result.question;
        allAcceptedQuestions.push(q);
        deduplicationEngine.addAccepted(q.text);
        updateCoverageState(coverageState, {
          task_statement_id: q.task_statement_id,
          primary_service: q.primary_service,
          scenario_type: q.scenario_type,
        }, TOTAL_SLOTS);
        count++;
        // Non-blocking progress update
        updateJobProgress(jobId, {
          questions_generated: count,
          current_domain: q.domain ?? '',
        });
      } else {
        skipped++;
        updateJobProgress(jobId, { questions_skipped: skipped });
      }
    }
  }

  // 6b. Retry skipped slots — re-attempt with fresh selections up to 2 retry rounds
  let retryRound = 0;
  const MAX_RETRY_ROUNDS = 2;
  while (skipped > 0 && retryRound < MAX_RETRY_ROUNDS && count < slotsNeeded) {
    retryRound++;
    const slotsToRetry = Math.min(skipped, slotsNeeded - count);
    console.log(`Retry round ${retryRound}: attempting ${slotsToRetry} skipped slots`);

    // Pick domains for retry slots using the same distribution logic
    const retryDistribution = computeSlotDistribution(examGuide, slotsToRetry);
    const retrySlots = [];
    for (const [domainName, slotCount] of retryDistribution) {
      for (let i = 0; i < slotCount; i++) retrySlots.push({ domainName });
    }

    let retriedCount = 0;
    for (let batchStart = 0; batchStart < retrySlots.length; batchStart += BATCH_CONCURRENCY) {
      const batchSlots = retrySlots.slice(batchStart, batchStart + BATCH_CONCURRENCY);
      const resolvedSlots = batchSlots.map(rawSlot => {
        const selected = selectSlot(rawSlot.domainName, examGuide, coverageState);
        return { ...rawSlot, ...selected };
      });

      const results = await Promise.all(
        resolvedSlots.map((slot, idx) =>
          generateOneQuestion(slot, examGuide, deduplicationEngine, coverageState, certId, certName, examId, count + batchStart + idx + 1)
        )
      );

      for (const result of results) {
        if (result.accepted) {
          const q = result.question;
          allAcceptedQuestions.push(q);
          deduplicationEngine.addAccepted(q.text);
          updateCoverageState(coverageState, { task_statement_id: q.task_statement_id, primary_service: q.primary_service, scenario_type: q.scenario_type }, TOTAL_SLOTS);
          count++;
          skipped--;
          retriedCount++;
          updateJobProgress(jobId, { questions_generated: count, questions_skipped: skipped });
        }
      }
    }
    console.log(`Retry round ${retryRound} recovered ${retriedCount} questions`);
    if (retriedCount === 0) break; // No progress, stop retrying
  }

  // 7. Run quality validation
  const report = validateExam(allAcceptedQuestions, examGuide, coverageState, deduplicationEngine, { exam_id: examId, cert_id: certId });

  // 8. Persist quality report
  await persistQualityReport(report);

  // 9. Update job to completed
  await updateJobProgress(jobId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    questions_generated: count,
    questions_skipped: skipped,
  });

  console.log(`Batch generation complete for ${examId}: ${count} accepted, ${skipped} skipped`);
};


// ── Lambda handler ────────────────────────────────────────────────────────────

export const handler = async (event) => {
  console.log("AI Factory Request:", JSON.stringify(event));

  try {
    const body = event.body ? JSON.parse(event.body) : event;
    const { mode = 'generate', certId, topic, context, count = 1, domain, question } = body;

    // ── ENRICH MODE ──────────────────────────────────────────────────────────
    if (mode === 'enrich') {
      if (!question) return { statusCode: 400, headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN }, body: JSON.stringify({ error: "question object required" }) };

      const optionsText = Object.entries(question.options || {})
        .map(([k, v]) => `${k}. ${v}`).join('\n');

      const prompt = `You are an AWS certification expert and psychometrician. Enrich the following exam question with a detailed explanation, AWS documentation links, and metadata tags.

Question: ${question.text}
Options:\n${optionsText}
Correct Answer: ${question.correct}
Domain: ${question.domain}
Certification: ${certId}

REQUIREMENTS:
1. Write a 4-6 sentence explanation: first sentence states WHY the correct answer is right with specific AWS service behavior. Then one sentence per wrong answer explaining exactly why it is incorrect. Be precise about AWS service limits, defaults, and behaviors.
2. Provide 2-3 real AWS documentation URLs (must be real docs.aws.amazon.com paths).
3. Identify the PRIMARY AWS service being tested (the main service the question is about).
4. Identify the SCENARIO TYPE from: migration, troubleshooting, cost-optimization, security, architecture-design, operational.

Return ONLY a JSON object:
{
  "explanation": "4-6 sentence explanation as described above.",
  "resources": [
    { "type": "📖 AWS Docs", "url": "https://docs.aws.amazon.com/..." },
    { "type": "📖 AWS Docs", "url": "https://docs.aws.amazon.com/..." }
  ],
  "primary_service": "The main AWS service being tested (e.g. Amazon S3, AWS Lambda)",
  "scenario_type": "one of: migration|troubleshooting|cost-optimization|security|architecture-design|operational"
}

Return ONLY the JSON object. No other text.`;

      const aiText = await invokeModel(prompt, 2000, 0.7, MODEL_HAIKU);
      const jsonStr = aiText.substring(aiText.indexOf('{'), aiText.lastIndexOf('}') + 1);
      const enriched = JSON.parse(jsonStr);

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Content-Type": "application/json" },
        body: JSON.stringify(enriched)
      };
    }

    // ── FIX MODE ─────────────────────────────────────────────────────────────
    if (mode === 'fix') {
      if (!question) return { statusCode: 400, headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN }, body: JSON.stringify({ error: "question object required" }) };

      const optionCount = Object.keys(question.options || {}).length;
      const correctField = String(question.correct || '');
      const isMultiAnswer = correctField.length > 1 && /^[A-D,\s]+$/.test(correctField);
      const hasFewOptions = optionCount < 4;

      const optionsText = Object.entries(question.options || {})
        .map(([k, v]) => `${k}. ${v}`).join('\n');

      // Build a precise issue description so the model knows exactly what to fix
      const issueDescriptions = [];
      if (hasFewOptions) issueDescriptions.push(`- Only ${optionCount} answer option(s) present — must have exactly 4 options (A, B, C, D)`);
      if (isMultiAnswer) issueDescriptions.push(`- The correct field is "${correctField}" (multi-letter) — rewrite as a single-answer question with correct: one of A|B|C|D, OR rewrite as a proper multi-select with correct as a comma-separated list like "A,C"`);
      if ((question.text || '').length < 60) issueDescriptions.push('- Question text is too short or truncated — expand to a full scenario-based question');
      if (!question.explanation || question.explanation.length < 100) issueDescriptions.push('- Explanation is missing or too short — write a 4-6 sentence explanation');
      const shortOptions = Object.entries(question.options || {}).filter(([, v]) => String(v).length < 10);
      if (shortOptions.length > 0) issueDescriptions.push(`- Options ${shortOptions.map(([k]) => k).join(', ')} are too short or truncated — complete them`);

      const prompt = `You are an AWS certification expert and psychometrician. Fix the following exam question. It has these specific issues:

${issueDescriptions.length > 0 ? issueDescriptions.join('\n') : '- General wording, grammar, or clarity issues'}

Additionally, fix ANY of the following general quality issues you find:
- Typos or spelling mistakes in the question text or any option
- Grammar errors or awkward phrasing
- Factually incorrect statements about AWS services
- Ambiguous wording that could lead to multiple valid interpretations
- Options that are obviously wrong or nonsensical (not plausible distractors)
- Inconsistent tense or voice across options

Original Question: ${question.text}
Original Options:\n${optionsText}
Correct Answer Field: ${question.correct}
Domain: ${question.domain}
Certification: ${certId}

RULES:
1. Keep the same AWS technical concept being tested
2. Fix ALL issues listed above plus any general quality issues you find
3. Always produce exactly 4 options: A, B, C, D
4. If this is a single-answer question, correct must be exactly one letter: A, B, C, or D
5. If this is a multi-select question (question text says "select TWO" or similar), correct must be comma-separated letters like "A,C"
6. Each option must be at least 15 characters and meaningfully different from the others
7. Write a 4-6 sentence explanation covering why the correct answer is right and why each wrong answer is incorrect
8. Do NOT change the AWS service or concept being tested

Return ONLY a JSON object:
{
  "text": "The complete, corrected question text",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "correct": "A or B or C or D (or comma-separated for multi-select)",
  "explanation": "4-6 sentence explanation.",
  "resources": [{ "type": "📖 AWS Docs", "url": "https://docs.aws.amazon.com/..." }]
}

Return ONLY the JSON object. No other text.`;

      const aiText = await invokeModel(prompt, 2500);
      const jsonStr = aiText.substring(aiText.indexOf('{'), aiText.lastIndexOf('}') + 1);
      const fixed = JSON.parse(jsonStr);

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Content-Type": "application/json" },
        body: JSON.stringify(fixed)
      };
    }

    // ── SCAN MODE (AI quality scan for typos, grammar, and answer verification) ─
    if (mode === 'scan') {
      if (!question) return jsonResponse(400, { error: 'question object required' });

      const optionsText = Object.entries(question.options || {})
        .map(([k, v]) => `${k}. ${v}`).join('\n');

      const prompt = `You are a strict AWS certification exam quality auditor. Your job is to find ALL issues with this question. Be thorough and critical — flag anything that could confuse a test-taker or be factually wrong.

Question: ${question.text}
Options:\n${optionsText}
Designated Correct Answer: ${question.correct}
Explanation: ${question.explanation || 'None provided'}
Domain: ${question.domain}
Certification: ${certId}

CRITICALLY CHECK ALL OF THE FOLLOWING:

1. **ANSWER VERIFICATION** (MOST IMPORTANT): Read the question carefully. Determine which option is actually correct based on current AWS documentation and best practices. If the designated correct answer "${question.correct}" is WRONG, flag it as a major issue and state which answer should be correct and why.

2. **EXPLANATION CONSISTENCY**: If the explanation mentions a different answer than "${question.correct}" as being correct, flag it. For example, if correct is "A" but explanation says "Option B is the best approach", that's a major issue.

3. **Typos and spelling mistakes** in question text or any option.

4. **Grammar errors** or awkward phrasing that makes the question hard to understand.

5. **Factual errors** about AWS services (wrong service capabilities, incorrect limits, outdated information).

6. **Ambiguous wording** where multiple options could reasonably be correct.

7. **Implausible distractors** — options that are obviously wrong and wouldn't fool anyone.

8. **Incomplete question** — doesn't end with a clear question or scenario is too vague.

Be STRICT. If you find ANY issue, report it. Do not give the benefit of the doubt.

Return ONLY a JSON object:
{
  "hasIssues": true or false,
  "issues": ["specific issue 1", "specific issue 2"],
  "severity": "none" | "minor" | "major",
  "correctAnswer": "The letter (A/B/C/D) that is actually correct based on AWS docs, or null if designated answer is correct",
  "answerMismatch": true or false
}

Return ONLY the JSON object. No other text.`;

      const aiText = await invokeModel(prompt, 800, 0.2, MODEL_SONNET);
      const jsonStr = aiText.substring(aiText.indexOf('{'), aiText.lastIndexOf('}') + 1);
      const scanResult = JSON.parse(jsonStr);

      return jsonResponse(200, scanResult);
    }


    // ── BATCH MODE ────────────────────────────────────────────────────────────
    if (mode === 'batch') {
      const { examId, force = false } = body;
      if (!certId || !BLUEPRINTS[certId]) {
        return jsonResponse(400, { error: 'Valid certId is required' });
      }
      if (!examId) {
        return jsonResponse(400, { error: 'examId is required' });
      }

      // Check for existing questions
      if (!force) {
        const existing = await queryExamQuestions(certId, examId);
        if (existing.length > 0) {
          return jsonResponse(409, {
            error: 'Exam already has questions. Use force=true or regenerate mode to overwrite.',
            existingCount: existing.length,
          });
        }
      }

      // Create job record
      const jobId = await createJob(certId, examId);

      // Invoke self asynchronously (InvocationType: 'Event')
      await lambdaClient.send(new InvokeCommand({
        FunctionName: FUNCTION_NAME,
        InvocationType: 'Event',
        Payload: JSON.stringify({ mode: 'batch-run', certId, examId, jobId }),
      }));

      return jsonResponse(200, { jobId, status: 'in_progress', message: 'Batch generation started' });
    }

    // ── BATCH-RUN MODE (internal async) ──────────────────────────────────────
    if (mode === 'batch-run') {
      const { examId, jobId } = body;
      try {
        const examGuide = await getExamGuide(certId);
        await runBatchGeneration(certId, examId, jobId, examGuide);
      } catch (err) {
        console.error(`batch-run error for job ${jobId}:`, err);
        await updateJobProgress(jobId, {
          status: 'failed',
          error: err.message ?? String(err),
          completed_at: new Date().toISOString(),
        });
      }
      return jsonResponse(200, { message: 'batch-run complete' });
    }

    // ── REGENERATE MODE ───────────────────────────────────────────────────────
    if (mode === 'regenerate') {
      const { examId } = body;
      if (!certId || !BLUEPRINTS[certId]) {
        return jsonResponse(400, { error: 'Valid certId is required' });
      }
      if (!examId) {
        return jsonResponse(400, { error: 'examId is required' });
      }

      // Delete existing questions
      await deleteExamQuestions(certId, examId);

      // Create job record
      const jobId = await createJob(certId, examId);

      // Invoke self asynchronously
      await lambdaClient.send(new InvokeCommand({
        FunctionName: FUNCTION_NAME,
        InvocationType: 'Event',
        Payload: JSON.stringify({ mode: 'batch-run', certId, examId, jobId }),
      }));

      return jsonResponse(200, { jobId, status: 'in_progress', message: 'Regeneration started' });
    }

    // ── JOB-STATUS MODE ───────────────────────────────────────────────────────
    if (mode === 'job-status') {
      const { jobId } = body;
      if (!jobId) return jsonResponse(400, { error: 'jobId is required' });

      const record = await getJobRecord(jobId);
      if (!record) return jsonResponse(404, { error: `Job ${jobId} not found` });

      return jsonResponse(200, record);
    }

    // ── CANCEL-JOB MODE ───────────────────────────────────────────────────────
    if (mode === 'cancel-job') {
      const { jobId } = body;
      if (!jobId) return jsonResponse(400, { error: 'jobId is required' });

      await cancelJobRecord(jobId);
      return jsonResponse(200, { message: 'Job cancelled' });
    }

    // ── TRIM MODE — reduce exam to exactly 65 questions ───────────────────────
    if (mode === 'trim') {
      const { examId } = body;
      if (!certId) return jsonResponse(400, { error: 'certId is required' });
      if (!examId) return jsonResponse(400, { error: 'examId is required' });

      const questions = await queryExamQuestions(certId, examId);
      if (questions.length <= TOTAL_SLOTS) {
        return jsonResponse(200, { message: `Exam has ${questions.length} questions — no trimming needed`, count: questions.length });
      }

      // Sort by generated_at (newest first) and keep the first 65, delete the rest
      const sorted = questions.sort((a, b) => (a.generated_at ?? '').localeCompare(b.generated_at ?? ''));
      const toKeep = sorted.slice(0, TOTAL_SLOTS);
      const toDelete = sorted.slice(TOTAL_SLOTS);

      // Batch-delete excess questions
      for (let i = 0; i < toDelete.length; i += 25) {
        const chunk = toDelete.slice(i, i + 25);
        await docClient.send(new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: chunk.map(item => ({
              DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
            })),
          },
        }));
      }

      return jsonResponse(200, {
        message: `Trimmed exam from ${questions.length} to ${TOTAL_SLOTS} questions`,
        deleted: toDelete.length,
        remaining: TOTAL_SLOTS,
      });
    }

    // ── QUALITY-REPORT MODE ───────────────────────────────────────────────────
    if (mode === 'quality-report') {
      const { examId } = body;
      if (!examId) return jsonResponse(400, { error: 'examId is required' });

      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `QUALITY#${examId}`, SK: 'REPORT' },
      }));

      if (!result.Item) return jsonResponse(404, { error: `Quality report for exam ${examId} not found` });

      return jsonResponse(200, result.Item);
    }

    // ── PARSE-GUIDE MODE ──────────────────────────────────────────────────────
    if (mode === 'parse-guide') {
      if (!certId) return jsonResponse(400, { error: 'certId is required' });

      const guide = await getExamGuide(certId);

      const inScopeServices = guide.in_scope_services ?? [];
      const outOfScopeServices = guide.out_of_scope_services ?? [];
      const taskStatementCount = (guide.domains ?? []).reduce(
        (sum, d) => sum + (d.task_statements ?? []).length, 0
      );

      return jsonResponse(200, {
        certId,
        domainCount: (guide.domains ?? []).length,
        taskStatementCount,
        inScopeServiceCount: inScopeServices.length,
        outOfScopeServiceCount: outOfScopeServices.length,
        domains: (guide.domains ?? []).map(d => ({
          name: d.name,
          weight: d.weight,
          taskStatementCount: (d.task_statements ?? []).length,
        })),
      });
    }


    // ── GENERATE MODE (default) ───────────────────────────────────────────────
    if (!certId || !BLUEPRINTS[certId]) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
        body: JSON.stringify({ error: "Valid certId is required" })
      };
    }

    const blueprint = BLUEPRINTS[certId];
    const targetDomain = domain || blueprint.domains[Math.floor(Math.random() * blueprint.domains.length)].name;

    const generatePrompt = `You are an elite AWS Certification Psychometrician specializing in ${blueprint.name} (${certId}).
Generate ${count} high-fidelity exam question(s) for domain: ${targetDomain}.
${topic ? `Focus topic: ${topic}` : ''}
${context ? `Context: ${context}` : ''}

Return ONLY a JSON array of question objects:
[{
  "q_id": "unique_id",
  "cert_id": "${certId}",
  "type": "QUESTION",
  "domain": "${targetDomain}",
  "text": "scenario-based question",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "correct": "A|B|C|D",
  "explanation": "Detailed explanation of correct and incorrect answers.",
  "resources": [{ "type": "📖 AWS Docs", "url": "https://docs.aws.amazon.com/..." }]
}]`;

    const aiText = await invokeModel(generatePrompt);
    const questions = JSON.parse(aiText.substring(aiText.indexOf('['), aiText.lastIndexOf(']') + 1));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Content-Type": "application/json" },
      body: JSON.stringify({ questions })
    };

  } catch (error) {
    console.error("AI Generation Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
      body: JSON.stringify({ error: "Failed to generate content", details: error.message })
    };
  }
};
