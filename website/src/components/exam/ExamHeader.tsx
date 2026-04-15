
import { Clock, BookOpen, Pause, Play } from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';

const ExamHeader: React.FC = () => {
  const { 
    examId, 
    certId,
    timeLeft, 
    status, 
    toggleTimer, 
    studyMode, 
    setStudyMode,
    questions,
    answers
  } = useExamStore();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / questions.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest border border-orange-500/20">
              {certId}
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Practice Exam: {examId}</h1>
          </div>
          <p className="text-slate-500 text-sm">65 Questions • 130 Minutes • 72% Passing Score</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className={`text-3xl font-mono font-bold flex items-center gap-2 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              <Clock className="w-6 h-6 text-slate-400" />
              {formatTime(timeLeft)}
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Remaining</p>
          </div>

          <button
            onClick={toggleTimer}
            className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-slate-300 hover:text-white"
          >
            {status === 'paused' ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 py-4 border-y border-slate-800/50">
        <button
          onClick={() => setStudyMode(!studyMode)}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${
            studyMode 
            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
            : 'bg-slate-900 text-slate-500 border border-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Study Mode: {studyMode ? 'ON' : 'OFF'}
        </button>
        
        <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
          <div 
            className="h-full bg-orange-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(249,115,22,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
          {answeredCount} / {questions.length} DONE
        </span>
      </div>
    </div>
  );
};

export default ExamHeader;
