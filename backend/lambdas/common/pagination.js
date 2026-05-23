/**
 * Pagination — cursor encode/decode helpers for DynamoDB pagination.
 *
 * Cursors are base64-encoded JSON of { PK, SK }, opaque to the client.
 * Default page size: 20, max: 50.
 *
 * Requirements: 8.2, 8.3
 */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

/**
 * Encode a DynamoDB LastEvaluatedKey into an opaque cursor string.
 *
 * @param {{ PK: string, SK: string }} lastEvaluatedKey - The DynamoDB LastEvaluatedKey
 * @returns {string} Base64-encoded cursor
 */
export function encodeCursor(lastEvaluatedKey) {
  if (!lastEvaluatedKey) return null;
  const json = JSON.stringify({ PK: lastEvaluatedKey.PK, SK: lastEvaluatedKey.SK });
  return Buffer.from(json, 'utf-8').toString('base64');
}

/**
 * Decode an opaque cursor string back into a DynamoDB ExclusiveStartKey.
 *
 * @param {string|null|undefined} cursor - The base64-encoded cursor from the client
 * @returns {{ PK: string, SK: string }|undefined} The decoded key, or undefined if no cursor
 * @throws {Error} If the cursor is malformed
 */
export function decodeCursor(cursor) {
  if (!cursor) return undefined;

  try {
    const json = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(json);

    if (!parsed.PK || !parsed.SK) {
      throw new Error('Invalid cursor: missing PK or SK');
    }

    return { PK: parsed.PK, SK: parsed.SK };
  } catch (err) {
    throw new Error('Invalid cursor format');
  }
}

/**
 * Clamp a requested page size to valid bounds.
 *
 * @param {number|string|undefined} requestedSize - The page size from the request
 * @returns {number} A valid page size between 1 and MAX_PAGE_SIZE
 */
export function clampPageSize(requestedSize) {
  const size = parseInt(requestedSize, 10);
  if (isNaN(size) || size < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(size, MAX_PAGE_SIZE);
}
