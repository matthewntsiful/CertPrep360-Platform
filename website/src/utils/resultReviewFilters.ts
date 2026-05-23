/**
 * Pure filtering functions for the ResultReview page.
 *
 * These functions implement the filter logic for question lists:
 * - "correct": returns only questions where isCorrect is true
 * - "incorrect": returns only questions where isCorrect is false AND selected is non-null
 * - "skipped": returns only questions where selected is null
 * - "all": returns all questions unfiltered
 */

export type FilterTab = 'all' | 'correct' | 'incorrect' | 'skipped';

export interface FilterableQuestion {
  isCorrect: boolean;
  selected: string | null;
}

/**
 * Filters a list of questions based on the active filter tab.
 *
 * @param questions - Array of questions with isCorrect and selected fields
 * @param filter - The active filter tab
 * @returns Filtered array of questions
 */
export function filterQuestions<T extends FilterableQuestion>(
  questions: T[],
  filter: FilterTab,
): T[] {
  switch (filter) {
    case 'correct':
      return questions.filter(q => q.isCorrect);
    case 'incorrect':
      return questions.filter(q => !q.isCorrect && q.selected !== null);
    case 'skipped':
      return questions.filter(q => q.selected === null);
    default:
      return questions;
  }
}
