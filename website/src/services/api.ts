import { fetchAuthSession } from '@aws-amplify/auth';
import type {
  AnalyticsResponse,
  PaginatedHistoryResponse,
  AttemptDetailResponse,
  HistoryParams,
  DynamicQuizResponse,
} from '../types/analytics';

export interface UserAnalytics {
  examsCompleted: number;
  averageScore: number;
  totalStudyHours: number;
  weakestDomain: string;
  certificationsTracked: string[];
  recentAttempts: Array<{
    id?: string;
    examId: string;
    certId: string;
    score: number;
    date: string;
  }>;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://api.example.com/dev';

async function authFetch(path: string, options: RequestInit = {}) {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error('No auth token available');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

async function publicFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

/**
 * Fetches real user analytics from the backend API.
 */
export async function fetchUserAnalytics(): Promise<UserAnalytics | null> {
  try {
    return await authFetch('/analytics') as UserAnalytics;
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return null;
  }
}

/**
 * Fetches a specific exam attempt by ID.
 */
export async function fetchAttempt(attemptId: string): Promise<any> {
  return await authFetch(`/analytics?attemptId=${attemptId}`);
}

export interface CertCatalog {
  [certId: string]: {
    totalQuestions: number;
    examCount: number;
    exams: string[];
  };
}

export async function fetchCatalog(): Promise<CertCatalog> {
  try {
    return await publicFetch('/catalog') as CertCatalog;
  } catch (error) {
    console.error('Failed to fetch catalog:', error);
    return {};
  }
}

/**
 * Fetches a dynamic domain-specific quiz from the backend GSI endpoint.
 */
export async function fetchDynamicQuiz(domain: string, certId = 'SAA-C03', limit = 10) {
  try {
    return await authFetch(`/dynamic-quiz?domain=${encodeURIComponent(domain)}&certId=${certId}&limit=${limit}`);
  } catch (error) {
    console.error('Failed to fetch dynamic quiz:', error);
    return null;
  }
}

/**
 * Initializes a Paystack transaction and returns the authorization URL.
 */
export async function initializePayment(amount: number) {
  return await authFetch('/payment/initialize', {
    method: 'POST',
    body: JSON.stringify({ amount })
  });
}

/**
 * Verifies a Paystack transaction after the user completes payment.
 */
export async function verifyPayment(reference: string) {
  return await authFetch('/payment/verify', {
    method: 'POST',
    body: JSON.stringify({ reference })
  });
}

// ─── Study Mode Enhancement APIs ────────────────────────────────────────────

/**
 * Fetches enhanced analytics including trend data and weak pool count.
 */
export async function fetchAnalytics(): Promise<AnalyticsResponse> {
  return await authFetch('/analytics') as AnalyticsResponse;
}

/**
 * Fetches paginated attempt history with optional filtering and sorting.
 * Designed for use with TanStack Query's `useInfiniteQuery`:
 *
 * ```ts
 * useInfiniteQuery({
 *   queryKey: ['history', filters],
 *   queryFn: ({ pageParam }) => fetchHistory({ ...filters, cursor: pageParam }),
 *   getNextPageParam: (lastPage) => lastPage.nextCursor,
 * })
 * ```
 */
export async function fetchHistory(params: HistoryParams = {}): Promise<PaginatedHistoryResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('history', 'true');

  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.certId) searchParams.set('certId', params.certId);
  if (params.status) searchParams.set('status', params.status);
  if (params.sort) searchParams.set('sort', params.sort);

  return await authFetch(`/analytics?${searchParams.toString()}`) as PaginatedHistoryResponse;
}

/**
 * Fetches detailed attempt data including question snapshots for the ResultReview page.
 */
export async function fetchAttemptDetail(attemptId: string): Promise<AttemptDetailResponse> {
  return await authFetch(`/analytics?attemptId=${encodeURIComponent(attemptId)}`) as AttemptDetailResponse;
}

/**
 * Starts an adaptive quiz that auto-selects the user's 2-3 weakest domains
 * and distributes questions using inverse performance weighting.
 */
export async function startAdaptiveQuiz(certId: string, limit = 20): Promise<DynamicQuizResponse> {
  return await authFetch(
    `/dynamic-quiz?mode=adaptive&certId=${encodeURIComponent(certId)}&limit=${limit}`
  ) as DynamicQuizResponse;
}

/**
 * Starts a multi-domain quiz with explicitly specified domains.
 * Domains are passed as a comma-separated list.
 */
export async function startMultiDomainQuiz(
  domains: string[],
  certId: string,
  limit = 20
): Promise<DynamicQuizResponse> {
  const domainParam = domains.map(d => encodeURIComponent(d)).join(',');
  return await authFetch(
    `/dynamic-quiz?domain=${domainParam}&certId=${encodeURIComponent(certId)}&limit=${limit}`
  ) as DynamicQuizResponse;
}
