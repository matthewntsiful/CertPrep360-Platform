import { fetchAuthSession } from '@aws-amplify/auth';

const API_URL = import.meta.env.VITE_API_URL;

async function authFetch(path: string, options: RequestInit = {}) {
  const session = await fetchAuthSession({ forceRefresh: true });
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
  getCatalog: () => authFetch('/admin/stats?action=catalog'),
  
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
  }),

  listUsers: () => authFetch('/admin/stats?action=listUsers'),

  generateAIContent: (payload: { certId: string, topic?: string, count?: number, domain?: string }) => 
    authFetch('/admin/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ mode: 'generate', ...payload })
    }),

  enrichQuestion: (certId: string, question: any) =>
    authFetch('/admin/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ mode: 'enrich', certId, question })
    }),

  fixQuestion: (certId: string, question: any) =>
    authFetch('/admin/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ mode: 'fix', certId, question })
    }),

  partialUpdateQuestion: (q_id: string, cert_id: string, exam_id: string, fields: Record<string, any>) =>
    authFetch('/admin/content', {
      method: 'PATCH',
      body: JSON.stringify({ q_id, cert_id, exam_id, fields })
    })
};
