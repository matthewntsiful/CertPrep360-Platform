import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Target,
  AlertCircle,
  BookOpen,
  Eye,
  EyeOff,
  ChevronRight,
  Filter
} from 'lucide-react';
import { fetchAttemptDetail } from '../services/api';
import { FormattedText } from '../components/FormattedText';
import type { QuestionSnapshot } from '../types/analytics';
import { filterQuestions } from '../utils/resultReviewFilters';

type FilterTab = 'all' | 'correct' | 'incorrect' | 'skipped';

const AnimatedScoreRing = ({ score, passed }: { score: number; passed: boolean }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const colorClass = passed ? 'text-emerald-500' : 'text-red-500';

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle 
          cx="50" cy="50" r={radius} 
          className="stroke-slate-800" strokeWidth="8" fill="none" 
        />
        <motion.circle 
          cx="50" cy="50" r={radius} 
          className={colorClass} strokeWidth="8" fill="none" strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
          stroke="currentColor"
        />
      </svg>
      <div className="relative flex flex-col items-center">
        <span className={`text-3xl font-black ${colorClass}`}>{score}%</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{passed ? 'Passed' : 'Failed'}</span>
      </div>
    </div>
  );
};

interface QuestionItem {
  index: number;
  q_id: string;
  domain: string;
  selected: string | null;
  isCorrect: boolean;
  snapshot?: QuestionSnapshot;
}

const ResultReview: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [revealedQuestions, setRevealedQuestions] = useState<Set<number>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);
  const questionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const { data: attempt, isLoading, error } = useQuery({
    queryKey: ['attemptDetail', attemptId],
    queryFn: () => fetchAttemptDetail(attemptId!),
    enabled: !!attemptId,
  });

  // Build the unified question list from answers + snapshots
  const allQuestions: QuestionItem[] = useMemo(() => {
    if (!attempt?.answers) return [];

    const snapshotMap = new Map<string, QuestionSnapshot>();
    if (attempt.questionSnapshots) {
      attempt.questionSnapshots.forEach(snap => {
        snapshotMap.set(snap.q_id, snap);
      });
    }

    return Object.entries(attempt.answers).map(([idx, ans]) => {
      const snapshot = snapshotMap.get(ans.q_id);
      return {
        index: Number(idx),
        q_id: ans.q_id,
        domain: ans.domain || 'Unassigned',
        selected: ans.selected,
        isCorrect: ans.isCorrect,
        snapshot,
      };
    });
  }, [attempt]);

  // Apply filter
  const filteredQuestions: QuestionItem[] = useMemo(() => {
    return filterQuestions(allQuestions, activeFilter);
  }, [allQuestions, activeFilter]);

  // Reset focused index when filter changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [activeFilter]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => Math.min(prev + 1, filteredQuestions.length - 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(prev - 1, 0));
    }
  }, [filteredQuestions.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll focused question into view
  useEffect(() => {
    const focusedQuestion = filteredQuestions[focusedIndex];
    if (focusedQuestion) {
      const el = questionRefs.current.get(focusedQuestion.index);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [focusedIndex, filteredQuestions]);

  const toggleReveal = (questionIndex: number) => {
    setRevealedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionIndex)) {
        next.delete(questionIndex);
      } else {
        next.add(questionIndex);
      }
      return next;
    });
  };

  // Filter counts
  const filterCounts = useMemo(() => {
    const correct = allQuestions.filter(q => q.isCorrect).length;
    const incorrect = allQuestions.filter(q => !q.isCorrect && q.selected !== null).length;
    const skipped = allQuestions.filter(q => q.selected === null).length;
    return { all: allQuestions.length, correct, incorrect, skipped };
  }, [allQuestions]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
      <p className="text-xs font-black uppercase tracking-widest text-slate-500 animate-pulse">Retrieving Attempt Logs...</p>
    </div>
  );

  if (error || !attempt) return (
    <div className="p-10 bg-slate-900/50 border border-red-500/20 rounded-[3rem] text-center space-y-4">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
      <h2 className="text-xl font-black text-white uppercase tracking-widest">Failed to load attempt</h2>
      <button onClick={() => navigate('/history')} className="px-6 py-2 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Back to History</button>
    </div>
  );

  const passed = attempt.score >= 72;

  // Calculate domain stats
  const domainStats = (() => {
    const stats: Record<string, { correct: number; total: number }> = {};
    allQuestions.forEach(q => {
      const domain = q.domain;
      if (!stats[domain]) stats[domain] = { correct: 0, total: 0 };
      stats[domain].total += 1;
      if (q.isCorrect) stats[domain].correct += 1;
    });
    return Object.entries(stats).map(([domain, data]) => ({
      domain,
      correct: data.correct,
      total: data.total,
      percentage: Math.round((data.correct / data.total) * 100),
    })).sort((a, b) => b.total - a.total);
  })();

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="space-y-6">
        <button 
          onClick={() => navigate('/history')}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" /> Back to History
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded bg-slate-800 text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase">
                {attempt.certId} / {attempt.examId}
              </span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Review Result</h1>
            <p className="text-slate-500">Deep dive into your performance metrics and answer accuracy.</p>
          </div>

          <AnimatedScoreRing score={attempt.score} passed={passed} />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-2">
           <Clock className="w-5 h-5 text-blue-500 mb-2" />
           <div className="text-2xl font-black text-white">{attempt.timeTaken}m</div>
           <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time Invested</div>
        </div>
        <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-2">
           <Target className="w-5 h-5 text-orange-500 mb-2" />
           <div className="text-2xl font-black text-white">{allQuestions.length}</div>
           <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Questions Attempted</div>
        </div>
        <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-2">
           <BookOpen className="w-5 h-5 text-emerald-500 mb-2" />
           <div className="text-2xl font-black text-white">
             {domainStats.length > 0
               ? `${Math.round(domainStats.reduce((sum, d) => sum + d.correct, 0) / domainStats.reduce((sum, d) => sum + d.total, 0) * 100)}%`
               : `${attempt.score}%`}
           </div>
           <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Accuracy</div>
        </div>
      </div>

      {/* Domain Breakdown */}
      {domainStats.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Target className="text-orange-500 w-5 h-5" /> Domain Breakdown
          </h2>
          <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-6">
            {domainStats.map((stat, i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-end justify-between text-xs">
                  <span className="font-bold text-slate-300 tracking-wide max-w-[70%] leading-relaxed">{stat.domain}</span>
                  <span className="font-mono text-slate-500 font-bold">{stat.correct} / {stat.total} (<span className={stat.percentage >= 72 ? 'text-emerald-500' : 'text-orange-500'}>{stat.percentage}%</span>)</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.percentage}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={`h-full rounded-full ${stat.percentage >= 72 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="text-orange-500 w-5 h-5" /> Question Breakdown
          </h2>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <Filter className="w-3 h-3" />
            <span>Use ← → to navigate</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all' as FilterTab, label: 'All', count: filterCounts.all },
            { key: 'correct' as FilterTab, label: 'Correct', count: filterCounts.correct },
            { key: 'incorrect' as FilterTab, label: 'Incorrect', count: filterCounts.incorrect },
            { key: 'skipped' as FilterTab, label: 'Skipped', count: filterCounts.skipped },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeFilter === tab.key
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Question List */}
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="p-10 bg-slate-900/50 border border-slate-800 rounded-[2rem] text-center">
              <p className="text-slate-500 text-sm font-bold">No questions match this filter.</p>
            </div>
          ) : (
            filteredQuestions.map((q, listIdx) => {
              const isRevealed = revealedQuestions.has(q.index);
              const isFocused = listIdx === focusedIndex;

              return (
                <motion.div
                  key={q.index}
                  ref={(el) => {
                    if (el) questionRefs.current.set(q.index, el);
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: listIdx * 0.02 }}
                  className={`p-6 sm:p-8 bg-slate-900/50 border rounded-[2rem] space-y-5 transition-all ${
                    isFocused
                      ? 'border-orange-500/50 ring-2 ring-orange-500/20'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border ${
                        q.isCorrect
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500'
                          : q.selected === null
                            ? 'border-slate-600/20 bg-slate-600/5 text-slate-400'
                            : 'border-red-500/20 bg-red-500/5 text-red-500'
                      }`}>
                        Q{q.index + 1}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{q.domain}</div>
                        <div className={`text-xs font-black uppercase tracking-widest ${
                          q.isCorrect
                            ? 'text-emerald-500'
                            : q.selected === null
                              ? 'text-slate-400'
                              : 'text-red-500'
                        }`}>
                          {q.isCorrect ? 'Correct' : q.selected === null ? 'Skipped' : 'Incorrect'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {q.isCorrect
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : q.selected === null
                          ? <AlertCircle className="w-5 h-5 text-slate-400" />
                          : <XCircle className="w-5 h-5 text-red-500" />
                      }
                    </div>
                  </div>

                  {/* Question Text (if snapshot available) */}
                  {q.snapshot && (
                    <div className="pt-2">
                      <FormattedText text={q.snapshot.text} className="text-sm leading-relaxed text-slate-300 font-normal" />
                    </div>
                  )}

                  {/* Options Display (if snapshot available and revealed) */}
                  {q.snapshot && isRevealed && (
                    <div className="space-y-2 pt-2">
                      {Object.entries(q.snapshot.options).map(([letter, text]) => {
                        const isCorrectOption = letter === q.snapshot!.correct;
                        const isUserSelection = letter === q.selected;
                        const isIncorrectSelection = isUserSelection && !isCorrectOption;

                        let borderColor = 'border-slate-800/60';
                        let bgColor = 'bg-slate-900/50';
                        let textColor = 'text-slate-300';
                        let badgeColor = 'bg-slate-800/80 text-slate-400';

                        if (isCorrectOption) {
                          borderColor = 'border-emerald-500/50';
                          bgColor = 'bg-emerald-500/5';
                          textColor = 'text-emerald-300';
                          badgeColor = 'bg-emerald-500 text-white';
                        }
                        if (isIncorrectSelection) {
                          borderColor = 'border-red-500/50';
                          bgColor = 'bg-red-500/5';
                          textColor = 'text-red-300';
                          badgeColor = 'bg-red-500 text-white';
                        }

                        return (
                          <div
                            key={letter}
                            className={`p-3 sm:p-4 rounded-xl border flex items-start gap-3 ${borderColor} ${bgColor}`}
                          >
                            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 font-bold text-xs ${badgeColor}`}>
                              {letter}
                            </div>
                            <span className={`text-sm leading-relaxed ${textColor}`}>{text}</span>
                            {isCorrectOption && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-auto mt-0.5" />
                            )}
                            {isIncorrectSelection && (
                              <XCircle className="w-4 h-4 text-red-500 shrink-0 ml-auto mt-0.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Explanation (if snapshot available and revealed) */}
                  {q.snapshot && isRevealed && q.snapshot.explanation && (
                    <div className="p-4 sm:p-5 rounded-xl bg-blue-500/5 border border-blue-500/20">
                      <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Explanation</div>
                      <FormattedText text={q.snapshot.explanation} className="text-sm text-slate-300 leading-relaxed" />
                    </div>
                  )}

                  {/* Legacy fallback (no snapshot) */}
                  {!q.snapshot && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Your Selection</span>
                        <div className="p-4 bg-slate-950 rounded-xl text-white font-bold border border-slate-800">
                          Option {q.selected || 'No Answer'}
                        </div>
                      </div>
                      {!q.isCorrect && q.selected !== null && (
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Status</span>
                          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 font-bold">
                            Incorrect — snapshot data unavailable
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reveal/Hide Toggle */}
                  {q.snapshot && (
                    <div className="pt-2">
                      <button
                        onClick={() => toggleReveal(q.index)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                          isRevealed
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20'
                        }`}
                      >
                        {isRevealed ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Hide Answer
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Reveal Answer
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Navigation hint at bottom */}
        {filteredQuestions.length > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4 text-slate-500">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
              <ChevronLeft className="w-3 h-3" />
              <span>{focusedIndex + 1} / {filteredQuestions.length}</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultReview;
