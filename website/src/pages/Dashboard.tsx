import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Terminal, 
  Target, 
  BarChart3, 
  Clock, 
  BookOpen, 
  Zap,
  Layout as LayoutIcon,
  Play,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatCardSkeleton, HistoryItemSkeleton } from '../components/Skeleton';
import { fetchUserAnalytics } from '../services/api';

// Dashboard component
const formatRelativeDate = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hours < 24) return `${hours} hours ago`;
  return `${days} day${days !== 1 ? 's' : ''} ago`;
};

const Dashboard: React.FC = () => {
  const { user, attributes } = useAuth();
  const navigate = useNavigate();
  const { data: analytics, isLoading: loading } = useQuery({
    queryKey: ['userAnalytics'],
    queryFn: fetchUserAnalytics,
  });
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  const handleGeneratePracticeSet = async () => {
    if (!analytics?.weakestDomain || generatingQuiz) return;
    setGeneratingQuiz(true);
    navigate(`/quiz/dynamic/${encodeURIComponent(analytics.weakestDomain)}`);
    setGeneratingQuiz(false);
  };

  const stats = analytics ? [
    { label: 'Exams Completed', value: String(analytics.examsCompleted), icon: Target, color: 'text-orange-500' },
    { label: 'Overall Accuracy', value: `${analytics.averageScore}%`, icon: BarChart3, color: 'text-blue-500' },
    { label: 'Study Hours', value: String(analytics.totalStudyHours), icon: Clock, color: 'text-emerald-500' },
    { label: 'Weakest Domain', value: analytics.weakestDomain.split(' ').slice(0, 2).join(' '), icon: AlertCircle, color: 'text-purple-500' }
  ] : [];

  const activeRoadmap = {
    title: analytics?.certificationsTracked?.[0] ? `AWS ${analytics.certificationsTracked[0]}` : 'Solutions Architect Associate',
    code: analytics?.certificationsTracked?.[0] || 'SAA-C03',
    progress: analytics ? Math.min(analytics.examsCompleted * 6, 100) : 0,
    nextMilestone: analytics?.weakestDomain ?? 'Loading...'
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] border border-orange-500/20">
              Candidate Dashboard
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Hello, <span className="text-orange-500">{attributes?.name || user?.username || 'Architect'}</span>.
          </h1>
          <p className="text-slate-500 text-lg">Your AWS certification environment is active and optimized.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Certs Tracked</span>
            <span className="text-xl font-black text-white">
              {loading ? '—' : analytics?.certificationsTracked.length ?? 0}
            </span>
          </div>
          <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-orange-500" />
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))
        ) : stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 md:p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-4 hover:border-slate-700 transition-all"
          >
            <div className={`w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-3xl font-black text-white truncate">{stat.value}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Active Path Spotlight */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Terminal className="text-orange-500 w-5 h-5" /> Current Focus
            </h2>
            <Link to="/#certifications" className="text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Change Roadmap</Link>
          </div>
          
          <div className="p-6 md:p-10 bg-slate-900 border border-slate-800 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity hidden sm:block">
              <LayoutIcon className="w-48 h-48" />
            </div>
            
            <div className="relative z-10 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded bg-slate-800 text-[10px] font-bold text-slate-400 font-mono tracking-widest">{activeRoadmap.code}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Active Roadmap</span>
                </div>
                <h3 className="text-3xl font-black text-white">{activeRoadmap.title}</h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400 font-medium">Overall Progress</span>
                  <span className="text-orange-500 font-bold">{activeRoadmap.progress}%</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${activeRoadmap.progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-800">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                     <BookOpen className="w-5 h-5 text-slate-500" />
                   </div>
                   <div className="text-sm">
                      <div className="text-slate-500 text-[10px] font-bold uppercase">Focus Area</div>
                      <div className="text-white font-medium text-xs max-w-[200px] leading-relaxed">{activeRoadmap.nextMilestone}</div>
                   </div>
                </div>
                <button 
                  onClick={() => navigate(`/certification/${activeRoadmap.code.toLowerCase()}`)}
                  className="w-full md:w-auto px-8 py-4 bg-white text-slate-950 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl"
                >
                  <Play className="w-5 h-5 fill-current" /> Continue Studying
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Performance */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-xl font-bold">Recent Results</h2>
            <Link to="/history" className="text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">See All</Link>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <HistoryItemSkeleton key={i} />
              ))
            ) : (analytics?.recentAttempts ?? []).map((attempt, i) => {
              const passed = attempt.score >= 72;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => navigate(`/results/${attempt.id}`)}
                  className="p-6 bg-slate-900/50 border border-slate-800 rounded-[2rem] flex items-center justify-between group hover:bg-slate-900/80 hover:border-slate-700 cursor-pointer hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border font-black text-xs ${
                      passed ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' : 'border-red-500/20 bg-red-500/5 text-red-500'
                    }`}>
                      {attempt.score}%
                    </div>
                    <div>
                      <h4 className="font-bold text-white leading-tight">{attempt.certId}</h4>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{formatRelativeDate(attempt.date)}</span>
                    </div>
                  </div>
                  <div className={`text-[10px] font-black uppercase tracking-widest ${passed ? 'text-emerald-500' : 'text-red-500'}`}>
                    {passed ? 'Passed' : 'Failed'}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <button 
            onClick={handleGeneratePracticeSet}
            disabled={generatingQuiz}
            className="w-full p-6 bg-slate-900/20 border border-slate-800 border-dashed rounded-[2rem] text-slate-500 hover:text-white hover:border-slate-600 transition-all flex flex-col items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className={`w-6 h-6 group-hover:scale-125 transition-transform ${generatingQuiz ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-bold uppercase tracking-widest">
              {generatingQuiz ? 'Generating...' : `Practice ${analytics?.weakestDomain?.split(' ').slice(-1)[0] ?? 'Domain'}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
