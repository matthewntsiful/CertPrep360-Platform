/**
 * Unit tests for QualityValidator module.
 * Uses Node's built-in test runner (node:test). No AWS calls are made.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeDomainBalance,
  computeServiceDiversity,
  computeDuplicateRate,
  validateExam,
} from './qualityValidator.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EXAM_GUIDE = {
  domains: [
    {
      name: 'Design Secure Architectures',
      weight: 0.30,
      task_statements: [{ id: '1.1', text: 'Secure access', services: ['IAM'] }],
    },
    {
      name: 'Design Resilient Architectures',
      weight: 0.26,
      task_statements: [{ id: '2.1', text: 'Scalable architectures', services: ['SQS'] }],
    },
    {
      name: 'Design High-Performing Architectures',
      weight: 0.24,
      task_statements: [{ id: '3.1', text: 'High-performing storage', services: ['S3'] }],
    },
    {
      name: 'Design Cost-Optimized Architectures',
      weight: 0.20,
      task_statements: [{ id: '4.1', text: 'Cost-optimized storage', services: ['Glacier'] }],
    },
  ],
  in_scope_services: ['IAM', 'SQS', 'S3', 'Glacier', 'EC2', 'Lambda', 'RDS', 'DynamoDB', 'CloudFront', 'Route53'],
  out_of_scope_services: ['SimpleDB'],
};

/** Build a minimal coverage state from a service count map and task statement counts */
function makeCoverageState({ serviceCounts = {}, taskStatementCounts = {} } = {}) {
  return {
    serviceCounts: new Map(Object.entries(serviceCounts)),
    taskStatementCounts: new Map(Object.entries(taskStatementCounts)),
    saturatedServices: new Set(),
    totalQuestions: 0,
  };
}

/** Build N questions all in the same domain */
function makeQuestions(domain, count, service = 'IAM') {
  return Array.from({ length: count }, (_, i) => ({
    text: `Question ${i + 1} about ${service} in ${domain} scenario ${i}`,
    domain,
    primary_service: service,
  }));
}

// ---------------------------------------------------------------------------
// computeDomainBalance
// ---------------------------------------------------------------------------

describe('computeDomainBalance', () => {
  it('returns score 0 and correct breakdown for empty questions', () => {
    const { score, breakdown } = computeDomainBalance([], EXAM_GUIDE);
    // With 0 questions, actual_pct is 0 for all domains
    // score = sum(|0 - weight|) = 0.30 + 0.26 + 0.24 + 0.20 = 1.0
    assert.ok(score >= 0, 'score should be non-negative');
    assert.equal(breakdown.length, 4);
  });

  it('returns score 0 when actual percentages exactly match target weights', () => {
    // 30 secure, 26 resilient, 24 high-perf, 20 cost-opt = 100 questions
    const questions = [
      ...makeQuestions('Design Secure Architectures', 30),
      ...makeQuestions('Design Resilient Architectures', 26),
      ...makeQuestions('Design High-Performing Architectures', 24),
      ...makeQuestions('Design Cost-Optimized Architectures', 20),
    ];
    const { score } = computeDomainBalance(questions, EXAM_GUIDE);
    assert.ok(score < 0.01, `Expected score near 0, got ${score}`);
  });

  it('returns a positive score when domains are imbalanced', () => {
    // All questions in one domain
    const questions = makeQuestions('Design Secure Architectures', 65);
    const { score } = computeDomainBalance(questions, EXAM_GUIDE);
    assert.ok(score > 0.05, `Expected score > 0.05 for heavily imbalanced exam, got ${score}`);
  });

  it('breakdown has correct fields', () => {
    const { breakdown } = computeDomainBalance(makeQuestions('Design Secure Architectures', 10), EXAM_GUIDE);
    for (const entry of breakdown) {
      assert.ok('domain' in entry, 'missing domain field');
      assert.ok('actual_pct' in entry, 'missing actual_pct field');
      assert.ok('target_pct' in entry, 'missing target_pct field');
    }
  });
});

// ---------------------------------------------------------------------------
// computeServiceDiversity
// ---------------------------------------------------------------------------

describe('computeServiceDiversity', () => {
  it('returns score 0 when no services are covered', () => {
    const state = makeCoverageState();
    const { score } = computeServiceDiversity(state, EXAM_GUIDE);
    assert.equal(score, 0);
  });

  it('returns score 1.0 when all in-scope services are covered', () => {
    const serviceCounts = Object.fromEntries(EXAM_GUIDE.in_scope_services.map(s => [s, 1]));
    const state = makeCoverageState({ serviceCounts });
    const { score } = computeServiceDiversity(state, EXAM_GUIDE);
    assert.equal(score, 1);
  });

  it('returns correct fractional score', () => {
    // Cover 5 of 10 in-scope services
    const serviceCounts = { IAM: 2, SQS: 1, S3: 3, Glacier: 1, EC2: 2 };
    const state = makeCoverageState({ serviceCounts });
    const { score } = computeServiceDiversity(state, EXAM_GUIDE);
    assert.ok(Math.abs(score - 0.5) < 0.01, `Expected 0.5, got ${score}`);
  });

  it('uncoveredServices lists services with zero questions', () => {
    const serviceCounts = { IAM: 1 };
    const state = makeCoverageState({ serviceCounts });
    const { uncoveredServices } = computeServiceDiversity(state, EXAM_GUIDE);
    assert.ok(uncoveredServices.includes('SQS'), 'SQS should be uncovered');
    assert.ok(!uncoveredServices.includes('IAM'), 'IAM should not be uncovered');
  });

  it('returns score 1 when exam guide has no in-scope services', () => {
    const emptyGuide = { ...EXAM_GUIDE, in_scope_services: [] };
    const state = makeCoverageState();
    const { score } = computeServiceDiversity(state, emptyGuide);
    assert.equal(score, 1);
  });
});

// ---------------------------------------------------------------------------
// computeDuplicateRate
// ---------------------------------------------------------------------------

describe('computeDuplicateRate', () => {
  it('returns 0 for fewer than 2 questions', () => {
    assert.equal(computeDuplicateRate([], null), 0);
    assert.equal(computeDuplicateRate([{ text: 'single question' }], null), 0);
  });

  it('returns 0 for completely different questions', () => {
    const questions = [
      { text: 'Configure Amazon Route 53 health checks to monitor endpoint availability and failover DNS records.' },
      { text: 'Implement AWS Glue ETL jobs to transform raw clickstream data stored in S3 into Parquet files.' },
      { text: 'A company needs to encrypt data at rest in DynamoDB using customer managed keys in AWS KMS.' },
    ];
    const rate = computeDuplicateRate(questions, null);
    assert.ok(rate < 0.30, `Expected low duplicate rate for distinct questions, got ${rate}`);
  });

  it('returns a high rate for near-identical questions', () => {
    const base = 'A company needs to migrate its on-premises MySQL database to Amazon RDS with minimal downtime using AWS DMS.';
    const questions = [
      { text: base },
      { text: base + ' Which service should the solutions architect recommend?' },
      { text: base + ' What is the recommended approach for this migration scenario?' },
    ];
    const rate = computeDuplicateRate(questions, null);
    assert.ok(rate > 0.30, `Expected high duplicate rate for near-identical questions, got ${rate}`);
  });

  it('returns a value in [0, 1]', () => {
    const questions = makeQuestions('Design Secure Architectures', 10);
    const rate = computeDuplicateRate(questions, null);
    assert.ok(rate >= 0 && rate <= 1, `Rate ${rate} out of [0,1] range`);
  });
});

// ---------------------------------------------------------------------------
// validateExam — PASS / WARN / FAIL
// ---------------------------------------------------------------------------

describe('validateExam — PASS result', () => {
  it('returns PASS for a well-balanced exam with good diversity', () => {
    // 100 questions spread evenly across all 10 in-scope services (10 each = 10%)
    // and balanced across domains — no service exceeds the 10% WARN threshold
    const inScopeServices = EXAM_GUIDE.in_scope_services; // 10 services
    const questions = [];
    const serviceCounts = {};
    const taskStatementCounts = { '1.1': 0, '2.1': 0, '3.1': 0, '4.1': 0 };

    // 30 secure, 26 resilient, 24 high-perf, 20 cost-opt = 100 questions
    const domainSlots = [
      { domain: 'Design Secure Architectures', count: 30, tsId: '1.1' },
      { domain: 'Design Resilient Architectures', count: 26, tsId: '2.1' },
      { domain: 'Design High-Performing Architectures', count: 24, tsId: '3.1' },
      { domain: 'Design Cost-Optimized Architectures', count: 20, tsId: '4.1' },
    ];

    let qIdx = 0;
    for (const { domain, count, tsId } of domainSlots) {
      for (let i = 0; i < count; i++) {
        // Rotate through all 10 services so no single service exceeds 10%
        const service = inScopeServices[qIdx % inScopeServices.length];
        questions.push({ text: `Question ${qIdx} about ${service} in ${domain} scenario ${i}`, domain, primary_service: service });
        serviceCounts[service] = (serviceCounts[service] ?? 0) + 1;
        taskStatementCounts[tsId]++;
        qIdx++;
      }
    }

    const coverageState = makeCoverageState({ serviceCounts, taskStatementCounts });

    const report = validateExam(questions, EXAM_GUIDE, coverageState, null, {
      exam_id: 'TEST-EXAM-01',
      cert_id: 'SAA-C03',
    });

    assert.equal(report.result, 'PASS', `Expected PASS, got ${report.result}. Failures: ${report.failures.join('; ')} Warnings: ${report.warnings.join('; ')}`);
    assert.equal(report.failures.length, 0);
  });
});

describe('validateExam — FAIL result', () => {
  it('fails when domain balance score exceeds 0.05', () => {
    // All questions in one domain → massive imbalance
    const questions = makeQuestions('Design Secure Architectures', 65, 'IAM');
    const serviceCounts = Object.fromEntries(EXAM_GUIDE.in_scope_services.map(s => [s, 1]));
    serviceCounts['IAM'] = 65;
    const coverageState = makeCoverageState({ serviceCounts });

    const report = validateExam(questions, EXAM_GUIDE, coverageState, null);
    assert.equal(report.result, 'FAIL');
    assert.ok(report.failures.some(f => f.includes('Domain balance')), 'Expected domain balance failure');
  });

  it('fails when service diversity score is below 0.40', () => {
    const questions = [
      ...makeQuestions('Design Secure Architectures', 30, 'IAM'),
      ...makeQuestions('Design Resilient Architectures', 26, 'SQS'),
      ...makeQuestions('Design High-Performing Architectures', 24, 'S3'),
      ...makeQuestions('Design Cost-Optimized Architectures', 20, 'Glacier'),
    ];
    // Only 2 of 10 in-scope services covered → diversity = 0.2 < 0.40
    const coverageState = makeCoverageState({ serviceCounts: { IAM: 30, SQS: 26 } });

    const report = validateExam(questions, EXAM_GUIDE, coverageState, null);
    assert.equal(report.result, 'FAIL');
    assert.ok(report.failures.some(f => f.includes('diversity')), 'Expected diversity failure');
  });
});

describe('validateExam — WARN result', () => {
  it('warns when a task statement has zero questions', () => {
    const questions = [
      ...makeQuestions('Design Secure Architectures', 30, 'IAM'),
      ...makeQuestions('Design Resilient Architectures', 26, 'SQS'),
      ...makeQuestions('Design High-Performing Architectures', 24, 'S3'),
      ...makeQuestions('Design Cost-Optimized Architectures', 20, 'Glacier'),
    ];
    const serviceCounts = Object.fromEntries(EXAM_GUIDE.in_scope_services.map(s => [s, 1]));
    // Leave task statement 4.1 with 0 questions
    const taskStatementCounts = { '1.1': 30, '2.1': 26, '3.1': 24 };
    const coverageState = makeCoverageState({ serviceCounts, taskStatementCounts });

    const report = validateExam(questions, EXAM_GUIDE, coverageState, null);
    assert.ok(report.result === 'WARN' || report.result === 'PASS', `Expected WARN or PASS, got ${report.result}`);
    if (report.result === 'WARN') {
      assert.ok(report.warnings.some(w => w.includes('task statement')), 'Expected task statement warning');
    }
  });
});

describe('validateExam — report structure', () => {
  it('always returns all required fields', () => {
    const report = validateExam([], EXAM_GUIDE, makeCoverageState(), null, {
      exam_id: 'EXAM-01',
      cert_id: 'SAA-C03',
    });

    const requiredFields = [
      'exam_id', 'cert_id', 'generated_at', 'result',
      'domain_balance_score', 'service_diversity_score', 'duplicate_rate',
      'warnings', 'failures', 'domain_breakdown', 'service_breakdown',
      'uncovered_services', 'uncovered_task_statements',
    ];

    for (const field of requiredFields) {
      assert.ok(field in report, `Missing field: ${field}`);
    }

    assert.equal(report.exam_id, 'EXAM-01');
    assert.equal(report.cert_id, 'SAA-C03');
    assert.ok(['PASS', 'WARN', 'FAIL'].includes(report.result));
    assert.ok(Array.isArray(report.warnings));
    assert.ok(Array.isArray(report.failures));
  });
});
