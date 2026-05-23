/**
 * Unit tests for submit-results Lambda enhancements.
 *
 * Tests:
 * - Request validation (missing fields return 400)
 * - Snapshot truncation with oversized payloads
 * - Weak Pool creation when item doesn't exist
 * - Weak Pool promotion/demotion transitions
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock DynamoDB client ──────────────────────────────────────────────────────

const mockSend = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  PutCommand: class PutCommand {
    constructor(public input: any) {}
  },
  GetCommand: class GetCommand {
    constructor(public input: any) {}
  },
  UpdateCommand: class UpdateCommand {
    constructor(public input: any) {}
  },
}));

vi.mock('../../submit-results/common/db.js', () => ({
  docClient: { send: (...args: any[]) => mockSend(...args) },
}));

// Set environment variables before importing handler
vi.stubEnv('TABLE_NAME', 'TestTable');
vi.stubEnv('ALLOWED_ORIGIN', 'https://test.example.com');

// Import handler after mocks are set up
const { handler } = await import('../../submit-results/index.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(body: any, userId: string | null = 'user-123') {
  return {
    requestContext: {
      authorizer: {
        claims: userId ? { sub: userId } : {},
      },
    },
    body: JSON.stringify(body),
  };
}

function makeBasicBody(overrides: any = {}) {
  return {
    examId: 'exam-1',
    certId: 'SAA-C03',
    score: 78,
    timeTaken: 45,
    answers: {
      '0': { q_id: 'q1', domain: 'Security', selected: 'A', isCorrect: true },
      '1': { q_id: 'q2', domain: 'Networking', selected: 'B', isCorrect: false },
    },
    ...overrides,
  };
}

function makeSnapshot(id: string, explanationLength = 100) {
  return {
    q_id: id,
    text: `Question text for ${id}`,
    options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
    correct: 'A',
    explanation: 'x'.repeat(explanationLength),
    domain: 'Security',
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('submit-results handler', () => {
  beforeEach(() => {
    mockSend.mockReset();
    // Default: DynamoDB operations succeed
    mockSend.mockResolvedValue({});
  });

  // ── Request Validation ────────────────────────────────────────────────────

  describe('request validation (missing fields return 400)', () => {
    it('returns 400 when userId is missing from auth context', async () => {
      const event = makeEvent(makeBasicBody(), null);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('Missing required fields');
    });

    it('returns 400 when examId is missing', async () => {
      const event = makeEvent({ score: 78, certId: 'SAA-C03' });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('Missing required fields');
    });

    it('returns 400 when score is missing (undefined)', async () => {
      const event = makeEvent({ examId: 'exam-1', certId: 'SAA-C03' });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('Missing required fields');
    });

    it('returns 201 when score is 0 (falsy but valid)', async () => {
      // GetCommand for Weak Pool returns no item
      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: null }); // GetCommand for Weak Pool
      mockSend.mockResolvedValueOnce({}); // PutCommand for new Weak Pool

      const event = makeEvent(makeBasicBody({ score: 0 }));
      const result = await handler(event);

      expect(result.statusCode).toBe(201);
    });

    it('returns 201 on valid request with all required fields', async () => {
      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: null }); // GetCommand for Weak Pool
      mockSend.mockResolvedValueOnce({}); // PutCommand for new Weak Pool

      const event = makeEvent(makeBasicBody());
      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body).message).toBe('Result saved successfully');
    });
  });

  // ── Snapshot Truncation ───────────────────────────────────────────────────

  describe('snapshot truncation with oversized payloads', () => {
    it('stores snapshots unchanged when within 400KB limit', async () => {
      const snapshots = [makeSnapshot('q1', 200), makeSnapshot('q2', 200)];

      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: null }); // GetCommand for Weak Pool
      mockSend.mockResolvedValueOnce({}); // PutCommand for new Weak Pool

      const event = makeEvent(makeBasicBody({ questionSnapshots: snapshots }));
      await handler(event);

      // Verify the PutCommand was called with snapshots
      const putCall = mockSend.mock.calls[0][0];
      const storedItem = putCall.input.Item;
      expect(storedItem.questionSnapshots).toBeDefined();
      expect(storedItem.questionSnapshots.length).toBe(2);
      // Explanations should be preserved unchanged
      expect(storedItem.questionSnapshots[0].explanation).toBe('x'.repeat(200));
      expect(storedItem.questionSnapshots[1].explanation).toBe('x'.repeat(200));
    });

    it('truncates explanations when total item exceeds 400KB', async () => {
      // Create snapshots with very large explanations that exceed 400KB
      const largeExplanation = 'x'.repeat(50_000); // 50KB each
      const snapshots = Array.from({ length: 10 }, (_, i) =>
        makeSnapshot(`q${i}`, 0)
      ).map(s => ({ ...s, explanation: largeExplanation }));
      // 10 * 50KB = 500KB in explanations alone, exceeds 400KB

      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: null }); // GetCommand for Weak Pool
      mockSend.mockResolvedValueOnce({}); // PutCommand for new Weak Pool

      const event = makeEvent(makeBasicBody({ questionSnapshots: snapshots }));
      await handler(event);

      const putCall = mockSend.mock.calls[0][0];
      const storedItem = putCall.input.Item;
      expect(storedItem.questionSnapshots).toBeDefined();
      expect(storedItem.questionSnapshots.length).toBe(10);

      // Explanations should be truncated
      for (const snap of storedItem.questionSnapshots) {
        expect(snap.explanation.length).toBeLessThan(largeExplanation.length);
      }

      // But question text, options, and correct answer should be preserved
      for (let i = 0; i < 10; i++) {
        expect(storedItem.questionSnapshots[i].q_id).toBe(`q${i}`);
        expect(storedItem.questionSnapshots[i].text).toBe(`Question text for q${i}`);
        expect(storedItem.questionSnapshots[i].options).toEqual({
          A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D',
        });
        expect(storedItem.questionSnapshots[i].correct).toBe('A');
      }
    });

    it('preserves question text and options even when explanations are fully removed', async () => {
      // Create extremely large snapshots that force complete explanation removal
      const hugeExplanation = 'x'.repeat(100_000); // 100KB each
      const snapshots = Array.from({ length: 5 }, (_, i) => ({
        ...makeSnapshot(`q${i}`, 0),
        explanation: hugeExplanation,
      }));

      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: null }); // GetCommand for Weak Pool
      mockSend.mockResolvedValueOnce({}); // PutCommand for new Weak Pool

      const event = makeEvent(makeBasicBody({ questionSnapshots: snapshots }));
      await handler(event);

      const putCall = mockSend.mock.calls[0][0];
      const storedItem = putCall.input.Item;

      // All question text and options must be preserved
      for (let i = 0; i < 5; i++) {
        expect(storedItem.questionSnapshots[i].text).toBe(`Question text for q${i}`);
        expect(storedItem.questionSnapshots[i].options).toEqual({
          A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D',
        });
        expect(storedItem.questionSnapshots[i].correct).toBe('A');
      }
    });

    it('does not add questionSnapshots field when none provided', async () => {
      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: null }); // GetCommand for Weak Pool
      mockSend.mockResolvedValueOnce({}); // PutCommand for new Weak Pool

      const event = makeEvent(makeBasicBody());
      await handler(event);

      const putCall = mockSend.mock.calls[0][0];
      const storedItem = putCall.input.Item;
      expect(storedItem.questionSnapshots).toBeUndefined();
    });
  });

  // ── Weak Pool Creation ────────────────────────────────────────────────────

  describe('Weak Pool creation when item does not exist', () => {
    it('creates a new Weak Pool item when GetCommand returns no item', async () => {
      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: undefined }); // GetCommand — no existing pool
      mockSend.mockResolvedValueOnce({}); // PutCommand for new Weak Pool

      const answers = {
        '0': { q_id: 'q1', domain: 'Security', selected: 'B', isCorrect: false },
      };
      const event = makeEvent(makeBasicBody({ answers }));
      await handler(event);

      // Third call should be PutCommand for new Weak Pool
      const poolPutCall = mockSend.mock.calls[2][0];
      expect(poolPutCall.input.Item).toBeDefined();
      expect(poolPutCall.input.Item.PK).toBe('USER#user-123');
      expect(poolPutCall.input.Item.SK).toBe('WEAK_POOL#SAA-C03');
      expect(poolPutCall.input.Item.type).toBe('WEAK_POOL');
      expect(poolPutCall.input.Item.sessionCounter).toBe(1);
      // The incorrect question should be in Box 1
      expect(poolPutCall.input.Item.questions.q1).toBeDefined();
      expect(poolPutCall.input.Item.questions.q1.box).toBe(1);
      expect(poolPutCall.input.Item.questions.q1.domain).toBe('Security');
    });

    it('creates Weak Pool with multiple incorrect questions in Box 1', async () => {
      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: undefined }); // GetCommand — no existing pool
      mockSend.mockResolvedValueOnce({}); // PutCommand for new Weak Pool

      const answers = {
        '0': { q_id: 'q1', domain: 'Security', selected: 'B', isCorrect: false },
        '1': { q_id: 'q2', domain: 'Networking', selected: 'C', isCorrect: false },
        '2': { q_id: 'q3', domain: 'Security', selected: 'A', isCorrect: true },
      };
      const event = makeEvent(makeBasicBody({ answers }));
      await handler(event);

      const poolPutCall = mockSend.mock.calls[2][0];
      const questions = poolPutCall.input.Item.questions;

      // Only incorrect questions should be in the pool
      expect(questions.q1).toBeDefined();
      expect(questions.q1.box).toBe(1);
      expect(questions.q2).toBeDefined();
      expect(questions.q2.box).toBe(1);
      // Correct question should NOT be in the pool
      expect(questions.q3).toBeUndefined();
    });
  });

  // ── Weak Pool Promotion/Demotion ──────────────────────────────────────────

  describe('Weak Pool promotion/demotion transitions', () => {
    it('promotes a Box 1 question to Box 2 when answered correctly', async () => {
      const existingPool = {
        q1: { box: 1, addedAt: '2024-01-01T00:00:00.000Z', lastReviewed: '2024-01-01T00:00:00.000Z', domain: 'Security', certId: 'SAA-C03' },
      };

      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: { PK: 'USER#user-123', SK: 'WEAK_POOL#SAA-C03', questions: existingPool, sessionCounter: 5 } }); // GetCommand
      mockSend.mockResolvedValueOnce({}); // UpdateCommand

      const answers = {
        '0': { q_id: 'q1', domain: 'Security', selected: 'A', isCorrect: true },
      };
      const event = makeEvent(makeBasicBody({ answers }));
      await handler(event);

      // Third call should be UpdateCommand with promoted question
      const updateCall = mockSend.mock.calls[2][0];
      const updatedQuestions = updateCall.input.ExpressionAttributeValues[':questions'];
      expect(updatedQuestions.q1.box).toBe(2);
    });

    it('promotes a Box 2 question to Box 3 when answered correctly', async () => {
      const existingPool = {
        q1: { box: 2, addedAt: '2024-01-01T00:00:00.000Z', lastReviewed: '2024-01-01T00:00:00.000Z', domain: 'Security', certId: 'SAA-C03' },
      };

      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: { PK: 'USER#user-123', SK: 'WEAK_POOL#SAA-C03', questions: existingPool, sessionCounter: 5 } }); // GetCommand
      mockSend.mockResolvedValueOnce({}); // UpdateCommand

      const answers = {
        '0': { q_id: 'q1', domain: 'Security', selected: 'A', isCorrect: true },
      };
      const event = makeEvent(makeBasicBody({ answers }));
      await handler(event);

      const updateCall = mockSend.mock.calls[2][0];
      const updatedQuestions = updateCall.input.ExpressionAttributeValues[':questions'];
      expect(updatedQuestions.q1.box).toBe(3);
    });

    it('removes a Box 3 question from pool when answered correctly (mastered)', async () => {
      const existingPool = {
        q1: { box: 3, addedAt: '2024-01-01T00:00:00.000Z', lastReviewed: '2024-01-01T00:00:00.000Z', domain: 'Security', certId: 'SAA-C03' },
        q2: { box: 1, addedAt: '2024-01-01T00:00:00.000Z', lastReviewed: '2024-01-01T00:00:00.000Z', domain: 'Networking', certId: 'SAA-C03' },
      };

      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: { PK: 'USER#user-123', SK: 'WEAK_POOL#SAA-C03', questions: existingPool, sessionCounter: 5 } }); // GetCommand
      mockSend.mockResolvedValueOnce({}); // UpdateCommand

      const answers = {
        '0': { q_id: 'q1', domain: 'Security', selected: 'A', isCorrect: true },
      };
      const event = makeEvent(makeBasicBody({ answers }));
      await handler(event);

      const updateCall = mockSend.mock.calls[2][0];
      const updatedQuestions = updateCall.input.ExpressionAttributeValues[':questions'];
      // q1 should be removed (mastered)
      expect(updatedQuestions.q1).toBeUndefined();
      // q2 should remain unchanged
      expect(updatedQuestions.q2).toBeDefined();
      expect(updatedQuestions.q2.box).toBe(1);
    });

    it('demotes a Box 2 question back to Box 1 when answered incorrectly', async () => {
      const existingPool = {
        q1: { box: 2, addedAt: '2024-01-01T00:00:00.000Z', lastReviewed: '2024-01-01T00:00:00.000Z', domain: 'Security', certId: 'SAA-C03' },
      };

      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: { PK: 'USER#user-123', SK: 'WEAK_POOL#SAA-C03', questions: existingPool, sessionCounter: 5 } }); // GetCommand
      mockSend.mockResolvedValueOnce({}); // UpdateCommand

      const answers = {
        '0': { q_id: 'q1', domain: 'Security', selected: 'B', isCorrect: false },
      };
      const event = makeEvent(makeBasicBody({ answers }));
      await handler(event);

      const updateCall = mockSend.mock.calls[2][0];
      const updatedQuestions = updateCall.input.ExpressionAttributeValues[':questions'];
      expect(updatedQuestions.q1.box).toBe(1);
    });

    it('demotes a Box 3 question back to Box 1 when answered incorrectly', async () => {
      const existingPool = {
        q1: { box: 3, addedAt: '2024-01-01T00:00:00.000Z', lastReviewed: '2024-01-01T00:00:00.000Z', domain: 'Security', certId: 'SAA-C03' },
      };

      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: { PK: 'USER#user-123', SK: 'WEAK_POOL#SAA-C03', questions: existingPool, sessionCounter: 5 } }); // GetCommand
      mockSend.mockResolvedValueOnce({}); // UpdateCommand

      const answers = {
        '0': { q_id: 'q1', domain: 'Security', selected: 'C', isCorrect: false },
      };
      const event = makeEvent(makeBasicBody({ answers }));
      await handler(event);

      const updateCall = mockSend.mock.calls[2][0];
      const updatedQuestions = updateCall.input.ExpressionAttributeValues[':questions'];
      expect(updatedQuestions.q1.box).toBe(1);
    });

    it('adds new incorrect question to Box 1 when pool already exists', async () => {
      const existingPool = {
        q1: { box: 2, addedAt: '2024-01-01T00:00:00.000Z', lastReviewed: '2024-01-01T00:00:00.000Z', domain: 'Security', certId: 'SAA-C03' },
      };

      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: { PK: 'USER#user-123', SK: 'WEAK_POOL#SAA-C03', questions: existingPool, sessionCounter: 5 } }); // GetCommand
      mockSend.mockResolvedValueOnce({}); // UpdateCommand

      const answers = {
        '0': { q_id: 'q2', domain: 'Networking', selected: 'B', isCorrect: false },
      };
      const event = makeEvent(makeBasicBody({ answers }));
      await handler(event);

      const updateCall = mockSend.mock.calls[2][0];
      const updatedQuestions = updateCall.input.ExpressionAttributeValues[':questions'];
      // New incorrect question should be added to Box 1
      expect(updatedQuestions.q2).toBeDefined();
      expect(updatedQuestions.q2.box).toBe(1);
      expect(updatedQuestions.q2.domain).toBe('Networking');
      // Existing question should remain unchanged
      expect(updatedQuestions.q1).toBeDefined();
      expect(updatedQuestions.q1.box).toBe(2);
    });

    it('uses UpdateCommand (not PutCommand) when pool already exists', async () => {
      const existingPool = {
        q1: { box: 1, addedAt: '2024-01-01T00:00:00.000Z', lastReviewed: '2024-01-01T00:00:00.000Z', domain: 'Security', certId: 'SAA-C03' },
      };

      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: { PK: 'USER#user-123', SK: 'WEAK_POOL#SAA-C03', questions: existingPool, sessionCounter: 5 } }); // GetCommand
      mockSend.mockResolvedValueOnce({}); // UpdateCommand

      const answers = {
        '0': { q_id: 'q1', domain: 'Security', selected: 'A', isCorrect: true },
      };
      const event = makeEvent(makeBasicBody({ answers }));
      await handler(event);

      // Third call should be UpdateCommand (has UpdateExpression)
      const updateCall = mockSend.mock.calls[2][0];
      expect(updateCall.input.UpdateExpression).toBeDefined();
      expect(updateCall.input.UpdateExpression).toContain('SET questions');
    });

    it('does not modify pool for correct answers not in pool', async () => {
      const existingPool = {
        q1: { box: 2, addedAt: '2024-01-01T00:00:00.000Z', lastReviewed: '2024-01-01T00:00:00.000Z', domain: 'Security', certId: 'SAA-C03' },
      };

      mockSend.mockResolvedValueOnce({}); // PutCommand for attempt
      mockSend.mockResolvedValueOnce({ Item: { PK: 'USER#user-123', SK: 'WEAK_POOL#SAA-C03', questions: existingPool, sessionCounter: 5 } }); // GetCommand
      mockSend.mockResolvedValueOnce({}); // UpdateCommand

      const answers = {
        '0': { q_id: 'q99', domain: 'Networking', selected: 'A', isCorrect: true },
      };
      const event = makeEvent(makeBasicBody({ answers }));
      await handler(event);

      const updateCall = mockSend.mock.calls[2][0];
      const updatedQuestions = updateCall.input.ExpressionAttributeValues[':questions'];
      // q99 should NOT be in the pool (correct answer, not previously in pool)
      expect(updatedQuestions.q99).toBeUndefined();
      // Existing entry should remain unchanged
      expect(updatedQuestions.q1.box).toBe(2);
    });
  });
});
