import { motion } from 'framer-motion';
import { Users, MessageSquare, TrendingUp, Award, Pin, ExternalLink } from 'lucide-react';

const threads = [
  {
    pinned: true,
    category: 'Announcements',
    title: 'SAA-C03 Exam Update — New Question Bank Added (May 2025)',
    author: 'CertPrep360 Team',
    replies: 42,
    views: '3.2k',
    time: '2 days ago',
    badge: 'Official',
    badgeColor: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  },
  {
    pinned: false,
    category: 'Study Strategy',
    title: 'How I passed SAA-C03 on my first attempt — full breakdown',
    author: 'cloud_architect_ke',
    replies: 87,
    views: '5.1k',
    time: '5 days ago',
    badge: 'Top Post',
    badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    pinned: false,
    category: 'Exam Domains',
    title: 'VPC peering vs Transit Gateway — when does each make sense?',
    author: 'devops_matthieu',
    replies: 34,
    views: '1.8k',
    time: '1 week ago',
    badge: 'Discussion',
    badgeColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  {
    pinned: false,
    category: 'Exam Domains',
    title: 'Confused about RDS Multi-AZ vs Aurora Global — can someone clarify?',
    author: 'saa_candidate_2025',
    replies: 19,
    views: '940',
    time: '1 week ago',
    badge: 'Q&A',
    badgeColor: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
  {
    pinned: false,
    category: 'Study Strategy',
    title: 'Best order to tackle the 16 practice exams — domain-first or sequential?',
    author: 'aws_learner_gh',
    replies: 56,
    views: '2.4k',
    time: '2 weeks ago',
    badge: 'Discussion',
    badgeColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  {
    pinned: false,
    category: 'Score Reports',
    title: 'Scored 89% on Exam 12 — sharing my notes on cost optimization traps',
    author: 'infra_ninja',
    replies: 28,
    views: '1.3k',
    time: '3 weeks ago',
    badge: 'Score Report',
    badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
];

const stats = [
  { label: 'Community Members', value: '12,400+', icon: Users },
  { label: 'Active Threads', value: '3,800+', icon: MessageSquare },
  { label: 'Avg Pass Rate', value: '91%', icon: TrendingUp },
  { label: 'Certified Members', value: '8,200+', icon: Award },
];

const CommunityForum = () => {
  return (
    <div className="space-y-12 pb-20">
      <section className="text-center space-y-4 pt-12">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
            <Users className="text-purple-500 w-8 h-8" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Community <span className="text-purple-500">Forum</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Connect with thousands of AWS candidates. Share strategies, ask questions, and celebrate certifications.
        </p>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08 }}
            className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl text-center space-y-2"
          >
            <stat.icon className="w-5 h-5 text-purple-500 mx-auto" />
            <div className="text-2xl font-black text-white">{stat.value}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Recent Threads</h2>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sorted by Activity</span>
        </div>

        {threads.map((thread, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.07 }}
            className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-purple-500/30 transition-all group cursor-pointer"
          >
            <div className="flex items-start gap-4">
              {thread.pinned && <Pin className="w-4 h-4 text-orange-500 mt-1 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{thread.category}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${thread.badgeColor}`}>
                    {thread.badge}
                  </span>
                </div>
                <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors mb-2 truncate">
                  {thread.title}
                </h3>
                <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
                  <span>by {thread.author}</span>
                  <span>{thread.replies} replies</span>
                  <span>{thread.views} views</span>
                  <span>{thread.time}</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-700 group-hover:text-purple-500 transition-colors shrink-0 mt-1" />
            </div>
          </motion.div>
        ))}
      </div>

      <section className="max-w-5xl mx-auto p-10 bg-slate-900 border border-purple-500/20 rounded-3xl text-center space-y-4">
        <Users className="w-10 h-10 text-purple-500 mx-auto" />
        <h2 className="text-2xl font-bold">Join the Conversation</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Full forum access is available to registered CertPrep360 members. Sign up to post, reply, and track your community contributions.
        </p>
        <div className="flex justify-center gap-4 flex-wrap pt-2">
          <a
            href="/signup"
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
          >
            Create Account
          </a>
          <a
            href="/login"
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all"
          >
            Log In
          </a>
        </div>
      </section>
    </div>
  );
};

export default CommunityForum;
