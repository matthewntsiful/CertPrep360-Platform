/**
 * Property 4: Question snapshot persistence with size enforcement
 *
 * For any valid set of question snapshots submitted with exam results,
 * the stored attempt record SHALL preserve all question text, options,
 * and correct answer fields unchanged, AND the total serialized item size
 * SHALL be less than 400KB. If the original payload exceeds 400KB,
 * explanation fields SHALL be truncated while all other snapshot fields
 * remain intact.
 *
 * Feature: study-mode-enhancements, Property 4: Question snapshot persistence with size enforcement
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  estimateSize,
  fitsWithinLimit,
  truncateSnapshots,
} from '../../common/snapshotTruncation.js';

const MAX_ITEM_SIZE_BYTES = 400 * 1024;

// ── Generators ────────────────────────────────────────────────────────────────

/**
 * Generate a valid question snapshot with realistic field sizes.
 */
const questionSnapshotArb = fc.record({
  q_id: fc.uuid(),
  text: fc.string({ minLength: 10, maxLength: 500 }),
  options: fc.record({
    A: fc.string({ minLength: 5, maxLength: 200 }),
    B: fc.string({ minLength: 5, maxLength: 200 }),
    C: fc.string({ minLength: 5, maxLength: 200 }),
    D: fc.string({ minLength: 5, maxLength: 200 }),
  }),
  correct: fc.constantFrom('A', 'B', 'C', 'D'),
  explanation: fc.string({ minLength: 0, maxLength: 2000 }),
  domain: fc.string({ minLength: 3, maxLength: 80 }),
});

/**
 * Generate a set of snapshots that may or may not exceed 400KB.
 * We use between 1 and 120 snapshots to cover both small and large payloads.
 */
const snapshotsArb = fc.array(questionSnapshotArb, { minLength: 1, maxLength: 120 });

/**
 * Generate snapshots that are likely to exceed 400KB (large explanations).
 * This ensures we exercise the truncation path.
 * We use 65 snapshots (typical exam size) with large explanations to push over 400KB.
 */
const oversizedSnapshotsArb = fc.array(
  fc.record({
    q_id: fc.uuid(),
    text: fc.string({ minLength: 50, maxLength: 300 }),
    options: fc.record({
      A: fc.string({ minLength: 20, maxLength: 150 }),
      B: fc.string({ minLength: 20, maxLength: 150 }),
      C: fc.string({ minLength: 20, maxLength: 150 }),
      D: fc.string({ minLength: 20, maxLength: 150 }),
    }),
    correct: fc.constantFrom('A', 'B', 'C', 'D'),
    explanation: fc.string({ minLength: 4000, maxLength: 6000 }),
    domain: fc.string({ minLength: 3, maxLength: 50 }),
  }),
  { minLength: 65, maxLength: 80 },
);

/**
 * Generate a realistic base item size (the non-snapshot portion of the DynamoDB item).
 * Typically 1KB-10KB for metadata, answers, etc.
 */
const baseItemSizeArb = fc.integer({ min: 0, max: 10_000 });

// ── Property Tests ────────────────────────────────────────────────────────────

describe('Feature: study-mode-enhancements, Property 4: Question snapshot persistence with size enforcement', () => {
  it('truncateSnapshots output always fits within 400KB limit', () => {
    fc.assert(
      fc.property(snapshotsArb, baseItemSizeArb, (snapshots, baseItemSize) => {
        const result = truncateSnapshots(snapshots, baseItemSize);
        const totalSize = baseItemSize + estimateSize(result);
        expect(totalSize).toBeLessThan(MAX_ITEM_SIZE_BYTES);
      }),
      { numRuns: 20 },
    );
  });

  it('truncateSnapshots preserves question text unchanged', () => {
    fc.assert(
      fc.property(snapshotsArb, baseItemSizeArb, (snapshots, baseItemSize) => {
        const result = truncateSnapshots(snapshots, baseItemSize);
        for (let i = 0; i < snapshots.length; i++) {
          expect(result[i].text).toBe(snapshots[i].text);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('truncateSnapshots preserves options unchanged', () => {
    fc.assert(
      fc.property(snapshotsArb, baseItemSizeArb, (snapshots, baseItemSize) => {
        const result = truncateSnapshots(snapshots, baseItemSize);
        for (let i = 0; i < snapshots.length; i++) {
          expect(result[i].options).toEqual(snapshots[i].options);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('truncateSnapshots preserves correct answer field unchanged', () => {
    fc.assert(
      fc.property(snapshotsArb, baseItemSizeArb, (snapshots, baseItemSize) => {
        const result = truncateSnapshots(snapshots, baseItemSize);
        for (let i = 0; i < snapshots.length; i++) {
          expect(result[i].correct).toBe(snapshots[i].correct);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('truncateSnapshots only modifies explanation fields when truncation is needed', () => {
    fc.assert(
      fc.property(snapshotsArb, baseItemSizeArb, (snapshots, baseItemSize) => {
        const result = truncateSnapshots(snapshots, baseItemSize);

        // If the original already fits, explanations should be unchanged
        if (fitsWithinLimit(snapshots, baseItemSize)) {
          for (let i = 0; i < snapshots.length; i++) {
            expect(result[i].explanation).toBe(snapshots[i].explanation);
          }
        } else {
          // When truncation occurs, explanations should be shorter or equal
          for (let i = 0; i < snapshots.length; i++) {
            expect(result[i].explanation.length).toBeLessThanOrEqual(
              snapshots[i].explanation.length,
            );
          }
        }
      }),
      { numRuns: 20 },
    );
  });

  it('truncateSnapshots with oversized payloads still fits within 400KB', () => {
    fc.assert(
      fc.property(oversizedSnapshotsArb, baseItemSizeArb, (snapshots, baseItemSize) => {
        const result = truncateSnapshots(snapshots, baseItemSize);
        const totalSize = baseItemSize + estimateSize(result);
        expect(totalSize).toBeLessThan(MAX_ITEM_SIZE_BYTES);
      }),
      { numRuns: 20 },
    );
  });

  it('truncateSnapshots preserves the number of snapshots (never drops questions)', () => {
    fc.assert(
      fc.property(snapshotsArb, baseItemSizeArb, (snapshots, baseItemSize) => {
        const result = truncateSnapshots(snapshots, baseItemSize);
        expect(result.length).toBe(snapshots.length);
      }),
      { numRuns: 20 },
    );
  });

  it('truncateSnapshots preserves q_id and domain fields unchanged', () => {
    fc.assert(
      fc.property(snapshotsArb, baseItemSizeArb, (snapshots, baseItemSize) => {
        const result = truncateSnapshots(snapshots, baseItemSize);
        for (let i = 0; i < snapshots.length; i++) {
          expect(result[i].q_id).toBe(snapshots[i].q_id);
          expect(result[i].domain).toBe(snapshots[i].domain);
        }
      }),
      { numRuns: 20 },
    );
  });
});
