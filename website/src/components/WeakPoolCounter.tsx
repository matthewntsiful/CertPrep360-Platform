import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { RefreshCw, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchAnalytics } from '../services/api';

/**
 * WeakPoolCounter — A stat card displaying the total number of questions
 * in the user's Weak Pool (spaced repetition system).
 * Includes a "Start Review Quiz" link that navigates to the dynamic quiz
 * with adaptive mode for targeted review.
 *
 * Validates: Requirements 5.6
 */
const WeakPoolCounter: React.FC = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalytics,
  });

  const weakPoolCount = analytics?.weakPoolCount ?? 0;

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-4 animate-pulse">
        <div className="w-12 h-12 bg-slate-800 rounded-xl" />
        <div className="space-y-2">
          <div className="h-8 w-16 bg-slate-800 rounded" />
          <div className="h-3 w-32 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-4 hover:border-slate-700 transition-all"
    >
      <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-amber-500">
        <RefreshCw className="w-6 h-6" />
      </div>

      <div>
        <div className="text-3xl font-black text-white">{weakPoolCount}</div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Questions to Review
        </div>
      </div>

      {weakPoolCount > 0 && (
        <Link
          to="/quiz/dynamic/adaptive"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/20 rounded-xl text-amber-400 hover:text-amber-300 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Start Review Quiz
        </Link>
      )}
    </motion.div>
  );
};

export default WeakPoolCounter;
