import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Target, LayoutGrid } from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';

interface ExamNavigationProps {
  onToggleGrid: () => void;
}

const ExamNavigation: React.FC<ExamNavigationProps> = ({ onToggleGrid }) => {
  const { 
    questions, 
    currentQuestionIndex, 
    nextQuestion, 
    prevQuestion, 
    completeExam 
  } = useExamStore();

  if (!questions.length) return null;

  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="fixed bottom-8 left-0 right-0 z-[9999] flex justify-center px-4 pointer-events-none">
      <motion.div 
        className="pointer-events-auto flex items-center gap-6 px-4 py-3 rounded-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-full sm:max-w-xl"
        style={{ WebkitBackdropFilter: 'blur(40px)' }}
      >
        {/* Previous Button */}
        <button
          onClick={prevQuestion}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Vertical Divider */}
        <div className="w-px h-6 bg-slate-800 hidden sm:block" />

        {/* Question Counter */}
        <div className="flex flex-col items-center min-w-[3rem]">
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-500/80">Question</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-white">{currentQuestionIndex + 1}</span>
            <span className="text-xs font-bold text-slate-600">/ {questions.length}</span>
          </div>
        </div>

        <div className="w-px h-6 bg-slate-800 hidden sm:block" />

        {/* Matrix Toggle */}
        <button
          onClick={onToggleGrid}
          className="p-2.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all group"
          title="Toggle Question Matrix"
        >
          <LayoutGrid className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </button>

        {/* Vertical Divider */}
        <div className="w-px h-6 bg-slate-800 hidden sm:block" />

        {/* Next / Complete Button */}
        {isLastQuestion ? (
          <button
            onClick={completeExam}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-500/20 uppercase tracking-widest"
          >
            Finish
            <Target className="w-4 h-4 ml-1" />
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            className="flex items-center gap-2 px-6 py-2.5 bg-white text-slate-950 rounded-full font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default ExamNavigation;
