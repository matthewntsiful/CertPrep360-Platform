import React from 'react';
import { useExamStore } from '../../store/useExamStore';
import { motion } from 'framer-motion';
import { LayoutGrid, X } from 'lucide-react';

interface ExamProgressProps {
  onClose?: () => void;
  isDrawer?: boolean;
}

const ExamProgress: React.FC<ExamProgressProps> = ({ onClose, isDrawer }) => {
  const { 
    questions, 
    currentQuestionIndex, 
    answers, 
    flaggedQuestions, 
    goToQuestion 
  } = useExamStore();

  const getStatusStyle = (index: number) => {
    const isCurrent = index === currentQuestionIndex;
    const isAnswered = answers[index] !== undefined;
    const isFlagged = flaggedQuestions.has(index);

    if (isCurrent) return 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.4)] border-orange-400';
    if (isFlagged) return 'bg-yellow-500 text-slate-900 border-yellow-400';
    if (isAnswered) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    
    return 'bg-slate-900 text-slate-600 border-slate-800 hover:border-slate-700 hover:text-slate-400';
  };

  const handleQuestionClick = (index: number) => {
    goToQuestion(index);
    if (onClose) onClose();
  };

  return (
    <div className={`rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800 flex flex-col ${isDrawer ? 'h-full' : 'p-6 sticky top-24'}`}>
      {isDrawer && (
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-white uppercase tracking-widest text-xs">Question Matrix</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className={`space-y-6 ${isDrawer ? 'p-6 overflow-y-auto flex-1 h-[60vh] custom-scrollbar' : ''}`}>
        {!isDrawer && (
           <div className="flex items-center justify-between">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Progress Matrix</h3>
             <span className="text-[10px] font-mono font-bold text-orange-500">
               {Object.keys(answers).length} / {questions.length}
             </span>
           </div>
        )}

        <div className="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
          {questions.map((_, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.15, zIndex: 10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleQuestionClick(i)}
              className={`w-7 h-7 rounded-sm border text-[9px] font-black transition-all flex items-center justify-center relative shrink-0 ${getStatusStyle(i)}`}
            >
              {(i + 1).toString().padStart(2, '0')}
              {flaggedQuestions.has(i) && ! (i === currentQuestionIndex) && (
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
              )}
            </motion.button>
          ))}
        </div>

        {/* Compact Legend */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-x-4 gap-y-2">
          <LegendItem icon={<div className="w-1.5 h-1.5 rounded-full bg-orange-500" />} label="Current" />
          <LegendItem icon={<div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />} label="Done" />
          <LegendItem icon={<div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />} label="Flag" />
          <LegendItem icon={<div className="w-1.5 h-1.5 rounded-full bg-slate-800" />} label="Next" />
        </div>
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600">
    {icon} {label}
  </div>
);

export default ExamProgress;
