
import { motion } from 'framer-motion';
import { 
  Trophy, 
  XCircle, 
  RotateCcw, 
  Home as HomeIcon, 
  Share2, 
  Clock, 
  Target,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { RESOURCES_DATA } from '../../data/resourcesData';

const ExamResults: React.FC = () => {
  const navigate = useNavigate();
  const { 
    questions, 
    answers, 
    resetExam, 
    startTime,
    certId,
    examId
  } = useExamStore();

  const certMetadata = RESOURCES_DATA[certId.toLowerCase()];

  // Calculate results
  let correctCount = 0;
  const domainPerformance: Record<string, { correct: number; total: number }> = {};

  questions.forEach((q, i) => {
    const userAns = answers[i];
    const domainName = q.domain || 'General';
    
    if (!domainPerformance[domainName]) {
      domainPerformance[domainName] = { correct: 0, total: 0 };
    }
    domainPerformance[domainName].total++;

    if (!userAns) return;

    let isCorrect = false;
    if (Array.isArray(userAns)) {
      if ([...userAns].sort().join('') === [...q.correct].sort().join('')) {
        isCorrect = true;
      }
    } else {
      if (userAns === q.correct) {
        isCorrect = true;
      }
    }

    if (isCorrect) {
      correctCount++;
      domainPerformance[domainName].correct++;
    }
  });

  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= (parseInt(certMetadata?.passingScore) || 72);
  const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000 / 60) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto space-y-12 py-12"
    >
      {/* Hero Result */}
      <div className="text-center space-y-6">
        <div className="relative inline-block">
          <motion.div
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", damping: 12 }}
            className={`w-32 h-32 mx-auto rounded-3xl flex items-center justify-center shadow-2xl ${passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
          >
            {passed ? <Trophy className="w-16 h-16" /> : <XCircle className="w-16 h-16" />}
          </motion.div>
          {passed && (
             <motion.div
               animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
               transition={{ repeat: Infinity, duration: 2 }}
               className="absolute inset-0 bg-emerald-500 blur-2xl -z-10 rounded-full"
             />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-extrabold tracking-tight">
            {passed ? 'Exam Passed!' : 'Requires Improvement'}
          </h1>
          <p className="text-slate-400 text-lg uppercase tracking-widest font-bold font-mono">
            {certId} • Practice Exam {examId}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              <Target className="w-6 h-6" />
            </div>
          </div>
          <div className={`text-4xl font-black ${passed ? 'text-emerald-500' : 'text-red-500'}`}>{score}%</div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Overall Score</p>
        </div>

        <div className="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="text-4xl font-black text-white">{correctCount} / {questions.length}</div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Correct Answers</p>
        </div>

        <div className="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="text-4xl font-black text-white">{timeTaken}m</div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Time Taken</p>
        </div>
      </div>

      {/* Domain Breakdown */}
      <div className="p-10 rounded-[2.5rem] bg-slate-900 border border-slate-800 space-y-10">
        <div className="space-y-2">
          <h3 className="text-2xl font-black flex items-center gap-3">
            Knowledge Domain Analysis
          </h3>
          <p className="text-slate-500 text-sm">Performance breakdown mapped to official certification domains.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {Object.entries(domainPerformance).map(([domain, data], i) => {
            const domainAccuracy = Math.round((data.correct / data.total) * 100);
            const isStrong = domainAccuracy >= 75;
            
            return (
              <motion.div 
                key={domain}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">Domain {i + 1}</span>
                    <h4 className="text-sm font-bold text-white leading-tight">{domain}</h4>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-black ${isStrong ? 'text-emerald-500' : 'text-orange-500'}`}>
                      {domainAccuracy}%
                    </span>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${domainAccuracy}%` }}
                      transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                      className={`h-full rounded-full ${
                        isStrong ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                      }`}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                    isStrong ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'
                  }`}>
                    {isStrong ? 'Strong' : 'Needs Review'}
                  </span>
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                    {data.correct} of {data.total} Questions
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
        <button
          onClick={() => {
            resetExam();
            navigate('/');
          }}
          className="w-full sm:w-auto px-10 py-5 bg-white text-slate-950 rounded-2xl font-black flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
        >
          <RotateCcw className="w-5 h-5" /> Retake Practice
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full sm:w-auto px-10 py-5 bg-slate-900 text-white border border-slate-800 rounded-2xl font-black flex items-center justify-center gap-3 transition-all hover:bg-slate-800"
        >
          <HomeIcon className="w-5 h-5" /> Back to Dashboard
        </button>
        <button className="w-full sm:w-auto px-10 py-5 text-slate-400 hover:text-white font-bold flex items-center justify-center gap-3 transition-colors">
          <Share2 className="w-5 h-5" /> Share Result
        </button>
      </div>
    </motion.div>
  );
};

export default ExamResults;
