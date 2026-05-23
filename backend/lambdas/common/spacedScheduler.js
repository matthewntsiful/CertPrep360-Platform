/**
 * SpacedScheduler — scheduling logic for Leitner box review intervals.
 *
 * Box 1: always included in every quiz session
 * Box 2: included every 3 sessions (sessionCounter % 3 === 0)
 * Box 3: included every 7 days (now - lastReviewed >= 7 days)
 *
 * Requirements: 6.1, 6.2, 6.3
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Determine which questions from the Weak Pool should be included in the
 * current quiz session based on Leitner scheduling rules.
 *
 * @param {Record<string, { box: number, lastReviewed: string, domain: string, certId: string }>} questions
 *   The questions map from the Weak Pool record (q_id → entry)
 * @param {number} sessionCounter - The current session counter for the user
 * @param {Date|string} [now] - The current time (defaults to new Date())
 * @returns {Array<{ questionId: string, box: number, domain: string, certId: string }>}
 *   Array of questions scheduled for review in this session
 */
export function getScheduledQuestions(questions, sessionCounter, now) {
  if (!questions || Object.keys(questions).length === 0) {
    return [];
  }

  const currentTime = now ? new Date(now) : new Date();
  const scheduled = [];

  for (const [questionId, entry] of Object.entries(questions)) {
    const shouldInclude = isScheduledForReview(entry, sessionCounter, currentTime);
    if (shouldInclude) {
      scheduled.push({
        questionId,
        box: entry.box,
        domain: entry.domain,
        certId: entry.certId,
      });
    }
  }

  return scheduled;
}

/**
 * Determine if a single Weak Pool entry should be reviewed in this session.
 *
 * @param {{ box: number, lastReviewed: string }} entry - The Weak Pool entry
 * @param {number} sessionCounter - The current session counter
 * @param {Date} currentTime - The current time
 * @returns {boolean} True if the question should be included in this session
 */
export function isScheduledForReview(entry, sessionCounter, currentTime) {
  const { box, lastReviewed } = entry;

  switch (box) {
    case 1:
      // Box 1: always included
      return true;

    case 2:
      // Box 2: every 3 sessions
      return sessionCounter % 3 === 0;

    case 3: {
      // Box 3: every 7 days since last review
      const lastReviewedDate = new Date(lastReviewed);
      const elapsed = currentTime.getTime() - lastReviewedDate.getTime();
      return elapsed >= SEVEN_DAYS_MS;
    }

    default:
      return false;
  }
}

/**
 * Check if Box 2 questions should be included for the given session counter.
 *
 * @param {number} sessionCounter - The current session counter
 * @returns {boolean} True if Box 2 questions should be included
 */
export function shouldIncludeBox2(sessionCounter) {
  return sessionCounter % 3 === 0;
}

/**
 * Check if a Box 3 question should be included based on its last review time.
 *
 * @param {string} lastReviewed - ISO timestamp of last review
 * @param {Date|string} [now] - The current time (defaults to new Date())
 * @returns {boolean} True if 7+ days have elapsed since last review
 */
export function shouldIncludeBox3(lastReviewed, now) {
  const currentTime = now ? new Date(now) : new Date();
  const lastReviewedDate = new Date(lastReviewed);
  const elapsed = currentTime.getTime() - lastReviewedDate.getTime();
  return elapsed >= SEVEN_DAYS_MS;
}
