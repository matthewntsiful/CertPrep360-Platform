import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fetchAuthSession } from '@aws-amplify/auth';
import type { ExamResult, Question, ExamSession } from '../types/exam';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.example.com/dev';

interface AttemptReference {
  attemptId: string;
  startedAt: string;
  expiresAt: number;
}

interface ExamStartResponse {
  attempt: AttemptReference;
  questions: Question[];
}

async function authFetch(path: string, options: RequestInit = {}) {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error('No auth token available');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export interface QuizMetadata {
  mode: string;
  domains: string[];
  weakPoolIncluded: number;
}

interface ExamStore extends ExamSession {
  quizMeta: QuizMetadata | null;
  startExam: (certId: string, examId: string) => Promise<void>;
  startDynamicQuiz: (certId: string, domain: string, questions: Question[], attemptId: string, meta?: QuizMetadata) => void;
  setAnswer: (questionIndex: number, answer: string | string[]) => void;
  toggleFlag: (questionIndex: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  goToQuestion: (index: number) => void;
  setStudyMode: (enabled: boolean) => void;
  toggleTimer: () => void;
  tick: () => void;
  completeExam: () => Promise<void>;
  resetExam: () => void;
}

const INITIAL_TIME = 130 * 60;

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const scheduleSync = (state: ExamStore) => {
  if (state.status !== 'running' || !state.examId || state.examId.startsWith('Dynamic-')) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      await authFetch('/session', {
        method: 'POST',
        body: JSON.stringify({
          examId: state.examId,
          certId: state.certId,
          sessionData: {
            answers: state.answers,
            flaggedQuestions: Array.from(state.flaggedQuestions),
            timeLeft: state.timeLeft,
            currentQuestionIndex: state.currentQuestionIndex,
            startTime: state.startTime,
          },
        }),
      });
    } catch {
      // A local exam may continue; final submission communicates recoverable errors.
    }
  }, 2000);
};

const initialState = {
  examId: '',
  certId: '',
  attemptId: null,
  questions: [] as Question[],
  currentQuestionIndex: 0,
  answers: {} as Record<number, string | string[]>,
  flaggedQuestions: new Set<number>(),
  timeLeft: INITIAL_TIME,
  status: 'idle' as const,
  studyMode: false,
  startTime: null,
  submissionError: null,
  result: null,
  quizMeta: null,
};

const migratePersistedExamState = (persistedState: unknown) => {
  const state = persistedState as { studyMode?: unknown } | null;
  return { studyMode: state?.studyMode === true };
};

/**
 * Ensures the runtime store state has the correct shapes for fields that can't
 * survive a JSON round-trip or a partial rehydration from an older app version.
 * Called once on page load after Zustand rehydrates from localStorage.
 */
const sanitizeRehydratedState = (state: ExamStore): void => {
  let needsReset = false;

  // questions must always be an array — a non-array here crashes every .map() call
  if (!Array.isArray(state.questions)) needsReset = true;

  // flaggedQuestions must be a Set — JSON.stringify(new Set()) → "{}", so if
  // it ever got persisted or cloned through JSON it becomes a plain object
  if (!(state.flaggedQuestions instanceof Set)) needsReset = true;

  // answers must be a plain object
  if (typeof state.answers !== 'object' || Array.isArray(state.answers) || state.answers === null) needsReset = true;

  if (needsReset) {
    // Preserve studyMode — the only intentionally persisted field
    const studyMode = typeof state.studyMode === 'boolean' ? state.studyMode : false;
    useExamStore.setState({ ...initialState, studyMode });
  }
};

export const useExamStore = create<ExamStore>()(
  persist(
    (set) => ({
      ...initialState,

      startExam: async (certId, examId) => {
        const normalizedCertId = certId.toUpperCase();
        set({ ...initialState, status: 'loading', certId: normalizedCertId, examId });
        try {
          const response = await authFetch(`/questions/${normalizedCertId}/${examId}`) as ExamStartResponse;
          if (!response?.attempt?.attemptId || !Array.isArray(response.questions) || response.questions.length === 0) {
            throw new Error('The server did not issue a valid exam attempt');
          }

          let session = null;
          try {
            const resumed = await authFetch(`/session/${normalizedCertId}/${examId}`);
            session = resumed?.session?.sessionData || null;
          } catch {
            // Absence of a session is normal for a newly issued attempt.
          }

          set({
            certId: normalizedCertId,
            examId,
            attemptId: response.attempt.attemptId,
            questions: response.questions,
            status: 'running',
            answers: session?.answers || {},
            flaggedQuestions: session?.flaggedQuestions && Array.isArray(session.flaggedQuestions)
              ? new Set<number>(session.flaggedQuestions)
              : new Set<number>(),
            timeLeft: session?.timeLeft || Math.max(0, response.attempt.expiresAt - Math.floor(Date.now() / 1000)),
            currentQuestionIndex: session?.currentQuestionIndex || 0,
            startTime: Date.parse(response.attempt.startedAt),
          });
        } catch {
          set({ status: 'error', submissionError: 'Unable to load this exam. Please retry or sign in again.' });
        }
      },

      startDynamicQuiz: (certId, domain, questions, attemptId, meta) => {
        set({
          ...initialState,
          status: 'running',
          questions,
          flaggedQuestions: new Set(),
          timeLeft: questions.length * 2 * 60,
          certId: certId.toUpperCase(),
          examId: `Dynamic-${domain}`,
          attemptId,
          startTime: Date.now(),
          quizMeta: meta || null,
        });
      },

      setAnswer: (index, answer) => {
        set((state) => {
          const nextState = { ...state, answers: { ...state.answers, [index]: answer } };
          scheduleSync(nextState as ExamStore);
          return nextState;
        });
      },

      toggleFlag: (index) => {
        set((state) => {
          const flaggedQuestions = new Set(state.flaggedQuestions);
          if (flaggedQuestions.has(index)) flaggedQuestions.delete(index);
          else flaggedQuestions.add(index);
          const nextState = { ...state, flaggedQuestions };
          scheduleSync(nextState as ExamStore);
          return nextState;
        });
      },

      nextQuestion: () => set((state) => {
        const nextState = { ...state, currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.questions.length - 1) };
        scheduleSync(nextState as ExamStore);
        return nextState;
      }),

      prevQuestion: () => set((state) => {
        const nextState = { ...state, currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0) };
        scheduleSync(nextState as ExamStore);
        return nextState;
      }),

      goToQuestion: (index) => set((state) => {
        const nextState = { ...state, currentQuestionIndex: Math.max(0, Math.min(index, state.questions.length - 1)) };
        scheduleSync(nextState as ExamStore);
        return nextState;
      }),

      setStudyMode: (enabled) => set({ studyMode: enabled }),

      toggleTimer: () => set((state) => ({
        status: state.status === 'paused' ? 'running' : state.status === 'running' ? 'paused' : state.status,
      })),

      tick: () => set((state) => {
        if (state.status !== 'running') return state;
        if (state.timeLeft <= 1) {
          queueMicrotask(() => { void useExamStore.getState().completeExam(); });
          return { timeLeft: 0 };
        }
        return { timeLeft: state.timeLeft - 1 };
      }),

      completeExam: async () => {
        const state = useExamStore.getState();
        if (state.status === 'submitting' || state.status === 'completed') return;
        if (!state.attemptId) {
          set({ status: 'error', submissionError: 'This exam has no active server attempt. Please restart it.' });
          return;
        }

        const answers = Object.fromEntries(state.questions.map((question, index) => [
          question.q_id,
          state.answers[index] ?? null,
        ]));
        set({ status: 'submitting', submissionError: null });

        try {
          const result = await authFetch('/results', {
            method: 'POST',
            body: JSON.stringify({ attemptId: state.attemptId, answers }),
          }) as ExamResult;
          set({ status: 'completed', result, submissionError: null });
        } catch {
          set({
            status: 'error',
            submissionError: 'Your answers have not been recorded. Check your connection and retry submission.',
          });
        }
      },

      resetExam: () => {
        if (syncTimeout) clearTimeout(syncTimeout);
        set((state) => ({ ...initialState, studyMode: state.studyMode }));
      },
    }),
    {
      name: 'certprep360-exam-storage',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Never retain questions, answer keys, learner answers, or server attempts on a shared device.
      partialize: (state) => ({ studyMode: state.studyMode }),
      migrate: migratePersistedExamState,
      onRehydrateStorage: () => (state) => {
        if (state) sanitizeRehydratedState(state);
      },
    },
  ),
);
