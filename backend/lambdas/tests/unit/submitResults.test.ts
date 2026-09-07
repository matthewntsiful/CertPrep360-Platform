import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSend = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  PutCommand: class PutCommand { constructor(public input: any) {} },
  GetCommand: class GetCommand { constructor(public input: any) {} },
  UpdateCommand: class UpdateCommand { constructor(public input: any) {} },
  DynamoDBDocumentClient: { from: () => ({ send: (...args: any[]) => mockSend(...args) }) },
}));

vi.mock('../../submit-results/common/db.js', () => ({
  docClient: { send: (...args: any[]) => mockSend(...args) },
}));

vi.stubEnv('TABLE_NAME', 'TestTable');
vi.stubEnv('ALLOWED_ORIGIN', 'https://test.example.com');

const { handler } = await import('../../submit-results/index.js');

function makeEvent(body: unknown, userId: string | null = 'user-123') {
  return {
    requestContext: { authorizer: { claims: userId ? { sub: userId } : {} } },
    body: JSON.stringify(body),
  };
}

const manifest = {
  PK: 'USER#user-123',
  SK: 'ATTEMPT#attempt-1#MANIFEST',
  type: 'ATTEMPT_MANIFEST',
  status: 'ACTIVE',
  attemptId: 'attempt-1',
  certId: 'SAA-C03',
  examId: 'exam-1',
  startedAt: '2026-09-07T00:00:00.000Z',
  expiresAt: 1_800_000_000,
  questions: [
    { q_id: 'q1', domain: 'Security', correct: ['A'], explanation: 'Correct answer is A.', resources: [] },
    { q_id: 'q2', domain: 'Networking', correct: ['A', 'B'], explanation: 'Both options are required.', resources: [] },
  ],
};

describe('submit-results handler', () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({});
  });

  it('requires an authenticated user', async () => {
    const response = await handler(makeEvent({ attemptId: 'attempt-1', answers: {} }, null));
    expect(response.statusCode).toBe(401);
  });

  it('requires a server-issued attempt ID and answer map', async () => {
    const response = await handler(makeEvent({ score: 100, timeTaken: 1 }));
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toContain('attemptId');
  });

  it('scores using the manifest rather than client-provided score or correctness', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: manifest }) // manifest get
      .mockResolvedValueOnce({}) // immutable attempt put
      .mockResolvedValueOnce({}) // manifest status update
      .mockResolvedValueOnce({ Item: undefined }) // weak pool get
      .mockResolvedValueOnce({}); // weak pool put

    const response = await handler(makeEvent({
      attemptId: 'attempt-1',
      // These fields are deliberately ignored; server scoring is authoritative.
      score: 100,
      timeTaken: 1,
      answers: { q1: 'A', q2: 'A' },
    }));

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.score).toBe(50);
    expect(body.correctCount).toBe(1);
    expect(body.timeTaken).toBeGreaterThanOrEqual(0);
    expect(body.answers.q1.isCorrect).toBe(true);
    expect(body.answers.q2.isCorrect).toBe(false);

    const storedAttempt = mockSend.mock.calls[1][0].input.Item;
    expect(storedAttempt.score).toBe(50);
    expect(storedAttempt.answers.q2.isCorrect).toBe(false);
  });

  it('matches multi-answer selections independently of selection order', async () => {
    mockSend
      .mockResolvedValueOnce({ Item: manifest })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: undefined })
      .mockResolvedValueOnce({});

    const response = await handler(makeEvent({
      attemptId: 'attempt-1',
      answers: { q1: 'A', q2: ['B', 'A'] },
    }));

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.score).toBe(100);
    expect(body.answers.q2.isCorrect).toBe(true);
  });

  it('rejects expired or previously submitted attempts', async () => {
    mockSend.mockResolvedValueOnce({ Item: { ...manifest, status: 'SUBMITTED' } });
    const submittedResponse = await handler(makeEvent({ attemptId: 'attempt-1', answers: {} }));
    expect(submittedResponse.statusCode).toBe(409);

    mockSend.mockResolvedValueOnce({ Item: { ...manifest, expiresAt: 1 } });
    const expiredResponse = await handler(makeEvent({ attemptId: 'attempt-1', answers: {} }));
    expect(expiredResponse.statusCode).toBe(409);
  });
});
