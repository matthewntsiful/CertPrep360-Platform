/**
 * Property 6: Leitner box state transitions
 *
 * For any question in the Weak_Pool at box level B, answering correctly
 * SHALL move it to box B+1 (or remove it if B=3), and answering incorrectly
 * SHALL move it to box 1. For any question not in the Weak_Pool that is
 * answered incorrectly, it SHALL be added to box 1.
 *
 * Feature: study-mode-enhancements, Property 6: Leitner box state transitions
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  addToBox1,
  promote,
  demote,
  removeFromPool,
} from '../../common/weakPool.js';

// ── Generators ────────────────────────────────────────────────────────────────

/**
 * Generate a valid question ID.
 */
const questionIdArb = fc.uuid();

/**
 * Generate a valid domain name.
 */
const domainArb = fc.string({ minLength: 3, maxLength: 80 });

/**
 * Generate a valid certification ID.
 */
const certIdArb = fc.stringMatching(/^[A-Z]{2,5}-[A-Z0-9]{2,5}$/);

/**
 * Generate a valid Leitner box number (1, 2, or 3).
 */
const boxArb = fc.constantFrom(1, 2, 3) as fc.Arbitrary<1 | 2 | 3>;

/**
 * Generate a valid ISO timestamp string within a reasonable range.
 */
const isoTimestampArb = fc.integer({
  min: new Date('2023-01-01').getTime(),
  max: new Date('2025-12-31').getTime(),
}).map(ts => new Date(ts).toISOString());

/**
 * Generate a single Weak Pool entry.
 */
const weakPoolEntryArb = fc.record({
  box: boxArb,
  addedAt: isoTimestampArb,
  lastReviewed: isoTimestampArb,
  domain: domainArb,
  certId: certIdArb,
});

/**
 * Generate a Weak Pool (map of question IDs to entries).
 */
const weakPoolArb = fc.dictionary(
  fc.uuid(),
  weakPoolEntryArb,
  { minKeys: 0, maxKeys: 20 },
);

// ── Property Tests ────────────────────────────────────────────────────────────

describe('Feature: study-mode-enhancements, Property 6: Leitner box state transitions', () => {
  it('addToBox1 places a new question in Box 1', () => {
    fc.assert(
      fc.property(weakPoolArb, questionIdArb, domainArb, certIdArb, (pool, qId, domain, certId) => {
        const result = addToBox1(pool, qId, domain, certId);

        // The question should exist in the result pool at Box 1
        expect(result[qId]).toBeDefined();
        expect(result[qId].box).toBe(1);
        expect(result[qId].domain).toBe(domain);
        expect(result[qId].certId).toBe(certId);
      }),
      { numRuns: 20 },
    );
  });

  it('addToBox1 preserves all existing pool entries', () => {
    fc.assert(
      fc.property(weakPoolArb, questionIdArb, domainArb, certIdArb, (pool, qId, domain, certId) => {
        const result = addToBox1(pool, qId, domain, certId);

        // All original entries (except possibly the same qId) should be preserved
        for (const [existingId, entry] of Object.entries(pool)) {
          if (existingId !== qId) {
            expect(result[existingId]).toEqual(entry);
          }
        }
      }),
      { numRuns: 20 },
    );
  });

  it('promote moves Box 1 questions to Box 2', () => {
    fc.assert(
      fc.property(weakPoolArb, questionIdArb, weakPoolEntryArb, (pool, qId, entry) => {
        // Set up a pool with a question in Box 1
        const poolWithQ = { ...pool, [qId]: { ...entry, box: 1 as const } };
        const result = promote(poolWithQ, qId);

        expect(result[qId]).toBeDefined();
        expect(result[qId].box).toBe(2);
      }),
      { numRuns: 20 },
    );
  });

  it('promote moves Box 2 questions to Box 3', () => {
    fc.assert(
      fc.property(weakPoolArb, questionIdArb, weakPoolEntryArb, (pool, qId, entry) => {
        // Set up a pool with a question in Box 2
        const poolWithQ = { ...pool, [qId]: { ...entry, box: 2 as const } };
        const result = promote(poolWithQ, qId);

        expect(result[qId]).toBeDefined();
        expect(result[qId].box).toBe(3);
      }),
      { numRuns: 20 },
    );
  });

  it('promote removes Box 3 questions from the pool (mastered)', () => {
    fc.assert(
      fc.property(weakPoolArb, questionIdArb, weakPoolEntryArb, (pool, qId, entry) => {
        // Set up a pool with a question in Box 3
        const poolWithQ = { ...pool, [qId]: { ...entry, box: 3 as const } };
        const result = promote(poolWithQ, qId);

        // Question should be removed from the pool
        expect(result[qId]).toBeUndefined();
      }),
      { numRuns: 20 },
    );
  });

  it('demote moves any question back to Box 1', () => {
    fc.assert(
      fc.property(weakPoolArb, questionIdArb, weakPoolEntryArb, boxArb, (pool, qId, entry, box) => {
        // Set up a pool with a question at any box level
        const poolWithQ = { ...pool, [qId]: { ...entry, box } };
        const result = demote(poolWithQ, qId);

        expect(result[qId]).toBeDefined();
        expect(result[qId].box).toBe(1);
      }),
      { numRuns: 20 },
    );
  });

  it('demote preserves all other pool entries unchanged', () => {
    fc.assert(
      fc.property(weakPoolArb, questionIdArb, weakPoolEntryArb, boxArb, (pool, qId, entry, box) => {
        const poolWithQ = { ...pool, [qId]: { ...entry, box } };
        const result = demote(poolWithQ, qId);

        // All entries other than the demoted question should be unchanged
        for (const [existingId, existingEntry] of Object.entries(poolWithQ)) {
          if (existingId !== qId) {
            expect(result[existingId]).toEqual(existingEntry);
          }
        }
      }),
      { numRuns: 20 },
    );
  });

  it('promote preserves all other pool entries unchanged', () => {
    fc.assert(
      fc.property(weakPoolArb, questionIdArb, weakPoolEntryArb, boxArb, (pool, qId, entry, box) => {
        const poolWithQ = { ...pool, [qId]: { ...entry, box } };
        const result = promote(poolWithQ, qId);

        // All entries other than the promoted question should be unchanged
        for (const [existingId, existingEntry] of Object.entries(poolWithQ)) {
          if (existingId !== qId) {
            expect(result[existingId]).toEqual(existingEntry);
          }
        }
      }),
      { numRuns: 20 },
    );
  });

  it('removeFromPool removes the specified question entirely', () => {
    fc.assert(
      fc.property(weakPoolArb, questionIdArb, weakPoolEntryArb, (pool, qId, entry) => {
        const poolWithQ = { ...pool, [qId]: entry };
        const result = removeFromPool(poolWithQ, qId);

        expect(result[qId]).toBeUndefined();
      }),
      { numRuns: 20 },
    );
  });

  it('removeFromPool preserves all other pool entries', () => {
    fc.assert(
      fc.property(weakPoolArb, questionIdArb, weakPoolEntryArb, (pool, qId, entry) => {
        const poolWithQ = { ...pool, [qId]: entry };
        const result = removeFromPool(poolWithQ, qId);

        for (const [existingId, existingEntry] of Object.entries(poolWithQ)) {
          if (existingId !== qId) {
            expect(result[existingId]).toEqual(existingEntry);
          }
        }
      }),
      { numRuns: 20 },
    );
  });
});
