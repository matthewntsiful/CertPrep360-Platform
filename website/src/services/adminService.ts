import { fetchAuthSession } from '@aws-amplify/auth';

const API_URL = import.meta.env.VITE_API_URL;

async function authFetch(path: string, options: RequestInit = {}) {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  
  if (!token) throw new Error('Root privileges required: No auth token available');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  return response.json();
}

export const adminService = {
  getStats: () => authFetch('/admin/stats'),
  
  getQuestions: (certId?: string, examId?: string) => {
    const params = new URLSearchParams();
    if (certId) params.append('certId', certId);
    if (examId) params.append('examId', examId);
    return authFetch(`/admin/content?${params.toString()}`);
  },

  upsertQuestion: (question: any) => authFetch('/admin/content', {
    method: 'POST', // Backend handles PUT via POST as well
    body: JSON.stringify(question)
  }),

  deleteQuestion: (q_id: string, exam_id: string) => authFetch('/admin/content', {
    method: 'DELETE',
    body: JSON.stringify({ q_id, exam_id })
  })
};
