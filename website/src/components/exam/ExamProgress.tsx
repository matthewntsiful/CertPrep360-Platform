import React from 'react';
import { useExamStore } from '../../store/useExamStore';
import { motion } from 'framer-motion';

const ExamProgress: React.FC = () => {
  const { 
    questions, 
    currentQuestionIndex, 
    answers, 
    flaggedQuestions, 
    goToQuestion 
  } = useExamStore();

  const getStatusColor = (index: number) => {
    const isCurrent = index === currentQuestionIndex;
    const isAnswered = answers[index] !== undefined;
    const isFlagged = flaggedQuestions.has(index);

    if (isCurrent) return 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]';
    if (isFlagged) return 'bg-yellow-500 text-slate-900 border-yellow-500';
    if (isAnswered) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    
    return 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300';
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 sticky top-24">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Navigation</h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-300"
                style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              {Math.round((Object.keys(answers).length / questions.length) * 100)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {questions.map((_, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => goToQuestion(i)}
              className={`aspect-square rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center relative ${getStatusColor(i)}`}
            >
              {i + 1}
              {flaggedQuestions.has(i) && ! (i === currentQuestionIndex) && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full border border-slate-900" />
              )}
            </motion.button>
          ))}
        </div>

        <div className="pt-6 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <div className="w-3 h-3 rounded bg-orange-500" /> Current
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" /> Answered
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <div className="w-3 h-3 rounded bg-yellow-500" /> Flagged
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <div className="w-3 h-3 rounded bg-slate-900 border border-slate-800" /> Unvisited
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamProgress;
