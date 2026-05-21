/**
 * Unit tests for DiversityEnforcer module.
 *
 * Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SCENARIO_TYPES,
  buildCoverageState,
  selectTaskStatement,
  selectService,
  selectScenarioType,
  selectSlot,
  updateCoverageState,
  computeSlotDistribution,
} from './diversityEnforcer.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EXAM_GUIDE = {
  domains: [
    {
      name: 'Design Secure Architectures',
      weight: 0.30,
      task_statements: [
        { id: '1.1', text: 'Design secure access to AWS resources', services: ['IAM', 'STS', 'Cognito'] },
        { id: '1.2', text: 'Design secure workloads and applications', services: ['WAF', 'Shield', 'KMS'] },
        { id: '1.3', text: 'Determine appropriate data security controls', services: ['KMS', 'Macie', 'S3'] },
      ],
    },
    {
      name: 'Design Resilient Architectures',
      weight: 0.26,
      task_statements: [
        { id: '2.1', text: 'Design scalable and loosely coupled architectures', services: ['SQS', 'SNS', 'EventBridge'] },
        { id: '2.2', text: 'Design highly available and fault-tolerant architectures', services: ['Route53', 'ELB', 'Auto Scaling'] },
      ],
    },
    {
      name: 'Design High-Performing Architectures',
      weight: 0.24,
      task_statements: [
        { id: '3.1', text: 'Determine high-performing and scalable storage solutions', services: ['S3', 'EFS', 'FSx'] },
      ],
    },
    {
      name: 'Design Cost-Optimized Architectures',
      weight: 0.20,
      task_statements: [
        { id: '4.1', text: 'Design cost-optimized storage solutions', services: ['S3', 'Glacier'] },
        { id: '4.2', text: 'Design cost-optimized compute solutions', services: ['EC2', 'Lambda', 'Fargate'] },
      ],
    },
  ],
  inScopeServices: [
    'IAM', 'STS', 'Cognito', 'WAF', 'Shield', 'KMS', 'Macie', 'S3',
    'SQS', 'SNS', 'EventBridge', 'Route53', 'ELB', 'Auto Scaling',
    'EFS', 'FSx', 'Glacier', 'EC2', 'Lambda', 'Fargate',
  ],
  outOfScopeServices: ['SimpleDB', 'CloudSearch'],
};

// ---------------------------------------------------------------------------
// SCENARIO_TYPES
// ---------------------------------------------------------------------------

describe('SCENARIO_TYPES', () => {
  it('contains exactly 6 entries in the correct order', () => {
    assert.deepEqual(SCENARIO_TYPES, [
      'migration',
      'troubleshooting',
      'cost-optimization',
      'security',
      'architecture-design',
      'operational',
    ]);
  });
});

// ---------------------------------------------------------------------------
// buildCoverageState
// ---------------------------------------------------------------------------

describe('buildCoverageState', () => {
  it('returns zero counts when no existing questions', () => {
    const state = buildCoverageState([], EXAM_GUIDE);

    assert.equal(state.totalQuestions, 0);
    assert.equal(state.saturatedServices.size, 0);

    // All task statement IDs should be pre-populated with 0
    assert.equal(state.taskStatementCounts.get('1.1'), 0);
    assert.equal(state.taskStatementCounts.get('2.2'), 0);

    // All scenario types should be pre-populated with 0
    for (const type of SCENARIO_TYPES) {
      assert.equal(state.scenarioTypeCounts.get(type), 0);
    }
  });

  it('tallies counts from existing questions', () => {
    const existing = [
      { task_statement_id: '1.1', primary_service: 'IAM', scenario_type: 'security' },
      { task_statement_id: '1.1', primary_service: 'IAM', scenario_type: 'migration' },
      { task_statement_id: '2.1', primary_service: 'SQS', scenario_type: 'security' },
    ];

    const state = buildCoverageState(existing, EXAM_GUIDE);

    assert.equal(state.totalQuestions, 3);
    assert.equal(state.taskStatementCounts.get('1.1'), 2);
    assert.equal(state.taskStatementCounts.get('2.1'), 1);
    assert.equal(state.taskStatementCounts.get('1.2'), 0); // untouched
    assert.equal(state.serviceCounts.get('IAM'), 2);
    assert.equal(state.serviceCounts.get('SQS'), 1);
    assert.equal(state.scenarioTypeCounts.get('security'), 2);
    assert.equal(state.scenarioTypeCounts.get('migration'), 1);
    assert.equal(state.scenarioTypeCounts.get('troubleshooting'), 0);
  });

  it('handles questions with missing fields gracefully', () => {
    const existing = [
      { task_statement_id: '1.1' }, // no service or scenario_type
      { primary_service: 'EC2' },   // no task_statement_id
      {},                            // completely empty
    ];

    const state = buildCoverageState(existing, EXAM_GUIDE);
    assert.equal(state.totalQuestions, 3);
    assert.equal(state.taskStatementCounts.get('1.1'), 1);
    assert.equal(state.serviceCounts.get('EC2'), 1);
  });
});

// ---------------------------------------------------------------------------
// selectTaskStatement
// ---------------------------------------------------------------------------

describe('selectTaskStatement', () => {
  it('returns the task statement with the lowest count', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    // Give 1.1 and 1.2 a count of 2, leave 1.3 at 0
    state.taskStatementCounts.set('1.1', 2);
    state.taskStatementCounts.set('1.2', 2);

    const ts = selectTaskStatement('Design Secure Architectures', EXAM_GUIDE, state);
    assert.equal(ts.id, '1.3');
  });

  it('returns null for an unknown domain', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    const ts = selectTaskStatement('Unknown Domain', EXAM_GUIDE, state);
    assert.equal(ts, null);
  });

  it('returns one of the tied task statements when counts are equal', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    // All counts are 0 — any of the three task statements is valid
    const ts = selectTaskStatement('Design Secure Architectures', EXAM_GUIDE, state);
    assert.ok(['1.1', '1.2', '1.3'].includes(ts.id), `Unexpected task statement id: ${ts.id}`);
  });

  it('returns the only task statement in a single-statement domain', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    const ts = selectTaskStatement('Design High-Performing Architectures', EXAM_GUIDE, state);
    assert.equal(ts.id, '3.1');
  });
});

// ---------------------------------------------------------------------------
// selectService
// ---------------------------------------------------------------------------

describe('selectService', () => {
  it('returns the least-covered service for a task statement', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    state.serviceCounts.set('IAM', 5);
    state.serviceCounts.set('STS', 5);
    // Cognito has count 0 — should be selected

    const ts = { id: '1.1', text: '...', services: ['IAM', 'STS', 'Cognito'] };
    const service = selectService(ts, EXAM_GUIDE, state);
    assert.equal(service, 'Cognito');
  });

  it('excludes saturated services', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    state.saturatedServices.add('IAM');
    state.saturatedServices.add('STS');
    state.serviceCounts.set('Cognito', 10);

    const ts = { id: '1.1', text: '...', services: ['IAM', 'STS', 'Cognito'] };
    const service = selectService(ts, EXAM_GUIDE, state);
    assert.equal(service, 'Cognito');
  });

  it('falls back to in-scope services when task statement services are all saturated', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    state.saturatedServices.add('IAM');
    state.saturatedServices.add('STS');
    state.saturatedServices.add('Cognito');

    const ts = { id: '1.1', text: '...', services: ['IAM', 'STS', 'Cognito'] };
    const service = selectService(ts, EXAM_GUIDE, state);
    // Should fall back to any non-saturated in-scope service
    assert.ok(EXAM_GUIDE.inScopeServices.includes(service), `${service} not in inScopeServices`);
    assert.ok(!state.saturatedServices.has(service), `${service} should not be saturated`);
  });

  it('returns null when no in-scope services exist', () => {
    const emptyGuide = { ...EXAM_GUIDE, inScopeServices: [] };
    const state = buildCoverageState([], emptyGuide);
    const ts = { id: '1.1', text: '...', services: [] };
    const service = selectService(ts, emptyGuide, state);
    assert.equal(service, null);
  });
});

// ---------------------------------------------------------------------------
// selectScenarioType
// ---------------------------------------------------------------------------

describe('selectScenarioType', () => {
  it('returns the first scenario type when all counts are 0', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    const type = selectScenarioType(state);
    assert.equal(type, 'migration'); // first in SCENARIO_TYPES order
  });

  it('returns the least-used scenario type', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    state.scenarioTypeCounts.set('migration', 3);
    state.scenarioTypeCounts.set('troubleshooting', 3);
    state.scenarioTypeCounts.set('cost-optimization', 3);
    state.scenarioTypeCounts.set('security', 3);
    state.scenarioTypeCounts.set('architecture-design', 3);
    state.scenarioTypeCounts.set('operational', 1); // lowest

    const type = selectScenarioType(state);
    assert.equal(type, 'operational');
  });

  it('cycles through types in order when all are tied', () => {
    // After using migration once, troubleshooting should be next
    const state = buildCoverageState([], EXAM_GUIDE);
    state.scenarioTypeCounts.set('migration', 1);

    const type = selectScenarioType(state);
    assert.equal(type, 'troubleshooting');
  });
});

// ---------------------------------------------------------------------------
// selectSlot
// ---------------------------------------------------------------------------

describe('selectSlot', () => {
  it('returns a slot with taskStatement, service, and scenarioType', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    const slot = selectSlot('Design Secure Architectures', EXAM_GUIDE, state);

    assert.ok(slot.taskStatement !== null && slot.taskStatement !== undefined, 'taskStatement should not be null');
    assert.ok(typeof slot.service === 'string', 'service should be a string');
    assert.ok(SCENARIO_TYPES.includes(slot.scenarioType), `scenarioType "${slot.scenarioType}" not in SCENARIO_TYPES`);
  });

  it('service belongs to the selected task statement or in-scope list', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    const slot = selectSlot('Design Secure Architectures', EXAM_GUIDE, state);

    const allServices = [
      ...slot.taskStatement.services,
      ...EXAM_GUIDE.inScopeServices,
    ];
    assert.ok(allServices.includes(slot.service), `service "${slot.service}" not in expected pool`);
  });
});

// ---------------------------------------------------------------------------
// updateCoverageState
// ---------------------------------------------------------------------------

describe('updateCoverageState', () => {
  it('increments task statement, service, and scenario type counts', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    const slot = { task_statement_id: '1.1', primary_service: 'IAM', scenario_type: 'security' };

    updateCoverageState(state, slot, 65);

    assert.equal(state.taskStatementCounts.get('1.1'), 1);
    assert.equal(state.serviceCounts.get('IAM'), 1);
    assert.equal(state.scenarioTypeCounts.get('security'), 1);
    assert.equal(state.totalQuestions, 1);
  });

  it('marks service as saturated when count reaches floor(totalSlots * 0.15)', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    const totalSlots = 65;
    const threshold = Math.floor(totalSlots * 0.15); // 9

    // Pre-set count to threshold - 1
    state.serviceCounts.set('IAM', threshold - 1);
    state.totalQuestions = threshold - 1;

    const slot = { task_statement_id: '1.1', primary_service: 'IAM', scenario_type: 'security' };
    updateCoverageState(state, slot, totalSlots);

    assert.equal(state.serviceCounts.get('IAM'), threshold);
    assert.ok(state.saturatedServices.has('IAM'), 'IAM should be saturated');
  });

  it('does not mark service saturated below threshold', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    const slot = { task_statement_id: '1.1', primary_service: 'IAM', scenario_type: 'security' };

    updateCoverageState(state, slot, 65);

    assert.ok(!state.saturatedServices.has('IAM'), 'IAM should not be saturated after 1 question');
  });

  it('handles slots with missing fields gracefully', () => {
    const state = buildCoverageState([], EXAM_GUIDE);
    const before = state.totalQuestions;

    updateCoverageState(state, {}, 65);

    assert.equal(state.totalQuestions, before + 1);
  });
});

// ---------------------------------------------------------------------------
// computeSlotDistribution
// ---------------------------------------------------------------------------

describe('computeSlotDistribution', () => {
  it('total slots always equals totalSlots (65)', () => {
    const distribution = computeSlotDistribution(EXAM_GUIDE, 65);
    const total = [...distribution.values()].reduce((sum, n) => sum + n, 0);
    assert.equal(total, 65);
  });

  it('total slots always equals totalSlots for various counts', () => {
    for (const totalSlots of [10, 20, 30, 50, 65, 100]) {
      const distribution = computeSlotDistribution(EXAM_GUIDE, totalSlots);
      const total = [...distribution.values()].reduce((sum, n) => sum + n, 0);
      assert.equal(total, totalSlots, `Total mismatch for totalSlots=${totalSlots}`);
    }
  });

  it('highest-weight domain receives the most slots', () => {
    const distribution = computeSlotDistribution(EXAM_GUIDE, 65);
    // Design Secure Architectures has weight 0.30 — highest
    const secureSlots = distribution.get('Design Secure Architectures');
    for (const [domain, slots] of distribution) {
      if (domain !== 'Design Secure Architectures') {
        assert.ok(
          secureSlots >= slots,
          `Secure (${secureSlots}) should have >= slots than ${domain} (${slots})`,
        );
      }
    }
  });

  it('returns empty map for exam guide with no domains', () => {
    const distribution = computeSlotDistribution({ domains: [] }, 65);
    assert.equal(distribution.size, 0);
  });

  it('assigns remainder to highest-weight domain so total is exact', () => {
    const guide = {
      domains: [
        { name: 'Domain A', weight: 0.33 },
        { name: 'Domain B', weight: 0.33 },
        { name: 'Domain C', weight: 0.34 },
      ],
    };
    const distribution = computeSlotDistribution(guide, 10);
    const total = [...distribution.values()].reduce((sum, n) => sum + n, 0);
    assert.equal(total, 10);
  });

  it('each domain appears in the distribution', () => {
    const distribution = computeSlotDistribution(EXAM_GUIDE, 65);
    for (const domain of EXAM_GUIDE.domains) {
      assert.ok(distribution.has(domain.name), `Domain "${domain.name}" missing from distribution`);
    }
  });
});
