/**
 * Property 5: ResultReview filter correctness
 *
 * For any set of question answers with mixed correctness and skipped status,
 * applying the "correct" filter SHALL return only answers where isCorrect is true,
 * applying the "incorrect" filter SHALL return only answers where isCorrect is false
 * and selected is non-null, and applying the "skipped" filter SHALL return only
 * answers where selected is null.
 *
 * Feature: study-mode-enhancements, Property 5: ResultReview filter correctness
 *
 * **Validates: Requirements 4.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterQuestions, type FilterableQuestion } from '../../utils/resultReviewFilters';

// ── Generators ────────────────────────────────────────────────────────────────

/**
 * Generate a valid option letter (A, B, C, D, E).
 */
const optionLetterArb = fc.constantFrom('A', 'B', 'C', 'D', 'E');

/**
 * Generate a selected value: either a valid option letter or null (skipped).
 */
const selectedArb = fc.oneof(
  { weight: 3, arbitrary: optionLetterArb },
  { weight: 1, arbitrary: fc.constant(null) },
);

/**
 * Generate a single question answer with isCorrect and selected fields.
 * Ensures logical consistency:
 * - If selected is null (skipped), isCorrect must be false
 * - If selected is non-null, isCorrect can be true or false
 */
const questionArb: fc.Arbitrary<FilterableQuestion> = selectedArb.chain(selected => {
  if (selected === null) {
    // Skipped questions are never correct
    return fc.constant({ isCorrect: false, selected: null as string | null });
  }
  return fc.boolean().map(isCorrect => ({ isCorrect, selected }));
});

/**
 * Generate a list of questions with mixed correctness and skipped status.
 */
const questionListArb = fc.array(questionArb, { minLength: 0, maxLength: 50 });

// ── Property Tests ────────────────────────────────────────────────────────────

describe('Feature: study-mode-enhancements, Property 5: ResultReview filter correctness', () => {
  it('"correct" filter returns only questions where isCorrect is true', () => {
    fc.assert(
      fc.property(questionListArb, (questions) => {
        const result = filterQuestions(questions, 'correct');

        // Every returned question must have isCorrect === true
        for (const q of result) {
          expect(q.isCorrect).toBe(true);
        }

        // All correct questions from the input must be in the result
        const expectedCount = questions.filter(q => q.isCorrect).length;
        expect(result.length).toBe(expectedCount);
      }),
      { numRuns: 20 },
    );
  });

  it('"incorrect" filter returns only questions where isCorrect is false AND selected is non-null', () => {
    fc.assert(
      fc.property(questionListArb, (questions) => {
        const result = filterQuestions(questions, 'incorrect');

        // Every returned question must have isCorrect === false and selected !== null
        for (const q of result) {
          expect(q.isCorrect).toBe(false);
          expect(q.selected).not.toBeNull();
        }

        // All incorrect non-skipped questions from the input must be in the result
        const expectedCount = questions.filter(q => !q.isCorrect && q.selected !== null).length;
        expect(result.length).toBe(expectedCount);
      }),
      { numRuns: 20 },
    );
  });

  it('"skipped" filter returns only questions where selected is null', () => {
    fc.assert(
      fc.property(questionListArb, (questions) => {
        const result = filterQuestions(questions, 'skipped');

        // Every returned question must have selected === null
        for (const q of result) {
          expect(q.selected).toBeNull();
        }

        // All skipped questions from the input must be in the result
        const expectedCount = questions.filter(q => q.selected === null).length;
        expect(result.length).toBe(expectedCount);
      }),
      { numRuns: 20 },
    );
  });

  it('"all" filter returns all questions unchanged', () => {
    fc.assert(
      fc.property(questionListArb, (questions) => {
        const result = filterQuestions(questions, 'all');

        expect(result.length).toBe(questions.length);
        expect(result).toEqual(questions);
      }),
      { numRuns: 20 },
    );
  });

  it('filters are mutually exclusive and exhaustive (correct + incorrect + skipped = all)', () => {
    fc.assert(
      fc.property(questionListArb, (questions) => {
        const correct = filterQuestions(questions, 'correct');
        const incorrect = filterQuestions(questions, 'incorrect');
        const skipped = filterQuestions(questions, 'skipped');

        // The three filters should partition the full list (no overlaps, no gaps)
        expect(correct.length + incorrect.length + skipped.length).toBe(questions.length);
      }),
      { numRuns: 20 },
    );
  });
});
