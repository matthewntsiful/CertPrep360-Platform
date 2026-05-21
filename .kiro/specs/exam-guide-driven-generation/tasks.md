# Implementation Plan: Exam Guide-Driven AI Question Generation

## Overview

9 tasks implementing the full exam-guide-driven generation pipeline: PDF parsing, diversity enforcement, semantic deduplication, coverage tracking, quality validation, Lambda redesign, admin UI regeneration workflow, and deployment.

## Tasks

- [x] 1. Upload exam guide PDFs to S3 and add pdf-parse dependency
  - Create `scripts/upload-exam-guides.sh` that iterates `CertPrep360-ExamGuide/` and uploads each PDF to `s3://certprep360-dev-assets/exam-guides/<CERT_ID>.pdf` using the Matthew_Cli profile
  - Run the upload script and verify all 12 PDFs are accessible in S3
  - Add `pdf-parse` to `backend/lambdas/package.json` dependencies
  - Run `npm install` in `backend/lambdas/` to update `package-lock.json`
  - Verify the Lambda execution role has `s3:GetObject` permission on the bucket
  - **Requirements**: 1.1, 1.2, 1.6, 8.1

- [x] 2. Implement ExamGuideParser module
  - Create `backend/lambdas/common/examGuideParser.js` with `GUIDE_MAP` config mapping all 12 cert IDs to S3 PDF paths
  - Implement `downloadPdf(certId)` — downloads PDF from S3 to Lambda `/tmp/<certId>.pdf`
  - Implement `extractText(pdfPath)` — uses `pdf-parse` to extract raw text
  - Implement `parseDomains(text)` — regex extraction of domain names, weights, and task statements
  - Implement `parseServices(text)` — regex extraction of in-scope and out-of-scope service lists
  - Implement `cacheGuide(certId, guideData)` — writes to DynamoDB `PK=EXAM_GUIDE#<certId> SK=METADATA` with 30-day TTL
  - Implement `getCachedGuide(certId)` — reads from DynamoDB cache, returns null on miss
  - Implement `getExamGuide(certId)` — checks cache first, falls back to parse+cache, throws structured error if PDF not found
  - Write unit tests for `parseDomains` and `parseServices` using SAA-C03 PDF text as fixture
  - **Requirements**: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.1, 8.3

- [x] 3. Implement DeduplicationEngine module
  - Create `backend/lambdas/common/deduplicationEngine.js`
  - Implement `tokenize(text)` — lowercase, remove punctuation, remove stopwords, return token array
  - Implement `computeTf(tokens)` — returns `Map<term, frequency>` normalized by document length
  - Implement `computeIdf(corpus)` — returns `Map<term, idf_score>` where `idf = log(N / df + 1)`
  - Implement `computeTfIdf(tokens, idf)` — returns `Map<term, tfidf_score>`
  - Implement `cosineSimilarity(vecA, vecB)` — dot product divided by product of magnitudes, returns [0,1]
  - Implement `DeduplicationEngine` class: `constructor(existingTexts)`, `checkDuplicate(candidateText, threshold)`, `addAccepted(text)`
  - Verify symmetry property: `similarity(A,B) === similarity(B,A)` in a test
  - **Requirements**: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

- [x] 4. Implement DiversityEnforcer module
  - Create `backend/lambdas/common/diversityEnforcer.js`
  - Define `SCENARIO_TYPES` array: `['migration', 'troubleshooting', 'cost-optimization', 'security', 'architecture-design', 'operational']`
  - Implement `buildCoverageState(existingQuestions, examGuide)` — initializes counts from existing questions
  - Implement `selectTaskStatement(domain, examGuide, coverageState)` — least-covered task statement, random tiebreak
  - Implement `selectService(taskStatement, coverageState)` — least-covered non-saturated service, random tiebreak
  - Implement `selectScenarioType(coverageState)` — least-used scenario type globally
  - Implement `selectSlot(domain, examGuide, coverageState)` — composes the three selectors
  - Implement `updateCoverageState(coverageState, slot, totalSlots)` — increments counts, marks saturated at 15%
  - Implement `computeSlotDistribution(examGuide, totalSlots)` — `round(totalSlots × weight)` with remainder to highest-weight domain
  - **Requirements**: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3

- [x] 5. Implement CoverageTracker module
  - Create `backend/lambdas/common/coverageTracker.js`
  - Implement `buildCoverageReport(coverageState, examGuide, examId, certId)` — computes all Quality Report fields
  - Implement `persistCoverageReport(report)` — writes to DynamoDB `PK=QUALITY#<examId> SK=REPORT`
  - Implement `getCoverageReport(examId)` — reads from DynamoDB
  - **Requirements**: 4.1, 4.2, 4.3, 4.4, 4.5

- [x] 6. Implement QualityValidator module
  - Create `backend/lambdas/common/qualityValidator.js`
  - Implement `computeDomainBalance(questions, examGuide)` — returns `{ score, breakdown }` (sum of absolute deviations)
  - Implement `computeServiceDiversity(coverageState, examGuide)` — returns `{ score, uncoveredServices }`
  - Implement `computeDuplicateRate(questions, deduplicationEngine)` — samples up to 500 pairs, returns fraction > 0.70
  - Implement `validateExam(questions, examGuide, coverageState, deduplicationEngine)` — applies FAIL/WARN/PASS thresholds, returns QualityReport
  - Implement `persistQualityReport(report)` — delegates to coverageTracker
  - **Requirements**: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6

- [x] 7. Redesign ai-generate-content Lambda with batch and regenerate modes
  - Add imports for all new common modules in `ai-generate-content/index.js`
  - Implement `createJob(certId, examId)` — writes job record to DynamoDB, returns `jobId`
  - Implement `updateJobProgress(jobId, updates)` — non-blocking DynamoDB UpdateItem
  - Implement `getJobRecord(jobId)` — reads job record from DynamoDB
  - Implement `cancelJobRecord(jobId)` — sets status to `cancelled`
  - Implement `deleteExamQuestions(certId, examId)` — queries and batch-deletes all questions for the exam
  - Implement redesigned `buildGeneratePrompt(certId, certName, domain, taskStatement, service, scenarioType, outOfScopeServices)` using the new prompt template (temperature 0.95)
  - Implement `checkOutOfScope(questionText, outOfScopeServices)` — returns true if primary service is out-of-scope
  - Implement `generateOneQuestion(slot, examGuide, deduplicationEngine, coverageState, certId, examId, questionNumber)` — single slot with up to 3 retries for out-of-scope and dedup failures
  - Implement `runBatchGeneration(certId, examId, jobId, force)` — main orchestration loop with parallel batches of 5, immediate DynamoDB writes, job progress updates, quality validation
  - Add `batch` mode handler: validate inputs, 409 if exists and !force, create job, invoke `runBatchGeneration` asynchronously, return `{ jobId }`
  - Add `regenerate` mode handler: call `deleteExamQuestions`, then run batch with `force: true`
  - Add `job-status` mode handler: return job record by `jobId`
  - Add `cancel-job` mode handler: call `cancelJobRecord`
  - Add `quality-report` mode handler: return quality report by `examId`
  - Add `parse-guide` mode handler: call `getExamGuide(certId)`, return summary
  - Update Lambda timeout to 15 minutes and memory to 1024 MB in infrastructure config
  - **Requirements**: 2.1–2.8, 3.1–3.6, 4.1–4.5, 5.1–5.6, 6.1–6.6, 7.1–7.6, 8.1–8.5

- [x] 8. Add admin UI Regenerate mode with progress polling and quality report
  - Add `startBatchGeneration`, `startRegeneration`, `getJobStatus`, `cancelJob`, `getQualityReport`, `parseExamGuide` methods to `website/src/services/adminService.ts`
  - Add TypeScript interfaces `JobStatus` and `QualityReport` to `website/src/types/exam.ts`
  - Add "Regenerate" mode card to the mode selector grid in `AdminAIFactory.tsx` (`RotateCcw` icon, label "Regenerate", desc "Delete & rebuild from exam guide")
  - Add `jobId`, `jobStatus`, `qualityReport`, `confirmDelete` state variables
  - Implement `handleRegenerate()` — shows confirmation modal, calls `startRegeneration`, sets `jobId`
  - Implement 5-second polling `useEffect` that calls `getJobStatus(jobId)` and updates `jobStatus`; on completion fetches quality report
  - Implement confirmation modal (two-step: "Delete X questions?" → confirm button)
  - Implement live progress display: progress bar (generated/65), current domain label, skipped counter, Cancel button
  - Implement `QualityReportCard` component: PASS/WARN/FAIL badge, domain balance table, service diversity score, duplicate rate, uncovered services list, warnings/failures lists
  - Wire "Publish Exam" button: disabled if `qualityReport.result === 'FAIL'`; for WARN show acknowledgment checkbox
  - Add "Parse Guide" utility button that calls `parseExamGuide(selectedCert)` and shows extracted task statement count
  - **Requirements**: 6.1–6.6, 7.1–7.6

- [ ] 9. Deploy Lambda and frontend, regenerate SAA-C03 exams 17 and 18
  - Run `scripts/upload-exam-guides.sh` to upload all PDFs to S3
  - Run `npm install` in `backend/lambdas/` to install `pdf-parse`
  - Update Lambda timeout (15 min) and memory (1024 MB) in infrastructure config
  - Deploy the updated `ai-generate-content` Lambda using `scripts/deploy-lambdas.sh`
  - Test `parse-guide` mode for SAA-C03 via admin UI or direct API call
  - Test a 5-question batch generation for SAA-C03 to verify the pipeline end-to-end
  - Build frontend: `npm run build` in `website/`
  - Sync frontend to S3 and invalidate CloudFront distribution `E3BJ1TGWKI1MXR`
  - Trigger regeneration of SAA-C03-EXAM-17 and SAA-C03-EXAM-18 via admin UI
  - Verify quality reports for both exams show PASS or WARN (not FAIL)
  - Commit all changes to the `develop` branch
  - **Requirements**: all

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3", "4", "5", "6"] },
    { "wave": 4, "tasks": ["7", "8"] },
    { "wave": 5, "tasks": ["9"] }
  ]
}
```

Tasks 3, 4, 5, 6 can be implemented in parallel after Task 2 completes. Task 7 depends on all of 2–6. Task 8 can be developed in parallel with Task 7 (mock API responses). Task 9 requires both 7 and 8.

## Notes

- The `pdf-parse` package is pure JavaScript with no native binaries, making it safe for Lambda deployment.
- Lambda self-invocation (async invoke) is used for batch generation to avoid API Gateway's 29-second timeout. The frontend polls `job-status` every 5 seconds.
- The SAA-C03 exam guide PDF filename in the project has an unusual `#` character in the name (`solutions-architect-associate-03.pdf#saa-03-out-of-scope-services.pdf`). The upload script must handle this by stripping the `#` suffix when naming the S3 object.
- Existing `generate`, `enrich`, and `fix` modes in the Lambda are unchanged — this is purely additive.
