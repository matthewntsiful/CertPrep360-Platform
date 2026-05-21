# Technical Design Document

## Overview


This document describes the technical design for the exam-guide-driven generation system. The redesign replaces the current single-prompt Lambda with a multi-stage pipeline that parses official AWS exam guide PDFs, enforces topic and service diversity, deduplicates candidates before storage, tracks coverage, and exposes an admin regeneration workflow with real-time progress.

The implementation touches three areas:
- **Backend**: `backend/lambdas/ai-generate-content/index.js` — extended with new modes and helper modules
- **Backend**: New `backend/lambdas/common/` modules for parsing, deduplication, coverage, and validation
- **Frontend**: `website/src/pages/AdminAIFactory.tsx` — new "Regenerate" mode with progress polling

---

## Components and Interfaces

The system is composed of six new modules in `backend/lambdas/common/` plus extensions to the existing `ai-generate-content` Lambda and `AdminAIFactory.tsx` frontend page. Each module has a clearly defined interface described in the Component Design section below.

## Data Models

All new DynamoDB items use the existing `CertPrep360-Dev-Main` single-table. Three new item types are introduced:

**Exam Guide Cache** (`PK=EXAM_GUIDE#<cert_id>`, `SK=METADATA`) — stores parsed domain/task/service data with 30-day TTL.

**Generation Job Record** (`PK=JOB#<job_id>`, `SK=METADATA`) — tracks batch generation progress with fields: `job_id`, `cert_id`, `exam_id`, `status`, `questions_generated`, `questions_skipped`, `current_domain`, `started_at`, `completed_at`, `error`.

**Quality Report** (`PK=QUALITY#<exam_id>`, `SK=REPORT`) — stores post-generation validation results: `result` (PASS/WARN/FAIL), `domain_balance_score`, `service_diversity_score`, `duplicate_rate`, `warnings`, `failures`, `domain_breakdown`, `service_breakdown`, `uncovered_services`, `uncovered_task_statements`.

Full schemas are detailed in the DynamoDB Data Model section below.

## Error Handling

- **PDF parse failure**: `getExamGuide` throws a structured error `{ certId, reason }` and the Lambda returns 422 with the error details. Generation does not proceed.
- **Bedrock throttling**: Retried with exponential backoff (1s, 2s, 4s) up to 3 attempts per slot. On exhaustion the slot is skipped and `questions_skipped` is incremented.
- **Out-of-scope violation**: Slot retried up to 3 times with a different random seed. On exhaustion the slot is skipped.
- **Deduplication rejection**: Slot retried up to 3 times. On exhaustion the slot is skipped.
- **Job cancellation**: The orchestration loop checks `isCancelled(jobId)` before each parallel batch. If cancelled, remaining slots are abandoned and the job record is updated to `cancelled`.
- **Lambda timeout**: If the Lambda approaches its 15-minute timeout, the job record is updated to `failed` with reason `timeout` via a `context.getRemainingTimeInMillis()` guard.

## Correctness Properties

### Property 1: Deduplication Symmetry
`cosineSimilarity(A, B) === cosineSimilarity(B, A)` — symmetry enforced by the commutative dot product formula in the DeduplicationEngine.
**Validates: Requirements 3.6**

### Property 2: Slot Distribution Completeness
`sum(round(65 × weight_i)) === 65` — slot distribution always sums to exactly 65, enforced by assigning the rounding remainder to the highest-weight domain.
**Validates: Requirements 5.2**

### Property 3: Service Concentration Limit
No single service exceeds 15% of total questions in a generated exam — enforced by the `saturatedServices` set in `CoverageState` which blocks further selection of that service.
**Validates: Requirements 4.3**

### Property 4: Coverage Namespace Isolation
Coverage state is namespaced by `cert_id + exam_id` — DynamoDB key structure prevents cross-exam contamination.
**Validates: Requirements 8.4**

## Testing Strategy

- **Unit tests** for `parseDomains`, `parseServices` (using SAA-C03 PDF text fixture), `cosineSimilarity` (symmetry + known values), `computeSlotDistribution` (sum === 65), `selectSlot` (least-covered selection).
- **Integration test**: Run `parse-guide` mode for SAA-C03 and verify the cache item is written to DynamoDB with expected domain count.
- **End-to-end smoke test**: Generate 5 questions for SAA-C03 in batch mode and verify: no duplicates, all questions reference in-scope services, job record reaches `completed` status.

## Architecture

```
Admin UI (AdminAIFactory.tsx)
        │
        │  POST /ai-generate  { mode: 'batch' | 'regenerate' | 'job-status' | ... }
        ▼
API Gateway → ai-generate-content Lambda
        │
        ├── ExamGuideParser  ──→  S3 (exam guide PDFs)
        │        └──→  DynamoDB (Exam_Guide_Cache)
        │
        ├── DiversityEnforcer  (in-memory, reads Coverage state)
        │
        ├── Bedrock (Claude Sonnet)  ←── enriched prompt
        │
        ├── DeduplicationEngine  (TF-IDF cosine, in-memory batch pool)
        │
        ├── CoverageTracker  (in-memory during batch, persisted to DynamoDB)
        │
        ├── DynamoDB  (question storage, job records, quality reports)
        │
        └── QualityValidator  (post-batch, writes report to DynamoDB)
```

The Lambda runs as a single function with multiple modes dispatched by the `mode` field in the request body. Long-running batch jobs (65 questions) are handled by increasing the Lambda timeout to 15 minutes. The frontend polls a job-status endpoint every 5 seconds.

---

## DynamoDB Data Model

The existing single-table design (`CertPrep360-Dev-Main`) is extended with three new item types.

### Exam Guide Cache

```
PK: EXAM_GUIDE#<cert_id>          e.g. EXAM_GUIDE#SAA-C03
SK: METADATA
Attributes:
  cert_id:        string
  parsed_at:      ISO timestamp
  domains: [
    {
      name:    string,
      weight:  number,           // 0.0–1.0
      task_statements: [
        {
          id:       string,      // e.g. "1.1"
          text:     string,
          services: string[]     // in-scope services for this task
        }
      ]
    }
  ]
  in_scope_services:   string[]
  out_of_scope_services: string[]
  ttl: number                    // Unix epoch, 30-day cache
```

### Generation Job Record

```
PK: JOB#<job_id>
SK: METADATA
Attributes:
  job_id:              string    // uuid
  cert_id:             string
  exam_id:             string
  status:              'in_progress' | 'completed' | 'failed' | 'cancelled'
  questions_generated: number
  questions_skipped:   number
  current_domain:      string
  started_at:          ISO timestamp
  completed_at:        ISO timestamp | null
  error:               string | null
  ttl:                 number    // 7-day TTL
```

### Quality Report

```
PK: QUALITY#<exam_id>
SK: REPORT
Attributes:
  exam_id:               string
  cert_id:               string
  generated_at:          ISO timestamp
  result:                'PASS' | 'WARN' | 'FAIL'
  domain_balance_score:  number   // sum of abs deviations
  service_diversity_score: number // distinct services covered / total in-scope
  duplicate_rate:        number   // fraction of pairs with similarity > 0.70
  warnings: string[]
  failures: string[]
  domain_breakdown: [{ domain: string, actual_pct: number, target_pct: number }]
  service_breakdown: [{ service: string, count: number, pct: number }]
  uncovered_services: string[]
  uncovered_task_statements: string[]
```

---

## Component Design

### 1. ExamGuideParser (`common/examGuideParser.js`)

The exam guide PDFs are stored in `CertPrep360-ExamGuide/` in the project. They must be uploaded to an S3 bucket accessible by the Lambda. The parser uses the `pdf-parse` npm package (added to `backend/lambdas/package.json`) to extract text, then applies regex patterns to identify domain sections, task statements, and service lists.

**PDF-to-S3 upload**: A one-time script (`scripts/upload-exam-guides.sh`) uploads all PDFs to `s3://certprep360-dev-assets/exam-guides/<cert_id>.pdf`.

**Parsing strategy**:
```
1. Download PDF from S3 into Lambda /tmp
2. Extract raw text with pdf-parse
3. Split text into sections by domain headers (regex: /Domain \d+:/)
4. Within each domain section, extract task statements (regex: /Task Statement \d+\.\d+:/)
5. Extract in-scope services from "Services and features" appendix section
6. Extract out-of-scope services from "Out-of-scope" section
7. Return structured ExamGuideData object
8. Write to DynamoDB cache with 30-day TTL
```

**Cert-to-PDF mapping** (config object in `examGuideParser.js`):
```js
const GUIDE_MAP = {
  'SAA-C03': 'exam-guides/saa-c03.pdf',
  'CLF-C02': 'exam-guides/clf-c02.pdf',
  'AIF-C01': 'exam-guides/aif-c01.pdf',
  'DVA-C02': 'exam-guides/dva-c02.pdf',
  'COE-C01': 'exam-guides/coe-c01.pdf',
  'MLE-C01': 'exam-guides/mle-c01.pdf',
  // ... all 12 certs
};
```

**Interface**:
```js
async function parseExamGuide(certId)
  → { domains, inScopeServices, outOfScopeServices }

async function getExamGuide(certId)
  → cached result from DynamoDB, or calls parseExamGuide if cache miss
```

---

### 2. DiversityEnforcer (`common/diversityEnforcer.js`)

Operates on an in-memory `CoverageState` object that is built at the start of each batch and updated as questions are accepted.

```js
// CoverageState shape
{
  taskStatementCounts: Map<taskStatementId, number>,
  serviceCounts:       Map<serviceName, number>,
  scenarioTypeCounts:  Map<scenarioType, number>,
  saturatedServices:   Set<serviceName>,   // services at 15% limit
  totalQuestions:      number
}

function buildCoverageState(existingQuestions, examGuide)
  → CoverageState

function selectSlot(domain, examGuide, coverageState)
  → { taskStatement, service, scenarioType }
  // Picks least-covered task statement in domain
  // Picks least-covered non-saturated service for that task statement
  // Picks least-used scenario type globally

function updateCoverageState(coverageState, acceptedQuestion, slot)
  → void  // mutates in place, marks service saturated if at 15% limit
```

**Scenario types** cycle in order: `migration`, `troubleshooting`, `cost-optimization`, `security`, `architecture-design`, `operational`.

---

### 3. Bedrock Prompt Template

The redesigned prompt injects task statement, service, scenario type, and out-of-scope constraints:

```
You are an AWS Certification Psychometrician creating questions for the ${certName} (${certId}) exam.

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
}
```

Temperature is set to **0.95** for all batch generation calls.

---

### 4. DeduplicationEngine (`common/deduplicationEngine.js`)

Uses TF-IDF cosine similarity — no external API calls, runs entirely in Lambda memory.

```js
function tokenize(text)
  → string[]  // lowercase, remove stopwords, stem with simple suffix rules

function buildTfIdf(corpus)
  → { tfidfVectors: Map<docId, Map<term, score>>, idf: Map<term, score> }

function cosineSimilarity(vecA, vecB)
  → number  // [0, 1]

function checkDuplicate(candidateText, existingTexts, batchTexts, threshold = 0.70)
  → { isDuplicate: boolean, similarTo: string | null, score: number }
```

The engine is initialized once per batch with all existing question texts for the exam. As questions are accepted into the batch, their texts are added to `batchTexts` so intra-batch duplicates are also caught.

---

### 5. CoverageTracker (`common/coverageTracker.js`)

```js
function buildInitialCoverage(existingQuestions, examGuide)
  → CoverageState

function recordAcceptedQuestion(coverageState, question, slot, totalSlots)
  → void  // updates counts, marks saturated services

function buildCoverageReport(coverageState, examGuide, examId, certId)
  → CoverageReport  // matches DynamoDB Quality Report schema

async function persistCoverageReport(report)
  → void  // writes to DynamoDB PK=QUALITY#examId SK=REPORT
```

---

### 6. Generation Orchestrator — Batch Mode

The `batch` mode in the Lambda handler orchestrates the full 65-question generation:

```
1. Validate certId, examId, check for existing questions (409 if exists and !force)
2. Create job record in DynamoDB (status: in_progress)
3. Load exam guide (cache or parse)
4. Load existing questions for exam (for dedup initialization)
5. Build CoverageState from existing questions
6. Compute slot distribution: for each domain, round(65 × weight) slots
7. Initialize DeduplicationEngine with existing question texts
8. For each slot (processed in parallel batches of 5):
   a. DiversityEnforcer.selectSlot(domain, examGuide, coverageState)
   b. Call Bedrock with enriched prompt (temperature 0.95)
   c. Parse response JSON
   d. Check out-of-scope service violation → retry up to 3x
   e. DeduplicationEngine.checkDuplicate → retry up to 3x
   f. If accepted: write question to DynamoDB immediately
   g. Update CoverageState, add text to dedup engine batch pool
   h. Update job record (questions_generated++, current_domain)
9. Run QualityValidator on completed exam
10. Persist quality report to DynamoDB
11. Update job record (status: completed, completed_at)
```

**Job record updates** happen via a non-blocking `updateJobProgress()` call after each accepted question, so the frontend polling sees live progress.

---

### 7. QualityValidator (`common/qualityValidator.js`)

```js
function validateExam(questions, examGuide, coverageState)
  → QualityReport

// Computes:
// - domain_balance_score: sum(|actual_pct - target_pct|) for each domain
// - service_diversity_score: distinct services covered / total in-scope services
// - duplicate_rate: pairs with similarity > 0.70 / total pairs (sampled for large exams)
// - warnings: service > 10%, task statements with 0 questions
// - failures: balance > 0.05, diversity < 0.40, duplicate_rate > 0.02
// - result: PASS | WARN | FAIL
```

---

### 8. Lambda Handler — New Modes

The existing `mode` dispatch is extended:

| mode | description |
|------|-------------|
| `generate` | existing single-question generation (unchanged) |
| `enrich` | existing enrichment (unchanged) |
| `fix` | existing fix (unchanged) |
| `batch` | new: generate full 65-question exam with diversity + dedup |
| `regenerate` | new: delete existing exam questions, then run `batch` |
| `job-status` | new: return current job record by job_id |
| `cancel-job` | new: set job status to cancelled |
| `quality-report` | new: return quality report for an exam_id |
| `parse-guide` | new: trigger exam guide parsing and cache it |

**New request shape for `batch`/`regenerate`**:
```json
{
  "mode": "batch",
  "certId": "SAA-C03",
  "examId": "SAA-C03-EXAM-17",
  "force": false
}
```

**Response for `batch`/`regenerate`** (returns immediately, job runs async via Lambda invoke):
```json
{
  "jobId": "uuid",
  "status": "in_progress",
  "message": "Batch generation started"
}
```

Since Lambda has a 15-minute timeout and 65 questions × ~3s per Bedrock call = ~3.5 minutes, the batch fits within a single Lambda invocation. The Lambda is invoked asynchronously (`InvocationType: Event`) by the API call, and the frontend polls `job-status`.

---

### 9. Admin UI Changes (`AdminAIFactory.tsx`)

A new **"Regenerate"** mode card is added alongside the existing four modes.

**New state**:
```ts
const [jobId, setJobId] = useState<string | null>(null);
const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
const [confirmDelete, setConfirmDelete] = useState(false);
```

**Polling logic**:
```ts
useEffect(() => {
  if (!jobId || jobStatus?.status === 'completed' || jobStatus?.status === 'failed') return;
  const interval = setInterval(async () => {
    const status = await adminService.getJobStatus(jobId);
    setJobStatus(status);
    if (status.status === 'completed') {
      const report = await adminService.getQualityReport(examId);
      setQualityReport(report);
    }
  }, 5000);
  return () => clearInterval(interval);
}, [jobId, jobStatus?.status]);
```

**Regenerate flow UI**:
1. Select cert + exam from dropdowns
2. Click "Regenerate Exam" → show confirmation modal ("This will delete all X existing questions")
3. Confirm → call `POST /ai-generate { mode: 'regenerate', certId, examId, force: true }`
4. Show live progress bar polling job-status every 5s:
   - Questions generated: X / 65
   - Questions skipped: Y
   - Current domain: "Design Secure Architectures"
   - Estimated completion: ~Xm remaining
5. On completion: show Quality Report card (PASS/WARN/FAIL with metrics)
6. If PASS or WARN: "Publish Exam" button becomes active
7. If FAIL: "Publish Exam" is disabled, show specific failures

**Quality Report card** displays:
- Overall result badge (green PASS / yellow WARN / red FAIL)
- Domain balance bar chart (actual vs target %)
- Service diversity score (e.g. "47% of in-scope services covered")
- Duplicate rate (e.g. "0.3% duplicate pairs")
- List of uncovered services (if any)
- List of warnings (if any)

---

### 10. New API Service Methods (`adminService.ts`)

```ts
startBatchGeneration(certId: string, examId: string, force?: boolean): Promise<{ jobId: string }>
startRegeneration(certId: string, examId: string): Promise<{ jobId: string }>
getJobStatus(jobId: string): Promise<JobStatus>
cancelJob(jobId: string): Promise<void>
getQualityReport(examId: string): Promise<QualityReport>
parseExamGuide(certId: string): Promise<void>
```

---

### 11. S3 Bucket for Exam Guides

Exam guide PDFs are uploaded to the existing `aws-exams-dev.matthewntsiful.com` bucket under the prefix `exam-guides/` (or a dedicated `certprep360-dev-assets` bucket if preferred). The Lambda execution role already has S3 read access.

**Upload script** (`scripts/upload-exam-guides.sh`):
```bash
for file in CertPrep360-ExamGuide/*.pdf; do
  cert_id=$(basename "$file" | sed 's/#.*//' | sed 's/-[0-9]*\.pdf//' | tr '[:lower:]' '[:upper:]')
  aws s3 cp "$file" "s3://certprep360-dev-assets/exam-guides/${cert_id}.pdf" --profile Matthew_Cli
done
```

---

### 12. New npm Dependencies

Added to `backend/lambdas/package.json`:
- `pdf-parse` — PDF text extraction (no native binaries, pure JS)
- `uuid` — job ID generation (already available via AWS SDK transitive deps, but explicit is cleaner)

No new frontend dependencies are needed.

---

## File Change Summary

| File | Change |
|------|--------|
| `backend/lambdas/ai-generate-content/index.js` | Add batch/regenerate/job-status/cancel/quality-report/parse-guide modes; refactor generate prompt |
| `backend/lambdas/common/examGuideParser.js` | New: PDF parsing + DynamoDB cache |
| `backend/lambdas/common/diversityEnforcer.js` | New: slot selection logic |
| `backend/lambdas/common/deduplicationEngine.js` | New: TF-IDF cosine similarity |
| `backend/lambdas/common/coverageTracker.js` | New: coverage state management |
| `backend/lambdas/common/qualityValidator.js` | New: post-batch quality metrics |
| `backend/lambdas/package.json` | Add pdf-parse dependency |
| `website/src/pages/AdminAIFactory.tsx` | Add Regenerate mode, progress polling, quality report display |
| `website/src/services/adminService.ts` | Add new API methods |
| `scripts/upload-exam-guides.sh` | New: one-time PDF upload script |
