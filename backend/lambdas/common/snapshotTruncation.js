/**
 * SnapshotTruncation — size-check and explanation-truncation logic for
 * question snapshots stored in DynamoDB attempt records.
 *
 * Strategy: truncate the longest explanations first until the total
 * serialized item size is under 400KB, preserving question text, options,
 * and correct answers.
 *
 * Requirements: 3.2, 3.3
 */

const MAX_ITEM_SIZE_BYTES = 400 * 1024; // 400KB DynamoDB item limit
const TRUNCATION_SUFFIX = '...';

/**
 * Estimate the serialized size of an object in bytes (UTF-8 JSON).
 *
 * @param {any} obj - The object to measure
 * @returns {number} Approximate size in bytes
 */
export function estimateSize(obj) {
  return Buffer.byteLength(JSON.stringify(obj), 'utf-8');
}

/**
 * Check whether a set of snapshots fits within the size budget.
 *
 * @param {Array<object>} snapshots - The question snapshots array
 * @param {number} [baseItemSize=0] - Size of the rest of the DynamoDB item (without snapshots)
 * @returns {boolean} True if the total size is under 400KB
 */
export function fitsWithinLimit(snapshots, baseItemSize = 0) {
  const snapshotsSize = estimateSize(snapshots);
  return (baseItemSize + snapshotsSize) < MAX_ITEM_SIZE_BYTES;
}

/**
 * Truncate question snapshot explanations to fit within the 400KB limit.
 *
 * Truncates the longest explanations first, reducing them iteratively
 * until the total size is under the limit. Preserves question text,
 * options, and correct answer fields unchanged.
 *
 * @param {Array<object>} snapshots - The question snapshots to potentially truncate
 * @param {number} [baseItemSize=0] - Size of the rest of the DynamoDB item (without snapshots)
 * @returns {Array<object>} Snapshots with explanations truncated as needed
 */
export function truncateSnapshots(snapshots, baseItemSize = 0) {
  if (!snapshots || snapshots.length === 0) return snapshots;

  // Deep clone to avoid mutating the input
  let result = snapshots.map(s => ({ ...s }));

  // Check if already within limit
  if (fitsWithinLimit(result, baseItemSize)) {
    return result;
  }

  // Iteratively truncate the longest explanation until we fit
  const budget = MAX_ITEM_SIZE_BYTES - baseItemSize;

  while (estimateSize(result) >= budget) {
    // Find the snapshot with the longest explanation
    let longestIdx = -1;
    let longestLen = 0;

    for (let i = 0; i < result.length; i++) {
      const explanation = result[i].explanation || '';
      if (explanation.length > longestLen) {
        longestLen = explanation.length;
        longestIdx = i;
      }
    }

    // If no explanation left to truncate, we've done all we can
    if (longestIdx === -1 || longestLen <= TRUNCATION_SUFFIX.length) {
      // Remove all explanations as last resort
      result = result.map(s => ({ ...s, explanation: '' }));
      break;
    }

    // Halve the longest explanation
    const currentExplanation = result[longestIdx].explanation;
    const newLength = Math.max(
      Math.floor(currentExplanation.length / 2),
      0
    );

    if (newLength <= TRUNCATION_SUFFIX.length) {
      result[longestIdx].explanation = '';
    } else {
      result[longestIdx].explanation =
        currentExplanation.slice(0, newLength - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX;
    }
  }

  return result;
}
