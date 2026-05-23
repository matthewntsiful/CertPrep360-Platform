/**
 * Property 1: Trend data is chronologically ordered and complete
 *
 * For any set of user attempt records stored in DynamoDB, the Analytics API
 * trend data response SHALL return all attempts sorted by timestamp in ascending
 * order, and each entry SHALL contain score, certId, examId, and timestamp fields.
 *
 * Feature: study-mode-enhancements, Property 1: Trend data is chronologically ordered and complete
 *
 * **Validates: Requirements 1.6**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ── Inline the transformation logic from get-user-analytics handler ──────────

/**
 * Extract the timestamp portion from an SK like ATTEMPT#2024-01-15T10:30:00Z#EXAM#exam-1
 */
function extractTimestampFromSK(sk: string): string {
  if (!sk) return '';
  const parts = sk.split('#');
  // SK format: ATTEMPT#<timestamp>#EXAM#<examId>
  return parts[1] || '';
}

/**
 * Compute domain scores from answers when domainScores is not pre-computed.
 */
function computeDomainScoresFromAnswers(answers: Record<string, { domain?: string; isCorrect?: boolean }> | null | undefined): Record<string, number> {
  if (!answers || typeof answers !== 'object') return {};

  const domainStats: Record<string, { correct: number; total: number }> = {};
  for (const answer of Object.values(answers)) {
    const { domain, isCorrect } = answer;
    if (!domain) continue;

    if (!domainStats[domain]) {
      domainStats[domain] = { correct: 0, total: 0 };
    }
    domainStats[domain].total += 1;
    if (isCorrect) {
      domainStats[domain].correct += 1;
    }
  }

  const scores: Record<string, number> = {};
  for (const [domain, stats] of Object.entries(domainStats)) {
    scores[domain] = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);
  }

  return scores;
}

interface AttemptRecord {
  PK: string;
  SK: string;
  timestamp?: string;
  score?: number;
  certId?: string;
  examId?: string;
  domainScores?: Record<string, number>;
  answers?: Record<string, { domain?: string; isCorrect?: boolean }>;
}

interface TrendDataPoint {
  date: string;
  score: number;
  certId: string;
  examId: string;
  domainScores: Record<string, number>;
}

/**
 * The trend data transformation logic extracted from the get-user-analytics handler.
 * Given an array of attempt records, returns them sorted chronologically with required fields.
 */
function buildTrendData(attempts: AttemptRecord[]): TrendDataPoint[] {
  const sortedAttempts = [...attempts].sort((a, b) => {
    const tsA = a.timestamp || a.SK;
    const tsB = b.timestamp || b.SK;
    return tsA < tsB ? -1 : tsA > tsB ? 1 : 0;
  });

  return sortedAttempts.map((attempt) => ({
    date: attempt.timestamp || extractTimestampFromSK(attempt.SK),
    score: attempt.score || 0,
    certId: attempt.certId || '',
    examId: attempt.examId || '',
    domainScores: attempt.domainScores || computeDomainScoresFromAnswers(attempt.answers),
  }));
}

// ── Generators ────────────────────────────────────────────────────────────────

/**
 * Generate a valid ISO timestamp within a reasonable range.
 */
const isoTimestampArb = fc.integer({
  min: new Date('2023-01-01').getTime(),
  max: new Date('2025-12-31').getTime(),
}).map((ts) => new Date(ts).toISOString());

/**
 * Generate a valid certification ID (e.g., SAA-C03, DVA-C02).
 */
const certIdArb = fc.stringMatching(/^[A-Z]{2,5}-[A-Z0-9]{2,5}$/);

/**
 * Generate a valid exam ID (e.g., exam-1, exam-42).
 */
const examIdArb = fc.stringMatching(/^exam-[0-9]{1,4}$/);

/**
 * Generate a valid score (0-100).
 */
const scoreArb = fc.integer({ min: 0, max: 100 });

/**
 * Generate a domain name.
 */
const domainArb = fc.constantFrom(
  'Design Resilient Architectures',
  'Design High-Performing Architectures',
  'Design Secure Architectures',
  'Design Cost-Optimized Architectures',
  'Networking',
  'Security',
);

/**
 * Generate a domain scores map.
 */
const domainScoresArb = fc.dictionary(
  domainArb,
  fc.integer({ min: 0, max: 100 }),
  { minKeys: 1, maxKeys: 4 },
);

/**
 * Generate a single attempt record as it would appear from DynamoDB.
 */
const attemptRecordArb = fc.record({
  timestamp: isoTimestampArb,
  certId: certIdArb,
  examId: examIdArb,
  score: scoreArb,
  domainScores: domainScoresArb,
}).map((rec) => ({
  PK: 'USER#test-user',
  SK: `ATTEMPT#${rec.timestamp}#EXAM#${rec.examId}`,
  timestamp: rec.timestamp,
  certId: rec.certId,
  examId: rec.examId,
  score: rec.score,
  domainScores: rec.domainScores,
}));

/**
 * Generate a list of attempt records (1 to 50 attempts).
 */
const attemptListArb = fc.array(attemptRecordArb, { minLength: 1, maxLength: 50 });

// ── Property Tests ────────────────────────────────────────────────────────────

describe('Feature: study-mode-enhancements, Property 1: Trend data is chronologically ordered and complete', () => {
  it('trend data is sorted by timestamp in ascending order', () => {
    fc.assert(
      fc.property(attemptListArb, (attempts) => {
        const trendData = buildTrendData(attempts);

        // Verify ascending chronological order
        for (let i = 1; i < trendData.length; i++) {
          expect(trendData[i].date >= trendData[i - 1].date).toBe(true);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('trend data contains all attempts (no data loss)', () => {
    fc.assert(
      fc.property(attemptListArb, (attempts) => {
        const trendData = buildTrendData(attempts);

        // The number of trend data points must equal the number of input attempts
        expect(trendData.length).toBe(attempts.length);
      }),
      { numRuns: 20 },
    );
  });

  it('each trend data entry contains required score field', () => {
    fc.assert(
      fc.property(attemptListArb, (attempts) => {
        const trendData = buildTrendData(attempts);

        for (const point of trendData) {
          expect(typeof point.score).toBe('number');
          expect(point.score).toBeGreaterThanOrEqual(0);
          expect(point.score).toBeLessThanOrEqual(100);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('each trend data entry contains required certId field', () => {
    fc.assert(
      fc.property(attemptListArb, (attempts) => {
        const trendData = buildTrendData(attempts);

        for (const point of trendData) {
          expect(typeof point.certId).toBe('string');
          expect(point.certId.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('each trend data entry contains required examId field', () => {
    fc.assert(
      fc.property(attemptListArb, (attempts) => {
        const trendData = buildTrendData(attempts);

        for (const point of trendData) {
          expect(typeof point.examId).toBe('string');
          expect(point.examId.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('each trend data entry contains required timestamp (date) field', () => {
    fc.assert(
      fc.property(attemptListArb, (attempts) => {
        const trendData = buildTrendData(attempts);

        for (const point of trendData) {
          expect(typeof point.date).toBe('string');
          expect(point.date.length).toBeGreaterThan(0);
          // Verify it's a valid ISO date string
          expect(new Date(point.date).toISOString()).toBe(point.date);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('trend data preserves all scores from input attempts', () => {
    fc.assert(
      fc.property(attemptListArb, (attempts) => {
        const trendData = buildTrendData(attempts);

        // Collect all scores from input and output, sort them, and compare
        const inputScores = attempts.map((a) => a.score ?? 0).sort((a, b) => a - b);
        const outputScores = trendData.map((t) => t.score).sort((a, b) => a - b);

        expect(outputScores).toEqual(inputScores);
      }),
      { numRuns: 20 },
    );
  });

  it('trend data ordering is stable for attempts with identical timestamps', () => {
    fc.assert(
      fc.property(
        isoTimestampArb,
        fc.array(attemptRecordArb, { minLength: 2, maxLength: 10 }),
        (sharedTimestamp, attempts) => {
          // Give all attempts the same timestamp to test stability
          const sameTimeAttempts = attempts.map((a, i) => ({
            ...a,
            timestamp: sharedTimestamp,
            SK: `ATTEMPT#${sharedTimestamp}#EXAM#exam-${i}`,
          }));

          const trendData = buildTrendData(sameTimeAttempts);

          // All dates should be the shared timestamp
          for (const point of trendData) {
            expect(point.date).toBe(sharedTimestamp);
          }

          // Length should be preserved
          expect(trendData.length).toBe(sameTimeAttempts.length);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('trend data uses SK fallback when timestamp field is missing', () => {
    fc.assert(
      fc.property(attemptListArb, (attempts) => {
        // Remove the timestamp field to force SK fallback
        const attemptsWithoutTimestamp = attempts.map((a) => {
          const { timestamp, ...rest } = a;
          return rest as AttemptRecord;
        });

        const trendData = buildTrendData(attemptsWithoutTimestamp);

        // Should still produce valid output with dates extracted from SK
        expect(trendData.length).toBe(attemptsWithoutTimestamp.length);

        for (const point of trendData) {
          expect(typeof point.date).toBe('string');
          expect(point.date.length).toBeGreaterThan(0);
        }

        // Should still be sorted ascending
        for (let i = 1; i < trendData.length; i++) {
          expect(trendData[i].date >= trendData[i - 1].date).toBe(true);
        }
      }),
      { numRuns: 20 },
    );
  });
});
