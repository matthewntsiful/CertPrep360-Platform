import React, { useState } from 'react';
import { Clock, BookOpen, Pause, Play, X, AlertTriangle } from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ExamHeader: React.FC = () => {
  const navigate = useNavigate();
  const [showCancel, setShowCancel] = useState(false);
  const { examId, certId, timeLeft, status, toggleTimer, studyMode, setStudyMode, questions, answers, resetExam } = useExamStore();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = () => {
    resetExam();
    navigate(`/certification/${certId.toLowerCase()}`);
  };

  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / questions.length) * 100;

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-start gap-4">
          {/* Left — cert + exam info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest border border-orange-500/20">
                {certId}
              </span>
              <h1 className="text-xl font-bold tracking-tight">{examId}</h1>
            </div>
            <p className="text-slate-500 text-xs">{questions.length} Questions • {questions.length * 2} Min • 72% Pass</p>
          </div>

          {/* Right — timer + controls */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className={`text-2xl font-mono font-bold flex items-center gap-1.5 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                <Clock className="w-5 h-5 text-slate-400" />
                {formatTime(timeLeft)}
              </div>
            </div>
            <button onClick={toggleTimer}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-slate-300 hover:text-white">
              {status === 'paused' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
            <button onClick={() => setShowCancel(true)}
              className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all text-red-400 hover:text-red-300"
              title="Cancel exam">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress bar row */}
        <div className="flex items-center gap-4 py-3 border-y border-slate-800/50">
          <button onClick={() => setStudyMode(!studyMode)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shrink-0 ${
              studyMode ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'
            }`}>
            <BookOpen className="w-3.5 h-3.5" />
            Study {studyMode ? 'ON' : 'OFF'}
          </button>
          <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 transition-all duration-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
              style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-[10px] font-mono text-slate-500 shrink-0">{answeredCount}/{questions.length}</span>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCancel(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200]" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[201] flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 w-full max-w-sm space-y-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white">Cancel Exam?</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    You have answered <span className="text-white font-bold">{answeredCount}</span> of <span className="text-white font-bold">{questions.length}</span> questions. Your progress will be lost.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={handleCancel}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02]">
                    Yes, Cancel Exam
                  </button>
                  <button onClick={() => setShowCancel(false)}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all">
                    Continue Exam
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ExamHeader;
