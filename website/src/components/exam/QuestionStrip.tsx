import React, { useEffect, useRef } from 'react';
import { useExamStore } from '../../store/useExamStore';
import { motion } from 'framer-motion';

const QuestionStrip: React.FC = () => {
  const { questions, currentQuestionIndex, answers, flaggedQuestions, goToQuestion } = useExamStore();
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active question into center
  useEffect(() => {
    if (activeRef.current && stripRef.current) {
      const strip = stripRef.current;
      const btn = activeRef.current;
      const stripCenter = strip.offsetWidth / 2;
      const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
      strip.scrollTo({ left: btnCenter - stripCenter, behavior: 'smooth' });
    }
  }, [currentQuestionIndex]);

  const getStyle = (i: number) => {
    const isCurrent = i === currentQuestionIndex;
    const isAnswered = answers[i] !== undefined;
    const isFlagged = flaggedQuestions.has(i);
    if (isCurrent) return 'bg-orange-500 text-white border-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.5)] scale-110';
    if (isFlagged) return 'bg-yellow-500 text-slate-900 border-yellow-400';
    if (isAnswered) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    return 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300';
  };

  return (
    <div className="relative">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

      <div
        ref={stripRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-8 py-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {questions.map((_, i) => (
          <motion.button
            key={i}
            ref={i === currentQuestionIndex ? activeRef : null}
            onClick={() => goToQuestion(i)}
            whileTap={{ scale: 0.9 }}
            className={`shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-lg border text-[10px] font-black transition-all flex items-center justify-center relative ${getStyle(i)}`}
          >
            {(i + 1).toString().padStart(2, '0')}
            {flaggedQuestions.has(i) && i !== currentQuestionIndex && (
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
            )}
          </motion.button>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-center gap-6 pb-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-orange-500" /> Current
        </span>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-emerald-500/40" /> Answered
        </span>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-yellow-500" /> Flagged
        </span>
      </div>
    </div>
  );
};

export default QuestionStrip;
