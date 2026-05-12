import React, { useState } from 'react';
import { 
  Wand2, 
  Settings, 
  RefreshCcw, 
  CheckCircle2, 
  Loader2,
  Trash2,
  Rocket,
  Info,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService } from '../services/adminService';
import { RESOURCES_DATA } from '../data/resourcesData';

interface AIGeneratedQuestion {
  q_id: string;
  cert_id: string;
  type: string;
  domain: string;
  text: string;
  options: Record<string, string>;
  correct: string;
  explanation: string;
  resources: Array<{type: string, url: string}>;
}

const BLUEPRINTS = Object.keys(RESOURCES_DATA).reduce((acc: any, key) => {
  const cert = RESOURCES_DATA[key];
  acc[cert.code] = {
    name: cert.title,
    domains: cert.domains.map(d => ({ name: d.name, weight: d.percent / 100 }))
  };
  return acc;
}, {});

const AdminAIFactory: React.FC = () => {
  const [selectedCert, setSelectedCert] = useState("SAA-C03");
  const [examId, setExamId] = useState("SAA-C03-EXAM-04");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drafts, setDrafts] = useState<AIGeneratedQuestion[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [mode, setMode] = useState<'full' | 'topup'>('full');
  const [examStatus, setExamStatus] = useState<{existing: number, missing: number, startFrom: number} | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setExamStatus(null);
    try {
      const questions = await adminService.getQuestions(selectedCert, examId);
      const existing = Array.isArray(questions) ? questions.length : 0;
      const missing = Math.max(0, 65 - existing);
      setExamStatus({ existing, missing, startFrom: existing + 1 });
    } catch (err: any) {
      setExamStatus({ existing: 0, missing: 65, startFrom: 1 });
    } finally {
      setIsChecking(false);
    }
  };

  const handleGenerate = async () => {
    const startFrom = mode === 'topup' && examStatus ? examStatus.startFrom : 1;
    const totalToGenerate = mode === 'topup' && examStatus ? examStatus.missing : 65;

    if (totalToGenerate === 0) {
      setStatusMessage("Exam already has 65 questions. Nothing to generate.");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setDrafts([]);
    setStatusMessage("Initializing Blueprint Engine...");

    const blueprint = BLUEPRINTS[selectedCert];
    const batchSize = 1;
    const iterations = totalToGenerate;

    try {
      for (let i = 0; i < iterations; i++) {
        const progressPercent = Math.round((i / iterations) * 100);
        setProgress(progressPercent);

        const domainObj = blueprint.domains[i % blueprint.domains.length];
        setStatusMessage(`Manufacturing Q${String(startFrom + i).padStart(3, '0')} / ${String(startFrom + totalToGenerate - 1).padStart(3, '0')}: ${domainObj.name}...`);

        const response = await adminService.generateAIContent({
          certId: selectedCert,
          count: batchSize,
          domain: domainObj.name,
          topic: topic || undefined
        });

        if (response.questions) {
          const mappedQuestions = response.questions.map((q: any, idx: number) => ({
            ...q,
            exam_id: examId,
            q_id: `${examId}_Q${String(startFrom + i + idx).padStart(3, '0')}`
          }));
          setDrafts(prev => [...prev, ...mappedQuestions]);
        }
      }

      setProgress(100);
      setStatusMessage(`Manufacturing Complete — ${totalToGenerate} questions ready.`);
    } catch (err: any) {
      console.error("Generation failed:", err);
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm(`Are you sure you want to publish ${drafts.length} questions to the live catalog?`)) return;
    
    setIsGenerating(true);
    setStatusMessage("Injecting into DynamoDB...");
    
    try {
      for (const q of drafts) {
        await adminService.upsertQuestion({
          ...q,
          exam_id: examId // Ensure consistent exam_id
        });
      }
      alert("Exam Set Successfully Deployed!");
      setDrafts([]);
      setProgress(0);
      setStatusMessage("");
    } catch (err: any) {
      alert("Publishing failed: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-[10px] font-black uppercase tracking-[0.2em] border border-purple-500/20">
              AI Content Lab
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sonnet 4.5 Tier</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white">Full Exam Factory</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] space-y-8">
            <div className="flex items-center gap-3 text-white">
              <Settings className="w-5 h-5 text-purple-500" />
              <h2 className="text-sm font-black uppercase tracking-widest">Blueprint Parameters</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Certification</label>
                <select 
                  value={selectedCert}
                  onChange={(e) => setSelectedCert(e.target.value)}
                  className="w-full bg-slate-950 border-slate-800 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 focus:border-purple-500/50 transition-all cursor-pointer"
                >
                  {Object.keys(BLUEPRINTS).map(id => (
                    <option key={id} value={id}>{id} - {BLUEPRINTS[id].name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Exam Identifier (SK Prefix)</label>
                <input 
                  type="text" 
                  value={examId}
                  onChange={(e) => setExamId(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border-slate-800 rounded-2xl px-6 py-4 text-sm font-medium text-white focus:border-purple-500/50 transition-all"
                  placeholder="e.g. SAA-C03-EXAM-04"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Focus Topic (Optional)</label>
                <textarea 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-slate-950 border-slate-800 rounded-2xl px-6 py-4 text-sm font-medium text-white focus:border-purple-500/50 transition-all min-h-[100px]"
                  placeholder="e.g. Focus on S3 Lifecycle Policies and DynamoDB replication..."
                />
              </div>

              {/* Mode Toggle */}
              <div className="flex rounded-2xl overflow-hidden border border-slate-800">
                <button
                  onClick={() => { setMode('full'); setExamStatus(null); }}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                    mode === 'full' ? 'bg-purple-600 text-white' : 'bg-slate-950 text-slate-500 hover:text-slate-300'
                  }`}
                >Full Set</button>
                <button
                  onClick={() => setMode('topup')}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                    mode === 'topup' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-500 hover:text-slate-300'
                  }`}
                >Top Up</button>
              </div>

              {/* Top Up: Check Status */}
              {mode === 'topup' && (
                <div className="space-y-3">
                  <button
                    onClick={handleCheckStatus}
                    disabled={isChecking}
                    className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all disabled:opacity-50"
                  >
                    {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                    Check Exam Status
                  </button>
                  {examStatus && (
                    <div className={`p-4 rounded-2xl border text-[10px] font-bold uppercase tracking-widest space-y-1 ${
                      examStatus.missing === 0
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      <p>Existing: {examStatus.existing} / 65</p>
                      <p>Missing: {examStatus.missing} questions</p>
                      {examStatus.missing > 0 && <p>Will generate: Q{String(examStatus.startFrom).padStart(3,'0')} → Q{String(examStatus.startFrom + examStatus.missing - 1).padStart(3,'0')}</p>}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || (mode === 'topup' && (!examStatus || examStatus.missing === 0))}
                className="w-full py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-purple-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                {mode === 'full' ? 'Generate 65-Question Set' : `Fill ${examStatus?.missing ?? '?'} Missing Questions`}
              </button>
            </div>
          </div>

          <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
            <div className="flex items-start gap-4">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                Full Set generates all 65 questions from scratch. Top Up checks existing questions and fills only the gaps — safe to run on partially complete exams.
              </p>
            </div>
          </div>
        </div>

        {/* Manufacturing Progress & drafts */}
        <div className="lg:col-span-2 space-y-6">
          {(isGenerating || drafts.length > 0) && (
            <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCcw className={`w-5 h-5 text-blue-500 ${isGenerating ? 'animate-spin' : ''}`} />
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Manufacturing Pipeline</h2>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  {drafts.length} / {mode === 'topup' && examStatus ? examStatus.missing : 65} Questions
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-4">
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                  />
                </div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">
                  {statusMessage}
                </p>
              </div>

              {/* Draft List */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {drafts.map((q, i) => (
                    <motion.div 
                      key={q.q_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-5 bg-slate-950 border border-slate-800/50 rounded-2xl space-y-3 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Draft #{i+1} • {q.domain}</span>
                        <div className="flex items-center gap-2">
                           <CheckCircle2 className="w-3.5 h-3.5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                           <Trash2 className="w-3.5 h-3.5 text-slate-600 hover:text-red-500 cursor-pointer transition-colors" onClick={() => setDrafts(drafts.filter(d => d.q_id !== q.q_id))} />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-xs font-medium text-slate-300 leading-relaxed font-outfit">{q.text}</p>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {Object.entries(q.options).map(([key, value]) => (
                            <div 
                              key={key} 
                              className={`p-3 rounded-xl border text-[10px] font-medium leading-relaxed ${
                                q.correct === key 
                                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-400'
                              }`}
                            >
                              <span className="font-black mr-2 opacity-50">{key}.</span> {value as React.ReactNode}
                            </div>
                          ))}
                        </div>
                        
                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                          <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 block mb-1">Explanation</span>
                          <p className="text-[10px] text-slate-400 leading-relaxed">{q.explanation}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {drafts.length > 0 && !isGenerating && (
                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button 
                    onClick={handlePublish}
                    className="flex items-center gap-3 px-10 py-5 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-white/10 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Rocket className="w-5 h-5" /> Deploy Set to Catalog
                  </button>
                </div>
              )}
            </div>
          )}

          {!isGenerating && drafts.length === 0 && (
            <div className="h-[600px] bg-slate-950/20 border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center justify-center gap-6 p-20 text-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-700">
                <LayoutGrid className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-500 uppercase tracking-widest">Pipeline Empty</h3>
                <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto">Select a blueprint and trigger the engine to begin manufacturing full exam sets.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAIFactory;
