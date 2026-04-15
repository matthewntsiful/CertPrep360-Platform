import { get } from '@aws-amplify/api';

export interface UserAnalytics {
  examsCompleted: number;
  averageScore: number;
  totalStudyHours: number;
  weakestDomain: string;
  certificationsTracked: string[];
  recentAttempts: Array<{
    examId: string;
    certId: string;
    score: number;
    date: string;
  }>;
}

/**
 * Fetches real user analytics from the backend API.
 * Returns null in DEV mode (uses mock data in Dashboard instead).
 */
export async function fetchUserAnalytics(): Promise<UserAnalytics | null> {
  if (import.meta.env.DEV) return null;

  try {
    const restOperation = get({
      apiName: 'CertPrepApi',
      path: '/analytics',
    });
    const { body } = await restOperation.response;
    return await body.json() as unknown as UserAnalytics;
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return null;
  }
}

/**
 * Fetches a dynamic domain-specific quiz from the backend GSI endpoint.
 */
export async function fetchDynamicQuiz(domain: string, certId = 'SAA-C03', limit = 10) {
  if (import.meta.env.DEV) {
    console.log('[DEV] Would call GET /dynamic-quiz?domain=' + domain);
    return null;
  }

  try {
    const restOperation = get({
      apiName: 'CertPrepApi',
      path: `/dynamic-quiz?domain=${encodeURIComponent(domain)}&certId=${certId}&limit=${limit}`,
    });
    const { body } = await restOperation.response;
    return await body.json();
  } catch (error) {
    console.error('Failed to fetch dynamic quiz:', error);
    return null;
  }
}
