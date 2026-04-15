import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useExamStore } from '../store/useExamStore';
import { useTimer } from '../hooks/useTimer';

import ExamHeader from '../components/exam/ExamHeader';
import ExamProgress from '../components/exam/ExamProgress';
import QuestionView from '../components/exam/QuestionView';
import ExamResults from '../components/exam/ExamResults';
import PauseOverlay from '../components/exam/PauseOverlay';

const ExamPage: React.FC = () => {
  const { certId, examId } = useParams<{ certId: string; examId: string }>();
  const { status, startExam, questions } = useExamStore();
  
  // Custom hook to handle 1s ticks
  useTimer();

  useEffect(() => {
    // Self-healing: if stuck in 'running' but with no questions (due to local caching bug), force restart
    if (status === 'running' && questions.length === 0) {
      startExam(certId!, examId!);
      return;
    }

    // Initial load: start exam fetching from API
    if (status === 'idle' && certId && examId) {
      startExam(certId, examId);
    }
  }, [status, certId, examId, startExam, questions.length]);

  if (status === 'idle' || (status === 'running' && questions.length === 0)) {
    return <div className="flex items-center justify-center min-h-[60vh]">Loading Exam...</div>;
  }

  if (status === 'completed') {
    return <ExamResults />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">
      <div className="flex-1 space-y-8">
        <ExamHeader />
        <QuestionView />
      </div>
      
      <div className="lg:w-80 space-y-8">
        <ExamProgress />
      </div>

      <PauseOverlay />
    </div>
  );
};

export default ExamPage;
