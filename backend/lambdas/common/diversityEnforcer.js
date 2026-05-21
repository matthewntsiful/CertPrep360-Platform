/**
 * DiversityEnforcer — selects task statement, service, and scenario type
 * for each generation slot to maximize variety across a batch.
 *
 * Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3
 */

/**
 * Valid scenario types, cycled in order to ensure even distribution.
 */
export const SCENARIO_TYPES = [
  'migration',
  'troubleshooting',
  'cost-optimization',
  'security',
  'architecture-design',
  'operational',
];

// ---------------------------------------------------------------------------
// CoverageState helpers
// ---------------------------------------------------------------------------

/**
 * Build an initial CoverageState from existing questions and the exam guide.
 *
 * CoverageState shape:
 * {
 *   taskStatementCounts: Map<taskStatementId, number>,
 *   serviceCounts:       Map<serviceName, number>,
 *   scenarioTypeCounts:  Map<scenarioType, number>,
 *   saturatedServices:   Set<serviceName>,
 *   totalQuestions:      number
 * }
 *
 * @param {Array<{ task_statement_id?: string, primary_service?: string, scenario_type?: string }>} existingQuestions
 * @param {{ domains: Array<{ task_statements: Array<{ id: string }> }>, inScopeServices: string[] }} examGuide
 * @returns {CoverageState}
 */
export function buildCoverageState(existingQuestions, examGuide) {
  const taskStatementCounts = new Map();
  const serviceCounts = new Map();
  const scenarioTypeCounts = new Map();
  const saturatedServices = new Set();

  // Pre-populate all known task statement IDs with 0 so least-covered logic
  // always has a baseline for every task statement in the guide.
  for (const domain of (examGuide.domains ?? [])) {
    for (const ts of (domain.task_statements ?? [])) {
      if (!taskStatementCounts.has(ts.id)) {
        taskStatementCounts.set(ts.id, 0);
      }
    }
  }

  // Pre-populate all known scenario types with 0.
  for (const type of SCENARIO_TYPES) {
    scenarioTypeCounts.set(type, 0);
  }

  // Tally counts from existing questions.
  for (const q of (existingQuestions ?? [])) {
    if (q.task_statement_id) {
      taskStatementCounts.set(
        q.task_statement_id,
        (taskStatementCounts.get(q.task_statement_id) ?? 0) + 1,
      );
    }
    if (q.primary_service) {
      serviceCounts.set(
        q.primary_service,
        (serviceCounts.get(q.primary_service) ?? 0) + 1,
      );
    }
    if (q.scenario_type) {
      scenarioTypeCounts.set(
        q.scenario_type,
        (scenarioTypeCounts.get(q.scenario_type) ?? 0) + 1,
      );
    }
  }

  const totalQuestions = (existingQuestions ?? []).length;

  return {
    taskStatementCounts,
    serviceCounts,
    scenarioTypeCounts,
    saturatedServices,
    totalQuestions,
  };
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/**
 * Pick a random element from an array.
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Select the least-covered task statement within a domain, breaking ties randomly.
 *
 * @param {string} domainName
 * @param {{ domains: Array<{ name: string, task_statements: Array<{ id: string, text: string, services: string[] }> }> }} examGuide
 * @param {CoverageState} coverageState
 * @returns {{ id: string, text: string, services: string[] } | null}
 */
export function selectTaskStatement(domainName, examGuide, coverageState) {
  const domain = (examGuide.domains ?? []).find(d => d.name === domainName);
  if (!domain || !domain.task_statements || domain.task_statements.length === 0) {
    return null;
  }

  const { taskStatementCounts } = coverageState;

  // Find the minimum count among all task statements in this domain.
  let minCount = Infinity;
  for (const ts of domain.task_statements) {
    const count = taskStatementCounts.get(ts.id) ?? 0;
    if (count < minCount) minCount = count;
  }

  // Collect all task statements tied at the minimum count.
  const candidates = domain.task_statements.filter(
    ts => (taskStatementCounts.get(ts.id) ?? 0) === minCount,
  );

  return pickRandom(candidates);
}

/**
 * Select the least-covered, non-saturated service for a task statement,
 * breaking ties randomly.
 *
 * Falls back to any non-saturated in-scope service from the exam guide if
 * the task statement has no services listed (or all are saturated).
 *
 * @param {{ id: string, text: string, services: string[] }} taskStatement
 * @param {{ inScopeServices: string[] }} examGuide
 * @param {CoverageState} coverageState
 * @returns {string | null}
 */
export function selectService(taskStatement, examGuide, coverageState) {
  const { serviceCounts, saturatedServices } = coverageState;

  // Candidate pool: services listed under the task statement, minus saturated ones.
  let pool = (taskStatement.services ?? []).filter(s => !saturatedServices.has(s));

  // If the task statement has no eligible services, fall back to all in-scope services.
  if (pool.length === 0) {
    pool = (examGuide.inScopeServices ?? []).filter(s => !saturatedServices.has(s));
  }

  // If everything is saturated, allow any in-scope service (last resort).
  if (pool.length === 0) {
    pool = examGuide.inScopeServices ?? [];
  }

  if (pool.length === 0) return null;

  // Find the minimum count among the pool.
  let minCount = Infinity;
  for (const service of pool) {
    const count = serviceCounts.get(service) ?? 0;
    if (count < minCount) minCount = count;
  }

  const candidates = pool.filter(s => (serviceCounts.get(s) ?? 0) === minCount);
  return pickRandom(candidates);
}

/**
 * Select the least-used scenario type globally, cycling through SCENARIO_TYPES
 * in order when there are ties (preserving the defined cycle order).
 *
 * @param {CoverageState} coverageState
 * @returns {string}
 */
export function selectScenarioType(coverageState) {
  const { scenarioTypeCounts } = coverageState;

  let minCount = Infinity;
  for (const type of SCENARIO_TYPES) {
    const count = scenarioTypeCounts.get(type) ?? 0;
    if (count < minCount) minCount = count;
  }

  // Among tied types, return the first one in SCENARIO_TYPES order (cycle order).
  for (const type of SCENARIO_TYPES) {
    if ((scenarioTypeCounts.get(type) ?? 0) === minCount) {
      return type;
    }
  }

  // Fallback (should never reach here given SCENARIO_TYPES is non-empty).
  return SCENARIO_TYPES[0];
}

/**
 * Compose the three selectors into a single slot selection.
 *
 * @param {string} domainName
 * @param {object} examGuide
 * @param {CoverageState} coverageState
 * @returns {{ taskStatement: object, service: string, scenarioType: string }}
 */
export function selectSlot(domainName, examGuide, coverageState) {
  const taskStatement = selectTaskStatement(domainName, examGuide, coverageState);
  const service = selectService(taskStatement ?? { services: [] }, examGuide, coverageState);
  const scenarioType = selectScenarioType(coverageState);

  return { taskStatement, service, scenarioType };
}

// ---------------------------------------------------------------------------
// State mutation
// ---------------------------------------------------------------------------

/**
 * Update coverage state after a question is accepted.
 * Increments task statement, service, and scenario type counts.
 * Marks a service as saturated when its count reaches floor(totalSlots * 0.15).
 *
 * @param {CoverageState} coverageState — mutated in place
 * @param {{ task_statement_id?: string, primary_service?: string, scenario_type?: string }} slot
 * @param {number} totalSlots — total slots in the batch (used to compute saturation threshold)
 */
export function updateCoverageState(coverageState, slot, totalSlots) {
  const { taskStatementCounts, serviceCounts, scenarioTypeCounts, saturatedServices } =
    coverageState;

  if (slot.task_statement_id) {
    taskStatementCounts.set(
      slot.task_statement_id,
      (taskStatementCounts.get(slot.task_statement_id) ?? 0) + 1,
    );
  }

  if (slot.primary_service) {
    const newCount = (serviceCounts.get(slot.primary_service) ?? 0) + 1;
    serviceCounts.set(slot.primary_service, newCount);

    // Mark saturated when count reaches floor(totalSlots * 0.15).
    const threshold = Math.floor(totalSlots * 0.15);
    if (newCount >= threshold) {
      saturatedServices.add(slot.primary_service);
    }
  }

  if (slot.scenario_type) {
    scenarioTypeCounts.set(
      slot.scenario_type,
      (scenarioTypeCounts.get(slot.scenario_type) ?? 0) + 1,
    );
  }

  coverageState.totalQuestions += 1;
}

// ---------------------------------------------------------------------------
// Slot distribution
// ---------------------------------------------------------------------------

/**
 * Compute how many generation slots each domain should receive.
 *
 * Uses Math.round(totalSlots × weight) for each domain, then assigns any
 * rounding remainder to the highest-weight domain so the total always equals
 * totalSlots exactly.
 *
 * @param {{ domains: Array<{ name: string, weight: number }> }} examGuide
 * @param {number} totalSlots
 * @returns {Map<string, number>} domainName → slotCount
 */
export function computeSlotDistribution(examGuide, totalSlots) {
  const domains = examGuide.domains ?? [];
  const distribution = new Map();

  if (domains.length === 0) return distribution;

  let allocated = 0;

  for (const domain of domains) {
    const slots = Math.round(totalSlots * (domain.weight ?? 0));
    distribution.set(domain.name, slots);
    allocated += slots;
  }

  // Assign rounding remainder (positive or negative) to the highest-weight domain.
  const remainder = totalSlots - allocated;
  if (remainder !== 0) {
    const highestWeightDomain = domains.reduce((best, d) =>
      (d.weight ?? 0) > (best.weight ?? 0) ? d : best,
    );
    distribution.set(
      highestWeightDomain.name,
      (distribution.get(highestWeightDomain.name) ?? 0) + remainder,
    );
  }

  return distribution;
}
