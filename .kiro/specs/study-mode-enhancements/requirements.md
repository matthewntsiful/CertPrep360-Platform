# Requirements Document

## Introduction

This specification defines five enhancements to the CertPrep360 study mode experience: score trend visualization, storing full question text in attempt records, spaced repetition for weak questions, multi-domain adaptive quizzes, and history pagination with filtering. These features collectively transform the platform from a basic exam simulator into a data-driven learning system that adapts to each user's weaknesses over time.

## Glossary

- **Dashboard**: The main landing page after login that displays user statistics, recent results, and quick actions.
- **Score_Trend_Chart**: A line chart component on the Dashboard that visualizes exam score progression over time.
- **Attempt_Record**: A DynamoDB item (PK=USER#userId, SK=ATTEMPT#timestamp#EXAM#examId) storing the results of a completed exam.
- **Question_Snapshot**: The full question text, options, correct answer, and explanation stored within an Attempt_Record.
- **ResultReview_Page**: The page that displays detailed results for a specific historical attempt.
- **Spaced_Repetition_Engine**: The backend logic that tracks incorrect answers and schedules them for review using a Leitner box system.
- **Weak_Pool**: A per-user collection of questions the user has answered incorrectly, organized into Leitner boxes for spaced review.
- **Leitner_Box**: One of three review tiers: Box 1 (review every session), Box 2 (review every 3 sessions), Box 3 (review weekly).
- **Adaptive_Quiz_Engine**: The backend logic that selects questions from multiple weak domains proportionally based on inverse performance.
- **Domain_Performance**: A per-domain accuracy percentage calculated from all historical attempts for a user.
- **History_Page**: The page that lists all past exam attempts with filtering and sorting capabilities.
- **Analytics_API**: The GET /analytics Lambda (get-user-analytics) that computes and returns user statistics.
- **Submit_Results_API**: The POST /results Lambda (submit-results) that persists exam attempt data to DynamoDB.
- **Dynamic_Quiz_API**: The GET /dynamic-quiz Lambda (get-dynamic-quiz) that generates practice quizzes from the question bank.
- **Pass_Threshold**: The 72% score required to pass an AWS certification exam.

## Requirements

### Requirement 1: Score Trend Visualization

**User Story:** As a certification candidate, I want to see my exam scores plotted over time on the Dashboard, so that I can track my improvement trajectory and identify plateaus.

#### Acceptance Criteria

1. WHEN the Dashboard loads with at least two historical attempts, THE Score_Trend_Chart SHALL render a line chart showing score percentage on the Y-axis and attempt date on the X-axis.
2. THE Score_Trend_Chart SHALL display a horizontal reference line at the 72% Pass_Threshold.
3. WHERE the user has attempts across multiple certifications, THE Score_Trend_Chart SHALL render a separate trend line per certification, each with a distinct color.
4. WHEN the user hovers over a data point on the Score_Trend_Chart, THE Score_Trend_Chart SHALL display a tooltip showing the exact score, certification name, exam ID, and date.
5. WHEN the Dashboard loads with fewer than two historical attempts, THE Score_Trend_Chart SHALL display a message indicating that more attempts are needed to show trends.
6. THE Analytics_API SHALL return attempt history including score, certification ID, exam ID, and timestamp for all attempts in chronological order.

### Requirement 2: Per-Domain Trend Lines

**User Story:** As a certification candidate, I want to see how my accuracy in each domain changes over time, so that I can verify that my targeted study is working.

#### Acceptance Criteria

1. THE Analytics_API SHALL compute per-domain accuracy for each attempt and include domain-level scores in the trend data response.
2. WHEN the user selects a specific certification on the Score_Trend_Chart, THE Score_Trend_Chart SHALL display per-domain trend lines showing domain accuracy progression across attempts.
3. THE Score_Trend_Chart SHALL allow toggling individual domain lines on and off to reduce visual clutter.

### Requirement 3: Store Question Snapshots in Attempts

**User Story:** As a certification candidate, I want my historical exam attempts to include the full question text, options, correct answer, and explanation, so that I can review past exams as effectively as the post-exam review mode.

#### Acceptance Criteria

1. WHEN the user submits exam results, THE Submit_Results_API SHALL persist a Question_Snapshot for each question containing the question text, all options, the correct answer, the explanation, and the user's selected answer.
2. THE Submit_Results_API SHALL validate that the total Attempt_Record item size remains below 400KB (DynamoDB item size limit).
3. IF the Attempt_Record exceeds 400KB, THEN THE Submit_Results_API SHALL truncate explanation fields to fit within the size limit while preserving question text, options, and correct answers.
4. WHEN the user navigates to the ResultReview_Page for an attempt containing Question_Snapshots, THE ResultReview_Page SHALL display the full question text, all options with visual indicators for the user's selection and the correct answer, and the explanation.
5. WHEN the user navigates to the ResultReview_Page for a legacy attempt without Question_Snapshots, THE ResultReview_Page SHALL display the existing minimal answer data without errors.

### Requirement 4: ResultReview Page Enhanced Display

**User Story:** As a certification candidate, I want the historical result review to match the quality of the post-exam review mode, so that I can study from any past attempt.

#### Acceptance Criteria

1. THE ResultReview_Page SHALL provide filter controls to show all questions, only correct answers, only incorrect answers, or only skipped questions.
2. THE ResultReview_Page SHALL display a reveal/hide toggle for the correct answer and explanation on each question.
3. WHEN the user clicks reveal on a question in the ResultReview_Page, THE ResultReview_Page SHALL highlight the correct option in green and the user's incorrect selection in red.
4. THE ResultReview_Page SHALL support keyboard navigation (arrow keys) to move between questions.

### Requirement 5: Spaced Repetition Weak Pool Tracking

**User Story:** As a certification candidate, I want the system to track which questions I get wrong and schedule them for review, so that I can focus my study time on my actual weaknesses.

#### Acceptance Criteria

1. WHEN the user answers a question incorrectly during any exam or quiz, THE Spaced_Repetition_Engine SHALL add that question to the user's Weak_Pool in Leitner_Box 1.
2. WHEN the user answers a Weak_Pool question correctly, THE Spaced_Repetition_Engine SHALL promote that question to the next Leitner_Box (Box 1 to Box 2, Box 2 to Box 3).
3. WHEN the user answers a Weak_Pool question incorrectly, THE Spaced_Repetition_Engine SHALL demote that question back to Leitner_Box 1.
4. WHEN a question in Leitner_Box 3 is answered correctly, THE Spaced_Repetition_Engine SHALL remove that question from the Weak_Pool.
5. THE Spaced_Repetition_Engine SHALL persist the Weak_Pool state to DynamoDB using the key pattern PK=USER#userId, SK=WEAK_POOL#certId.
6. THE Dashboard SHALL display a "Questions to Review" count showing the total number of questions currently in the user's Weak_Pool.

### Requirement 6: Spaced Repetition Review Scheduling

**User Story:** As a certification candidate, I want questions to be scheduled for review at increasing intervals based on my mastery, so that I review difficult questions more frequently.

#### Acceptance Criteria

1. WHEN a dynamic quiz is generated and the user has questions in Leitner_Box 1, THE Dynamic_Quiz_API SHALL include Box 1 questions in every quiz session.
2. WHEN a dynamic quiz is generated and the user has questions in Leitner_Box 2, THE Dynamic_Quiz_API SHALL include Box 2 questions every 3 quiz sessions.
3. WHEN a dynamic quiz is generated and the user has questions in Leitner_Box 3, THE Dynamic_Quiz_API SHALL include Box 3 questions every 7 days since last review.
4. THE Spaced_Repetition_Engine SHALL track a session counter per user to determine Box 2 review intervals.
5. THE Spaced_Repetition_Engine SHALL track the last review timestamp per question to determine Box 3 review intervals.

### Requirement 7: Multi-Domain Adaptive Quiz Selection

**User Story:** As a certification candidate, I want practice quizzes to pull questions from my 2-3 weakest domains proportionally, so that I get broader coverage of my weak areas instead of only drilling one domain.

#### Acceptance Criteria

1. WHEN the Dynamic_Quiz_API receives a request with mode=adaptive, THE Dynamic_Quiz_API SHALL identify the user's 2-3 weakest domains based on Domain_Performance data.
2. THE Dynamic_Quiz_API SHALL distribute questions across selected domains using inverse performance weighting (lower accuracy domains receive proportionally more questions).
3. THE Dynamic_Quiz_API SHALL allocate a minimum of 2 questions per selected domain regardless of weighting.
4. WHEN the user specifies explicit domains in the quiz request, THE Dynamic_Quiz_API SHALL use those domains instead of auto-selecting based on performance.
5. THE Dynamic_Quiz_API SHALL accept a comma-separated list of domain names or the string "adaptive" as the domain parameter.
6. WHEN mode=adaptive is used and the user has fewer than 2 domains with attempt data, THE Dynamic_Quiz_API SHALL fall back to selecting questions from all available domains.

### Requirement 8: History Pagination

**User Story:** As a certification candidate, I want to browse all my past attempts without a 10-attempt limit, so that I can review my full exam history.

#### Acceptance Criteria

1. THE Analytics_API SHALL remove the 10-attempt limit and support paginated retrieval of all user attempts.
2. THE Analytics_API SHALL accept a pageSize parameter (default 20) and a cursor parameter for pagination.
3. THE Analytics_API SHALL return a nextCursor value when more results are available.
4. WHEN the user scrolls to the bottom of the History_Page attempt list, THE History_Page SHALL automatically fetch the next page of results.
5. THE History_Page SHALL display a loading indicator while fetching additional pages.
6. THE History_Page SHALL display the total count of attempts in the header.

### Requirement 9: History Filtering and Sorting

**User Story:** As a certification candidate, I want to filter my attempt history by certification and pass/fail status, and sort by date or score, so that I can quickly find specific past attempts.

#### Acceptance Criteria

1. THE History_Page SHALL provide a dropdown filter for certification, populated with all certifications the user has attempted.
2. THE History_Page SHALL provide a filter for pass/fail status with options: All, Passed, Failed.
3. THE History_Page SHALL provide sort options: newest first (default), oldest first, highest score, lowest score.
4. WHEN the user applies a filter or sort option, THE History_Page SHALL reset pagination to the first page and display the filtered/sorted results.
5. THE History_Page SHALL display both the total attempt count and the filtered result count when filters are active.
6. THE Analytics_API SHALL accept optional query parameters for certId filter, status filter (passed/failed), and sort order to perform server-side filtering.
