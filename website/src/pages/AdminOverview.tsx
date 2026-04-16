import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Database, 
  Zap, 
  Activity, 
  Search,
  ArrowUpRight,
  ShieldAlert,
  Terminal,
  Loader2
} from 'lucide-react';
import { fetchAuthSession } from '@aws-amplify/auth';
import { adminService } from '../services/adminService';

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMfaActive, setIsMfaActive] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // 1. Check MFA Status from Token
        const session = await fetchAuthSession();
        const amr = (session.tokens?.idToken?.payload?.amr as string[]) || [];
        setIsMfaActive(amr.includes('mfa'));

        // 2. Fetch Stats
        const data = await adminService.getStats();
        setStats(data.overview);
        setFinancials(data.financials);
      } catch (err: any) {
        console.error("Failed to fetch admin stats:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const recentIncidents = [
    { id: 1, type: "API", message: "Bedrock Latency Spike - US-East-1", time: "14 mins ago", severity: "low" },
    { id: 2, type: "AUTH", message: "Failed MFA attempt - User ID: 8210", time: "1 hour ago", severity: "medium" },
    { id: 3, type: "DB", message: "GSI Re-indexing Completed Successfully", time: "3 hours ago", severity: "low" },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Initializing Root Command...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 bg-slate-900/50 border border-red-500/20 rounded-[3rem] text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-black text-white uppercase tracking-widest">Unauthorized Access or API Error</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 border border-slate-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] border border-orange-500/20">
            System Overview
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Root Command Center</span>
          
          <div className="ml-auto flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isMfaActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${isMfaActive ? 'text-emerald-500' : 'text-red-500'}`}>
              MFA: {isMfaActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-white">Command Center</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.type === 'users' ? Users : 
                       stat.type === 'content' ? Database :
                       stat.type === 'sessions' ? Zap : Activity;
          const color = stat.type === 'users' ? 'text-blue-500' : 
                        stat.type === 'content' ? 'text-orange-500' :
                        stat.type === 'sessions' ? 'text-yellow-500' : 'text-emerald-500';

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] space-y-4 hover:border-slate-700 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div className={`p-4 bg-slate-950 border border-slate-800 rounded-2xl ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  stat.trend === 'Live' || stat.trend === 'Nominal' ? 'text-emerald-500' : 'text-slate-500'
                }`}>
                  {stat.trend}
                </span>
              </div>
              <div>
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* System Logs */}
        <div className="lg:col-span-2 space-y-6 text-slate-50">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-xl font-bold flex items-center gap-2 font-mono">
              <Terminal className="text-orange-500 w-5 h-5" /> system_logs.sh
            </h2>
            <button className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Clear Logs</button>
          </div>
          
          <div className="bg-slate-950 border border-slate-800 rounded-[2.5rem] overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-900/40 flex items-center gap-4">
               <Search className="w-4 h-4 text-slate-600" />
               <input 
                type="text" 
                placeholder="Search global audit logs..." 
                className="bg-transparent border-none text-xs font-medium text-slate-400 focus:ring-0 w-full"
               />
            </div>
            <div className="p-2">
               {recentIncidents.map((incident) => (
                 <div key={incident.id} className="p-6 hover:bg-slate-900/50 rounded-[2rem] flex items-center justify-between group transition-all">
                    <div className="flex items-center gap-6">
                      <div className={`w-2 h-2 rounded-full ${incident.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{incident.type}</span>
                          <span className="text-slate-800 text-xs">•</span>
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none">{incident.time}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-200 mt-1">{incident.message}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-700 group-hover:text-white transition-colors" />
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Financial Pulse (Mock for now) */}
        <div className="space-y-6">
           <h2 className="text-xl font-bold px-4">Financial Pulse</h2>
           <div className="p-10 bg-orange-500 rounded-[3rem] text-slate-950 space-y-8 relative overflow-hidden group">
              <Zap className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 group-hover:rotate-12 transition-transform" />
              <div className="relative z-10">
                <div className="px-3 py-1 bg-white/20 rounded-full w-fit text-[10px] font-black uppercase tracking-widest mb-4">Pricing Mode: Alpha (Free)</div>
                <h3 className="text-4xl font-black leading-tight">${financials?.mrr || '0'}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-950/60 mt-2">Projected Monthly Revenue</p>
                <div className="h-1 w-full bg-slate-950/10 rounded-full mt-6 overflow-hidden">
                   <div className="h-full bg-slate-950 w-3/4 animate-[shimmer_2s_infinite]" />
                </div>
                <p className="text-slate-950/70 text-xs mt-4 font-bold leading-relaxed">
                  Based on current user base and planned ${financials?.mrr > 0 ? (financials.mrr / financials.activeSubscriptions).toFixed(2) : '49'} subscription tier.
                </p>
              </div>
              <button className="relative z-10 w-full py-4 bg-slate-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                View Revenue Flow
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
