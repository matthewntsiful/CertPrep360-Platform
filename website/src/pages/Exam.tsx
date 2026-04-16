import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useExamStore } from '../store/useExamStore';
import { useTimer } from '../hooks/useTimer';

import ExamHeader from '../components/exam/ExamHeader';
import ExamProgress from '../components/exam/ExamProgress';
import QuestionView from '../components/exam/QuestionView';
import ExamResults from '../components/exam/ExamResults';
import ExamNavigation from '../components/exam/ExamNavigation';
import PauseOverlay from '../components/exam/PauseOverlay';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ExamPage: React.FC = () => {
  const { certId, examId } = useParams<{ certId: string; examId: string }>();
  const { status, startExam, questions } = useExamStore();
  const [showGrid, setShowGrid] = useState(false);
  
  // Custom hook to handle 1s ticks
  useTimer();

  useEffect(() => {
    // Self-healing: if stuck in 'running' but with no questions (due to local caching bug), force restart
    if (status === 'running' && questions.length === 0) {
      startExam(certId!, examId!);
      return;
    }

    // New: If the store says we are running a different exam than the URL, force a refresh
    // This fixes issues where local storage persistence holds onto legacy naming conventions
    if (status === 'running' && useExamStore.getState().examId !== examId) {
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
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto pb-32">
      <div className="flex-1 space-y-8">
        <ExamHeader />
        <QuestionView />
      </div>
      
      {/* Desktop Sidebar Matrix */}
      <div className="hidden lg:block lg:w-[22rem]">
        <ExamProgress />
      </div>

      {/* Mobile Matrix Drawer */}
      <AnimatePresence>
        {showGrid && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGrid(false)}
              className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[101] bg-slate-900 rounded-t-[2.5rem] border-t border-slate-800 lg:hidden"
            >
              <ExamProgress isDrawer onClose={() => setShowGrid(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ExamNavigation onToggleGrid={() => setShowGrid(!showGrid)} />

      <PauseOverlay />
    </div>
  );
};

export default ExamPage;
