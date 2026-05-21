use questions # Bugfix Requirements Document

## Introduction

Multi-answer questions (those requiring the user to select 2 or more correct answers) are always
marked incorrect in CertPrep360-Platform, regardless of which answers the user selects. The root
cause is an inconsistency in how the `correct` field is stored in DynamoDB across question sets:
SAA-C03 questions use a concatenated string format (`"AB"`, `"BCF"`), while COE-C01 questions use
a comma-separated format (`"A,B"`, `"A,C,F"`). Both the frontend scoring logic in `QuestionView.tsx`
and `useExamStore.ts`, and the backend Lambda `get-questions/index.js`, treat `correct` as a
character-iterable string via `[...q.correct]`. This spread works correctly for `"AB"` → `["A","B"]`
but produces `["A", ",", "B"]` for `"A,B"`, causing every comparison to fail for the 90 affected
COE-C01 questions in the `CertPrep360-Dev-Main` DynamoDB table.

The fix must be applied at three layers: the backend Lambda (normalize before returning to all
clients), the frontend (defensive normalization helper), and the DynamoDB data itself (migration
script to clean the source data).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a question's `correct` field is stored in comma-separated format (e.g. `"A,B"` or `"A,C,F"`) AND the user selects the correct answers THEN the system marks the answer as incorrect because spreading the string with `[...q.correct]` includes comma characters in the resulting array

1.2 WHEN a question's `correct` field is comma-separated AND the frontend computes `isMultiple` via `q.correct.length > 1` THEN the system returns `true` for single-answer questions stored as `"A"` (length 1 is fine) but returns an inflated count for multi-answer questions (e.g. `"A,B"` has length 3, not 2), causing the "Pick N correct answers" hint to display the wrong number

1.3 WHEN a question's `correct` field is comma-separated AND `completeExam()` in `useExamStore.ts` scores the exam THEN the system records every multi-answer question as incorrect, deflating the final score for any exam that includes COE-C01 questions

1.4 WHEN the `get-questions` Lambda returns items from DynamoDB THEN the system passes the raw `correct` field value through without normalization, propagating the inconsistent format to all clients

### Expected Behavior (Correct)

2.1 WHEN a question's `correct` field is in any supported format (`"AB"`, `"A,B"`, or `"A, B, C"`) AND the user selects all correct answer letters THEN the system SHALL mark the answer as correct

2.2 WHEN the frontend computes `isMultiple` for a question THEN the system SHALL derive the count from the normalized set of answer letters, so a question with correct answers A and B always reports a count of 2 regardless of storage format

2.3 WHEN `completeExam()` scores a multi-answer question THEN the system SHALL compare the sorted normalized correct letters against the sorted selected letters, producing an accurate score

2.4 WHEN the `get-questions` Lambda returns questions THEN the system SHALL normalize the `correct` field by stripping commas and spaces before including it in the response, so all clients receive the concatenated format (e.g. `"AB"`)

2.5 WHEN the DynamoDB migration script is run against `CertPrep360-Dev-Main` THEN the system SHALL update all items whose `correct` field contains a comma so that the value is stored in concatenated format, eliminating the inconsistency at the data source

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a question's `correct` field is already in concatenated format (e.g. `"AB"`, `"BCF"`) THEN the system SHALL CONTINUE TO evaluate answers correctly without any change in behavior

3.2 WHEN a question requires only a single correct answer (e.g. `correct = "C"`) THEN the system SHALL CONTINUE TO accept that single letter as the correct answer and reject all other single-letter selections

3.3 WHEN a user selects an incorrect combination of answers for a multi-answer question THEN the system SHALL CONTINUE TO mark the answer as incorrect

3.4 WHEN the exam timer, flagging, navigation, and session-sync features are used THEN the system SHALL CONTINUE TO operate exactly as before, unaffected by the normalization change

3.5 WHEN the `get-questions` Lambda is called for SAA-C03 questions (already in concatenated format) THEN the system SHALL CONTINUE TO return the same `correct` values as before (normalization of an already-clean string is a no-op)
