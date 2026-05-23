/**
 * Properties 8, 9, 10: Adaptive Domain Selection
 *
 * Property 8: Adaptive domain selection with inverse weighting
 * For any domain performance map with 3 or more domains, the adaptive selection
 * algorithm SHALL select the 2-3 domains with the lowest accuracy, and SHALL
 * allocate questions inversely proportional to accuracy (a domain with half the
 * accuracy of another SHALL receive approximately double the questions).
 *
 * Property 9: Minimum questions per domain invariant
 * For any adaptive quiz generation with a total question limit >= 2 × number of
 * selected domains, each selected domain SHALL receive at least 2 questions in
 * the final allocation.
 *
 * Property 10: Explicit domain selection
 * For any quiz request specifying explicit domain names, all returned questions
 * SHALL belong to one of the specified domains, and no questions from unspecified
 * domains SHALL be included.
 *
 * Feature: study-mode-enhancements, Property 8/9/10
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  identifyWeakDomains,
  computeInverseWeights,
  allocateQuestions,
  selectAndAllocate,
} from '../../common/adaptiveSelection.js';

// ── Generators ────────────────────────────────────────────────────────────────

/**
 * Generate a valid domain name (alphanumeric + spaces, avoids prototype property names).
 */
const domainNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{2,49}$/);

/**
 * Generate a valid accuracy percentage (0-100).
 */
const accuracyArb = fc.integer({ min: 0, max: 100 });

/**
 * Generate a domain scores map with at least 3 domains (for adaptive selection).
 */
const domainScoresArb = (minDomains = 3, maxDomains = 8) =>
  fc.uniqueArray(domainNameArb, { minLength: minDomains, maxLength: maxDomains })
    .chain(domains =>
      fc.tuple(
        fc.constant(domains),
        fc.array(accuracyArb, { minLength: domains.length, maxLength: domains.length }),
      ),
    )
    .map(([domains, scores]) => {
      const result: Record<string, number> = {};
      for (let i = 0; i < domains.length; i++) {
        result[domains[i]] = scores[i];
      }
      return result;
    });

/**
 * Generate a total questions count that is reasonable for quiz generation.
 */
const totalQuestionsArb = fc.integer({ min: 4, max: 100 });

/**
 * Generate a domain scores map with exactly 2 domains with distinct accuracies
 * to test inverse weighting proportionality.
 */
const twoDistinctDomainScoresArb = fc.tuple(
  domainNameArb,
  domainNameArb,
  fc.integer({ min: 1, max: 99 }),
  fc.integer({ min: 1, max: 99 }),
).filter(([d1, d2, a1, a2]) => d1 !== d2 && a1 !== a2);

// ── Property 8: Adaptive domain selection with inverse weighting ──────────────

describe('Feature: study-mode-enhancements, Property 8: Adaptive domain selection with inverse weighting', () => {
  it('identifyWeakDomains selects 2-3 domains with lowest accuracy from 3+ domains', () => {
    fc.assert(
      fc.property(domainScoresArb(3, 8), (domainScores) => {
        const weakDomains = identifyWeakDomains(domainScores);

        // Should return 2-3 domains
        expect(weakDomains.length).toBeGreaterThanOrEqual(2);
        expect(weakDomains.length).toBeLessThanOrEqual(3);

        // All returned domains should exist in the input
        for (const domain of weakDomains) {
          expect(domainScores).toHaveProperty(domain);
        }

        // Returned domains should be sorted by accuracy ascending (weakest first)
        for (let i = 0; i < weakDomains.length - 1; i++) {
          expect(domainScores[weakDomains[i]]).toBeLessThanOrEqual(domainScores[weakDomains[i + 1]]);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('identifyWeakDomains returns domains with lowest accuracy (no non-weak domain has lower accuracy)', () => {
    fc.assert(
      fc.property(domainScoresArb(4, 8), (domainScores) => {
        const weakDomains = identifyWeakDomains(domainScores);
        const weakSet = new Set(weakDomains);

        // The maximum accuracy among weak domains
        const maxWeakAccuracy = Math.max(...weakDomains.map(d => domainScores[d]));

        // All non-selected domains should have accuracy >= the max weak domain accuracy
        for (const [domain, accuracy] of Object.entries(domainScores)) {
          if (!weakSet.has(domain)) {
            expect(accuracy).toBeGreaterThanOrEqual(maxWeakAccuracy);
          }
        }
      }),
      { numRuns: 20 },
    );
  });

  it('computeInverseWeights produces normalized weights that sum to 1', () => {
    fc.assert(
      fc.property(domainScoresArb(2, 6), (domainScores) => {
        const domains = Object.keys(domainScores).slice(0, 3);
        const weights = computeInverseWeights(domains, domainScores);

        // All weights should be positive
        for (const domain of domains) {
          expect(weights[domain]).toBeGreaterThan(0);
        }

        // Weights should sum to approximately 1
        const sum = Object.values(weights).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 10);
      }),
      { numRuns: 20 },
    );
  });

  it('computeInverseWeights assigns higher weight to lower accuracy domains', () => {
    fc.assert(
      fc.property(twoDistinctDomainScoresArb, ([d1, d2, a1, a2]) => {
        const domainScores: Record<string, number> = { [d1]: a1, [d2]: a2 };
        const domains = [d1, d2];
        const weights = computeInverseWeights(domains, domainScores);

        // The domain with lower accuracy should have higher weight
        if (a1 < a2) {
          expect(weights[d1]).toBeGreaterThan(weights[d2]);
        } else {
          expect(weights[d2]).toBeGreaterThan(weights[d1]);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('allocateQuestions distributes more questions to lower accuracy domains', () => {
    fc.assert(
      fc.property(
        twoDistinctDomainScoresArb,
        fc.integer({ min: 20, max: 100 }),
        ([d1, d2, a1, a2], totalQuestions) => {
          const domainScores: Record<string, number> = { [d1]: a1, [d2]: a2 };
          const domains = [d1, d2];
          const allocation = allocateQuestions(domains, domainScores, totalQuestions);

          // The domain with lower accuracy should get more (or equal) questions
          if (a1 < a2) {
            expect(allocation[d1]).toBeGreaterThanOrEqual(allocation[d2]);
          } else {
            expect(allocation[d2]).toBeGreaterThanOrEqual(allocation[d1]);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('allocateQuestions total allocation equals totalQuestions', () => {
    fc.assert(
      fc.property(domainScoresArb(2, 5), totalQuestionsArb, (domainScores, totalQuestions) => {
        const domains = Object.keys(domainScores).slice(0, 3);
        const allocation = allocateQuestions(domains, domainScores, totalQuestions);

        const sum = Object.values(allocation).reduce((a, b) => a + b, 0);
        expect(sum).toBe(totalQuestions);
      }),
      { numRuns: 20 },
    );
  });
});

// ── Property 9: Minimum questions per domain invariant ────────────────────────

describe('Feature: study-mode-enhancements, Property 9: Minimum questions per domain invariant', () => {
  it('each selected domain receives at least 2 questions when totalQuestions >= 2 × domains', () => {
    fc.assert(
      fc.property(domainScoresArb(2, 5), (domainScores) => {
        const domains = Object.keys(domainScores).slice(0, 3);
        // Ensure totalQuestions >= 2 * number of domains
        const totalQuestions = domains.length * 2 + Math.floor(Math.random() * 20);
        const allocation = allocateQuestions(domains, domainScores, totalQuestions);

        // Each domain should have at least 2 questions
        for (const domain of domains) {
          expect(allocation[domain]).toBeGreaterThanOrEqual(2);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('minimum 2 per domain holds for adaptive selectAndAllocate with sufficient questions', () => {
    fc.assert(
      fc.property(domainScoresArb(3, 8), (domainScores) => {
        // Use enough questions to satisfy minimum (3 domains × 2 = 6 minimum)
        const totalQuestions = 20;
        const { domains, allocation } = selectAndAllocate(domainScores, totalQuestions);

        // Each selected domain should have at least 2 questions
        for (const domain of domains) {
          expect(allocation[domain]).toBeGreaterThanOrEqual(2);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('total allocation equals totalQuestions even with minimum constraint', () => {
    fc.assert(
      fc.property(
        domainScoresArb(3, 6),
        fc.integer({ min: 6, max: 60 }),
        (domainScores, totalQuestions) => {
          const { allocation } = selectAndAllocate(domainScores, totalQuestions);

          const sum = Object.values(allocation).reduce((a, b) => a + b, 0);
          expect(sum).toBe(totalQuestions);
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ── Property 10: Explicit domain selection ────────────────────────────────────

describe('Feature: study-mode-enhancements, Property 10: Explicit domain selection', () => {
  it('selectAndAllocate uses explicit domains when provided instead of auto-selecting', () => {
    fc.assert(
      fc.property(domainScoresArb(4, 8), (domainScores) => {
        const allDomains = Object.keys(domainScores);
        // Pick a subset of 2 domains explicitly
        const explicitDomains = allDomains.slice(0, 2);
        const totalQuestions = 10;

        const { domains, allocation } = selectAndAllocate(domainScores, totalQuestions, explicitDomains);

        // Should use exactly the explicit domains
        expect(domains).toEqual(explicitDomains);

        // Allocation should only contain the explicit domains
        const allocatedDomains = Object.keys(allocation);
        for (const domain of allocatedDomains) {
          expect(explicitDomains).toContain(domain);
        }

        // No unspecified domains should be in the allocation
        for (const domain of allDomains) {
          if (!explicitDomains.includes(domain)) {
            expect(allocation[domain]).toBeUndefined();
          }
        }
      }),
      { numRuns: 20 },
    );
  });

  it('explicit domain selection allocates all questions only to specified domains', () => {
    fc.assert(
      fc.property(
        domainScoresArb(5, 8),
        fc.integer({ min: 4, max: 40 }),
        (domainScores, totalQuestions) => {
          const allDomains = Object.keys(domainScores);
          // Pick 2-3 explicit domains
          const numExplicit = Math.min(3, allDomains.length);
          const explicitDomains = allDomains.slice(0, numExplicit);

          const { domains, allocation } = selectAndAllocate(domainScores, totalQuestions, explicitDomains);

          // Domains returned should match explicit domains exactly
          expect(new Set(domains)).toEqual(new Set(explicitDomains));

          // Total allocation should equal totalQuestions
          const sum = Object.values(allocation).reduce((a, b) => a + b, 0);
          expect(sum).toBe(totalQuestions);

          // All allocated domains should be in the explicit list
          for (const domain of Object.keys(allocation)) {
            expect(explicitDomains).toContain(domain);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('explicit domain selection still respects minimum 2 per domain when sufficient questions', () => {
    fc.assert(
      fc.property(domainScoresArb(4, 8), (domainScores) => {
        const allDomains = Object.keys(domainScores);
        const explicitDomains = allDomains.slice(0, 3);
        // Ensure enough questions for minimum (3 × 2 = 6)
        const totalQuestions = explicitDomains.length * 2 + 10;

        const { allocation } = selectAndAllocate(domainScores, totalQuestions, explicitDomains);

        // Each explicit domain should have at least 2 questions
        for (const domain of explicitDomains) {
          expect(allocation[domain]).toBeGreaterThanOrEqual(2);
        }
      }),
      { numRuns: 20 },
    );
  });
});
