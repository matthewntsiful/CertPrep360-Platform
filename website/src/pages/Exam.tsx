import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  const { status, startExam, questions, nextQuestion, prevQuestion, toggleFlag, toggleTimer, currentQuestionIndex } = useExamStore();

  useTimer();

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (status !== 'running') return;

      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); nextQuestion(); break;
        case 'ArrowLeft':  e.preventDefault(); prevQuestion(); break;
        case 'f': case 'F': e.preventDefault(); toggleFlag(currentQuestionIndex); break;
        case ' ':           e.preventDefault(); toggleTimer(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [status, currentQuestionIndex, nextQuestion, prevQuestion, toggleFlag, toggleTimer]);

  useEffect(() => {
    if (status === 'running' && questions.length === 0) { startExam(certId!, examId!); return; }
    if (status === 'running' && useExamStore.getState().examId !== examId) { startExam(certId!, examId!); return; }
    if (status === 'completed' && useExamStore.getState().examId !== examId) { startExam(certId!, examId!); return; }
    if (status === 'idle' && certId && examId) startExam(certId, examId);
  }, [status, certId, examId, startExam, questions.length]);

  if (status === 'idle' || (status === 'running' && questions.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Loading Exam...</p>
      </div>
    );
  }

  if (status === 'completed') return <ExamResults />;

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
