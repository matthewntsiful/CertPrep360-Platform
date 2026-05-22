/**
 * QualityValidator — post-batch quality metrics and pass/fail reporting.
 *
 * Computes domain balance, service diversity, and duplicate rate for a
 * completed exam, then applies FAIL/WARN/PASS thresholds to produce a
 * QualityReport.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './db.js';
import { cosineSimilarity, computeTfIdf, computeIdf, tokenize } from './deduplicationEngine.js';

const TABLE_NAME = process.env.TABLE_NAME || 'CertPrep360-Dev-Main';

// ── Thresholds ────────────────────────────────────────────────────────────────

const FAIL_DOMAIN_BALANCE_THRESHOLD = 0.10;   // > 10% deviation → FAIL (was 5%, too strict for 60-question exams)
const FAIL_DIVERSITY_THRESHOLD = 0.25;         // < 25% services covered → FAIL (was 40%, unrealistic for 119 services in 60 questions)
const FAIL_DUPLICATE_RATE_THRESHOLD = 0.02;    // > 2% duplicate pairs → FAIL
const WARN_SERVICE_CONCENTRATION = 0.10;       // > 10% questions for one service → WARN
const MAX_SAMPLE_PAIRS = 500;                  // max pairs to sample for duplicate rate
const DUPLICATE_SIMILARITY_THRESHOLD = 0.70;  // pairs above this are near-duplicates

// ── Domain Balance ────────────────────────────────────────────────────────────

/**
 * Computes the domain balance score: sum of absolute deviations between
 * actual domain percentages and target domain weights from the exam guide.
 *
 * @param {Array<{domain?: string, primary_service?: string}>} questions
 *   Each question should have a `domain` field matching a domain name in the
 *   exam guide. If `domain` is absent, the question is counted as "Unknown".
 * @param {{ domains: Array<{name: string, weight: number, task_statements: Array}> }} examGuide
 * @returns {{ score: number, breakdown: Array<{domain: string, actual_pct: number, target_pct: number}> }}
 */
export function computeDomainBalance(questions, examGuide) {
  if (!questions || questions.length === 0) {
    // No questions: every domain has 0% actual vs its target weight
    const breakdown = (examGuide?.domains ?? []).map(d => ({
      domain: d.name,
      actual_pct: 0,
      target_pct: d.weight,
    }));
    const score = breakdown.reduce((sum, b) => sum + Math.abs(b.actual_pct - b.target_pct), 0);
    return { score, breakdown };
  }

  const total = questions.length;
  const domains = examGuide?.domains ?? [];

  // Count questions per domain name
  const domainCounts = new Map();
  for (const q of questions) {
    const domainName = q.domain ?? 'Unknown';
    domainCounts.set(domainName, (domainCounts.get(domainName) ?? 0) + 1);
  }

  let score = 0;
  const breakdown = [];

  for (const domain of domains) {
    const count = domainCounts.get(domain.name) ?? 0;
    const actual_pct = count / total;
    const target_pct = domain.weight ?? 0;
    const deviation = Math.abs(actual_pct - target_pct);
    score += deviation;
    breakdown.push({ domain: domain.name, actual_pct, target_pct });
  }

  return { score, breakdown };
}

// ── Service Diversity ─────────────────────────────────────────────────────────

/**
 * Computes the service diversity score: distinct in-scope services covered
 * divided by the total number of in-scope services in the exam guide.
 *
 * @param {{ serviceCounts?: Map<string, number> }} coverageState
 *   The in-memory coverage state built during batch generation.
 *   `serviceCounts` maps service name → question count.
 * @param {{ in_scope_services: string[] }} examGuide
 * @returns {{ score: number, uncoveredServices: string[] }}
 */
export function computeServiceDiversity(coverageState, examGuide) {
  const inScopeServices = examGuide?.in_scope_services ?? [];

  if (inScopeServices.length === 0) {
    return { score: 1, uncoveredServices: [] };
  }

  const serviceCounts = coverageState?.serviceCounts ?? new Map();

  const coveredServices = inScopeServices.filter(
    svc => (serviceCounts.get(svc) ?? 0) > 0
  );
  const uncoveredServices = inScopeServices.filter(
    svc => (serviceCounts.get(svc) ?? 0) === 0
  );

  const score = coveredServices.length / inScopeServices.length;

  return { score, uncoveredServices };
}

// ── Duplicate Rate ────────────────────────────────────────────────────────────

/**
 * Computes the duplicate rate by sampling up to MAX_SAMPLE_PAIRS random pairs
 * from the questions array and checking cosine similarity.
 *
 * For large exams (many pairs), a random sample of up to 500 pairs is used to
 * avoid O(n²) cost.
 *
 * @param {Array<{text: string}>} questions
 * @param {import('./deduplicationEngine.js').DeduplicationEngine} deduplicationEngine
 *   Must expose a `cosineSimilarity` method, or we fall back to computing it
 *   directly using the exported functions from deduplicationEngine.js.
 * @returns {number} Fraction of sampled pairs with similarity > 0.70
 */
export function computeDuplicateRate(questions, deduplicationEngine) {
  if (!questions || questions.length < 2) return 0;

  // Build all possible pairs (or a sample if too many)
  const n = questions.length;
  const totalPairs = (n * (n - 1)) / 2;

  // Pre-tokenize all question texts
  const texts = questions.map(q => (typeof q === 'string' ? q : q.text ?? ''));
  const tokenizedTexts = texts.map(t => tokenize(t));

  // Build IDF from the full corpus for consistent scoring
  const idf = computeIdf(tokenizedTexts);

  // Pre-compute TF-IDF vectors
  const vectors = tokenizedTexts.map(tokens => computeTfIdf(tokens, idf));

  let pairs;

  if (totalPairs <= MAX_SAMPLE_PAIRS) {
    // Enumerate all pairs
    pairs = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairs.push([i, j]);
      }
    }
  } else {
    // Random sample of MAX_SAMPLE_PAIRS pairs without replacement
    const pairSet = new Set();
    pairs = [];

    // Use a seeded-like approach: shuffle indices and pick pairs
    // Simple reservoir-style sampling
    let attempts = 0;
    const maxAttempts = MAX_SAMPLE_PAIRS * 10;

    while (pairs.length < MAX_SAMPLE_PAIRS && attempts < maxAttempts) {
      const i = Math.floor(Math.random() * n);
      const j = Math.floor(Math.random() * n);
      if (i === j) { attempts++; continue; }

      const key = i < j ? `${i}:${j}` : `${j}:${i}`;
      if (pairSet.has(key)) { attempts++; continue; }

      pairSet.add(key);
      pairs.push([Math.min(i, j), Math.max(i, j)]);
      attempts++;
    }
  }

  if (pairs.length === 0) return 0;

  let duplicateCount = 0;

  for (const [i, j] of pairs) {
    const score = cosineSimilarity(vectors[i], vectors[j]);
    if (score > DUPLICATE_SIMILARITY_THRESHOLD) {
      duplicateCount++;
    }
  }

  return duplicateCount / pairs.length;
}

// ── Service Breakdown ─────────────────────────────────────────────────────────

/**
 * Builds a service breakdown array from the coverage state.
 *
 * @param {{ serviceCounts?: Map<string, number> }} coverageState
 * @param {number} totalQuestions
 * @returns {Array<{service: string, count: number, pct: number}>}
 */
function buildServiceBreakdown(coverageState, totalQuestions) {
  const serviceCounts = coverageState?.serviceCounts ?? new Map();
  const breakdown = [];

  for (const [service, count] of serviceCounts) {
    if (count > 0) {
      breakdown.push({
        service,
        count,
        pct: totalQuestions > 0 ? count / totalQuestions : 0,
      });
    }
  }

  // Sort descending by count
  breakdown.sort((a, b) => b.count - a.count);
  return breakdown;
}

/**
 * Finds task statements with zero questions assigned.
 *
 * @param {{ taskStatementCounts?: Map<string, number> }} coverageState
 * @param {{ domains: Array<{task_statements: Array<{id: string, text: string}>}> }} examGuide
 * @returns {string[]} Array of task statement IDs with zero coverage
 */
function findUncoveredTaskStatements(coverageState, examGuide) {
  const taskStatementCounts = coverageState?.taskStatementCounts ?? new Map();
  const uncovered = [];

  for (const domain of (examGuide?.domains ?? [])) {
    for (const ts of (domain.task_statements ?? [])) {
      if ((taskStatementCounts.get(ts.id) ?? 0) === 0) {
        uncovered.push(ts.id);
      }
    }
  }

  return uncovered;
}

// ── Main Validation ───────────────────────────────────────────────────────────

/**
 * Runs all quality checks on a completed exam and returns a QualityReport.
 *
 * @param {Array<{text: string, domain?: string, primary_service?: string}>} questions
 * @param {{ domains: Array, in_scope_services: string[], out_of_scope_services: string[] }} examGuide
 * @param {{ serviceCounts?: Map<string, number>, taskStatementCounts?: Map<string, number> }} coverageState
 * @param {import('./deduplicationEngine.js').DeduplicationEngine} deduplicationEngine
 * @param {{ exam_id?: string, cert_id?: string }} [meta]
 * @returns {{
 *   exam_id: string,
 *   cert_id: string,
 *   generated_at: string,
 *   result: 'PASS' | 'WARN' | 'FAIL',
 *   domain_balance_score: number,
 *   service_diversity_score: number,
 *   duplicate_rate: number,
 *   warnings: string[],
 *   failures: string[],
 *   domain_breakdown: Array<{domain: string, actual_pct: number, target_pct: number}>,
 *   service_breakdown: Array<{service: string, count: number, pct: number}>,
 *   uncovered_services: string[],
 *   uncovered_task_statements: string[]
 * }}
 */
export function validateExam(questions, examGuide, coverageState, deduplicationEngine, meta = {}) {
  const totalQuestions = questions?.length ?? 0;

  // ── Compute metrics ──────────────────────────────────────────────────────

  const { score: domain_balance_score, breakdown: domain_breakdown } =
    computeDomainBalance(questions, examGuide);

  const { score: service_diversity_score, uncoveredServices: uncovered_services } =
    computeServiceDiversity(coverageState, examGuide);

  const duplicate_rate = computeDuplicateRate(questions, deduplicationEngine);

  // ── Build breakdowns ─────────────────────────────────────────────────────

  const service_breakdown = buildServiceBreakdown(coverageState, totalQuestions);
  const uncovered_task_statements = findUncoveredTaskStatements(coverageState, examGuide);

  // ── Apply FAIL thresholds (Req 7.2) ─────────────────────────────────────

  const failures = [];

  if (domain_balance_score > FAIL_DOMAIN_BALANCE_THRESHOLD) {
    failures.push(
      `Domain balance score ${domain_balance_score.toFixed(4)} exceeds threshold of ${FAIL_DOMAIN_BALANCE_THRESHOLD} (${(domain_balance_score * 100).toFixed(1)}% deviation)`
    );
  }

  if (service_diversity_score < FAIL_DIVERSITY_THRESHOLD) {
    failures.push(
      `Service diversity score ${service_diversity_score.toFixed(4)} is below threshold of ${FAIL_DIVERSITY_THRESHOLD} (only ${(service_diversity_score * 100).toFixed(1)}% of in-scope services covered)`
    );
  }

  if (duplicate_rate > FAIL_DUPLICATE_RATE_THRESHOLD) {
    failures.push(
      `Duplicate rate ${duplicate_rate.toFixed(4)} exceeds threshold of ${FAIL_DUPLICATE_RATE_THRESHOLD} (${(duplicate_rate * 100).toFixed(1)}% of sampled pairs are near-duplicates)`
    );
  }

  // ── Apply WARN conditions (Req 7.3) ──────────────────────────────────────

  const warnings = [];

  // Warn if any single service appears in > 10% of questions
  for (const { service, pct } of service_breakdown) {
    if (pct > WARN_SERVICE_CONCENTRATION) {
      warnings.push(
        `Service "${service}" appears in ${(pct * 100).toFixed(1)}% of questions (warning threshold: ${WARN_SERVICE_CONCENTRATION * 100}%)`
      );
    }
  }

  // Warn if any task statement has zero questions
  if (uncovered_task_statements.length > 0) {
    warnings.push(
      `${uncovered_task_statements.length} task statement(s) have zero questions: ${uncovered_task_statements.join(', ')}`
    );
  }

  // ── Determine result ─────────────────────────────────────────────────────

  let result;
  if (failures.length > 0) {
    result = 'FAIL';
  } else if (warnings.length > 0) {
    result = 'WARN';
  } else {
    result = 'PASS';
  }

  return {
    exam_id: meta.exam_id ?? '',
    cert_id: meta.cert_id ?? '',
    generated_at: new Date().toISOString(),
    result,
    domain_balance_score,
    service_diversity_score,
    duplicate_rate,
    warnings,
    failures,
    domain_breakdown,
    service_breakdown,
    uncovered_services,
    uncovered_task_statements,
  };
}

// ── Persistence ───────────────────────────────────────────────────────────────

/**
 * Persists a QualityReport to DynamoDB.
 *
 * Delegates to `persistCoverageReport` from coverageTracker.js when available,
 * otherwise writes directly to DynamoDB using the same key structure.
 *
 * DynamoDB key: PK=QUALITY#<exam_id>, SK=REPORT
 *
 * @param {{
 *   exam_id: string,
 *   cert_id: string,
 *   generated_at: string,
 *   result: string,
 *   domain_balance_score: number,
 *   service_diversity_score: number,
 *   duplicate_rate: number,
 *   warnings: string[],
 *   failures: string[],
 *   domain_breakdown: Array,
 *   service_breakdown: Array,
 *   uncovered_services: string[],
 *   uncovered_task_statements: string[]
 * }} report
 * @returns {Promise<void>}
 */
export async function persistQualityReport(report) {
  // Attempt to delegate to coverageTracker.persistCoverageReport (Req 7.6)
  try {
    const { persistCoverageReport } = await import('./coverageTracker.js');
    await persistCoverageReport(report);
    return;
  } catch {
    // coverageTracker.js not yet available — fall back to direct DynamoDB write
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `QUALITY#${report.exam_id}`,
        SK: 'REPORT',
        exam_id: report.exam_id,
        cert_id: report.cert_id,
        generated_at: report.generated_at,
        result: report.result,
        domain_balance_score: report.domain_balance_score,
        service_diversity_score: report.service_diversity_score,
        duplicate_rate: report.duplicate_rate,
        warnings: report.warnings,
        failures: report.failures,
        domain_breakdown: report.domain_breakdown,
        service_breakdown: report.service_breakdown,
        uncovered_services: report.uncovered_services,
        uncovered_task_statements: report.uncovered_task_statements,
      },
    })
  );
}
