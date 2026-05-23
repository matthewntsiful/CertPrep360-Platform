/**
 * Property-Based Test: Per-domain accuracy computation
 *
 * Feature: study-mode-enhancements
 * Property 2: Per-domain accuracy computation
 *
 * Validates: Requirements 2.1
 *
 * For any attempt record containing answers with domain and isCorrect fields,
 * the computed domainScores map SHALL have each domain's value equal to
 * (correct answers in domain / total answers in domain) * 100, rounded to the nearest integer.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
// @ts-ignore - JS module without type declarations
import { computeDomainScores } from './domainScoring.js';

/**
 * Arbitrary for generating a non-empty domain name.
 * Uses stringMatching to produce alphabetic domain names with spaces.
 */
const domainArb = fc.stringMatching(/^[a-z][a-z ]{0,28}[a-z]$/);

/**
 * Arbitrary for generating a single answer entry.
 */
const answerArb = fc.record({
  domain: domainArb,
  isCorrect: fc.boolean(),
});

/**
 * Arbitrary for generating a non-empty answers map (Record<string, { domain, isCorrect }>).
 * Keys are string indices.
 */
const answersArb = fc
  .array(answerArb, { minLength: 1, maxLength: 100 })
  .map((answers) => {
    const record: Record<string, { domain: string; isCorrect: boolean }> = {};
    answers.forEach((answer, index) => {
      record[String(index)] = answer;
    });
    return record;
  });

describe('Feature: study-mode-enhancements, Property 2: Per-domain accuracy computation', () => {
  it('domainScores[d] === round((correct in d / total in d) * 100) for all domains', () => {
    fc.assert(
      fc.property(answersArb, (answers) => {
        const result = computeDomainScores(answers);

        // Compute expected domain scores manually
        const domainStats: Record<string, { correct: number; total: number }> = {};
        for (const answer of Object.values(answers)) {
          const { domain, isCorrect } = answer;
          if (!domainStats[domain]) {
            domainStats[domain] = { correct: 0, total: 0 };
          }
          domainStats[domain].total += 1;
          if (isCorrect) {
            domainStats[domain].correct += 1;
          }
        }

        // Verify each domain's score matches the expected computation
        for (const [domain, stats] of Object.entries(domainStats)) {
          const expected = Math.round((stats.correct / stats.total) * 100);
          expect(result[domain]).toBe(expected);
        }

        // Verify no extra domains in the result
        const expectedDomains = Object.keys(domainStats).sort();
        const actualDomains = Object.keys(result).sort();
        expect(actualDomains).toEqual(expectedDomains);
      }),
      { numRuns: 100 }
    );
  });

  it('returns scores in the range [0, 100] for all domains', () => {
    fc.assert(
      fc.property(answersArb, (answers) => {
        const result = computeDomainScores(answers);

        for (const score of Object.values(result)) {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('returns 100 when all answers in a domain are correct', () => {
    fc.assert(
      fc.property(
        fc.array(domainArb, { minLength: 1, maxLength: 10 }),
        (domains) => {
          // Create answers where all are correct
          const answers: Record<string, { domain: string; isCorrect: boolean }> = {};
          domains.forEach((domain, index) => {
            answers[String(index)] = { domain, isCorrect: true };
          });

          const result = computeDomainScores(answers);

          for (const score of Object.values(result)) {
            expect(score).toBe(100);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns 0 when all answers in a domain are incorrect', () => {
    fc.assert(
      fc.property(
        fc.array(domainArb, { minLength: 1, maxLength: 10 }),
        (domains) => {
          // Create answers where all are incorrect
          const answers: Record<string, { domain: string; isCorrect: boolean }> = {};
          domains.forEach((domain, index) => {
            answers[String(index)] = { domain, isCorrect: false };
          });

          const result = computeDomainScores(answers);

          for (const score of Object.values(result)) {
            expect(score).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
