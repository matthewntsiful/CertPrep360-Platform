/**
 * Property 7: Spaced repetition scheduling
 *
 * For any Weak_Pool state with a given session counter and current timestamp,
 * the scheduling function SHALL include all Box 1 questions, SHALL include
 * Box 2 questions if and only if sessionCounter mod 3 equals 0, and SHALL
 * include Box 3 questions if and only if the time since lastReviewed is
 * greater than or equal to 7 days.
 *
 * Feature: study-mode-enhancements, Property 7: Spaced repetition scheduling
 *
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getScheduledQuestions,
  isScheduledForReview,
  shouldIncludeBox2,
  shouldIncludeBox3,
} from '../../common/spacedScheduler.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ── Generators ────────────────────────────────────────────────────────────────

/**
 * Generate a valid session counter (non-negative integer).
 */
const sessionCounterArb = fc.nat({ max: 10_000 });

/**
 * Generate a valid ISO timestamp for lastReviewed within a reasonable range.
 * Uses integer timestamps to avoid invalid date issues during shrinking.
 */
const MIN_TS = new Date('2020-01-01T00:00:00Z').getTime();
const MAX_TS = new Date('2025-12-31T23:59:59Z').getTime();
const MAX_NOW_TS = new Date('2026-06-30T23:59:59Z').getTime();

const isoTimestampArb = fc.integer({ min: MIN_TS, max: MAX_TS })
  .map((ts) => new Date(ts).toISOString());

/**
 * Generate a "now" date that is always after or equal to the lastReviewed date.
 */
const nowDateArb = fc.integer({ min: MIN_TS, max: MAX_NOW_TS })
  .map((ts) => new Date(ts));

/**
 * Generate a valid Weak Pool entry for a specific box.
 */
const weakPoolEntryArb = (box: 1 | 2 | 3) =>
  fc.record({
    box: fc.constant(box),
    lastReviewed: isoTimestampArb,
    domain: fc.stringMatching(/^[a-zA-Z ]{3,40}$/),
    certId: fc.stringMatching(/^[a-zA-Z0-9]{3,10}$/),
  });

/**
 * Generate a Weak Pool entry with any valid box value.
 */
const anyWeakPoolEntryArb = fc.oneof(
  weakPoolEntryArb(1),
  weakPoolEntryArb(2),
  weakPoolEntryArb(3),
);

/**
 * Generate a questions map with multiple entries across different boxes.
 */
const questionsMapArb = fc
  .array(
    fc.tuple(fc.uuid(), anyWeakPoolEntryArb),
    { minLength: 1, maxLength: 50 },
  )
  .map((entries) => Object.fromEntries(entries));

// ── Property Tests ────────────────────────────────────────────────────────────

describe('Feature: study-mode-enhancements, Property 7: Spaced repetition scheduling', () => {
  it('Box 1 questions are always included in every session', () => {
    fc.assert(
      fc.property(
        sessionCounterArb,
        nowDateArb,
        fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }),
        (sessionCounter, now, questionIds) => {
          // Build a questions map with all entries in Box 1
          const questions: Record<string, any> = {};
          for (const qId of questionIds) {
            questions[qId] = {
              box: 1,
              lastReviewed: new Date('2024-01-01').toISOString(),
              domain: 'TestDomain',
              certId: 'SAA-C03',
            };
          }

          const scheduled = getScheduledQuestions(questions, sessionCounter, now);

          // All Box 1 questions must be included
          const scheduledIds = scheduled.map((s: any) => s.questionId);
          for (const qId of questionIds) {
            expect(scheduledIds).toContain(qId);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('Box 2 questions are included if and only if sessionCounter % 3 === 0', () => {
    fc.assert(
      fc.property(
        sessionCounterArb,
        nowDateArb,
        fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }),
        (sessionCounter, now, questionIds) => {
          // Build a questions map with all entries in Box 2
          const questions: Record<string, any> = {};
          for (const qId of questionIds) {
            questions[qId] = {
              box: 2,
              lastReviewed: new Date('2024-01-01').toISOString(),
              domain: 'TestDomain',
              certId: 'SAA-C03',
            };
          }

          const scheduled = getScheduledQuestions(questions, sessionCounter, now);
          const scheduledIds = scheduled.map((s: any) => s.questionId);

          if (sessionCounter % 3 === 0) {
            // All Box 2 questions must be included
            for (const qId of questionIds) {
              expect(scheduledIds).toContain(qId);
            }
          } else {
            // No Box 2 questions should be included
            for (const qId of questionIds) {
              expect(scheduledIds).not.toContain(qId);
            }
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('Box 3 questions are included if and only if lastReviewed >= 7 days ago', () => {
    fc.assert(
      fc.property(
        sessionCounterArb,
        nowDateArb,
        isoTimestampArb,
        fc.uuid(),
        (sessionCounter, now, lastReviewed, questionId) => {
          const questions: Record<string, any> = {
            [questionId]: {
              box: 3,
              lastReviewed,
              domain: 'TestDomain',
              certId: 'SAA-C03',
            },
          };

          const scheduled = getScheduledQuestions(questions, sessionCounter, now);
          const scheduledIds = scheduled.map((s: any) => s.questionId);

          const elapsed = now.getTime() - new Date(lastReviewed).getTime();

          if (elapsed >= SEVEN_DAYS_MS) {
            expect(scheduledIds).toContain(questionId);
          } else {
            expect(scheduledIds).not.toContain(questionId);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('shouldIncludeBox2 returns true iff sessionCounter % 3 === 0', () => {
    fc.assert(
      fc.property(sessionCounterArb, (sessionCounter) => {
        const result = shouldIncludeBox2(sessionCounter);
        expect(result).toBe(sessionCounter % 3 === 0);
      }),
      { numRuns: 20 },
    );
  });

  it('shouldIncludeBox3 returns true iff elapsed time >= 7 days', () => {
    fc.assert(
      fc.property(
        isoTimestampArb,
        nowDateArb,
        (lastReviewed, now) => {
          const result = shouldIncludeBox3(lastReviewed, now);
          const elapsed = now.getTime() - new Date(lastReviewed).getTime();
          expect(result).toBe(elapsed >= SEVEN_DAYS_MS);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('isScheduledForReview is consistent with getScheduledQuestions for individual entries', () => {
    fc.assert(
      fc.property(
        anyWeakPoolEntryArb,
        sessionCounterArb,
        nowDateArb,
        fc.uuid(),
        (entry, sessionCounter, now, questionId) => {
          // Test that isScheduledForReview matches what getScheduledQuestions returns
          const questions: Record<string, any> = {
            [questionId]: entry,
          };

          const scheduled = getScheduledQuestions(questions, sessionCounter, now);
          const isIncluded = scheduled.some((s: any) => s.questionId === questionId);
          const directResult = isScheduledForReview(entry, sessionCounter, now);

          expect(isIncluded).toBe(directResult);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('mixed box questions: only eligible questions are scheduled', () => {
    fc.assert(
      fc.property(
        questionsMapArb,
        sessionCounterArb,
        nowDateArb,
        (questions, sessionCounter, now) => {
          const scheduled = getScheduledQuestions(questions, sessionCounter, now);

          for (const item of scheduled) {
            const entry = questions[item.questionId];
            expect(entry).toBeDefined();

            if (entry.box === 1) {
              // Box 1 always valid
              expect(true).toBe(true);
            } else if (entry.box === 2) {
              // Box 2 only if sessionCounter % 3 === 0
              expect(sessionCounter % 3).toBe(0);
            } else if (entry.box === 3) {
              // Box 3 only if >= 7 days elapsed
              const elapsed = now.getTime() - new Date(entry.lastReviewed).getTime();
              expect(elapsed).toBeGreaterThanOrEqual(SEVEN_DAYS_MS);
            }
          }

          // Also verify no eligible questions were missed
          for (const [qId, entry] of Object.entries(questions) as [string, any][]) {
            const isScheduled = scheduled.some((s: any) => s.questionId === qId);
            const shouldBeScheduled = isScheduledForReview(entry, sessionCounter, now);
            expect(isScheduled).toBe(shouldBeScheduled);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
