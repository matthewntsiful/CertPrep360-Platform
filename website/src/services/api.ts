import { fetchAuthSession } from '@aws-amplify/auth';

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

const API_URL = import.meta.env.VITE_API_URL || 'https://api.example.com/dev';

async function authFetch(path: string, options: RequestInit = {}) {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error('No auth token available');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
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

export interface CertCatalog {
  [certId: string]: {
    totalQuestions: number;
    examCount: number;
    exams: string[];
  };
}

export async function fetchCatalog(): Promise<CertCatalog> {
  try {
    return await authFetch('/admin/stats?action=catalog') as CertCatalog;
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
