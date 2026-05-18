import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useExamStore } from '../store/useExamStore';
import { useTimer } from '../hooks/useTimer';
import { fetchDynamicQuiz } from '../services/api';

import ExamHeader from '../components/exam/ExamHeader';
import QuestionStrip from '../components/exam/QuestionStrip';
import QuestionView from '../components/exam/QuestionView';
import ExamResults from '../components/exam/ExamResults';
import ExamNavigation from '../components/exam/ExamNavigation';
import PauseOverlay from '../components/exam/PauseOverlay';

const DynamicQuizPage: React.FC = () => {
  const { domain } = useParams<{ domain: string }>();
  const { status, startDynamicQuiz, nextQuestion, prevQuestion, toggleFlag, toggleTimer, currentQuestionIndex } = useExamStore();
  const loadedRef = useRef<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useTimer();

  useEffect(() => {
    if (!domain) return;
    if (loadedRef.current === domain) return;
    loadedRef.current = domain;

    const loadQuiz = async () => {
      setLoading(true);
      try {
        const quiz = await fetchDynamicQuiz(domain);
        if (quiz && quiz.questions) {
          startDynamicQuiz(domain, quiz.questions);
        } else {
          setError('Failed to generate dynamic quiz or no questions available for this domain.');
        }
      } catch (err) {
        setError('Error fetching dynamic quiz.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [domain, startDynamicQuiz]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
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

  if (status === 'completed') return <ExamResults />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <p className="text-red-500 font-bold uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  if (loading || status === 'idle') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Generating Dynamic Quiz...</p>
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

export default DynamicQuizPage;
