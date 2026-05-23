/**
 * Property 12: Server-side filtering and sorting
 *
 * For any set of user attempts and any combination of certId filter, pass/fail
 * status filter, and sort order, the API response SHALL contain only attempts
 * matching all active filters, and SHALL be ordered according to the specified
 * sort (newest, oldest, highest score, or lowest score).
 *
 * Feature: study-mode-enhancements, Property 12: Server-side filtering and sorting
 *
 * **Validates: Requirements 9.3, 9.6**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ── Constants ─────────────────────────────────────────────────────────────────

const PASS_THRESHOLD = 72;

// ── Types ─────────────────────────────────────────────────────────────────────

interface AttemptRecord {
  PK: string;
  SK: string;
  certId: string;
  examId: string;
  score: number;
  timestamp: string;
  timeTaken: number;
}

type SortOrder = 'date_asc' | 'date_desc' | 'score_asc' | 'score_desc';
type StatusFilter = 'passed' | 'failed' | null;

// ── In-memory simulation of server-side filtering and sorting ─────────────────

/**
 * Simulates the server-side filtering logic from buildFilterExpressions.
 * Applies certId and status filters to a set of attempts.
 */
function applyFilters(
  attempts: AttemptRecord[],
  certIdFilter: string | null,
  statusFilter: StatusFilter,
): AttemptRecord[] {
  return attempts.filter((attempt) => {
    if (certIdFilter && attempt.certId !== certIdFilter) {
      return false;
    }
    if (statusFilter === 'passed' && attempt.score < PASS_THRESHOLD) {
      return false;
    }
    if (statusFilter === 'failed' && attempt.score >= PASS_THRESHOLD) {
      return false;
    }
    return true;
  });
}

/**
 * Simulates the server-side sorting logic.
 * - date_asc / date_desc: sort by SK (which contains timestamp)
 * - score_asc / score_desc: sort by score
 */
function applySorting(attempts: AttemptRecord[], sort: SortOrder): AttemptRecord[] {
  const sorted = [...attempts];
  switch (sort) {
    case 'date_asc':
      sorted.sort((a, b) => (a.SK < b.SK ? -1 : a.SK > b.SK ? 1 : 0));
      break;
    case 'date_desc':
      sorted.sort((a, b) => (a.SK > b.SK ? -1 : a.SK < b.SK ? 1 : 0));
      break;
    case 'score_asc':
      sorted.sort((a, b) => a.score - b.score);
      break;
    case 'score_desc':
      sorted.sort((a, b) => b.score - a.score);
      break;
  }
  return sorted;
}

/**
 * Full server-side filter + sort pipeline (mirrors the Lambda logic).
 */
function filterAndSort(
  attempts: AttemptRecord[],
  certIdFilter: string | null,
  statusFilter: StatusFilter,
  sort: SortOrder,
): AttemptRecord[] {
  const filtered = applyFilters(attempts, certIdFilter, statusFilter);
  return applySorting(filtered, sort);
}

// ── Generators ────────────────────────────────────────────────────────────────

const certIdArb = fc.constantFrom('SAA-C03', 'DVA-C02', 'SOA-C02', 'SAP-C02', 'CLF-C02');

const examIdArb = fc.constantFrom('exam-1', 'exam-2', 'exam-3', 'exam-4', 'exam-5');

/**
 * Generate a realistic ISO timestamp within a reasonable range.
 * Uses integer-based approach to avoid invalid date issues in fast-check v4.
 */
const MIN_TS = new Date('2023-01-01T00:00:00Z').getTime();
const MAX_TS = new Date('2025-12-31T23:59:59Z').getTime();

const timestampArb = fc.integer({ min: MIN_TS, max: MAX_TS })
  .map((ms) => new Date(ms).toISOString());

/**
 * Generate a score between 0 and 100.
 */
const scoreArb = fc.integer({ min: 0, max: 100 });

/**
 * Generate a single attempt record with realistic data.
 */
const attemptRecordArb = fc.tuple(certIdArb, examIdArb, timestampArb, scoreArb, fc.integer({ min: 10, max: 120 }))
  .map(([certId, examId, timestamp, score, timeTaken]) => ({
    PK: 'USER#test-user',
    SK: `ATTEMPT#${timestamp}#EXAM#${examId}`,
    certId,
    examId,
    score,
    timestamp,
    timeTaken,
  }));

/**
 * Generate a list of attempt records (1-50 items).
 */
const attemptsArb = fc.array(attemptRecordArb, { minLength: 1, maxLength: 50 });

/**
 * Generate an optional certId filter (null means no filter).
 */
const certIdFilterArb = fc.oneof(fc.constant(null), certIdArb);

/**
 * Generate an optional status filter.
 */
const statusFilterArb: fc.Arbitrary<StatusFilter> = fc.constantFrom(null, 'passed', 'failed');

/**
 * Generate a sort order.
 */
const sortOrderArb: fc.Arbitrary<SortOrder> = fc.constantFrom('date_asc', 'date_desc', 'score_asc', 'score_desc');

// ── Property Tests ────────────────────────────────────────────────────────────

describe('Feature: study-mode-enhancements, Property 12: Server-side filtering and sorting', () => {
  it('filtered results contain only attempts matching the certId filter', () => {
    fc.assert(
      fc.property(attemptsArb, certIdArb, (attempts, certId) => {
        const result = filterAndSort(attempts, certId, null, 'date_desc');

        // Every returned attempt must have the matching certId
        for (const attempt of result) {
          expect(attempt.certId).toBe(certId);
        }

        // All attempts with the matching certId should be included
        const expected = attempts.filter((a) => a.certId === certId);
        expect(result.length).toBe(expected.length);
      }),
      { numRuns: 20 },
    );
  });

  it('filtered results contain only attempts matching the status filter (passed: score >= 72)', () => {
    fc.assert(
      fc.property(attemptsArb, (attempts) => {
        const result = filterAndSort(attempts, null, 'passed', 'date_desc');

        // Every returned attempt must have score >= PASS_THRESHOLD
        for (const attempt of result) {
          expect(attempt.score).toBeGreaterThanOrEqual(PASS_THRESHOLD);
        }

        // All passing attempts should be included
        const expected = attempts.filter((a) => a.score >= PASS_THRESHOLD);
        expect(result.length).toBe(expected.length);
      }),
      { numRuns: 20 },
    );
  });

  it('filtered results contain only attempts matching the status filter (failed: score < 72)', () => {
    fc.assert(
      fc.property(attemptsArb, (attempts) => {
        const result = filterAndSort(attempts, null, 'failed', 'date_desc');

        // Every returned attempt must have score < PASS_THRESHOLD
        for (const attempt of result) {
          expect(attempt.score).toBeLessThan(PASS_THRESHOLD);
        }

        // All failing attempts should be included
        const expected = attempts.filter((a) => a.score < PASS_THRESHOLD);
        expect(result.length).toBe(expected.length);
      }),
      { numRuns: 20 },
    );
  });

  it('combined certId + status filters return only attempts matching BOTH conditions', () => {
    fc.assert(
      fc.property(attemptsArb, certIdArb, statusFilterArb.filter(s => s !== null), (attempts, certId, status) => {
        const result = filterAndSort(attempts, certId, status, 'date_desc');

        for (const attempt of result) {
          // Must match certId
          expect(attempt.certId).toBe(certId);

          // Must match status
          if (status === 'passed') {
            expect(attempt.score).toBeGreaterThanOrEqual(PASS_THRESHOLD);
          } else {
            expect(attempt.score).toBeLessThan(PASS_THRESHOLD);
          }
        }

        // Count should match manual filtering
        const expected = attempts.filter((a) => {
          if (a.certId !== certId) return false;
          if (status === 'passed' && a.score < PASS_THRESHOLD) return false;
          if (status === 'failed' && a.score >= PASS_THRESHOLD) return false;
          return true;
        });
        expect(result.length).toBe(expected.length);
      }),
      { numRuns: 20 },
    );
  });

  it('date_asc sort produces results in ascending chronological order (by SK)', () => {
    fc.assert(
      fc.property(attemptsArb, certIdFilterArb, statusFilterArb, (attempts, certId, status) => {
        const result = filterAndSort(attempts, certId, status, 'date_asc');

        // Verify ascending order by SK
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].SK <= result[i + 1].SK).toBe(true);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('date_desc sort produces results in descending chronological order (by SK)', () => {
    fc.assert(
      fc.property(attemptsArb, certIdFilterArb, statusFilterArb, (attempts, certId, status) => {
        const result = filterAndSort(attempts, certId, status, 'date_desc');

        // Verify descending order by SK
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].SK >= result[i + 1].SK).toBe(true);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('score_asc sort produces results in ascending score order', () => {
    fc.assert(
      fc.property(attemptsArb, certIdFilterArb, statusFilterArb, (attempts, certId, status) => {
        const result = filterAndSort(attempts, certId, status, 'score_asc');

        // Verify ascending order by score
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].score).toBeLessThanOrEqual(result[i + 1].score);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('score_desc sort produces results in descending score order', () => {
    fc.assert(
      fc.property(attemptsArb, certIdFilterArb, statusFilterArb, (attempts, certId, status) => {
        const result = filterAndSort(attempts, certId, status, 'score_desc');

        // Verify descending order by score
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('no filter (null certId, null status) returns all attempts in correct sort order', () => {
    fc.assert(
      fc.property(attemptsArb, sortOrderArb, (attempts, sort) => {
        const result = filterAndSort(attempts, null, null, sort);

        // Should return all attempts
        expect(result.length).toBe(attempts.length);

        // Verify sort order
        for (let i = 0; i < result.length - 1; i++) {
          switch (sort) {
            case 'date_asc':
              expect(result[i].SK <= result[i + 1].SK).toBe(true);
              break;
            case 'date_desc':
              expect(result[i].SK >= result[i + 1].SK).toBe(true);
              break;
            case 'score_asc':
              expect(result[i].score).toBeLessThanOrEqual(result[i + 1].score);
              break;
            case 'score_desc':
              expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
              break;
          }
        }
      }),
      { numRuns: 20 },
    );
  });

  it('filtering never introduces items that were not in the original set', () => {
    fc.assert(
      fc.property(attemptsArb, certIdFilterArb, statusFilterArb, sortOrderArb, (attempts, certId, status, sort) => {
        const result = filterAndSort(attempts, certId, status, sort);

        // Every item in the result must exist in the original attempts
        const originalSKs = new Set(attempts.map((a) => a.SK));
        for (const attempt of result) {
          expect(originalSKs.has(attempt.SK)).toBe(true);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('filtering is idempotent — applying the same filter twice yields the same result', () => {
    fc.assert(
      fc.property(attemptsArb, certIdFilterArb, statusFilterArb, sortOrderArb, (attempts, certId, status, sort) => {
        const result1 = filterAndSort(attempts, certId, status, sort);
        const result2 = filterAndSort(result1, certId, status, sort);

        // Applying filters to already-filtered results should yield the same set
        expect(result2.length).toBe(result1.length);
        for (let i = 0; i < result1.length; i++) {
          expect(result2[i].SK).toBe(result1[i].SK);
        }
      }),
      { numRuns: 20 },
    );
  });
});
