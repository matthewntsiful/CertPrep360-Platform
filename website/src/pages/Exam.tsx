import { useEffect, useRef } from 'react';
import { useParams, useBlocker } from 'react-router-dom';
import { useExamStore } from '../store/useExamStore';
import { useTimer } from '../hooks/useTimer';

import ExamHeader from '../components/exam/ExamHeader';
import QuestionStrip from '../components/exam/QuestionStrip';
import QuestionView from '../components/exam/QuestionView';
import ExamResults from '../components/exam/ExamResults';
import ExamNavigation from '../components/exam/ExamNavigation';
import PauseOverlay from '../components/exam/PauseOverlay';

const ExamPage: React.FC = () => {
  const { certId, examId } = useParams<{ certId: string; examId: string }>();
  const { status, startExam, completeExam, submissionError, questions, examId: storeExamId, nextQuestion, prevQuestion, toggleFlag, toggleTimer, currentQuestionIndex } = useExamStore();
  const loadedRef = useRef<string>('');

  useTimer();

  // Warn before navigating away during an active exam
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'running' || status === 'paused') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  // Block in-app navigation during active exam
  useBlocker(
    ({ currentLocation, nextLocation }) =>
      (status === 'running' || status === 'paused') &&
      currentLocation.pathname !== nextLocation.pathname &&
      !window.confirm('You have an active exam in progress. Are you sure you want to leave? Your progress is saved and you can resume later.')
  );

  // Load exam only when certId/examId changes AND the store doesn't already have it
  useEffect(() => {
    const key = `${certId}/${examId}`;
    if (!certId || !examId) return;
    if (loadedRef.current === key) return; // already loaded this exam in this session

    // If the store already has this exam loaded (from localStorage persistence), don't re-fetch
    if (storeExamId === examId && Array.isArray(questions) && questions.length > 0 && (status === 'running' || status === 'paused')) {
      loadedRef.current = key;
      return;
    }

    loadedRef.current = key;
    startExam(certId, examId);
  }, [certId, examId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes((e.target as HTMLElement).tagName)) return;
      // Allow space bar to toggle pause even when paused
      if (e.key === ' ') { e.preventDefault(); toggleTimer(); return; }
      if (status !== 'running') return;
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); nextQuestion(); break;
        case 'ArrowLeft':  e.preventDefault(); prevQuestion(); break;
        case 'f': case 'F': e.preventDefault(); toggleFlag(currentQuestionIndex); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [status, currentQuestionIndex, nextQuestion, prevQuestion, toggleFlag, toggleTimer]);

  if (status === 'completed') return <ExamResults />;

  if (status === 'error') {
    const canRetrySubmission = Array.isArray(questions) && questions.length > 0;
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4 text-center px-4">
        <p className="text-red-400 font-bold">{submissionError || 'Unable to continue this exam.'}</p>
        <button
          type="button"
          onClick={() => canRetrySubmission ? void completeExam() : void startExam(certId!, examId!)}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors"
        >
          {canRetrySubmission ? 'Retry Submission' : 'Retry Loading Exam'}
        </button>
      </div>
    );
  }

  if (status === 'loading' || status === 'idle' || (status === 'running' && (!Array.isArray(questions) || questions.length === 0))) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Loading Exam...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-32 space-y-6">
      <ExamHeader />
      <QuestionStrip />
      <QuestionView />
      <ExamNavigation />
      <PauseOverlay />
    </div>
  );
};

export default ExamPage;
