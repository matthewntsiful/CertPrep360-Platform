import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  History as HistoryIcon, 
  ChevronLeft,
  Calendar,
  Clock,
  Target,
  Award
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUserAnalytics } from '../services/api';

const formatFullDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const History: React.FC = () => {
  const navigate = useNavigate();
  const { data: analytics, isLoading: loading } = useQuery({
    queryKey: ['userAnalytics'],
    queryFn: fetchUserAnalytics,
  });

  const attempts = analytics?.recentAttempts ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center">
              <HistoryIcon className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight">Attempt History</h1>
              <p className="text-slate-500">Review your past performances and tracking progress.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-5 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-center">
            <div className="text-lg font-black text-white">{attempts.length}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Attempts</div>
          </div>
          <div className="px-5 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-center">
            <div className="text-lg font-black text-emerald-500">
              {attempts.length > 0 ? `${Math.round((attempts.filter((a: any) => a.score >= 72).length / attempts.length) * 100)}%` : '—'}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pass Rate</div>
          </div>
          <div className="px-5 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-center">
            <div className="text-lg font-black text-orange-500">
              {attempts.length > 0 ? `${Math.round(attempts.reduce((sum: number, a: any) => sum + a.score, 0) / attempts.length)}%` : '—'}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] animate-pulse h-24" />
          ))
        ) : attempts.length === 0 ? (
          <div className="p-20 bg-slate-900/20 border border-slate-800 border-dashed rounded-[3rem] text-center space-y-4">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
              <Award className="w-8 h-8 text-slate-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">No attempts found</h3>
              <p className="text-slate-500">Your exam history will appear here once you complete a test.</p>
            </div>
            <Link 
              to="/#certifications" 
              className="inline-block px-8 py-4 bg-white text-slate-950 font-black rounded-2xl hover:scale-105 transition-transform"
            >
              Start Your First Exam
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt: any, i: number) => {
              const passed = attempt.score >= 72;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]" />
                  <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 transition-all group-hover:border-slate-700">
                    <div className="flex items-center gap-6">
                      <div className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center border-2 font-black transition-all ${
                        passed 
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500 group-hover:border-emerald-500/40' 
                          : 'border-red-500/20 bg-red-500/5 text-red-500 group-hover:border-red-500/40'
                      }`}>
                        <span className="text-2xl">{attempt.score}%</span>
                        <span className="text-[8px] uppercase tracking-widest mt-1 opacity-60">Score</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xl font-black text-white">{attempt.certId}</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                            passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {passed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formatFullDate(attempt.date)}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <Clock className="w-4 h-4" />
                            <span>Exam ID: {attempt.examId}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                      <Link 
                        to={`/certification/${attempt.certId.toLowerCase()}`}
                        className="flex-1 sm:flex-none text-center px-6 py-3 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors uppercase tracking-widest"
                      >
                        Retake Exam
                      </Link>
                      <Link 
                        to={`/results/${attempt.id}`}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-950 text-xs font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform uppercase tracking-widest shadow-xl shadow-white/5"
                      >
                        <Target className="w-4 h-4" /> Review Results
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
