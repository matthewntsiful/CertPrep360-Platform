
import { Flag, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';
import { motion, AnimatePresence } from 'framer-motion';
import { FormattedText } from '../FormattedText';

const QuestionView: React.FC = () => {
  const { 
    questions, 
    currentQuestionIndex, 
    answers, 
    setAnswer, 
    flaggedQuestions, 
    toggleFlag,
    studyMode
  } = useExamStore();

  const q = questions[currentQuestionIndex];
  if (!q) return null;

  const currentAnswer = answers[currentQuestionIndex];
  const isMultiple = q.correct.length > 1;

  const handleOptionToggle = (letter: string) => {
    if (isMultiple) {
      const existing = (currentAnswer as string[]) || [];
      const next = existing.includes(letter)
        ? existing.filter(l => l !== letter)
        : [...existing, letter];
      setAnswer(currentQuestionIndex, next);
    } else {
      setAnswer(currentQuestionIndex, letter);
    }
  };

  const isCorrect = () => {
    if (!currentAnswer) return null;
    if (Array.isArray(currentAnswer)) {
      return [...currentAnswer].sort().join('') === [...q.correct].sort().join('');
    }
    return currentAnswer === q.correct;
  };

  return (
    <div className="space-y-8">
      <motion.div
        key={q.q_id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-5 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden"
      >
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 uppercase tracking-widest">
                {q.domain || 'AWS Professional'}
              </span>
            </div>
          </div>

          <button
            onClick={() => toggleFlag(currentQuestionIndex)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              flaggedQuestions.has(currentQuestionIndex)
              ? 'bg-yellow-500 text-slate-900 shadow-lg shadow-yellow-500/20 translate-y-[-2px]'
              : 'text-slate-500 hover:text-slate-300 bg-slate-800/50 border border-slate-800'
            }`}
          >
            <Flag className={`w-3.5 h-3.5 ${flaggedQuestions.has(currentQuestionIndex) ? 'fill-current' : ''}`} />
            {flaggedQuestions.has(currentQuestionIndex) ? 'Flagged' : 'Flag'}
          </button>
        </div>

        <FormattedText text={q.text} />

        {isMultiple && (
          <div className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-500/5 border border-blue-500/10 rounded-xl text-blue-400 text-xs">
            <Info className="w-4 h-4" />
            Pick <strong>{q.correct.length}</strong> correct answers
          </div>
        )}

        <div className="space-y-3">
          {Object.entries(q.options).map(([letter, text]) => {
            const isSelected = Array.isArray(currentAnswer) ? currentAnswer.includes(letter) : currentAnswer === letter;
            const showFeedback = studyMode && currentAnswer;
            const isAnswerCorrect = q.correct.includes(letter);
            
            let borderColor = 'border-slate-800/60';
            let bgColor = 'bg-slate-900/50';
            
            if (isSelected) {
              borderColor = 'border-orange-500';
              bgColor = 'bg-orange-500/5';
            }

            if (showFeedback) {
              if (isAnswerCorrect) {
                 borderColor = 'border-emerald-500';
                 bgColor = 'bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.05)]';
              } else if (isSelected) {
                 borderColor = 'border-red-500';
                 bgColor = 'bg-red-500/10';
              }
            }

            return (
              <button
                key={letter}
                onClick={() => handleOptionToggle(letter)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 group ${borderColor} ${bgColor} ${!showFeedback && 'hover:border-slate-700'}`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 font-bold text-xs transition-colors mt-0.5 ${
                  isSelected ? 'bg-orange-500 text-white' : 'bg-slate-800/80 text-slate-400 group-hover:bg-slate-700'
                }`}>
                  {letter}
                </div>
                <span className={`text-sm leading-relaxed font-normal ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>{text}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {studyMode && currentAnswer && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-10 p-6 rounded-2xl border ${isCorrect() ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}
            >
              <div className="flex items-center gap-3 mb-4">
                {isCorrect() ? (
                  <div className="flex items-center gap-2 text-emerald-500 font-bold">
                    <CheckCircle2 className="w-5 h-5" /> PASSED
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-500 font-bold">
                    <XCircle className="w-5 h-5" /> REJECTED
                  </div>
                )}
                <div className="text-xs uppercase tracking-widest font-extrabold text-slate-500">Explanation</div>
              </div>
              <FormattedText text={q.explanation || "No detailed explanation available for this beta question."} className="text-sm text-slate-300 leading-relaxed italic" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  );
};

export default QuestionView;
