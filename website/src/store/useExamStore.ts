import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, post } from '@aws-amplify/api';
import type { Question, ExamSession } from '../types/exam';

interface ExamStore extends ExamSession {
  startExam: (certId: string, examId: string) => Promise<void>;
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

      startExam: async (certId, examId) => {
        set({ status: 'idle', questions: [], answers: {}, flaggedQuestions: new Set(), timeLeft: INITIAL_TIME });
        
        try {
          const restOperation = get({
            apiName: 'CertPrepApi',
            path: `/questions/${certId}/${examId}`
          });
          const { body } = await restOperation.response;
          const questions = await body.json() as unknown as Question[];
          
          set({
            certId,
            examId,
            questions,
            status: 'running',
            startTime: Date.now(),
          });
        } catch (error) {
          console.error('Failed to load questions:', error);
          set({ status: 'idle' });
        }
      },

      setAnswer: (index, answer) => set((state) => ({
        answers: { ...state.answers, [index]: answer }
      })),

      toggleFlag: (index) => set((state) => {
        const next = new Set(state.flaggedQuestions);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return { flaggedQuestions: next };
      }),

      nextQuestion: () => set((state) => ({
        currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.questions.length - 1)
      })),

      prevQuestion: () => set((state) => ({
        currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0)
      })),

      goToQuestion: (index) => set({ currentQuestionIndex: index }),

      setStudyMode: (enabled) => set({ studyMode: enabled }),

      toggleTimer: () => set((state) => ({
        status: state.status === 'paused' ? 'running' : 'paused'
      })),

      tick: () => set((state) => {
        if (state.status !== 'running') return state;
        if (state.timeLeft <= 0) return { status: 'completed' as const };
        return { timeLeft: state.timeLeft - 1 };
      }),

      completeExam: async () => {
        const state = useExamStore.getState();
        const { questions, answers, certId, examId, startTime } = state;

        // Calculate score
        let correct = 0;
        questions.forEach((q, i) => {
          const answer = answers[i];
          if (!answer) return;
          const isCorrect = Array.isArray(answer)
            ? [...answer].sort().join('') === [...q.correct].sort().join('')
            : answer === q.correct;
          if (isCorrect) correct++;
        });
        const score = Math.round((correct / Math.max(questions.length, 1)) * 100);
        const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000 / 60) : 0;

        try {
          await post({
            apiName: 'CertPrepApi',
            path: '/results',
            options: {
              body: { examId, certId, score, timeTaken, answers }
            }
          }).response;
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
        currentQuestionIndex: 0
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
      },
    }
  )
);
