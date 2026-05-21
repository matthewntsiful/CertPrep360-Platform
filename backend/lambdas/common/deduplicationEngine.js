/**
 * DeduplicationEngine — TF-IDF cosine similarity deduplication.
 * Runs entirely in Lambda memory with no external API calls.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

// Common English stopwords to remove during tokenization
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i',
  'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'our', 'their', 'what', 'which', 'who', 'whom',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'same',
  'so', 'than', 'too', 'very', 'just', 'as', 'if', 'then', 'because',
  'while', 'although', 'though', 'after', 'before', 'since', 'until',
  'about', 'above', 'across', 'against', 'along', 'among', 'around',
  'between', 'during', 'into', 'through', 'under', 'within', 'without',
]);

/**
 * Tokenize text: lowercase, remove punctuation, remove stopwords.
 * @param {string} text
 * @returns {string[]} array of tokens
 */
export function tokenize(text) {
  if (!text || typeof text !== 'string') return [];

  return text
    .toLowerCase()
    // Remove punctuation (keep alphanumeric and spaces)
    .replace(/[^a-z0-9\s]/g, ' ')
    // Split on whitespace
    .split(/\s+/)
    // Filter empty strings and stopwords
    .filter(token => token.length > 0 && !STOPWORDS.has(token));
}

/**
 * Compute term frequency (TF) for a token array, normalized by document length.
 * @param {string[]} tokens
 * @returns {Map<string, number>} term → normalized frequency
 */
export function computeTf(tokens) {
  const tf = new Map();
  if (!tokens || tokens.length === 0) return tf;

  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }

  // Normalize by document length
  for (const [term, count] of tf) {
    tf.set(term, count / tokens.length);
  }

  return tf;
}

/**
 * Compute inverse document frequency (IDF) across a corpus.
 * Formula: idf(t) = log((N + 1) / (df + 1)) + 1  — standard smoothed IDF
 * that is always non-negative and avoids division by zero.
 * @param {string[][]} corpus — array of token arrays (one per document)
 * @returns {Map<string, number>} term → idf score
 */
export function computeIdf(corpus) {
  const idf = new Map();
  if (!corpus || corpus.length === 0) return idf;

  const N = corpus.length;
  const df = new Map(); // document frequency per term

  for (const tokens of corpus) {
    // Count each term once per document
    const seen = new Set(tokens);
    for (const term of seen) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  for (const [term, docFreq] of df) {
    // (N+1)/(df+1) is always >= 1, so log is always >= 0; +1 ensures rare terms
    // in a tiny corpus still get a positive weight.
    idf.set(term, Math.log((N + 1) / (docFreq + 1)) + 1);
  }

  return idf;
}

/**
 * Compute TF-IDF vector for a token array given a pre-computed IDF map.
 * @param {string[]} tokens
 * @param {Map<string, number>} idf
 * @returns {Map<string, number>} term → tfidf score
 */
export function computeTfIdf(tokens, idf) {
  const tf = computeTf(tokens);
  const tfidf = new Map();

  for (const [term, tfScore] of tf) {
    const idfScore = idf.get(term) ?? 0;
    tfidf.set(term, tfScore * idfScore);
  }

  return tfidf;
}

/**
 * Compute cosine similarity between two TF-IDF vectors.
 * Returns a value in [0, 1].
 * @param {Map<string, number>} vecA
 * @param {Map<string, number>} vecB
 * @returns {number}
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.size === 0 || vecB.size === 0) return 0;

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  // Dot product — iterate over the smaller map for efficiency
  for (const [term, scoreA] of vecA) {
    const scoreB = vecB.get(term) ?? 0;
    dotProduct += scoreA * scoreB;
  }

  // Magnitudes
  for (const score of vecA.values()) {
    magA += score * score;
  }
  for (const score of vecB.values()) {
    magB += score * score;
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;

  // Clamp to [0, 1] to handle floating-point rounding
  return Math.min(1, Math.max(0, dotProduct / (magA * magB)));
}

/**
 * DeduplicationEngine — initialized with existing question texts.
 * Maintains an in-memory corpus for TF-IDF computation and checks
 * candidates against both existing and batch-accepted texts.
 */
export class DeduplicationEngine {
  /**
   * @param {string[]} existingTexts — question texts already stored for this exam
   */
  constructor(existingTexts = []) {
    // Texts from DynamoDB (existing questions)
    this._existingTexts = [...existingTexts];
    // Texts accepted during the current batch (not yet in DynamoDB)
    this._batchTexts = [];

    // Pre-tokenize all existing texts
    this._existingTokens = this._existingTexts.map(t => tokenize(t));

    // Build IDF from existing corpus (will be rebuilt when batch texts are added)
    this._rebuildIdf();
  }

  /**
   * Rebuild the IDF map from the combined corpus (existing + batch).
   * @private
   */
  _rebuildIdf() {
    const batchTokens = this._batchTexts.map(t => tokenize(t));
    const corpus = [...this._existingTokens, ...batchTokens];
    this._idf = computeIdf(corpus);
    this._batchTokens = batchTokens;
  }

  /**
   * Check whether a candidate text is a duplicate of any existing or batch text.
   * @param {string} candidateText
   * @param {number} [threshold=0.70]
   * @returns {{ isDuplicate: boolean, similarTo: string|null, score: number }}
   */
  checkDuplicate(candidateText, threshold = 0.70) {
    const candidateTokens = tokenize(candidateText);

    // If the candidate has no tokens after filtering, it can't be compared
    if (candidateTokens.length === 0) {
      return { isDuplicate: false, similarTo: null, score: 0 };
    }

    const candidateVec = computeTfIdf(candidateTokens, this._idf);

    // Check against existing texts
    for (let i = 0; i < this._existingTexts.length; i++) {
      const existingVec = computeTfIdf(this._existingTokens[i], this._idf);
      const score = cosineSimilarity(candidateVec, existingVec);
      if (score > threshold) {
        return { isDuplicate: true, similarTo: this._existingTexts[i], score };
      }
    }

    // Check against batch texts (intra-batch deduplication — Requirement 3.4)
    for (let i = 0; i < this._batchTexts.length; i++) {
      const batchVec = computeTfIdf(this._batchTokens[i], this._idf);
      const score = cosineSimilarity(candidateVec, batchVec);
      if (score > threshold) {
        return { isDuplicate: true, similarTo: this._batchTexts[i], score };
      }
    }

    return { isDuplicate: false, similarTo: null, score: 0 };
  }

  /**
   * Add an accepted question text to the batch pool so subsequent candidates
   * are also checked against it (intra-batch deduplication).
   * @param {string} text
   */
  addAccepted(text) {
    this._batchTexts.push(text);
    this._rebuildIdf();
  }
}
