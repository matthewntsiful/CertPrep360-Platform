import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fetchAuthSession } from '@aws-amplify/auth';
import type { Question, ExamSession } from '../types/exam';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.example.com/dev';

// Helper: get the Cognito JWT and make an authenticated API request
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
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

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
  startDynamicQuiz: (domain: string, questions: Question[], meta?: QuizMetadata) => void;
  setAnswer: (questionIndex: number, answer: string | string[]) => void;
  toggleFlag: (questionIndex: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  goToQuestion: (index: number) => void;
  setStudyMode: (enabled: boolean) => void;
  toggleTimer: () => void;
  tick: () => void;
  completeExam: () => void;
  resetExam: () => void;
}

const INITIAL_TIME = 130 * 60; // 130 minutes

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const scheduleSync = (state: ExamStore) => {
  if (state.status !== 'running' || !state.examId || state.examId.startsWith('Dynamic-')) return;
  
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      const sessionData = {
        answers: state.answers,
        flaggedQuestions: Array.from(state.flaggedQuestions),
        timeLeft: state.timeLeft,
        currentQuestionIndex: state.currentQuestionIndex,
        startTime: state.startTime,
      };
      await authFetch('/session', {
        method: 'POST',
        body: JSON.stringify({
          examId: state.examId,
          certId: state.certId,
          sessionData
        })
      });
    } catch (e) {
      console.error('Failed to sync session to backend:', e);
    }
  }, 2000);
};

export const useExamStore = create<ExamStore>()(
  persist(
    (set) => ({
      examId: '',
      certId: '',
      questions: [],
      currentQuestionIndex: 0,
      answers: {},
      flaggedQuestions: new Set<number>(),
      timeLeft: INITIAL_TIME,
      status: 'idle',
      studyMode: false,
      startTime: null,
      quizMeta: null,

      startExam: async (certId, examId) => {
        set({ status: 'idle', questions: [], answers: {}, flaggedQuestions: new Set(), timeLeft: INITIAL_TIME, currentQuestionIndex: 0, certId, examId });
        
        try {
          const questions = await authFetch(`/questions/${certId}/${examId}`) as Question[];
          
          let session = null;
          try {
            const res = await authFetch(`/session/${certId}/${examId}`);
            if (res.session && res.session.sessionData) {
              session = res.session.sessionData;
            }
          } catch (e) {
            console.warn('No active session found or error loading session');
          }

          set({
            certId,
            examId,
            questions,
            status: 'running',
            answers: session?.answers || {},
            flaggedQuestions: session?.flaggedQuestions ? new Set(session.flaggedQuestions) : new Set(),
            timeLeft: session?.timeLeft || (questions.length * 2 * 60),
            currentQuestionIndex: session?.currentQuestionIndex || 0,
            startTime: session?.startTime || Date.now(),
          });
        } catch (error) {
          console.error('Failed to load questions:', error);
          set({ status: 'idle' });
        }
      },

      startDynamicQuiz: (domain, questions, meta) => {
        set({
          status: 'running',
          questions,
          answers: {},
          flaggedQuestions: new Set(),
          timeLeft: questions.length * 2 * 60, // 2 minutes per question (e.g. 20 mins for 10 questions)
          currentQuestionIndex: 0,
          certId: 'SAA-C03',
          examId: `Dynamic-${domain}`,
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
          const next = new Set(state.flaggedQuestions);
          if (next.has(index)) next.delete(index);
          else next.add(index);
          const nextState = { ...state, flaggedQuestions: next };
          scheduleSync(nextState as ExamStore);
          return nextState;
        });
      },

      nextQuestion: () => {
        set((state) => {
          const nextState = { ...state, currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.questions.length - 1) };
          scheduleSync(nextState as ExamStore);
          return nextState;
        });
      },

      prevQuestion: () => {
        set((state) => {
          const nextState = { ...state, currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0) };
          scheduleSync(nextState as ExamStore);
          return nextState;
        });
      },

      goToQuestion: (index) => {
        set((state) => {
          const nextState = { ...state, currentQuestionIndex: index };
          scheduleSync(nextState as ExamStore);
          return nextState;
        });
      },

      setStudyMode: (enabled) => set({ studyMode: enabled }),

      toggleTimer: () => set((state) => ({
        status: state.status === 'paused' ? 'running' : 'paused'
      })),

      tick: () => set((state) => {
        if (state.status !== 'running') return state;
        if (state.timeLeft <= 0) return { status: 'completed' as const };
        // We do not scheduleSync on every tick to avoid flooding, sync relies on user actions
        return { timeLeft: state.timeLeft - 1 };
      }),

      completeExam: async () => {
        const state = useExamStore.getState();
        const { questions, answers, certId, examId, startTime } = state;

        // Calculate score
        let correct = 0;
        const detailedAnswers: Record<string, any> = {};
        questions.forEach((q, i) => {
          const answer = answers[i];
          // Normalize correct field: handles both "AB" and "A,B" formats
          const correctLetters = q.correct.toUpperCase().split(/[,\s]+/).filter((c: string) => /^[A-Z]$/.test(c));
          const isCorrect = !!answer && (Array.isArray(answer)
            ? [...answer].sort().join('') === [...correctLetters].sort().join('')
            : answer === q.correct);
          if (isCorrect) correct++;
          detailedAnswers[i] = {
            q_id: q.q_id,
            domain: q.domain || "Unassigned",
            selected: answer || null,
            isCorrect
          };
        });
        const score = Math.round((correct / Math.max(questions.length, 1)) * 100);
        const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000 / 60) : 0;

        try {
          await authFetch('/results', {
            method: 'POST',
            body: JSON.stringify({ examId, certId, score, timeTaken, answers: detailedAnswers }),
          });
        } catch (err) {
          console.error('Failed to submit exam results:', err);
        }

        set({ status: 'completed' });
      },

      resetExam: () => set({
        status: 'idle',
        answers: {},
        flaggedQuestions: new Set(),
        timeLeft: INITIAL_TIME,
        currentQuestionIndex: 0,
        quizMeta: null,
      }),
    }),
    {
      name: 'certprep360-exam-storage',
      storage: createJSONStorage(() => localStorage),
      // Set serializes automatically, but we need to handle the Set type specifically if we want to revive it
      partialize: (state) => ({
        ...state,
        flaggedQuestions: Array.from(state.flaggedQuestions),
      }) as any,
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.flaggedQuestions)) {
          state.flaggedQuestions = new Set(state.flaggedQuestions);
        }
        // Normalize answer keys from strings back to numbers
        if (state && state.answers) {
          const normalized: Record<number, string | string[]> = {};
          Object.entries(state.answers).forEach(([k, v]) => {
            normalized[Number(k)] = v as string | string[];
          });
          state.answers = normalized;
        }
      },
    }
  )
);
