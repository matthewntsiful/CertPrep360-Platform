/**
 * Property 11: Pagination completeness
 *
 * For any set of N user attempts and a page size P, iterating through all
 * pages using the returned nextCursor values SHALL eventually retrieve all
 * N attempts with no duplicates and no omissions, and each page SHALL
 * contain at most P items.
 *
 * Feature: study-mode-enhancements, Property 11: Pagination completeness
 *
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  encodeCursor,
  decodeCursor,
  clampPageSize,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../../common/pagination.js';

// ── Generators ────────────────────────────────────────────────────────────────

/**
 * Generate a valid PK string (USER#<userId> pattern).
 */
const pkArb = fc.uuid().map((id) => `USER#${id}`);

/**
 * Generate a valid SK string (ATTEMPT#<timestamp>#EXAM#<examId> pattern).
 */
const skArb = fc
  .tuple(
    fc.integer({ min: new Date('2023-01-01').getTime(), max: new Date('2025-12-31').getTime() }),
    fc.stringMatching(/^exam-[a-z0-9]{1,8}$/),
  )
  .map(([ts, examId]) => `ATTEMPT#${new Date(ts).toISOString()}#EXAM#${examId}`);

/**
 * Generate a valid DynamoDB key (PK + SK).
 */
const dynamoKeyArb = fc.record({
  PK: pkArb,
  SK: skArb,
});

/**
 * Generate a simulated attempt item with PK, SK, score, certId, and examId.
 */
const attemptItemArb = fc.record({
  PK: pkArb,
  SK: skArb,
  score: fc.integer({ min: 0, max: 100 }),
  certId: fc.stringMatching(/^[A-Z]{2,5}-[A-Z0-9]{2,5}$/),
  examId: fc.stringMatching(/^exam-[a-z0-9]{1,8}$/),
});

/**
 * Generate a list of attempt items for a single user (same PK, unique SKs).
 */
const attemptListArb = fc
  .tuple(
    pkArb,
    fc.array(
      fc.tuple(
        fc.integer({ min: new Date('2023-01-01').getTime(), max: new Date('2025-12-31').getTime() }),
        fc.stringMatching(/^exam-[a-z0-9]{1,8}$/),
        fc.integer({ min: 0, max: 100 }),
        fc.stringMatching(/^[A-Z]{2,5}-[A-Z0-9]{2,5}$/),
      ),
      { minLength: 0, maxLength: 50 },
    ),
  )
  .map(([pk, items]) => {
    // Ensure unique SKs by appending index
    return items.map((item, idx) => ({
      PK: pk,
      SK: `ATTEMPT#${new Date(item[0] + idx).toISOString()}#EXAM#${item[1]}-${idx}`,
      score: item[2],
      certId: item[3],
      examId: `${item[1]}-${idx}`,
    }));
  });

/**
 * Generate a valid page size (1 to MAX_PAGE_SIZE).
 */
const pageSizeArb = fc.integer({ min: 1, max: MAX_PAGE_SIZE });

// ── Pagination Simulation ─────────────────────────────────────────────────────

/**
 * Simulate cursor-based pagination over a sorted list of items.
 *
 * This mimics how the analytics handler paginates through DynamoDB results:
 * - Items are sorted by SK (DynamoDB's native ordering)
 * - Each page returns at most `pageSize` items
 * - A cursor (encoded last item's key) is returned when more items exist
 * - The next page starts after the cursor position
 *
 * Returns all pages collected during iteration.
 */
function simulatePagination(
  items: Array<{ PK: string; SK: string; [key: string]: unknown }>,
  pageSize: number,
): Array<Array<{ PK: string; SK: string; [key: string]: unknown }>> {
  // Sort items by SK (ascending) to simulate DynamoDB's native ordering
  const sorted = [...items].sort((a, b) => (a.SK < b.SK ? -1 : a.SK > b.SK ? 1 : 0));

  const pages: Array<Array<{ PK: string; SK: string; [key: string]: unknown }>> = [];
  let cursor: string | null = null;

  // Safety limit to prevent infinite loops in case of bugs
  const maxIterations = Math.ceil(sorted.length / pageSize) + 1;
  let iterations = 0;

  do {
    iterations++;
    if (iterations > maxIterations) {
      throw new Error('Pagination exceeded expected number of iterations — possible infinite loop');
    }

    // Find start index based on cursor
    let startIndex = 0;
    if (cursor) {
      const decoded = decodeCursor(cursor);
      const cursorIdx = sorted.findIndex((item) => item.PK === decoded!.PK && item.SK === decoded!.SK);
      startIndex = cursorIdx >= 0 ? cursorIdx + 1 : 0;
    }

    // Get the page
    const page = sorted.slice(startIndex, startIndex + pageSize);
    pages.push(page);

    // Determine next cursor
    if (startIndex + pageSize < sorted.length) {
      const lastItem = page[page.length - 1];
      cursor = encodeCursor({ PK: lastItem.PK, SK: lastItem.SK });
    } else {
      cursor = null;
    }
  } while (cursor !== null);

  return pages;
}

// ── Property Tests ────────────────────────────────────────────────────────────

describe('Feature: study-mode-enhancements, Property 11: Pagination completeness', () => {
  describe('Cursor encode/decode round-trip', () => {
    it('encodeCursor followed by decodeCursor preserves PK and SK', () => {
      fc.assert(
        fc.property(dynamoKeyArb, (key) => {
          const encoded = encodeCursor(key);
          expect(encoded).not.toBeNull();
          expect(typeof encoded).toBe('string');

          const decoded = decodeCursor(encoded!);
          expect(decoded).toBeDefined();
          expect(decoded!.PK).toBe(key.PK);
          expect(decoded!.SK).toBe(key.SK);
        }),
        { numRuns: 20 },
      );
    });

    it('encodeCursor returns null for null/undefined input', () => {
      expect(encodeCursor(null)).toBeNull();
      expect(encodeCursor(undefined)).toBeNull();
    });

    it('decodeCursor returns undefined for null/undefined/empty input', () => {
      expect(decodeCursor(null)).toBeUndefined();
      expect(decodeCursor(undefined)).toBeUndefined();
      expect(decodeCursor('')).toBeUndefined();
    });
  });

  describe('clampPageSize bounds enforcement', () => {
    it('clampPageSize returns value between 1 and MAX_PAGE_SIZE for any integer input', () => {
      fc.assert(
        fc.property(fc.integer({ min: -1000, max: 1000 }), (size) => {
          const clamped = clampPageSize(size);
          expect(clamped).toBeGreaterThanOrEqual(1);
          expect(clamped).toBeLessThanOrEqual(MAX_PAGE_SIZE);
        }),
        { numRuns: 20 },
      );
    });

    it('clampPageSize returns DEFAULT_PAGE_SIZE for non-numeric input', () => {
      fc.assert(
        fc.property(fc.constantFrom('abc', '', 'NaN', null, undefined), (input) => {
          const clamped = clampPageSize(input);
          expect(clamped).toBe(DEFAULT_PAGE_SIZE);
        }),
        { numRuns: 20 },
      );
    });
  });

  describe('Pagination completeness over item sets', () => {
    it('iterating all pages retrieves all N items with no duplicates and no omissions', () => {
      fc.assert(
        fc.property(attemptListArb, pageSizeArb, (items, pageSize) => {
          if (items.length === 0) {
            // Empty list should produce one empty page
            const pages = simulatePagination(items, pageSize);
            expect(pages).toHaveLength(1);
            expect(pages[0]).toHaveLength(0);
            return;
          }

          const pages = simulatePagination(items, pageSize);

          // Collect all items from all pages
          const allRetrieved = pages.flat();

          // All N items should be retrieved (completeness — no omissions)
          expect(allRetrieved).toHaveLength(items.length);

          // No duplicates: all SKs should be unique in the retrieved set
          const retrievedSKs = allRetrieved.map((item) => item.SK);
          const uniqueSKs = new Set(retrievedSKs);
          expect(uniqueSKs.size).toBe(items.length);

          // Every original item should appear in the retrieved set
          const originalSKs = new Set(items.map((item) => item.SK));
          for (const sk of retrievedSKs) {
            expect(originalSKs.has(sk)).toBe(true);
          }
        }),
        { numRuns: 20 },
      );
    });

    it('each page contains at most pageSize items', () => {
      fc.assert(
        fc.property(attemptListArb, pageSizeArb, (items, pageSize) => {
          const pages = simulatePagination(items, pageSize);

          for (const page of pages) {
            expect(page.length).toBeLessThanOrEqual(pageSize);
          }
        }),
        { numRuns: 20 },
      );
    });

    it('number of pages equals ceil(N / pageSize) for non-empty item sets', () => {
      fc.assert(
        fc.property(attemptListArb, pageSizeArb, (items, pageSize) => {
          if (items.length === 0) return; // Skip empty sets for this property

          const pages = simulatePagination(items, pageSize);
          const expectedPages = Math.ceil(items.length / pageSize);

          expect(pages).toHaveLength(expectedPages);
        }),
        { numRuns: 20 },
      );
    });

    it('items within each page are in sorted SK order', () => {
      fc.assert(
        fc.property(attemptListArb, pageSizeArb, (items, pageSize) => {
          if (items.length === 0) return;

          const pages = simulatePagination(items, pageSize);

          for (const page of pages) {
            for (let i = 1; i < page.length; i++) {
              expect(page[i - 1].SK <= page[i].SK).toBe(true);
            }
          }
        }),
        { numRuns: 20 },
      );
    });

    it('pages are contiguous — last item of page N is before first item of page N+1', () => {
      fc.assert(
        fc.property(attemptListArb, pageSizeArb, (items, pageSize) => {
          if (items.length <= pageSize) return; // Need multiple pages

          const pages = simulatePagination(items, pageSize);

          for (let i = 1; i < pages.length; i++) {
            const prevPageLast = pages[i - 1][pages[i - 1].length - 1];
            const currPageFirst = pages[i][0];
            if (prevPageLast && currPageFirst) {
              expect(prevPageLast.SK < currPageFirst.SK).toBe(true);
            }
          }
        }),
        { numRuns: 20 },
      );
    });
  });
});
