import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, XCircle, RotateCcw, Home as HomeIcon, Clock, Target, CheckCircle2, ChevronDown, ChevronUp, BookOpen, ExternalLink, Share2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { RESOURCES_DATA } from '../../data/resourcesData';

const ExamResults: React.FC = () => {
  const navigate = useNavigate();
  const { questions, answers, resetExam, startTime, certId, examId } = useExamStore();
  const [showReview, setShowReview] = useState(false);
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct' | 'skipped'>('all');
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [showShare, setShowShare] = useState(false);

  const certMetadata = RESOURCES_DATA[certId.toLowerCase()];

  let correctCount = 0;
  const domainPerformance: Record<string, { correct: number; total: number }> = {};
  const questionResults = questions.map((q, i) => {
    const userAns = answers[i];
    const domain = q.domain || 'General';
    if (!domainPerformance[domain]) domainPerformance[domain] = { correct: 0, total: 0 };
    domainPerformance[domain].total++;

    let isCorrect = false;
    if (userAns) {
      isCorrect = Array.isArray(userAns)
        ? [...userAns].sort().join('') === [...q.correct].sort().join('')
        : userAns === q.correct;
    }
    if (isCorrect) { correctCount++; domainPerformance[domain].correct++; }
    return { q, userAns, isCorrect, skipped: !userAns };
  });

  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= (parseInt(certMetadata?.passingScore) || 72);
  const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000 / 60) : 0;

  const filteredResults = questionResults.filter(r => {
    if (filter === 'correct') return r.isCorrect;
    if (filter === 'wrong') return !r.isCorrect && !r.skipped;
    if (filter === 'skipped') return r.skipped;
    return true;
  });

  const shareText = `I scored ${score}% on the ${certId} Practice Exam on CertPrep360! ${passed ? "✅ Passed!" : "📚 Keep studying!"} #AWS #CloudCertification`;
  const shareUrl = "https://aws-exams.matthewntsiful.com";
  const shareLinks = [
    { label: "X", color: "bg-black hover:bg-slate-800", url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { label: "LinkedIn", color: "bg-blue-700 hover:bg-blue-600", url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` },
    { label: "WhatsApp", color: "bg-green-600 hover:bg-green-500", url: `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}` },
    { label: "Reddit", color: "bg-orange-600 hover:bg-orange-500", url: `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}` },
    { label: "Telegram", color: "bg-sky-500 hover:bg-sky-400", url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}` },
  ];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto space-y-10 py-12">

      {/* Hero */}
      <div className="text-center space-y-6">
        <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', damping: 12 }}
          className={`w-28 h-28 mx-auto rounded-3xl flex items-center justify-center shadow-2xl ${passed ? 'bg-emerald-500' : 'bg-red-500'} text-white relative`}>
          {passed ? <Trophy className="w-14 h-14" /> : <XCircle className="w-14 h-14" />}
          {passed && <motion.div animate={{ scale: [1,1.2,1], opacity: [0.5,1,0.5] }} transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-emerald-500 blur-2xl -z-10 rounded-full" />}
        </motion.div>
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight">{passed ? 'Exam Passed!' : 'Requires Improvement'}</h1>
          <p className="text-slate-400 text-sm uppercase tracking-widest font-bold mt-2">{certId} • {examId}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Target, value: `${score}%`, label: 'Score', color: passed ? 'text-emerald-500' : 'text-red-500', bg: passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500' },
          { icon: CheckCircle2, value: `${correctCount}/${questions.length}`, label: 'Correct', color: 'text-white', bg: 'bg-blue-500/10 text-blue-500' },
          { icon: Clock, value: `${timeTaken}m`, label: 'Time', color: 'text-white', bg: 'bg-orange-500/10 text-orange-500' },
        ].map((s, i) => (
          <div key={i} className="p-6 rounded-[2rem] bg-slate-900 border border-slate-800 text-center space-y-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto ${s.bg}`}><s.icon className="w-5 h-5" /></div>
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Domain Breakdown */}
      <div className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 space-y-8">
        <h3 className="text-xl font-black">Domain Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.entries(domainPerformance).map(([domain, data], i) => {
            const pct = Math.round((data.correct / data.total) * 100);
            const strong = pct >= 75;
            return (
              <motion.div key={domain} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="space-y-3">
                <div className="flex justify-between items-end">
                  <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Domain {i+1}</p>
                    <p className="text-sm font-bold text-white">{domain}</p></div>
                  <span className={`text-lg font-black ${strong ? 'text-emerald-500' : 'text-orange-500'}`}>{pct}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.5 + i * 0.08 }}
                    className={`h-full rounded-full ${strong ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${strong ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                    {strong ? 'Strong' : 'Needs Review'}
                  </span>
                  <span className="text-[10px] text-slate-600 font-bold">{data.correct} of {data.total}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Answer Review */}
      <div className="rounded-[2.5rem] bg-slate-900 border border-slate-800 overflow-hidden">
        <button onClick={() => setShowReview(!showReview)}
          className="w-full p-8 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-black text-white">Review Answers</h3>
              <p className="text-xs text-slate-500 font-medium">
                {correctCount} correct · {questionResults.filter(r => !r.isCorrect && !r.skipped).length} wrong · {questionResults.filter(r => r.skipped).length} skipped
              </p>
            </div>
          </div>
          {showReview ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        <AnimatePresence>
          {showReview && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="px-8 pb-8 space-y-6">

                {/* Filter tabs */}
                <div className="flex gap-2 flex-wrap">
                  {(['all','correct','wrong','skipped'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        filter === f ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}>
                      {f} {f === 'all' ? `(${questions.length})` : f === 'correct' ? `(${correctCount})` : f === 'wrong' ? `(${questionResults.filter(r => !r.isCorrect && !r.skipped).length})` : `(${questionResults.filter(r => r.skipped).length})`}
                    </button>
                  ))}
                </div>

                {/* Questions */}
                <div className="space-y-3">
                  {filteredResults.map(({ q, userAns, isCorrect, skipped }) => {
                    const globalIdx = questions.indexOf(q);
                    const isExpanded = expandedQ === globalIdx;
                    return (
                      <div key={q.q_id} className={`rounded-2xl border overflow-hidden ${
                        skipped ? 'border-slate-700 bg-slate-950/50' :
                        isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'
                      }`}>
                        <button onClick={() => setExpandedQ(isExpanded ? null : globalIdx)}
                          className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/5 transition-colors">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black ${
                            skipped ? 'bg-slate-800 text-slate-500' :
                            isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>{globalIdx + 1}</div>
                          <p className="text-xs text-slate-300 flex-1 line-clamp-2">{q.text}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            {skipped ? <span className="text-[9px] font-black text-slate-500 uppercase">Skipped</span> :
                             isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                             <XCircle className="w-4 h-4 text-red-500" />}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-4 space-y-3 border-t border-slate-800/50 pt-4">
                                {/* Options */}
                                <div className="space-y-2">
                                  {Object.entries(q.options).map(([letter, text]) => {
                                    const isUserAns = Array.isArray(userAns) ? userAns.includes(letter) : userAns === letter;
                                    const isCorrectAns = q.correct.includes(letter);
                                    return (
                                      <div key={letter} className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${
                                        isCorrectAns ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                                        isUserAns && !isCorrectAns ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                                        'bg-slate-900 border-slate-800 text-slate-500'
                                      }`}>
                                        <span className="font-black shrink-0">{letter}.</span>
                                        <span>{text as string}</span>
                                        {isCorrectAns && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-auto mt-0.5" />}
                                        {isUserAns && !isCorrectAns && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 ml-auto mt-0.5" />}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Explanation */}
                                {q.explanation && (
                                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Explanation</p>
                                    <p className="text-xs text-slate-300 leading-relaxed">{q.explanation}</p>
                                  </div>
                                )}

                                {/* Resources */}
                                {q.resources?.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {q.resources.map((r: any, i: number) => (
                                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-colors">
                                        {r.type} <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button onClick={() => { resetExam(); navigate('/'); }}
          className="w-full sm:w-auto px-10 py-4 bg-white text-slate-950 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 transition-all">
          <RotateCcw className="w-5 h-5" /> Retake
        </button>
        <button onClick={() => navigate('/')}
          className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white border border-slate-800 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all">
          <HomeIcon className="w-5 h-5" /> Dashboard
        </button>
        <button onClick={() => setShowShare(true)}
          className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white border border-slate-800 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all">
          <Share2 className="w-5 h-5" /> Share Result
        </button>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShare && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowShare(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200]" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-[201] flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 w-full max-w-md space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-white">Share Your Result</h3>
                  <button onClick={() => setShowShare(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <p className="text-sm text-slate-300 leading-relaxed">{shareText}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {shareLinks.map(link => (
                    <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                      className={`${link.color} text-white rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105`}>
                      <Share2 className="w-3.5 h-3.5" /> {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ExamResults;
