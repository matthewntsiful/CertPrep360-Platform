import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Eye, EyeOff, ExternalLink, ArrowLeft } from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';
import { FormattedText } from '../FormattedText';

interface ReviewModeProps {
  onClose: () => void;
}

const ReviewMode: React.FC<ReviewModeProps> = ({ onClose }) => {
  const { questions, answers } = useExamStore();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct' | 'skipped'>('all');

  const questionResults = questions.map((q, i) => {
    const userAns = answers[i] ?? (answers as any)[String(i)];
    let isCorrect = false;
    if (userAns) {
      isCorrect = Array.isArray(userAns)
        ? [...userAns].sort().join('') === [...q.correct].sort().join('')
        : userAns === q.correct;
    }
    return { q, userAns, isCorrect, skipped: !userAns, originalIndex: i };
  });

  const filtered = questionResults.filter(r => {
    if (filter === 'correct') return r.isCorrect;
    if (filter === 'wrong') return !r.isCorrect && !r.skipped;
    if (filter === 'skipped') return r.skipped;
    return true;
  });

  const current = filtered[index];
  if (!current) return null;

  const { q, userAns, isCorrect, skipped } = current;

  const handleNext = () => { setIndex(i => Math.min(i + 1, filtered.length - 1)); setRevealed(false); };
  const handlePrev = () => { setIndex(i => Math.max(i - 1, 0)); setRevealed(false); };
  const handleFilter = (f: typeof filter) => { setFilter(f); setIndex(0); setRevealed(false); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6 py-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Results
        </button>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {index + 1} / {filtered.length}
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'all', label: `All (${questionResults.length})` },
          { key: 'correct', label: `✅ Correct (${questionResults.filter(r => r.isCorrect).length})` },
          { key: 'wrong', label: `❌ Wrong (${questionResults.filter(r => !r.isCorrect && !r.skipped).length})` },
          { key: 'skipped', label: `⬜ Skipped (${questionResults.filter(r => r.skipped).length})` },
        ] as const).map(f => (
          <button type="button" key={f.key} onClick={() => handleFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === f.key ? 'bg-white text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div key={`${filter}-${index}`}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 space-y-6">

          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-blue-500/10 text-blue-400 border-blue-500/20">
              {q.domain || 'General'}
            </span>
            <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
              skipped ? 'text-slate-500' : isCorrect ? 'text-emerald-500' : 'text-red-500'
            }`}>
              {skipped ? '⬜ Skipped' : isCorrect ? <><CheckCircle2 className="w-3.5 h-3.5" /> Correct</> : <><XCircle className="w-3.5 h-3.5" /> Wrong</>}
            </span>
          </div>

          {/* Question text — always visible */}
          <FormattedText text={q.text} className="text-lg leading-relaxed text-slate-200 font-normal" />

          {/* Options — always visible, reveal correct/wrong on demand */}
          <div className="space-y-3">
            {Object.entries(q.options).map(([letter, text]) => {
              const isUserAns = Array.isArray(userAns) ? userAns.includes(letter) : userAns === letter;
              const isCorrectAns = q.correct.includes(letter);

              let style = 'bg-slate-950 border-slate-800 text-slate-400';
              if (revealed) {
                if (isCorrectAns) style = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300';
                else if (isUserAns && !isCorrectAns) style = 'bg-red-500/10 border-red-500/40 text-red-300';
              } else if (isUserAns) {
                style = 'bg-orange-500/10 border-orange-500/40 text-orange-300';
              }

              return (
                <div key={letter} className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${style}`}>
                  <span className="font-black text-xs shrink-0 mt-0.5">{letter}.</span>
                  <span className="text-sm leading-relaxed">{text as string}</span>
                  {revealed && isCorrectAns && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-auto mt-0.5" />}
                  {revealed && isUserAns && !isCorrectAns && <XCircle className="w-4 h-4 text-red-500 shrink-0 ml-auto mt-0.5" />}
                </div>
              );
            })}
          </div>

          {/* Reveal button */}
          <button onClick={() => setRevealed(!revealed)}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              revealed
                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:scale-[1.02] shadow-lg shadow-orange-500/20'
            }`}>
            {revealed ? <><EyeOff className="w-4 h-4" /> Hide Answer</> : <><Eye className="w-4 h-4" /> Reveal Answer & Explanation</>}
          </button>

          {/* Explanation & Resources — shown after reveal */}
          <AnimatePresence>
            {revealed && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="space-y-4">
                {q.explanation ? (
                  <div className="p-5 bg-blue-500/5 border border-blue-500/15 rounded-2xl space-y-2">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Explanation</p>
                    <FormattedText text={q.explanation} className="text-sm text-slate-300 leading-relaxed" />
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                    <p className="text-xs text-slate-600 italic">No explanation available for this question yet. Use the AI Factory Enrich mode to add one.</p>
                  </div>
                )}

                {q.resources?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {q.resources.map((r: any, i: number) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white transition-colors">
                        {r.type} <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={handlePrev} disabled={index === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl font-black text-sm text-slate-400 hover:text-white disabled:opacity-30 transition-all">
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex gap-1.5">
          {filtered.slice(Math.max(0, index - 2), Math.min(filtered.length, index + 3)).map((_, i) => {
            const actualI = Math.max(0, index - 2) + i;
            return (
              <button key={actualI} onClick={() => { setIndex(actualI); setRevealed(false); }}
                className={`w-2 h-2 rounded-full transition-all ${actualI === index ? 'bg-orange-500 w-6' : 'bg-slate-700 hover:bg-slate-500'}`} />
            );
          })}
        </div>

        <button onClick={handleNext} disabled={index === filtered.length - 1}
          className="flex items-center gap-2 px-6 py-3 bg-white text-slate-950 rounded-2xl font-black text-sm disabled:opacity-30 hover:scale-105 transition-all">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default ReviewMode;
