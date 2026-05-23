/**
 * AdaptiveSelection — inverse-performance weighting and minimum-2-per-domain
 * allocation for multi-domain adaptive quiz generation.
 *
 * Identifies the 2-3 weakest domains from a user's performance data and
 * distributes questions using inverse performance weighting, ensuring each
 * selected domain receives at least 2 questions.
 *
 * Requirements: 7.1, 7.2, 7.3
 */

const MIN_QUESTIONS_PER_DOMAIN = 2;
const MIN_WEAK_DOMAINS = 2;
const MAX_WEAK_DOMAINS = 3;

/**
 * Identify the 2-3 weakest domains from a domain performance map.
 *
 * @param {Record<string, number>} domainScores - Map of domain name to accuracy percentage (0-100)
 * @returns {string[]} Array of 2-3 domain names with the lowest accuracy
 */
export function identifyWeakDomains(domainScores) {
  const entries = Object.entries(domainScores);

  if (entries.length <= MIN_WEAK_DOMAINS) {
    return entries.map(([domain]) => domain);
  }

  // Sort by accuracy ascending (weakest first)
  const sorted = entries.sort((a, b) => a[1] - b[1]);

  // Take 2-3 weakest domains
  // Use 3 if there are at least 3 domains, otherwise use what's available
  const count = Math.min(MAX_WEAK_DOMAINS, sorted.length);
  return sorted.slice(0, count).map(([domain]) => domain);
}

/**
 * Compute inverse performance weights for the selected domains.
 * Lower accuracy → higher weight (more questions).
 *
 * Uses (100 - accuracy) as the raw weight, with a minimum weight of 1
 * to avoid zero allocation for domains with 100% accuracy.
 *
 * @param {string[]} domains - The selected domain names
 * @param {Record<string, number>} domainScores - Map of domain name to accuracy percentage
 * @returns {Record<string, number>} Map of domain name to normalized weight (0-1, sums to 1)
 */
export function computeInverseWeights(domains, domainScores) {
  const rawWeights = {};
  let totalWeight = 0;

  for (const domain of domains) {
    const accuracy = domainScores[domain] ?? 50; // default to 50% if unknown
    // Inverse: lower accuracy → higher weight. Minimum weight of 1.
    const weight = Math.max(100 - accuracy, 1);
    rawWeights[domain] = weight;
    totalWeight += weight;
  }

  // Normalize to sum to 1
  const normalized = {};
  for (const domain of domains) {
    normalized[domain] = totalWeight > 0 ? rawWeights[domain] / totalWeight : 1 / domains.length;
  }

  return normalized;
}

/**
 * Allocate questions across domains using inverse performance weighting
 * with a minimum of 2 questions per domain.
 *
 * @param {string[]} domains - The selected domain names
 * @param {Record<string, number>} domainScores - Map of domain name to accuracy percentage
 * @param {number} totalQuestions - Total number of questions to allocate
 * @returns {Record<string, number>} Map of domain name to number of questions allocated
 */
export function allocateQuestions(domains, domainScores, totalQuestions) {
  if (domains.length === 0) return {};

  const minTotal = domains.length * MIN_QUESTIONS_PER_DOMAIN;

  // If total questions is less than minimum required, distribute evenly
  if (totalQuestions <= minTotal) {
    const perDomain = Math.floor(totalQuestions / domains.length);
    const remainder = totalQuestions % domains.length;
    const allocation = {};

    // Sort domains by score ascending so weakest get the remainder
    const sorted = [...domains].sort((a, b) => (domainScores[a] ?? 50) - (domainScores[b] ?? 50));

    for (let i = 0; i < sorted.length; i++) {
      allocation[sorted[i]] = perDomain + (i < remainder ? 1 : 0);
    }
    return allocation;
  }

  // Allocate minimum first, then distribute remainder by weight
  const weights = computeInverseWeights(domains, domainScores);
  const allocation = {};
  let remaining = totalQuestions;

  // Give each domain its minimum
  for (const domain of domains) {
    allocation[domain] = MIN_QUESTIONS_PER_DOMAIN;
    remaining -= MIN_QUESTIONS_PER_DOMAIN;
  }

  // Distribute remaining questions by inverse weight
  if (remaining > 0) {
    const weightedAllocations = [];
    for (const domain of domains) {
      const extra = weights[domain] * remaining;
      weightedAllocations.push({ domain, extra });
    }

    // Round down and track remainder for distribution
    let allocated = 0;
    for (const item of weightedAllocations) {
      const floored = Math.floor(item.extra);
      allocation[item.domain] += floored;
      allocated += floored;
      item.fractional = item.extra - floored;
    }

    // Distribute leftover from rounding to domains with highest fractional parts
    let leftover = remaining - allocated;
    weightedAllocations.sort((a, b) => b.fractional - a.fractional);
    for (let i = 0; i < leftover && i < weightedAllocations.length; i++) {
      allocation[weightedAllocations[i].domain] += 1;
    }
  }

  return allocation;
}

/**
 * Full adaptive selection: identify weak domains and allocate questions.
 *
 * @param {Record<string, number>} domainScores - Map of domain name to accuracy percentage
 * @param {number} totalQuestions - Total number of questions to generate
 * @param {string[]|null} [explicitDomains=null] - If provided, use these domains instead of auto-selecting
 * @returns {{ domains: string[], allocation: Record<string, number> }}
 *   The selected domains and per-domain question allocation
 */
export function selectAndAllocate(domainScores, totalQuestions, explicitDomains = null) {
  const domains = explicitDomains || identifyWeakDomains(domainScores);
  const allocation = allocateQuestions(domains, domainScores, totalQuestions);

  return { domains, allocation };
}
