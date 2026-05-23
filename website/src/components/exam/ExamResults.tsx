import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, XCircle, RotateCcw, Home as HomeIcon, Clock, Target, CheckCircle2, Share2, X, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { RESOURCES_DATA } from '../../data/resourcesData';
import SoundEffects from '../../utils/sound';
import ReviewMode from './ReviewMode';

const ExamResults: React.FC = () => {
  const navigate = useNavigate();
  const { questions, answers, resetExam, startTime, certId, examId, quizMeta } = useExamStore();
  const [showShare, setShowShare] = useState(false);
  const [inReview, setInReview] = useState(false);


  const certMetadata = RESOURCES_DATA[certId.toLowerCase()];

  let correctCount = 0;
  const domainPerformance: Record<string, { correct: number; total: number }> = {};
  const questionResults = questions.map((q, i) => {
    const userAns = answers[i] ?? (answers as any)[String(i)];
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

  useEffect(() => {
    if (passed) {
      SoundEffects.playSuccess();
    } else {
      SoundEffects.playCompletion();
    }
  }, [passed]);

  const [copied, setCopied] = useState(false);
  const shareUrl = 'https://aws-exams.matthewntsiful.com';
  const shareText = `🎯 ${passed ? '✅ PASSED' : '📚 Practice Run'} — I scored ${score}% on the AWS ${certId} Practice Exam on CertPrep360!\n\n${correctCount}/${questions.length} correct in ${timeTaken} minutes.\n\nPrepare for your AWS certification 👇\n${shareUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: `CertPrep360 — ${certId} Result`, text: shareText, url: shareUrl });
    }
  };

  const shareLinks = [
    { label: 'X (Twitter)', emoji: '𝕏', color: 'bg-black hover:bg-slate-800 border-slate-700', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}` },
    { label: 'LinkedIn', emoji: 'in', color: 'bg-blue-700 hover:bg-blue-600 border-blue-600', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareText)}` },
    { label: 'WhatsApp', emoji: '💬', color: 'bg-green-600 hover:bg-green-500 border-green-500', url: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
    { label: 'Telegram', emoji: '✈️', color: 'bg-sky-500 hover:bg-sky-400 border-sky-400', url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}` },
    { label: 'Reddit', emoji: '🤖', color: 'bg-orange-600 hover:bg-orange-500 border-orange-500', url: `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}` },
    { label: 'Facebook', emoji: 'f', color: 'bg-blue-600 hover:bg-blue-500 border-blue-500', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}` },
  ];

  if (inReview) return <ReviewMode onClose={() => setInReview(false)} />;

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Weak Pool / Adaptive Quiz Info */}
      {quizMeta && quizMeta.weakPoolIncluded > 0 && (
        <div className="flex items-center gap-3 px-6 py-4 bg-amber-500/5 border border-amber-500/20 rounded-[2rem]">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-400">
              {quizMeta.weakPoolIncluded} Weak Pool {quizMeta.weakPoolIncluded === 1 ? 'question' : 'questions'} included
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Spaced repetition questions from your review pool were mixed into this quiz
            </p>
          </div>
        </div>
      )}

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

      {/* Answer Review Button */}
      <button onClick={() => setInReview(true)}
        className="w-full p-6 rounded-[2rem] bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-800/50 transition-all flex items-center gap-4 group">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="text-left">
          <p className="text-base font-black text-white">Review Answers</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {correctCount} correct · {questionResults.filter(r => !r.isCorrect && !r.skipped).length} wrong · {questionResults.filter(r => r.skipped).length} skipped — read each question and reveal the answer at your own pace
          </p>
        </div>
      </button>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button onClick={() => { resetExam(); navigate(`/certification/${certId.toLowerCase()}`); }}
          className="w-full sm:w-auto px-10 py-4 bg-white text-slate-950 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 transition-all">
          <RotateCcw className="w-5 h-5" /> Retake
        </button>
        <button onClick={() => navigate('/dashboard')}
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
                  <div>
                    <h3 className="text-xl font-black text-white">Share Your Result</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Let your network know how you did</p>
                  </div>
                  <button onClick={() => setShowShare(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Score card preview */}
                <div className={`p-5 rounded-2xl border space-y-1 ${passed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-950 border-slate-800'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CertPrep360</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${passed ? 'text-emerald-500' : 'text-orange-500'}`}>{passed ? '✅ Passed' : '📚 Practice'}</span>
                  </div>
                  <p className="text-2xl font-black text-white">{score}%</p>
                  <p className="text-xs text-slate-400">{certId} · {correctCount}/{questions.length} correct · {timeTaken}m</p>
                </div>

                {/* Platform grid */}
                <div className="grid grid-cols-3 gap-2">
                  {shareLinks.map(link => (
                    <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                      className={`${link.color} border text-white rounded-2xl py-3 px-2 text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105`}>
                      <span className="text-base">{link.emoji}</span>
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>

                {/* Copy + Native share */}
                <div className="flex gap-2">
                  <button onClick={handleCopy}
                    className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${
                      copied ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}>
                    {copied ? '✅ Copied!' : '📋 Copy Text'}
                  </button>
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button onClick={handleNativeShare}
                      className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                      📤 Share
                    </button>
                  )}
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
