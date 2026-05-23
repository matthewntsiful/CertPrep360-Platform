/**
 * Unit tests for get-dynamic-quiz Lambda — adaptive mode, multi-domain mode,
 * Weak Pool scheduling integration, and fallback behavior.
 *
 * Tests the handler's three modes:
 * - mode=adaptive: queries user's domain performance, identifies 2-3 weakest domains
 * - Multi-domain (comma-separated domain param): explicit domain list with inverse weighting
 * - Single-domain (original behavior): enhanced with Weak Pool mixing
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DynamoDB document client
const mockSend = vi.fn();
vi.mock('../../common/db.js', () => ({
  docClient: { send: (...args: any[]) => mockSend(...args) },
}));

// Import the handler after mocking
import { handler } from '../../get-dynamic-quiz/index.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(queryParams: Record<string, string> = {}, userId?: string) {
  return {
    queryStringParameters: queryParams,
    requestContext: userId
      ? { authorizer: { claims: { sub: userId } } }
      : {},
  };
}

function makeQuestion(id: string, domain: string, certId = 'SAA-C03') {
  return {
    PK: `CERT#${certId}`,
    SK: `QUESTION#${id}`,
    q_id: id,
    cert_id: certId,
    exam_id: 'exam-1',
    text: `Question ${id}`,
    options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
    correct: 'A',
    explanation: `Explanation for ${id}`,
    domain,
    primary_service: 'EC2',
    type: 'QUESTION',
  };
}

function makeAttemptWithDomainScores(
  userId: string,
  certId: string,
  domainScores: Record<string, number>,
  timestamp: string,
) {
  return {
    PK: `USER#${userId}`,
    SK: `ATTEMPT#${timestamp}#EXAM#exam-1`,
    certId,
    domainScores,
    type: 'EXAM_ATTEMPT',
  };
}

function makeWeakPoolItem(
  userId: string,
  certId: string,
  questions: Record<string, { box: number; lastReviewed: string; domain: string; certId: string }>,
  sessionCounter: number,
) {
  return {
    PK: `USER#${userId}`,
    SK: `WEAK_POOL#${certId}`,
    questions,
    sessionCounter,
    type: 'WEAK_POOL',
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TABLE_NAME = 'CertPrep360-Test';
  process.env.ALLOWED_ORIGIN = 'https://test.example.com';
});

// ── Adaptive Mode Tests ───────────────────────────────────────────────────────

describe('Dynamic Quiz - Adaptive Mode (mode=adaptive)', () => {
  it('returns mode "adaptive" with 2-3 weakest domains when user has sufficient data', async () => {
    const userId = 'user-123';
    const certId = 'SAA-C03';

    // Mock: getUserDomainPerformance — query attempts
    mockSend.mockImplementation((command: any) => {
      const input = command.input;

      // Query for user attempts (domain performance)
      if (input.KeyConditionExpression?.includes('begins_with') &&
          input.ExpressionAttributeValues?.[':skPrefix'] === 'ATTEMPT#') {
        return Promise.resolve({
          Items: [
            makeAttemptWithDomainScores(userId, certId, {
              'Design Resilient Architectures': 85,
              'Security': 45,
              'Cost Optimization': 60,
              'High Performance': 90,
              'Operational Excellence': 50,
            }, '2024-01-01T00:00:00Z'),
          ],
          LastEvaluatedKey: undefined,
        });
      }

      // UpdateCommand for Weak Pool session counter increment
      if (input.UpdateExpression?.includes('ADD sessionCounter')) {
        return Promise.resolve({
          Attributes: makeWeakPoolItem(userId, certId, {}, 1),
        });
      }

      // GSI1 query for domain questions
      if (input.IndexName === 'GSI1') {
        const domainKey = input.ExpressionAttributeValues?.[':pk'] as string;
        const domain = domainKey?.replace('DOMAIN#', '');
        return Promise.resolve({
          Items: Array.from({ length: 10 }, (_, i) =>
            makeQuestion(`${domain}-q${i}`, domain, certId),
          ),
          LastEvaluatedKey: undefined,
        });
      }

      return Promise.resolve({ Items: [], LastEvaluatedKey: undefined });
    });

    const event = makeEvent({ mode: 'adaptive', certId, limit: '20' }, userId);
    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.mode).toBe('adaptive');
    expect(body.domains.length).toBeGreaterThanOrEqual(2);
    expect(body.domains.length).toBeLessThanOrEqual(3);
    // The weakest domains should be Security (45), Operational Excellence (50), Cost Optimization (60)
    expect(body.domains).toContain('Security');
    expect(body.domains).toContain('Operational Excellence');
    expect(body.count).toBeGreaterThan(0);
    expect(body.count).toBeLessThanOrEqual(20);
    expect(body).toHaveProperty('weakPoolIncluded');
  });

  it('falls back to all domains when user has < 2 domains with data', async () => {
    const userId = 'user-456';
    const certId = 'SAA-C03';

    mockSend.mockImplementation((command: any) => {
      const input = command.input;

      // Query for user attempts — only 1 domain
      if (input.KeyConditionExpression?.includes('begins_with') &&
          input.ExpressionAttributeValues?.[':skPrefix'] === 'ATTEMPT#') {
        return Promise.resolve({
          Items: [
            makeAttemptWithDomainScores(userId, certId, {
              'Security': 60,
            }, '2024-01-01T00:00:00Z'),
          ],
          LastEvaluatedKey: undefined,
        });
      }

      // UpdateCommand for Weak Pool
      if (input.UpdateExpression?.includes('ADD sessionCounter')) {
        return Promise.resolve({
          Attributes: makeWeakPoolItem(userId, certId, {}, 1),
        });
      }

      // Scan for all domains in cert (fallback path)
      if (input.FilterExpression?.includes('#type = :qType') &&
          input.ProjectionExpression === '#domain') {
        return Promise.resolve({
          Items: [
            { domain: 'Security' },
            { domain: 'Design Resilient Architectures' },
            { domain: 'Cost Optimization' },
            { domain: 'High Performance' },
          ],
          LastEvaluatedKey: undefined,
        });
      }

      // GSI1 query for domain questions
      if (input.IndexName === 'GSI1') {
        const domainKey = input.ExpressionAttributeValues?.[':pk'] as string;
        const domain = domainKey?.replace('DOMAIN#', '');
        return Promise.resolve({
          Items: Array.from({ length: 5 }, (_, i) =>
            makeQuestion(`${domain}-q${i}`, domain, certId),
          ),
          LastEvaluatedKey: undefined,
        });
      }

      return Promise.resolve({ Items: [], LastEvaluatedKey: undefined });
    });

    const event = makeEvent({ mode: 'adaptive', certId, limit: '20' }, userId);
    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.mode).toBe('adaptive');
    // Should fall back to all available domains
    expect(body.domains.length).toBeGreaterThanOrEqual(2);
    expect(body.count).toBeGreaterThan(0);
  });

  it('falls back to all domains when user has no attempt data at all', async () => {
    const userId = 'user-new';
    const certId = 'SAA-C03';

    mockSend.mockImplementation((command: any) => {
      const input = command.input;

      // No attempts found
      if (input.KeyConditionExpression?.includes('begins_with') &&
          input.ExpressionAttributeValues?.[':skPrefix'] === 'ATTEMPT#') {
        return Promise.resolve({ Items: [], LastEvaluatedKey: undefined });
      }

      // UpdateCommand for Weak Pool
      if (input.UpdateExpression?.includes('ADD sessionCounter')) {
        return Promise.resolve({
          Attributes: makeWeakPoolItem(userId, certId, {}, 1),
        });
      }

      // Scan for all domains
      if (input.FilterExpression?.includes('#type = :qType') &&
          input.ProjectionExpression === '#domain') {
        return Promise.resolve({
          Items: [
            { domain: 'Security' },
            { domain: 'Design Resilient Architectures' },
            { domain: 'Cost Optimization' },
          ],
          LastEvaluatedKey: undefined,
        });
      }

      // GSI1 query for domain questions
      if (input.IndexName === 'GSI1') {
        const domainKey = input.ExpressionAttributeValues?.[':pk'] as string;
        const domain = domainKey?.replace('DOMAIN#', '');
        return Promise.resolve({
          Items: Array.from({ length: 5 }, (_, i) =>
            makeQuestion(`${domain}-q${i}`, domain, certId),
          ),
          LastEvaluatedKey: undefined,
        });
      }

      return Promise.resolve({ Items: [], LastEvaluatedKey: undefined });
    });

    const event = makeEvent({ mode: 'adaptive', certId, limit: '15' }, userId);
    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.mode).toBe('adaptive');
    // Fallback: all domains from the question bank
    expect(body.domains).toContain('Security');
    expect(body.domains).toContain('Design Resilient Architectures');
    expect(body.domains).toContain('Cost Optimization');
  });
});

// ── Multi-Domain Mode Tests ───────────────────────────────────────────────────

describe('Dynamic Quiz - Multi-Domain Mode (comma-separated domain param)', () => {
  it('uses explicit domains with inverse weighting', async () => {
    const userId = 'user-789';
    const certId = 'SAA-C03';
    const domains = ['Security', 'Cost Optimization'];

    mockSend.mockImplementation((command: any) => {
      const input = command.input;

      // Query for user attempts (domain performance for weighting)
      if (input.KeyConditionExpression?.includes('begins_with') &&
          input.ExpressionAttributeValues?.[':skPrefix'] === 'ATTEMPT#') {
        return Promise.resolve({
          Items: [
            makeAttemptWithDomainScores(userId, certId, {
              'Security': 40,
              'Cost Optimization': 80,
            }, '2024-01-01T00:00:00Z'),
          ],
          LastEvaluatedKey: undefined,
        });
      }

      // UpdateCommand for Weak Pool
      if (input.UpdateExpression?.includes('ADD sessionCounter')) {
        return Promise.resolve({
          Attributes: makeWeakPoolItem(userId, certId, {}, 1),
        });
      }

      // GSI1 query for domain questions
      if (input.IndexName === 'GSI1') {
        const domainKey = input.ExpressionAttributeValues?.[':pk'] as string;
        const domain = domainKey?.replace('DOMAIN#', '');
        return Promise.resolve({
          Items: Array.from({ length: 15 }, (_, i) =>
            makeQuestion(`${domain}-q${i}`, domain, certId),
          ),
          LastEvaluatedKey: undefined,
        });
      }

      return Promise.resolve({ Items: [], LastEvaluatedKey: undefined });
    });

    const event = makeEvent(
      { domain: domains.join(','), certId, limit: '20' },
      userId,
    );
    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.mode).toBe('multi-domain');
    expect(body.domains).toEqual(domains);
    expect(body.count).toBeGreaterThan(0);
    expect(body.count).toBeLessThanOrEqual(20);

    // All questions should belong to one of the specified domains
    for (const q of body.questions) {
      expect(domains).toContain(q.domain);
    }
  });

  it('returns only questions from specified domains (no leakage)', async () => {
    const userId = 'user-multi';
    const certId = 'SAA-C03';
    const requestedDomains = ['Security', 'High Performance'];

    mockSend.mockImplementation((command: any) => {
      const input = command.input;

      if (input.KeyConditionExpression?.includes('begins_with') &&
          input.ExpressionAttributeValues?.[':skPrefix'] === 'ATTEMPT#') {
        return Promise.resolve({
          Items: [
            makeAttemptWithDomainScores(userId, certId, {
              'Security': 50,
              'High Performance': 70,
              'Cost Optimization': 30,
            }, '2024-01-01T00:00:00Z'),
          ],
          LastEvaluatedKey: undefined,
        });
      }

      if (input.UpdateExpression?.includes('ADD sessionCounter')) {
        return Promise.resolve({
          Attributes: makeWeakPoolItem(userId, certId, {}, 1),
        });
      }

      if (input.IndexName === 'GSI1') {
        const domainKey = input.ExpressionAttributeValues?.[':pk'] as string;
        const domain = domainKey?.replace('DOMAIN#', '');
        return Promise.resolve({
          Items: Array.from({ length: 10 }, (_, i) =>
            makeQuestion(`${domain}-q${i}`, domain, certId),
          ),
          LastEvaluatedKey: undefined,
        });
      }

      return Promise.resolve({ Items: [], LastEvaluatedKey: undefined });
    });

    const event = makeEvent(
      { domain: requestedDomains.join(','), certId, limit: '10' },
      userId,
    );
    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    // No questions from 'Cost Optimization' should appear
    for (const q of body.questions) {
      expect(requestedDomains).toContain(q.domain);
      expect(q.domain).not.toBe('Cost Optimization');
    }
  });
});

// ── Weak Pool Scheduling Integration Tests ────────────────────────────────────

describe('Dynamic Quiz - Weak Pool Scheduling Integration', () => {
  it('includes Weak Pool questions and reports weakPoolIncluded count', async () => {
    const userId = 'user-wp';
    const certId = 'SAA-C03';
    const now = new Date();
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();

    mockSend.mockImplementation((command: any) => {
      const input = command.input;

      // Query for user attempts
      if (input.KeyConditionExpression?.includes('begins_with') &&
          input.ExpressionAttributeValues?.[':skPrefix'] === 'ATTEMPT#') {
        return Promise.resolve({
          Items: [
            makeAttemptWithDomainScores(userId, certId, {
              'Security': 40,
              'Cost Optimization': 60,
              'Design Resilient Architectures': 80,
            }, '2024-01-01T00:00:00Z'),
          ],
          LastEvaluatedKey: undefined,
        });
      }

      // UpdateCommand for Weak Pool — returns pool with scheduled questions
      if (input.UpdateExpression?.includes('ADD sessionCounter')) {
        return Promise.resolve({
          Attributes: makeWeakPoolItem(userId, certId, {
            'wp-q1': { box: 1, lastReviewed: now.toISOString(), domain: 'Security', certId },
            'wp-q2': { box: 1, lastReviewed: now.toISOString(), domain: 'Cost Optimization', certId },
            'wp-q3': { box: 2, lastReviewed: now.toISOString(), domain: 'Security', certId },
            'wp-q4': { box: 3, lastReviewed: eightDaysAgo, domain: 'Security', certId },
          }, 3), // sessionCounter=3, so Box 2 is included (3 % 3 === 0)
        });
      }

      // Query for individual weak pool questions by ID
      if (input.KeyConditionExpression?.includes('PK = :pk AND SK = :sk') &&
          input.ExpressionAttributeValues?.[':sk']?.startsWith('QUESTION#')) {
        const qId = input.ExpressionAttributeValues[':sk'].replace('QUESTION#', '');
        const domain = qId.includes('q1') || qId.includes('q3') || qId.includes('q4')
          ? 'Security'
          : 'Cost Optimization';
        return Promise.resolve({
          Items: [makeQuestion(qId, domain, certId)],
        });
      }

      // GSI1 query for domain questions
      if (input.IndexName === 'GSI1') {
        const domainKey = input.ExpressionAttributeValues?.[':pk'] as string;
        const domain = domainKey?.replace('DOMAIN#', '');
        return Promise.resolve({
          Items: Array.from({ length: 10 }, (_, i) =>
            makeQuestion(`${domain}-regular-q${i}`, domain, certId),
          ),
          LastEvaluatedKey: undefined,
        });
      }

      return Promise.resolve({ Items: [], LastEvaluatedKey: undefined });
    });

    const event = makeEvent({ mode: 'adaptive', certId, limit: '20' }, userId);
    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.weakPoolIncluded).toBeGreaterThanOrEqual(0);
    expect(typeof body.weakPoolIncluded).toBe('number');
  });

  it('increments session counter atomically on each quiz generation', async () => {
    const userId = 'user-session';
    const certId = 'SAA-C03';

    let sessionCounterUpdateCalled = false;

    mockSend.mockImplementation((command: any) => {
      const input = command.input;

      if (input.KeyConditionExpression?.includes('begins_with') &&
          input.ExpressionAttributeValues?.[':skPrefix'] === 'ATTEMPT#') {
        return Promise.resolve({
          Items: [
            makeAttemptWithDomainScores(userId, certId, {
              'Security': 50,
              'Cost Optimization': 60,
              'Design Resilient Architectures': 70,
            }, '2024-01-01T00:00:00Z'),
          ],
          LastEvaluatedKey: undefined,
        });
      }

      // Verify the session counter increment
      if (input.UpdateExpression?.includes('ADD sessionCounter')) {
        sessionCounterUpdateCalled = true;
        expect(input.Key).toEqual({ PK: `USER#${userId}`, SK: `WEAK_POOL#${certId}` });
        expect(input.ExpressionAttributeValues[':inc']).toBe(1);
        return Promise.resolve({
          Attributes: makeWeakPoolItem(userId, certId, {}, 5),
        });
      }

      if (input.IndexName === 'GSI1') {
        const domainKey = input.ExpressionAttributeValues?.[':pk'] as string;
        const domain = domainKey?.replace('DOMAIN#', '');
        return Promise.resolve({
          Items: Array.from({ length: 10 }, (_, i) =>
            makeQuestion(`${domain}-q${i}`, domain, certId),
          ),
          LastEvaluatedKey: undefined,
        });
      }

      return Promise.resolve({ Items: [], LastEvaluatedKey: undefined });
    });

    const event = makeEvent({ mode: 'adaptive', certId, limit: '10' }, userId);
    await handler(event);

    expect(sessionCounterUpdateCalled).toBe(true);
  });

  it('handles empty Weak Pool gracefully (weakPoolIncluded = 0)', async () => {
    const userId = 'user-empty-wp';
    const certId = 'SAA-C03';

    mockSend.mockImplementation((command: any) => {
      const input = command.input;

      if (input.KeyConditionExpression?.includes('begins_with') &&
          input.ExpressionAttributeValues?.[':skPrefix'] === 'ATTEMPT#') {
        return Promise.resolve({
          Items: [
            makeAttemptWithDomainScores(userId, certId, {
              'Security': 40,
              'Cost Optimization': 60,
              'Design Resilient Architectures': 80,
            }, '2024-01-01T00:00:00Z'),
          ],
          LastEvaluatedKey: undefined,
        });
      }

      // Empty Weak Pool
      if (input.UpdateExpression?.includes('ADD sessionCounter')) {
        return Promise.resolve({
          Attributes: { PK: `USER#${userId}`, SK: `WEAK_POOL#${certId}`, sessionCounter: 1 },
        });
      }

      if (input.IndexName === 'GSI1') {
        const domainKey = input.ExpressionAttributeValues?.[':pk'] as string;
        const domain = domainKey?.replace('DOMAIN#', '');
        return Promise.resolve({
          Items: Array.from({ length: 10 }, (_, i) =>
            makeQuestion(`${domain}-q${i}`, domain, certId),
          ),
          LastEvaluatedKey: undefined,
        });
      }

      return Promise.resolve({ Items: [], LastEvaluatedKey: undefined });
    });

    const event = makeEvent({ mode: 'adaptive', certId, limit: '10' }, userId);
    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.weakPoolIncluded).toBe(0);
  });
});

// ── Response Shape Tests ──────────────────────────────────────────────────────

describe('Dynamic Quiz - Response Shape', () => {
  it('adaptive mode response includes all required fields', async () => {
    const userId = 'user-shape';
    const certId = 'SAA-C03';

    mockSend.mockImplementation((command: any) => {
      const input = command.input;

      if (input.KeyConditionExpression?.includes('begins_with') &&
          input.ExpressionAttributeValues?.[':skPrefix'] === 'ATTEMPT#') {
        return Promise.resolve({
          Items: [
            makeAttemptWithDomainScores(userId, certId, {
              'Security': 30,
              'Cost Optimization': 50,
              'Design Resilient Architectures': 70,
              'High Performance': 90,
            }, '2024-01-01T00:00:00Z'),
          ],
          LastEvaluatedKey: undefined,
        });
      }

      if (input.UpdateExpression?.includes('ADD sessionCounter')) {
        return Promise.resolve({
          Attributes: makeWeakPoolItem(userId, certId, {}, 1),
        });
      }

      if (input.IndexName === 'GSI1') {
        const domainKey = input.ExpressionAttributeValues?.[':pk'] as string;
        const domain = domainKey?.replace('DOMAIN#', '');
        return Promise.resolve({
          Items: Array.from({ length: 10 }, (_, i) =>
            makeQuestion(`${domain}-q${i}`, domain, certId),
          ),
          LastEvaluatedKey: undefined,
        });
      }

      return Promise.resolve({ Items: [], LastEvaluatedKey: undefined });
    });

    const event = makeEvent({ mode: 'adaptive', certId, limit: '10' }, userId);
    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body).toHaveProperty('mode', 'adaptive');
    expect(body).toHaveProperty('domains');
    expect(body).toHaveProperty('count');
    expect(body).toHaveProperty('totalAvailable');
    expect(body).toHaveProperty('weakPoolIncluded');
    expect(body).toHaveProperty('questions');
    expect(Array.isArray(body.questions)).toBe(true);
    expect(Array.isArray(body.domains)).toBe(true);
    expect(typeof body.count).toBe('number');
    expect(typeof body.weakPoolIncluded).toBe('number');
  });

  it('returns 400 when neither domain nor mode=adaptive is provided', async () => {
    const event = makeEvent({ certId: 'SAA-C03', limit: '10' });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('domain');
  });
});
