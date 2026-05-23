# Implementation Plan: Study Mode Enhancements

## Overview

This plan implements five interconnected study mode enhancements: score trend visualization, question snapshot storage, spaced repetition (Leitner box system), multi-domain adaptive quiz selection, and paginated/filterable history. Implementation proceeds backend-first (shared logic → Lambda handlers) then frontend (components → page integration), ensuring each layer is testable before wiring together.

## Tasks

- [x] 1. Backend shared logic and types
  - [x] 1.1 Create shared utility modules for Weak Pool and pagination logic
    - Create `backend/lambdas/common/weakPool.js` with Leitner box transition functions: `addToBox1`, `promote`, `demote`, `removeFromPool`
    - Create `backend/lambdas/common/pagination.js` with cursor encode/decode helpers (base64 of `{ PK, SK }`)
    - Create `backend/lambdas/common/domainScoring.js` with `computeDomainScores(answers)` that calculates per-domain accuracy percentages
    - Create `backend/lambdas/common/snapshotTruncation.js` with size-check and explanation-truncation logic (truncate longest explanations first until < 400KB)
    - Create `backend/lambdas/common/spacedScheduler.js` with scheduling logic: Box 1 always, Box 2 every 3 sessions, Box 3 every 7 days
    - Create `backend/lambdas/common/adaptiveSelection.js` with inverse-performance weighting and minimum-2-per-domain allocation
    - _Requirements: 2.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 8.2, 8.3_

  - [x] 1.2 Write property tests for Leitner box transitions (Property 6)
    - **Property 6: Leitner box state transitions**
    - Test that correct answers promote (B→B+1, or remove if B=3), incorrect answers demote to Box 1, and new incorrect questions are added to Box 1
    - Use fast-check with Vitest, minimum 100 iterations
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [x] 1.3 Write property tests for spaced repetition scheduling (Property 7)
    - **Property 7: Spaced repetition scheduling**
    - Test that Box 1 always included, Box 2 iff sessionCounter % 3 === 0, Box 3 iff lastReviewed >= 7 days ago
    - Use fast-check with Vitest, minimum 100 iterations
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 1.4 Write property tests for domain accuracy computation (Property 2)
    - **Property 2: Per-domain accuracy computation**
    - Test that domainScores[d] === round((correct in d / total in d) * 100) for all domains
    - Use fast-check with Vitest, minimum 100 iterations
    - **Validates: Requirements 2.1**

  - [x] 1.5 Write property tests for snapshot size enforcement (Property 4)
    - **Property 4: Question snapshot persistence with size enforcement**
    - Test that stored item < 400KB, explanations truncated while text/options/correct preserved
    - Use fast-check with Vitest, minimum 100 iterations
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 1.6 Write property tests for adaptive domain selection (Properties 8, 9, 10)
    - **Property 8: Adaptive domain selection with inverse weighting**
    - **Property 9: Minimum questions per domain invariant**
    - **Property 10: Explicit domain selection**
    - Test inverse weighting, minimum 2 per domain, and explicit domain filtering
    - Use fast-check with Vitest, minimum 100 iterations
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 2. Enhance submit-results Lambda
  - [x] 2.1 Add question snapshot storage and Weak Pool update to submit-results handler
    - Modify `backend/lambdas/submit-results/index.js` to accept `questionSnapshots` array in request body
    - Call `computeDomainScores(answers)` and store `domainScores` in the attempt record
    - Call `snapshotTruncation` to validate/truncate snapshots before writing
    - After writing the attempt, call Weak Pool update logic: add incorrect questions to Box 1, promote correct Weak Pool questions, demote incorrect Weak Pool questions
    - Use DynamoDB `UpdateItem` with `SET` and `ADD` expressions for atomic Weak Pool updates
    - If Weak_Pool item doesn't exist, create it with initial state
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 5.5, 2.1_

  - [x] 2.2 Write unit tests for submit-results enhancements
    - Test request validation (missing fields return 400)
    - Test snapshot truncation with oversized payloads
    - Test Weak Pool creation when item doesn't exist
    - Test Weak Pool promotion/demotion transitions
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4_

- [x] 3. Enhance get-user-analytics Lambda
  - [x] 3.1 Add trend data, pagination, filtering, sorting, and Weak Pool count to analytics handler
    - Modify `backend/lambdas/get-user-analytics/index.js` to return `trendData` array (all attempts with score, certId, examId, timestamp, domainScores) in chronological order
    - Add `weakPoolCount` field by querying WEAK_POOL items and summing question counts
    - Add `?history=true` mode that returns `PaginatedHistoryResponse` with cursor-based pagination
    - Implement server-side filtering: `certId` filter (FilterExpression), `status` filter (score >= 72 or < 72)
    - Implement sorting: date asc/desc (native SK order), score asc/desc (in-memory sort of fetched batch)
    - Encode/decode cursor using pagination helpers
    - Return `totalCount` using a separate COUNT query
    - _Requirements: 1.6, 2.1, 5.6, 8.1, 8.2, 8.3, 9.3, 9.6_

  - [x] 3.2 Write property tests for trend data ordering (Property 1)
    - **Property 1: Trend data is chronologically ordered and complete**
    - Test that all attempts are returned sorted by timestamp ascending with required fields
    - Use fast-check with Vitest, minimum 100 iterations
    - **Validates: Requirements 1.6**

  - [x] 3.3 Write property tests for pagination completeness (Property 11)
    - **Property 11: Pagination completeness**
    - Test that iterating all pages retrieves all N attempts, no duplicates, no omissions, each page ≤ pageSize
    - Use fast-check with Vitest, minimum 100 iterations
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x] 3.4 Write property tests for server-side filtering and sorting (Property 12)
    - **Property 12: Server-side filtering and sorting**
    - Test that responses match all active filters and respect sort order
    - Use fast-check with Vitest, minimum 100 iterations
    - **Validates: Requirements 9.3, 9.6**

- [x] 4. Checkpoint - Backend logic complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Enhance get-dynamic-quiz Lambda
  - [x] 5.1 Add adaptive mode and spaced repetition integration to dynamic-quiz handler
    - Modify `backend/lambdas/get-dynamic-quiz/index.js` to accept `mode=adaptive` query parameter
    - When mode=adaptive: query user's domain performance, identify 2-3 weakest domains, distribute questions using inverse weighting (min 2 per domain)
    - Accept comma-separated domain list as alternative to adaptive mode
    - Query user's Weak_Pool item and apply scheduling logic (Box 1 always, Box 2 every 3rd session, Box 3 every 7 days)
    - Mix scheduled Weak_Pool questions into the quiz response
    - Increment sessionCounter atomically on each quiz generation
    - Return `weakPoolIncluded` count and `mode` in response
    - Fall back to all domains if user has < 2 domains with attempt data
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.2 Write unit tests for dynamic-quiz adaptive mode
    - Test adaptive domain selection with various performance profiles
    - Test fallback when < 2 domains have data
    - Test explicit domain list filtering
    - Test Weak Pool scheduling integration
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

- [x] 6. Frontend types and API service layer
  - [x] 6.1 Create TypeScript interfaces and extend API service
    - Create `website/src/types/analytics.ts` with `TrendDataPoint`, `PaginatedHistoryResponse`, `AttemptSummary`, `AnalyticsResponse` (enhanced), `QuestionSnapshot` interfaces
    - Extend `website/src/services/api.ts` with functions: `fetchAnalytics()`, `fetchHistory(params)`, `fetchAttemptDetail(attemptId)`, `startAdaptiveQuiz(certId, limit)`, `startMultiDomainQuiz(domains, certId, limit)`
    - Add cursor-based pagination support to `fetchHistory` using TanStack Query's `useInfiniteQuery` pattern
    - _Requirements: 1.6, 8.2, 8.3, 7.4, 7.5_

- [x] 7. Frontend Dashboard components
  - [x] 7.1 Create ScoreTrendChart component
    - Create `website/src/components/ScoreTrendChart.tsx` using Tremor `LineChart`
    - Render score % on Y-axis, attempt date on X-axis
    - Display horizontal reference line at 72% pass threshold
    - Render separate trend line per certification with distinct colors
    - Add tooltip showing score, cert name, exam ID, date on hover
    - Add certification selector dropdown to drill into per-domain lines
    - Add domain line toggle checkboxes
    - Show empty state message when < 2 attempts
    - Fetch data via TanStack Query from Analytics API
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3_

  - [x] 7.2 Write property test for distinct trend series (Property 3)
    - **Property 3: Distinct trend series per certification**
    - Test that N distinct certIds produce exactly N series in chart data transformation
    - Use fast-check with Vitest, minimum 100 iterations
    - **Validates: Requirements 1.3**

  - [x] 7.3 Create WeakPoolCounter component
    - Create `website/src/components/WeakPoolCounter.tsx` as a stat card displaying total Weak_Pool question count
    - Fetch `weakPoolCount` from Analytics API via TanStack Query
    - Include "Start Review Quiz" link/button that navigates to dynamic quiz with adaptive mode
    - _Requirements: 5.6_

  - [x] 7.4 Integrate ScoreTrendChart and WeakPoolCounter into Dashboard page
    - Modify `website/src/pages/Dashboard.tsx` to render `ScoreTrendChart` and `WeakPoolCounter`
    - Position chart in the main content area and counter as a stat card
    - _Requirements: 1.1, 5.6_

- [x] 8. Frontend ResultReview page enhancements
  - [x] 8.1 Enhance ResultReview page with question snapshots and filters
    - Modify `website/src/pages/ResultReview.tsx` to fetch and render `QuestionSnapshot` data
    - Add filter tabs: All / Correct / Incorrect / Skipped
    - Add reveal/hide toggle per question for answer + explanation
    - Highlight correct option in green and incorrect selection in red on reveal
    - Implement keyboard navigation (← → arrow keys) to move between questions
    - Add graceful fallback for legacy attempts without snapshots (show minimal answer data)
    - _Requirements: 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_

  - [x] 8.2 Write property test for ResultReview filter correctness (Property 5)
    - **Property 5: ResultReview filter correctness**
    - Test that "correct" filter returns only isCorrect=true, "incorrect" returns isCorrect=false AND selected≠null, "skipped" returns selected=null
    - Use fast-check with Vitest, minimum 100 iterations
    - **Validates: Requirements 4.1**

  - [x] 8.3 Write component tests for ResultReview page
    - Test snapshot rendering with mock data
    - Test graceful fallback for legacy attempts
    - Test keyboard navigation between questions
    - Test filter tab switching
    - _Requirements: 3.4, 3.5, 4.1, 4.4_

- [x] 9. Checkpoint - Dashboard and ResultReview complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Frontend History page enhancements
  - [x] 10.1 Enhance History page with infinite scroll, filters, and sorting
    - Modify `website/src/pages/History.tsx` to use TanStack Query `useInfiniteQuery` for cursor-based pagination
    - Implement infinite scroll (fetch next page on scroll to bottom)
    - Add certification dropdown filter (populated from user's attempted certs)
    - Add pass/fail status filter (All / Passed / Failed)
    - Add sort selector (newest, oldest, highest score, lowest score)
    - Reset pagination on filter/sort change
    - Display total count and filtered count in header
    - Show loading skeleton during page fetches
    - _Requirements: 8.1, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 10.2 Write component tests for History page
    - Test infinite scroll triggers fetch
    - Test filter/sort controls update query params
    - Test loading skeleton display
    - Test total/filtered count display
    - _Requirements: 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4_

- [x] 11. Frontend adaptive quiz UI updates
  - [x] 11.1 Update DynamicQuiz page for multi-domain adaptive mode
    - Modify `website/src/pages/DynamicQuiz.tsx` to add "Adaptive Mode" option that calls the API with `mode=adaptive`
    - Add multi-domain selector UI allowing users to pick specific domains
    - Display which domains were selected and how many Weak Pool questions were included in the quiz header
    - Show `weakPoolIncluded` count in quiz summary
    - _Requirements: 7.4, 7.5_

  - [x] 11.2 Write component tests for DynamicQuiz adaptive mode
    - Test adaptive mode toggle
    - Test multi-domain selector
    - Test weak pool count display
    - _Requirements: 7.4, 7.5_

- [x] 12. Final checkpoint - All features integrated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit/component tests validate specific examples and edge cases
- Backend Lambdas use plain JS (Node.js 20 ES modules); property tests use TypeScript with fast-check + Vitest
- Frontend uses React + TypeScript + Vite + TanStack Query + Zustand + Tremor + Tailwind
- All DynamoDB operations use the shared `./common/db.js` client

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.6", "6.1"] },
    { "id": 2, "tasks": ["2.1", "3.1", "5.1"] },
    { "id": 3, "tasks": ["2.2", "3.2", "3.3", "3.4", "5.2"] },
    { "id": 4, "tasks": ["7.1", "7.3", "8.1", "10.1", "11.1"] },
    { "id": 5, "tasks": ["7.2", "7.4", "8.2", "8.3", "10.2", "11.2"] }
  ]
}
```
