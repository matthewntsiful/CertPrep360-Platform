import React from 'react';
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
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { fetchAttempt } from '../services/api';
import { useExamStore } from '../store/useExamStore';

const ResultReview: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { /* questions */ } = useExamStore();

  const { data: attempt, isLoading, error } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => fetchAttempt(attemptId!),
    enabled: !!attemptId
  });

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

          <div className={`px-8 py-4 rounded-3xl border-2 flex flex-col items-center justify-center transition-all ${
            passed ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' : 'border-red-500/20 bg-red-500/5 text-red-500'
          }`}>
            <span className="text-3xl font-black">{attempt.score}%</span>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{passed ? 'Passed' : 'Failed'}</span>
          </div>
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
           <div className="text-2xl font-black text-white">{Object.keys(attempt.answers || {}).length}</div>
           <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Questions Attempted</div>
        </div>
        <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-2">
           <BookOpen className="w-5 h-5 text-emerald-500 mb-2" />
           <div className="text-2xl font-black text-white">Review</div>
           <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Detailed Analysis</div>
        </div>
      </div>

      {/* Answer List */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="text-orange-500 w-5 h-5" /> Question Breakdown
        </h2>

        <div className="space-y-4">
          {Object.entries(attempt.answers || {}).map(([idx, ans]: [string, any], i) => {
            const isRich = typeof ans === 'object' && ans !== null && 'selected' in ans;
            const isCorrect = isRich ? !!ans.isCorrect : false;
            const domainName = isRich ? (ans.domain || 'Unassigned') : 'Legacy Domain';
            const selectedOpt = isRich ? ans.selected : (Array.isArray(ans) ? ans.join(', ') : String(ans));

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="p-8 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] space-y-6 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border ${
                      isCorrect ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' : 'border-red-500/20 bg-red-500/5 text-red-500'
                    }`}>
                      Q{Number(idx) + 1}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{domainName}</div>
                      <div className={`text-xs font-black uppercase tracking-widest ${isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </div>
                    </div>
                  </div>
                  {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                </div>

                {/* We don't have the question text in the attempt record, 
                    but we show the choice made and the result. 
                    If we had the question store loaded, we could match it. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                   <div className="space-y-1">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Your Selection</span>
                      <div className="p-4 bg-slate-950 rounded-xl text-white font-bold border border-slate-800">
                        Option {selectedOpt || 'No Answer'}
                      </div>
                   </div>
                   {!isCorrect && (
                     <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Reference Data</span>
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-emerald-500 font-bold flex items-center justify-between">
                          <span>Correction Required</span>
                          <ExternalLink className="w-4 h-4 opacity-40" />
                        </div>
                     </div>
                   )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ResultReview;
