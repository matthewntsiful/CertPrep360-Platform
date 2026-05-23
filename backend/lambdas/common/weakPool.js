/**
 * WeakPool — Leitner box transition functions for spaced repetition.
 *
 * The Weak Pool tracks questions a user has answered incorrectly, organized
 * into three Leitner boxes:
 *   Box 1: review every session
 *   Box 2: review every 3 sessions
 *   Box 3: review weekly (7 days)
 *
 * Correct answers promote (B→B+1, or remove if B=3).
 * Incorrect answers demote to Box 1.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

/**
 * Add a question to Box 1 of the Weak Pool.
 * Used when a user answers a question incorrectly for the first time.
 *
 * @param {object} pool - The questions map from the Weak Pool record (q_id → entry)
 * @param {string} questionId - The question ID to add
 * @param {string} domain - The domain the question belongs to
 * @param {string} certId - The certification ID
 * @returns {object} Updated pool with the question in Box 1
 */
export function addToBox1(pool, questionId, domain, certId) {
  const now = new Date().toISOString();
  return {
    ...pool,
    [questionId]: {
      box: 1,
      addedAt: now,
      lastReviewed: now,
      domain,
      certId,
    },
  };
}

/**
 * Promote a question to the next Leitner box.
 * Box 1 → Box 2, Box 2 → Box 3.
 * If the question is in Box 3, it is removed from the pool (mastered).
 *
 * @param {object} pool - The questions map from the Weak Pool record
 * @param {string} questionId - The question ID to promote
 * @returns {object} Updated pool with the question promoted or removed
 */
export function promote(pool, questionId) {
  const entry = pool[questionId];
  if (!entry) return pool;

  if (entry.box >= 3) {
    return removeFromPool(pool, questionId);
  }

  return {
    ...pool,
    [questionId]: {
      ...entry,
      box: entry.box + 1,
      lastReviewed: new Date().toISOString(),
    },
  };
}

/**
 * Demote a question back to Box 1.
 * Used when a user answers a Weak Pool question incorrectly.
 *
 * @param {object} pool - The questions map from the Weak Pool record
 * @param {string} questionId - The question ID to demote
 * @returns {object} Updated pool with the question in Box 1
 */
export function demote(pool, questionId) {
  const entry = pool[questionId];
  if (!entry) return pool;

  return {
    ...pool,
    [questionId]: {
      ...entry,
      box: 1,
      lastReviewed: new Date().toISOString(),
    },
  };
}

/**
 * Remove a question from the Weak Pool entirely.
 * Used when a Box 3 question is answered correctly (mastered).
 *
 * @param {object} pool - The questions map from the Weak Pool record
 * @param {string} questionId - The question ID to remove
 * @returns {object} Updated pool without the specified question
 */
export function removeFromPool(pool, questionId) {
  const { [questionId]: _removed, ...rest } = pool;
  return rest;
}
