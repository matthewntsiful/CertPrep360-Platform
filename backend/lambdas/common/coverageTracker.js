/**
 * CoverageTracker — computes coverage reports from CoverageState and persists
 * them to DynamoDB as Quality Report items.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './db.js';

const TABLE_NAME = process.env.TABLE_NAME || 'CertPrep360-Dev-Main';

// ---------------------------------------------------------------------------
// Report computation
// ---------------------------------------------------------------------------

/**
 * Build a CoverageReport from the current CoverageState and exam guide.
 *
 * Computes:
 * - domain_breakdown: actual vs target percentage per domain
 * - service_breakdown: count and percentage per covered service
 * - uncovered_services: in-scope services with zero questions
 * - uncovered_task_statements: task statement IDs with zero questions
 * - domain_balance_score: sum of |actual_pct - target_pct| across all domains
 * - service_diversity_score: distinct services covered / total in-scope services
 *
 * Note: result, duplicate_rate, warnings, and failures are set by QualityValidator.
 * This function sets them to safe defaults so the report is always a valid item.
 *
 * @param {object} coverageState
 * @param {Map<string, number>} coverageState.taskStatementCounts
 * @param {Map<string, number>} coverageState.serviceCounts
 * @param {Map<string, number>} coverageState.scenarioTypeCounts
 * @param {Set<string>}         coverageState.saturatedServices
 * @param {number}              coverageState.totalQuestions
 * @param {object} examGuide
 * @param {Array<{ name: string, weight: number, task_statements: Array<{ id: string }> }>} examGuide.domains
 * @param {string[]} examGuide.in_scope_services
 * @param {string} examId
 * @param {string} certId
 * @returns {object} CoverageReport matching the DynamoDB Quality Report schema
 */
export function buildCoverageReport(coverageState, examGuide, examId, certId) {
  const {
    taskStatementCounts,
    serviceCounts,
    totalQuestions,
  } = coverageState;

  const domains = examGuide.domains ?? [];
  const inScopeServices = examGuide.in_scope_services ?? [];

  // ── Domain breakdown ──────────────────────────────────────────────────────

  // Count questions per domain by summing task statement counts within each domain.
  const domainBreakdown = domains.map(domain => {
    let domainCount = 0;
    for (const ts of (domain.task_statements ?? [])) {
      domainCount += taskStatementCounts.get(ts.id) ?? 0;
    }

    const actualPct = totalQuestions > 0 ? domainCount / totalQuestions : 0;
    const targetPct = domain.weight ?? 0;

    return {
      domain: domain.name,
      actual_pct: actualPct,
      target_pct: targetPct,
    };
  });

  // ── Domain balance score ──────────────────────────────────────────────────
  // Sum of absolute deviations between actual and target percentages.
  const domainBalanceScore = domainBreakdown.reduce(
    (sum, entry) => sum + Math.abs(entry.actual_pct - entry.target_pct),
    0,
  );

  // ── Service breakdown ─────────────────────────────────────────────────────
  // Only include services that have at least one question.
  const serviceBreakdown = [];
  for (const [service, count] of serviceCounts) {
    if (count > 0) {
      serviceBreakdown.push({
        service,
        count,
        pct: totalQuestions > 0 ? count / totalQuestions : 0,
      });
    }
  }
  // Sort descending by count for readability.
  serviceBreakdown.sort((a, b) => b.count - a.count);

  // ── Uncovered services ────────────────────────────────────────────────────
  // In-scope services with zero questions.
  const uncoveredServices = inScopeServices.filter(
    service => (serviceCounts.get(service) ?? 0) === 0,
  );

  // ── Service diversity score ───────────────────────────────────────────────
  // Distinct services covered / total in-scope services.
  const distinctServicesCovered = inScopeServices.filter(
    service => (serviceCounts.get(service) ?? 0) > 0,
  ).length;

  const serviceDiversityScore =
    inScopeServices.length > 0
      ? distinctServicesCovered / inScopeServices.length
      : 0;

  // ── Uncovered task statements ─────────────────────────────────────────────
  // Task statement IDs with zero questions.
  const uncoveredTaskStatements = [];
  for (const domain of domains) {
    for (const ts of (domain.task_statements ?? [])) {
      if ((taskStatementCounts.get(ts.id) ?? 0) === 0) {
        uncoveredTaskStatements.push(ts.id);
      }
    }
  }

  // ── Assemble report ───────────────────────────────────────────────────────
  return {
    PK: `QUALITY#${examId}`,
    SK: 'REPORT',
    exam_id: examId,
    cert_id: certId,
    generated_at: new Date().toISOString(),
    // Defaults — overwritten by QualityValidator after full validation.
    result: 'PASS',
    duplicate_rate: 0,
    warnings: [],
    failures: [],
    // Computed fields.
    domain_balance_score: domainBalanceScore,
    service_diversity_score: serviceDiversityScore,
    domain_breakdown: domainBreakdown,
    service_breakdown: serviceBreakdown,
    uncovered_services: uncoveredServices,
    uncovered_task_statements: uncoveredTaskStatements,
  };
}

// ---------------------------------------------------------------------------
// DynamoDB persistence
// ---------------------------------------------------------------------------

/**
 * Persist a coverage/quality report to DynamoDB.
 *
 * Writes to PK=QUALITY#<examId>, SK=REPORT.
 *
 * @param {object} report - A CoverageReport as returned by buildCoverageReport
 * @returns {Promise<void>}
 */
export async function persistCoverageReport(report) {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: report,
    }),
  );
}

/**
 * Read a coverage/quality report from DynamoDB by examId.
 *
 * @param {string} examId
 * @returns {Promise<object|null>} The report item, or null if not found
 */
export async function getCoverageReport(examId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `QUALITY#${examId}`,
        SK: 'REPORT',
      },
    }),
  );

  return result.Item ?? null;
}
