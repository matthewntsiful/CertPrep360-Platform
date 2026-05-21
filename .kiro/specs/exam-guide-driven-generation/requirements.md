# Requirements Document

## Introduction

CertPrep360-Platform's AI question generation system (`ai-generate-content` Lambda) currently produces low-quality exams due to a lack of exam guide awareness, no diversity enforcement, and no deduplication. Analysis of SAA-C03 exams 17 & 18 (130 questions) revealed 199 near-duplicate pairs, 8 questions sharing the same opening sentence, and zero coverage of major domains like Route 53, ECS/Fargate, DynamoDB, Kinesis, and dozens of other in-scope services.

This feature redesigns the generation pipeline so that every question is grounded in the official AWS exam guide for the target certification. The system will extract task statements and in-scope service lists from the PDF guides in `CertPrep360-ExamGuide/`, enforce scenario and service diversity during generation, deduplicate against existing questions before storage, track coverage across task statements and services, and expose an admin workflow for regenerating faulty exams with progress visibility.

## Glossary

- **Exam_Guide_Parser**: The component responsible for reading a certification's PDF exam guide and extracting structured data (task statements, in-scope services, out-of-scope services, domain weights).
- **Task_Statement**: An official, fine-grained learning objective within a domain as defined in the AWS exam guide (e.g., "Design secure access to AWS resources" within "Design Secure Architectures").
- **Coverage_Tracker**: The component that records which task statements and AWS services have been covered by questions already stored for a given exam, and computes coverage gaps.
- **Diversity_Enforcer**: The component that selects the target task statement, AWS service(s), and scenario type for each generation call to maximize variety across a batch.
- **Deduplication_Engine**: The component that computes semantic similarity between a candidate question and existing questions for the same exam and rejects candidates that exceed the similarity threshold.
- **Quality_Validator**: The component that runs automated checks on a completed exam (domain balance, service diversity, duplicate rate) and produces a pass/fail report.
- **Generation_Orchestrator**: The Lambda handler (or Step Function) that coordinates a full 65-question batch generation by invoking the Diversity_Enforcer, calling Bedrock, running the Deduplication_Engine, and persisting accepted questions.
- **Admin_Regeneration_Workflow**: The admin UI flow that allows an administrator to delete a faulty exam and trigger a fresh batch generation with real-time progress tracking.
- **Scenario_Type**: A named category of question scenario used to vary question framing. Valid values: `migration`, `troubleshooting`, `cost-optimization`, `security`, `architecture-design`, `operational`.
- **Similarity_Score**: A numeric value in [0, 1] representing how semantically similar two questions are, where 1.0 is identical.
- **In_Scope_Service**: An AWS service explicitly listed as testable in the exam guide for a given certification.
- **Out_Of_Scope_Service**: An AWS service explicitly listed as not testable in the exam guide for a given certification.
- **Service_Concentration_Limit**: The maximum fraction of questions in a single exam that may test the same AWS service (default: 15%).
- **Exam_Guide_Cache**: A DynamoDB item (or S3 object) storing the parsed exam guide data for a certification so the PDF does not need to be re-parsed on every generation call.

---

## Requirements

### Requirement 1: Exam Guide Parsing

**User Story:** As an admin, I want the system to extract official task statements and service lists from the PDF exam guides, so that every generated question is grounded in what AWS actually tests.

#### Acceptance Criteria

1. WHEN an exam guide PDF is available in `CertPrep360-ExamGuide/` for a given `cert_id`, THE Exam_Guide_Parser SHALL extract all domain names, their official percentage weights, and all task statements listed under each domain.
2. WHEN an exam guide PDF is available for a given `cert_id`, THE Exam_Guide_Parser SHALL extract the complete list of In_Scope_Services and Out_Of_Scope_Services as defined in the guide.
3. IF an exam guide PDF cannot be read or parsed for a given `cert_id`, THEN THE Exam_Guide_Parser SHALL return a structured error identifying the `cert_id` and the failure reason, and SHALL NOT proceed with generation.
4. WHEN parsing completes successfully, THE Exam_Guide_Parser SHALL store the structured result in the Exam_Guide_Cache keyed by `cert_id` so subsequent calls do not re-parse the PDF.
5. WHEN a cached entry exists for a `cert_id`, THE Exam_Guide_Parser SHALL return the cached result without re-reading the PDF.
6. THE Exam_Guide_Parser SHALL support all certification IDs present in `CertPrep360-ExamGuide/` (SAA-C03, CLF-C02, AIF-C01, DVA-C02, SAP-C02, DOP-C02, SCS-C02, ANS-C01, COE-C01, DEA-C01, MLE-C01, GDP-C01).

---

### Requirement 2: Diversity-Enforced Question Generation

**User Story:** As an admin, I want each generation call to target a specific task statement and AWS service, so that the resulting exam covers the full breadth of the certification rather than converging on familiar EC2/RDS patterns.

#### Acceptance Criteria

1. WHEN generating a question for a given `cert_id` and `domain`, THE Diversity_Enforcer SHALL select a Task_Statement from that domain that has the fewest existing questions in the current exam, breaking ties randomly.
2. WHEN generating a question, THE Diversity_Enforcer SHALL select an In_Scope_Service that has the fewest existing questions in the current exam and is listed under the selected Task_Statement, breaking ties randomly.
3. WHEN generating a question, THE Diversity_Enforcer SHALL select a Scenario_Type that has been used least frequently in the current exam batch, cycling through `migration`, `troubleshooting`, `cost-optimization`, `security`, `architecture-design`, and `operational`.
4. THE Generation_Orchestrator SHALL inject the selected Task_Statement, In_Scope_Service, and Scenario_Type into the Bedrock prompt for every generation call.
5. THE Generation_Orchestrator SHALL set the Bedrock model temperature to 0.9 or higher for all generation calls.
6. THE Generation_Orchestrator SHALL include the list of Out_Of_Scope_Services in the Bedrock prompt with an explicit instruction that the generated question MUST NOT test any Out_Of_Scope_Service.
7. WHEN a generated question references an Out_Of_Scope_Service as the primary tested concept, THE Generation_Orchestrator SHALL discard the question and retry the generation call for that slot, up to 3 retry attempts. IF the retry mechanism itself fails to trigger (e.g., due to a runtime error), THE Generation_Orchestrator SHALL skip the slot, treating it the same as exhausted retries.
8. IF all 3 retry attempts for a slot produce questions referencing Out_Of_Scope_Services, THEN THE Generation_Orchestrator SHALL log a warning and skip that slot, recording it as unfilled.

---

### Requirement 3: Semantic Deduplication

**User Story:** As an admin, I want new questions to be checked for similarity against existing questions in the same exam before being stored, so that near-duplicate questions are eliminated.

#### Acceptance Criteria

1. BEFORE storing a generated question, THE Deduplication_Engine SHALL compute a Similarity_Score between the candidate question text and every existing question text in the same exam.
2. IF the Similarity_Score between a candidate question and any existing question exceeds 0.70, THEN THE Deduplication_Engine SHALL reject the candidate and trigger a regeneration for that slot, up to 3 retry attempts.
3. IF all 3 retry attempts for a slot produce questions with Similarity_Score > 0.70 against existing questions, THEN THE Deduplication_Engine SHALL log a warning identifying the conflicting question IDs and skip that slot.
4. THE Deduplication_Engine SHALL also check the candidate against other questions generated in the same batch (not yet stored) to prevent intra-batch duplicates.
5. THE Deduplication_Engine SHALL use a text-based similarity algorithm (e.g., normalized Levenshtein distance or TF-IDF cosine similarity) that operates without external API calls.
6. FOR ALL pairs of questions in a completed exam, the Similarity_Score computed by the Deduplication_Engine SHALL be consistent: computing score(A, B) and score(B, A) SHALL return the same value (symmetry property).

---

### Requirement 4: Domain and Service Coverage Tracking

**User Story:** As an admin, I want the system to track which task statements and AWS services have been covered per exam, so that generation prioritizes uncovered areas and no single service dominates.

#### Acceptance Criteria

1. THE Coverage_Tracker SHALL maintain a count of questions per Task_Statement for each exam, updated after every accepted question is stored.
2. THE Coverage_Tracker SHALL maintain a count of questions per In_Scope_Service for each exam, updated after every accepted question is stored.
3. WHEN the count of questions for a single In_Scope_Service in an exam reaches the Service_Concentration_Limit (15% of total questions in the exam), THE Coverage_Tracker SHALL mark that service as saturated and THE Diversity_Enforcer SHALL exclude it from selection for subsequent generation calls in the same batch.
4. THE Coverage_Tracker SHALL expose a coverage report for a given `cert_id` and `exam_id` that lists: total questions, questions per domain (count and percentage), questions per Task_Statement, questions per In_Scope_Service, and a list of In_Scope_Services with zero coverage.
5. WHEN a batch generation completes, THE Generation_Orchestrator SHALL persist the final coverage report alongside the exam metadata in DynamoDB.

---

### Requirement 5: Batch Exam Generation

**User Story:** As an admin, I want to generate a complete 65-question exam in a single operation, so that I don't have to manually trigger individual question generation calls.

#### Acceptance Criteria

1. WHEN an admin triggers a batch generation for a `cert_id` and `exam_id`, THE Generation_Orchestrator SHALL attempt to fill all 65 question slots distributed across domains according to the official domain weights from the exam guide, generating exactly the number of available slots (total slots minus skipped slots) as the final question count.
2. THE Generation_Orchestrator SHALL distribute the 65 question slots across domains proportionally: a domain with weight W SHALL receive `round(65 × W)` slots, with any rounding remainder assigned to the highest-weight domain.
3. WHEN generating a batch, THE Generation_Orchestrator SHALL process questions in parallel batches of up to 5 concurrent Bedrock calls to respect API rate limits.
4. THE Generation_Orchestrator SHALL store each accepted question to DynamoDB immediately after it passes deduplication, rather than waiting for the full batch to complete.
5. WHEN a batch generation is triggered for an `exam_id` that already has questions in DynamoDB, THE Generation_Orchestrator SHALL return a 409 Conflict error and SHALL NOT overwrite existing questions unless the admin explicitly passes a `force: true` flag.
6. THE Generation_Orchestrator SHALL record a generation job record in DynamoDB with fields: `job_id`, `cert_id`, `exam_id`, `status` (`in_progress` | `completed` | `failed`), `questions_generated`, `questions_skipped`, `started_at`, `completed_at`.

---

### Requirement 6: Exam Regeneration Workflow

**User Story:** As an admin, I want to delete a faulty exam and regenerate it from scratch through the admin UI, so that I can replace low-quality exams without manual DynamoDB operations.

#### Acceptance Criteria

1. WHEN an admin selects an existing exam in the Admin_Regeneration_Workflow and confirms deletion, THE Admin_Regeneration_Workflow SHALL delete all questions for that `exam_id` from DynamoDB before triggering generation.
2. THE Admin_Regeneration_Workflow SHALL require explicit confirmation (a second user action) before deleting any existing exam questions.
3. WHEN a regeneration job is actively running (Bedrock calls are in flight and questions are being stored), THE Admin_Regeneration_Workflow SHALL display real-time progress: questions generated so far, questions skipped, current domain being processed, and estimated completion. The progress display SHALL NOT appear when the job status is `in_progress` but the job process has not yet started.
4. THE Admin_Regeneration_Workflow SHALL poll the generation job record every 5 seconds to update the progress display.
5. WHEN a regeneration job completes, THE Admin_Regeneration_Workflow SHALL display the final Quality_Validator report (domain balance, service diversity score, duplicate rate) before the admin can publish the exam.
6. THE Admin_Regeneration_Workflow SHALL allow the admin to cancel an in-progress generation job, which SHALL stop further Bedrock calls and mark the job status as `cancelled`.

---

### Requirement 7: Quality Validation

**User Story:** As an admin, I want automated quality checks run after generation, so that exams failing minimum quality thresholds are flagged for review before going live.

#### Acceptance Criteria

1. WHEN a batch generation completes, THE Quality_Validator SHALL compute the following metrics for the generated exam:
   - Domain balance score: the sum of absolute deviations between actual domain percentages and target domain weights from the exam guide.
   - Service diversity score: the number of distinct In_Scope_Services covered divided by the total number of In_Scope_Services in the exam guide.
   - Duplicate rate: the fraction of question pairs with Similarity_Score > 0.70.
2. THE Quality_Validator SHALL flag an exam as `FAIL` if any of the following thresholds are breached:
   - Domain balance score > 0.05 (more than 5 percentage points off on any domain).
   - Service diversity score < 0.40 (fewer than 40% of in-scope services covered).
   - Duplicate rate > 0.02 (more than 2% of question pairs are near-duplicates).
3. THE Quality_Validator SHALL flag an exam as `WARN` if any of the following conditions are met:
   - Any single In_Scope_Service appears in more than 10% of questions (below the hard 15% limit but above the warning threshold).
   - Any Task_Statement has zero questions assigned to it.
4. WHEN an exam is flagged as `FAIL`, THE Admin_Regeneration_Workflow SHALL prevent the admin from publishing the exam and SHALL display the specific failing metrics.
5. WHEN an exam is flagged as `WARN`, THE Admin_Regeneration_Workflow SHALL display the warning details but SHALL allow the admin to override and publish after explicit acknowledgment.
6. THE Quality_Validator SHALL store the validation report in DynamoDB keyed by `exam_id` so it can be retrieved independently of the generation job.

---

### Requirement 8: Extensibility to All Certifications

**User Story:** As a platform maintainer, I want the exam guide-driven generation system to work for all certifications supported by the platform, so that I don't need to build separate pipelines per cert.

#### Acceptance Criteria

1. THE Exam_Guide_Parser SHALL be configurable via a mapping of `cert_id` to PDF file path, so that adding a new certification requires only adding an entry to the mapping without code changes.
2. THE Generation_Orchestrator SHALL accept any `cert_id` present in the Exam_Guide_Cache and SHALL apply the same diversity, deduplication, and coverage logic regardless of certification.
3. WHERE a certification exam guide does not include an explicit out-of-scope services list, THE Exam_Guide_Parser SHALL treat the out-of-scope list as empty and SHALL NOT block generation.
4. THE Coverage_Tracker SHALL store coverage data namespaced by `cert_id` and `exam_id` so that coverage for one certification does not affect another.
5. THE system SHALL support the following `cert_id` values at launch: `SAA-C03`, `CLF-C02`, `AIF-C01`, `DVA-C02`, `SAP-C02`, `DOP-C02`, `SCS-C02`, `ANS-C01`, `COE-C01`, `DEA-C01`, `MLE-C01`, `GDP-C01`.
