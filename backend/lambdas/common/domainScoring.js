/**
 * DomainScoring — computes per-domain accuracy percentages from answers.
 *
 * For each domain present in the answers, calculates:
 *   round((correct in domain / total in domain) * 100)
 *
 * Requirements: 2.1
 */

/**
 * Compute per-domain accuracy scores from a set of answers.
 *
 * @param {Record<string, { domain: string, isCorrect: boolean }>} answers
 *   A map of answer index/id to answer details containing domain and isCorrect.
 * @returns {Record<string, number>} A map of domain name to accuracy percentage (0-100)
 */
export function computeDomainScores(answers) {
  const domainStats = {};

  for (const answer of Object.values(answers)) {
    const { domain, isCorrect } = answer;
    if (!domain) continue;

    if (!domainStats[domain]) {
      domainStats[domain] = { correct: 0, total: 0 };
    }

    domainStats[domain].total += 1;
    if (isCorrect) {
      domainStats[domain].correct += 1;
    }
  }

  const scores = {};
  for (const [domain, stats] of Object.entries(domainStats)) {
    if (stats.total === 0) {
      scores[domain] = 0;
    } else {
      scores[domain] = Math.round((stats.correct / stats.total) * 100);
    }
  }

  return scores;
}
