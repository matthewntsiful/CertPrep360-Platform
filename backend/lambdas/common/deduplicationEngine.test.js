/**
 * Unit tests for DeduplicationEngine module.
 * Uses Node's built-in test runner (node:test).
 *
 * Tests:
 *  1. Symmetry: cosineSimilarity(A, B) === cosineSimilarity(B, A)
 *  2. Identical texts return score of 1.0
 *  3. Completely different texts return score near 0
 *  4. A near-duplicate is correctly flagged above 0.70 threshold
 *  5. A clearly different question is not flagged
 *
 * Validates: Requirements 3.5, 3.6
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  tokenize,
  computeTf,
  computeIdf,
  computeTfIdf,
  cosineSimilarity,
  DeduplicationEngine,
} from './deduplicationEngine.js';

// ---------------------------------------------------------------------------
// Helper: build TF-IDF vectors for two texts using a shared IDF corpus
// ---------------------------------------------------------------------------
function buildVectors(textA, textB) {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  const idf = computeIdf([tokensA, tokensB]);
  const vecA = computeTfIdf(tokensA, idf);
  const vecB = computeTfIdf(tokensB, idf);
  return { vecA, vecB };
}

// ---------------------------------------------------------------------------
// Test 1 — Symmetry property (Requirement 3.6)
// ---------------------------------------------------------------------------
describe('cosineSimilarity symmetry', () => {
  it('similarity(A, B) === similarity(B, A) for arbitrary question texts', () => {
    const textA =
      'A company needs to migrate its on-premises MySQL database to AWS with minimal downtime. ' +
      'Which AWS service should the solutions architect recommend?';
    const textB =
      'An organization wants to replicate its Oracle database to Amazon RDS with near-zero downtime. ' +
      'What is the most appropriate migration strategy?';

    const { vecA, vecB } = buildVectors(textA, textB);

    const scoreAB = cosineSimilarity(vecA, vecB);
    const scoreBA = cosineSimilarity(vecB, vecA);

    assert.equal(
      scoreAB,
      scoreBA,
      `Expected cosineSimilarity(A,B) === cosineSimilarity(B,A), got ${scoreAB} vs ${scoreBA}`,
    );
  });

  it('symmetry holds for a second pair of texts', () => {
    const textA =
      'A developer is building a serverless application using AWS Lambda and needs to store session state. ' +
      'Which service provides the lowest latency for this use case?';
    const textB =
      'An architect is designing a cost-optimized storage solution for infrequently accessed data. ' +
      'Which Amazon S3 storage class should be used?';

    const { vecA, vecB } = buildVectors(textA, textB);

    assert.equal(cosineSimilarity(vecA, vecB), cosineSimilarity(vecB, vecA));
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Identical texts return score of 1.0
// ---------------------------------------------------------------------------
describe('cosineSimilarity identical texts', () => {
  it('returns 1.0 when both vectors are built from the same text', () => {
    const text =
      'A company is running a three-tier web application on Amazon EC2 instances. ' +
      'The security team requires that all traffic between tiers be encrypted. ' +
      'Which solution meets this requirement?';

    const tokens = tokenize(text);
    const idf = computeIdf([tokens]);
    const vec = computeTfIdf(tokens, idf);

    const score = cosineSimilarity(vec, vec);
    assert.equal(score, 1, `Expected 1.0 for identical vectors, got ${score}`);
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Completely different texts return score near 0
// ---------------------------------------------------------------------------
describe('cosineSimilarity unrelated texts', () => {
  it('returns a score close to 0 for texts with no shared meaningful tokens', () => {
    const textA =
      'Configure Amazon Route 53 health checks to monitor endpoint availability ' +
      'and automatically failover DNS records when an endpoint becomes unhealthy.';
    const textB =
      'Implement AWS Glue ETL jobs to transform raw clickstream data stored in ' +
      'Amazon S3 into aggregated Parquet files partitioned by date for Athena queries.';

    const { vecA, vecB } = buildVectors(textA, textB);
    const score = cosineSimilarity(vecA, vecB);

    // Texts share almost no domain-specific tokens; score should be well below 0.30
    assert.ok(
      score < 0.30,
      `Expected score < 0.30 for unrelated texts, got ${score}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Test 4 — Near-duplicate is flagged above 0.70 threshold
// ---------------------------------------------------------------------------
describe('DeduplicationEngine near-duplicate detection', () => {
  it('flags a near-duplicate question above the 0.70 threshold', () => {
    const original =
      'A company needs to store user session data for a web application with ' +
      'sub-millisecond read latency. The data must be highly available across ' +
      'multiple Availability Zones. Which AWS service should the architect choose?';

    // Paraphrase of the same question — same core concepts, slightly different wording
    const nearDuplicate =
      'A company wants to persist user session information for a web application ' +
      'requiring sub-millisecond read performance. The solution must be highly ' +
      'available across multiple Availability Zones. Which AWS service is most appropriate?';

    const engine = new DeduplicationEngine([original]);
    const result = engine.checkDuplicate(nearDuplicate, 0.70);

    assert.equal(
      result.isDuplicate,
      true,
      `Expected near-duplicate to be flagged (score=${result.score})`,
    );
    assert.ok(
      result.score > 0.70,
      `Expected score > 0.70, got ${result.score}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Test 5 — Clearly different question is NOT flagged
// ---------------------------------------------------------------------------
describe('DeduplicationEngine distinct question not flagged', () => {
  it('does not flag a clearly different question', () => {
    const existing =
      'A company needs to store user session data for a web application with ' +
      'sub-millisecond read latency. The data must be highly available across ' +
      'multiple Availability Zones. Which AWS service should the architect choose?';

    const different =
      'An organization is migrating a legacy monolithic application to AWS. ' +
      'The team wants to decouple components using an event-driven architecture. ' +
      'Which combination of services should the solutions architect recommend to ' +
      'enable asynchronous communication between microservices?';

    const engine = new DeduplicationEngine([existing]);
    const result = engine.checkDuplicate(different, 0.70);

    assert.equal(
      result.isDuplicate,
      false,
      `Expected distinct question NOT to be flagged (score=${result.score})`,
    );
    assert.ok(
      result.score <= 0.70,
      `Expected score <= 0.70, got ${result.score}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Additional: addAccepted enables intra-batch deduplication (Requirement 3.4)
// ---------------------------------------------------------------------------
describe('DeduplicationEngine intra-batch deduplication', () => {
  it('flags a near-duplicate added via addAccepted', () => {
    const engine = new DeduplicationEngine([]); // no existing questions

    const accepted =
      'A company needs to store user session data for a web application with ' +
      'sub-millisecond read latency. The data must be highly available across ' +
      'multiple Availability Zones. Which AWS service should the architect choose?';

    engine.addAccepted(accepted);

    const nearDuplicate =
      'A company wants to persist user session information for a web application ' +
      'requiring sub-millisecond read performance. The solution must be highly ' +
      'available across multiple Availability Zones. Which AWS service is most appropriate?';

    const result = engine.checkDuplicate(nearDuplicate, 0.70);

    assert.equal(
      result.isDuplicate,
      true,
      `Expected intra-batch near-duplicate to be flagged (score=${result.score})`,
    );
  });
});
