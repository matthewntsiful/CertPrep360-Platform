import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  RefreshCcw, 
  Wand2, 
  Trash2, 
  CheckCircle2, 
  Sparkles,
  Wrench,
  Loader2,
  Info,
  Rocket,
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drafts, setDrafts] = useState<AIGeneratedQuestion[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [mode, setMode] = useState<'full' | 'topup' | 'enrich' | 'fix'>('full');
  const [examStatus, setExamStatus] = useState<{existing: number, missing: number, startFrom: number} | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [existingExams, setExistingExams] = useState<string[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  const loadExistingExams = async (certId: string) => {
    setLoadingExams(true);
    setExamStatus(null);
    try {
      const questions = await adminService.getQuestions(certId);
      const exams = [...new Set((Array.isArray(questions) ? questions : []).map((q: any) => q.exam_id).filter(Boolean))].sort();
      setExistingExams(exams);
      if (exams.length > 0) setExamId(exams[0]);
    } catch {
      setExistingExams([]);
    } finally {
      setLoadingExams(false);
    }
  };

  const handleModeSwitch = (newMode: 'full' | 'topup' | 'enrich' | 'fix') => {
    setMode(newMode);
    setExamStatus(null);
    setDrafts([]);
    setStatusMessage('');
    if (newMode === 'topup' || newMode === 'enrich' || newMode === 'fix') loadExistingExams(selectedCert);
  };

  const handleCertChange = (certId: string) => {
    setSelectedCert(certId);
    setExamStatus(null);
    setDrafts([]);
    if (mode === 'topup' || mode === 'enrich' || mode === 'fix') loadExistingExams(certId);
  };

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
    const iterations = totalToGenerate;

    try {
      const concurrency = 5;
      let completed = 0;
      
      for (let i = 0; i < iterations; i += concurrency) {
        const batchEnd = Math.min(i + concurrency, iterations);
        const promises = [];
        
        for (let j = i; j < batchEnd; j++) {
          const domainObj = blueprint.domains[j % blueprint.domains.length];
          promises.push(
            adminService.generateAIContent({
              certId: selectedCert,
              count: 1,
              domain: domainObj.name,
              topic: topic || undefined
            }).then((response: any) => {
              if (response.questions) {
                return response.questions.map((q: any) => ({
                  ...q,
                  exam_id: examId,
                  q_id: `${examId}_Q${String(startFrom + j).padStart(3, '0')}`
                }));
              }
              return [];
            })
          );
        }
        
        setStatusMessage(`Manufacturing Q${String(startFrom + i).padStart(3, '0')} - Q${String(startFrom + batchEnd - 1).padStart(3, '0')}...`);
        const results = await Promise.allSettled(promises);
        
        const newDrafts = results
          .filter((res): res is PromiseFulfilledResult<any[]> => res.status === 'fulfilled')
          .flatMap(res => res.value);
          
        setDrafts(prev => [...prev, ...newDrafts]);
        
        completed += (batchEnd - i);
        setProgress(Math.round((completed / iterations) * 100));
      }

      setProgress(100);
      const msg = `Manufacturing Complete — ${totalToGenerate} questions ready.`;
      setStatusMessage(msg);
      toast.success(msg);
    } catch (err: any) {
      console.error("Generation failed:", err);
      const msg = `Error: ${err.message}`;
      setStatusMessage(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (drafts.length === 0) return;
    
    setIsPublishing(true);
    setStatusMessage("Injecting into DynamoDB...");
    
    try {
      for (const q of drafts) {
        await adminService.upsertQuestion({
          ...q,
          exam_id: examId // Ensure consistent exam_id
        });
      }
      setStatusMessage(`Success: ${drafts.length} questions published.`);
      toast.success(`${drafts.length} questions published live!`);
      setDrafts([]);
      setProgress(0);
    } catch (err: any) {
      toast.error(`Publishing failed: ${err.message}`);
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // Enrich & Fix state
  const [enrichFixQuestions, setEnrichFixQuestions] = useState<any[]>([]);
  const [enrichFixLoading, setEnrichFixLoading] = useState(false);
  const [enrichFixProgress, setEnrichFixProgress] = useState(0);
  const [enrichFixStatus, setEnrichFixStatus] = useState('');
  const [enrichFixResults, setEnrichFixResults] = useState<any[]>([]);
  const [forceEnrich, setForceEnrich] = useState(false);
  const [scanIssues, setScanIssues] = useState<any[]>([]);

  const ARTIFACTS = /[a-z]{2,4}\s*$|\s+[a-z]{1,3}\s*$|\.\s*[a-z]{1,4}\s*$/;

  const loadQuestionsForExam = async () => {
    setEnrichFixLoading(true);
    setEnrichFixResults([]);
    setScanIssues([]);
    try {
      const questions = await adminService.getQuestions(selectedCert, examId);
      const qs = Array.isArray(questions) ? questions : [];
      setEnrichFixQuestions(qs);
      if (mode === 'fix') {
        const issues = qs.filter(q => {
          const hasArtifact = ARTIFACTS.test(q.text || '');
          const hasShortOption = Object.values(q.options || {}).some((v: any) => v.length < 10);
          const hasShortText = (q.text || '').length < 60;
          return hasArtifact || hasShortOption || hasShortText;
        });
        setScanIssues(issues);
      }
    } catch { setEnrichFixQuestions([]); }
    finally { setEnrichFixLoading(false); }
  };

  const handleEnrich = async () => {
    const toProcess = forceEnrich
      ? enrichFixQuestions
      : enrichFixQuestions.filter(q =>
          !q.explanation || q.explanation.length < 300 || !q.resources?.length
        );
    if (toProcess.length === 0) { setEnrichFixStatus('All questions already have rich explanations. Enable Force Re-enrich to override.'); return; }
    setIsGenerating(true);
    setEnrichFixProgress(0);
    setEnrichFixResults([]);
    const results: any[] = [];
    for (let i = 0; i < toProcess.length; i++) {
      setEnrichFixProgress(Math.round((i / toProcess.length) * 100));
      setEnrichFixStatus(`Enriching Q${i + 1}/${toProcess.length}: ${toProcess[i].q_id}...`);
      try {
        const enriched = await adminService.enrichQuestion(selectedCert, toProcess[i]);
        results.push({ ...toProcess[i], ...enriched, _enriched: true });
      } catch { results.push({ ...toProcess[i], _error: true }); }
    }
    setEnrichFixProgress(100);
    setEnrichFixStatus(`Enrichment complete — ${results.filter(r => !r._error).length} questions ready.`);
    setEnrichFixResults(results);
    setIsGenerating(false);
  };

  const handleFix = async (questionsToFix: any[]) => {
    if (questionsToFix.length === 0) return;
    setIsGenerating(true);
    setEnrichFixProgress(0);
    setEnrichFixResults([]);
    const results: any[] = [];
    for (let i = 0; i < questionsToFix.length; i++) {
      setEnrichFixProgress(Math.round((i / questionsToFix.length) * 100));
      setEnrichFixStatus(`Fixing Q${i + 1}/${questionsToFix.length}: ${questionsToFix[i].q_id}...`);
      try {
        const fixed = await adminService.fixQuestion(selectedCert, questionsToFix[i]);
        results.push({ ...questionsToFix[i], ...fixed, _fixed: true });
      } catch { results.push({ ...questionsToFix[i], _error: true }); }
    }
    setEnrichFixProgress(100);
    setEnrichFixStatus(`Fix complete — ${results.filter(r => !r._error).length} questions ready.`);
    setEnrichFixResults(results);
    setIsGenerating(false);
  };

  const handlePublishEnrichFix = async () => {
    setIsPublishing(true);
    let count = 0;
    for (const q of enrichFixResults.filter(r => !r._error)) {
      const fields: any = {};
      if (q._enriched) { fields.explanation = q.explanation; fields.resources = q.resources; }
      if (q._fixed) { fields.text = q.text; fields.options = q.options; fields.explanation = q.explanation; fields.resources = q.resources; }
      await adminService.partialUpdateQuestion(q.q_id, q.cert_id, q.exam_id, fields, q.SK || q.sk);
      count++;
    }
    toast.success(`${count} questions updated successfully!`);
    setEnrichFixResults([]);
    setEnrichFixStatus('');
    setIsPublishing(false);
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-[10px] font-black uppercase tracking-[0.2em] border border-purple-500/20">AI Content Lab</span>
        <span className="text-slate-600">/</span>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sonnet 4.5 Tier</span>
      </div>
      <h1 className="text-4xl font-black tracking-tighter text-white">AI Content Factory</h1>

      {/* TOP BAR — Cert + Exam Selector */}
      <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Certification</label>
          <select
            value={selectedCert}
            onChange={(e) => handleCertChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 cursor-pointer"
          >
            {Object.keys(BLUEPRINTS).map(id => (
              <option key={id} value={id}>{id} — {BLUEPRINTS[id].name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
            {mode === 'full' ? 'New Exam ID' : 'Select Exam'}
          </label>
          {mode === 'full' ? (
            <div className="relative">
              <input
                type="text"
                value={examId}
                onChange={(e) => setExamId(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm font-medium text-white"
                placeholder={`e.g. ${selectedCert}-EXAM-${String((existingExams.length || 0) + 1).padStart(2,'0')}`}
              />
              {existingExams.length > 0 && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                  Next: {selectedCert}-EXAM-{String(existingExams.length + 1).padStart(2,'0')}
                </span>
              )}
            </div>
          ) : (
            <select
              value={examId}
              onChange={(e) => { setExamId(e.target.value); setExamStatus(null); setEnrichFixQuestions([]); setScanIssues([]); setEnrichFixResults([]); }}
              disabled={loadingExams}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 cursor-pointer disabled:opacity-50"
            >
              {loadingExams && <option>Loading...</option>}
              {!loadingExams && existingExams.length === 0 && <option>No exams found</option>}
              {existingExams.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* MODE CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { id: 'full',   icon: Wand2,     label: 'Generate',  desc: 'New exam from scratch',        color: 'purple', active: 'bg-purple-600 border-purple-500 text-white', inactive: 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-purple-500/40' },
          { id: 'topup',  icon: RefreshCcw, label: 'Top Up',   desc: 'Fill missing questions',       color: 'blue',   active: 'bg-blue-600 border-blue-500 text-white',   inactive: 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-blue-500/40' },
          { id: 'enrich', icon: Sparkles,  label: 'Enrich',    desc: 'Add explanations & resources', color: 'emerald', active: 'bg-emerald-600 border-emerald-500 text-white', inactive: 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-emerald-500/40' },
          { id: 'fix',    icon: Wrench,    label: 'Fix',       desc: 'Repair wording issues',        color: 'amber',  active: 'bg-amber-600 border-amber-500 text-white',  inactive: 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-amber-500/40' },
        ].map(m => (
          <button key={m.id} onClick={() => handleModeSwitch(m.id as any)}
            className={`p-5 rounded-[2rem] border transition-all text-left space-y-3 ${ mode === m.id ? m.active : m.inactive }`}
          >
            <m.icon className="w-6 h-6" />
            <div>
              <p className="text-sm font-black uppercase tracking-widest">{m.label}</p>
              <p className={`text-[10px] font-medium mt-0.5 ${ mode === m.id ? 'text-white/70' : 'text-slate-600' }`}>{m.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left — Controls */}
        <div className="space-y-4">

          {/* Generate controls */}
          {mode === 'full' && (
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Focus Topic (Optional)</p>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white min-h-[100px]"
                placeholder="e.g. Focus on S3 Lifecycle and DynamoDB replication..."
              />
              <button onClick={handleGenerate} disabled={isGenerating}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-50">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Generate 65 Questions
              </button>
            </div>
          )}

          {/* Top Up controls */}
          {mode === 'topup' && (
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-4">
              <button onClick={handleCheckStatus} disabled={isChecking}
                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 disabled:opacity-50">
                {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                Check Status
              </button>
              {examStatus && (
                <div className={`p-4 rounded-2xl border text-[10px] font-bold uppercase tracking-widest space-y-1 ${
                  examStatus.missing === 0 ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                  <p>Existing: {examStatus.existing} / 65</p>
                  <p>Missing: {examStatus.missing}</p>
                  {examStatus.missing > 0 && <p>Will fill: Q{String(examStatus.startFrom).padStart(3,'0')} → Q{String(examStatus.startFrom + examStatus.missing - 1).padStart(3,'0')}</p>}
                </div>
              )}
              <button onClick={handleGenerate} disabled={isGenerating || !examStatus || examStatus.missing === 0}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-50">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                Fill {examStatus?.missing ?? '?'} Questions
              </button>
            </div>
          )}

          {/* Enrich controls */}
          {mode === 'enrich' && (
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-4">
              <button onClick={loadQuestionsForExam} disabled={enrichFixLoading}
                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 disabled:opacity-50">
                {enrichFixLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                Scan Quality
              </button>
              {enrichFixQuestions.length > 0 && (
                <div className="p-4 rounded-2xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest space-y-1">
                  <p>Total: {enrichFixQuestions.length}</p>
                  <p>Need enrichment: {forceEnrich ? enrichFixQuestions.length : enrichFixQuestions.filter(q => !q.explanation || q.explanation.length < 300 || !q.resources?.length).length}</p>
                </div>
              )}
              {/* Force Re-enrich toggle */}
              <button type="button" onClick={() => setForceEnrich(!forceEnrich)}
                className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                  forceEnrich
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                }`}>
                {forceEnrich ? '⚡ Force Re-enrich: ON — All 65 questions' : 'Force Re-enrich All (override threshold)'}
              </button>
              <button onClick={handleEnrich} disabled={isGenerating || enrichFixQuestions.length === 0}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-50">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {forceEnrich ? `Re-enrich All ${enrichFixQuestions.length} Questions` : 'Enrich Questions'}
              </button>
            </div>
          )}

          {/* Fix controls */}
          {mode === 'fix' && (
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-4">
              <button onClick={loadQuestionsForExam} disabled={enrichFixLoading}
                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 disabled:opacity-50">
                {enrichFixLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                Scan for Issues
              </button>
              {enrichFixQuestions.length > 0 && (
                <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest space-y-1">
                  <p>Total: {enrichFixQuestions.length}</p>
                  <p>Issues found: {scanIssues.length}</p>
                </div>
              )}
              <button onClick={() => handleFix(scanIssues)} disabled={isGenerating || scanIssues.length === 0}
                className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-50">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                Fix {scanIssues.length} Issues
              </button>
            </div>
          )}

          {/* Info */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
              {mode === 'full' && 'Generates all 65 questions for a brand new exam.'}
              {mode === 'topup' && 'Fills only the missing questions in an existing exam.'}
              {mode === 'enrich' && 'Adds detailed explanations and AWS docs. Question text is never changed.'}
              {mode === 'fix' && 'Rewrites questions with wording issues. Correct answer is never changed.'}
            </p>
          </div>
        </div>

        {/* Right — Output */}
        <div className="lg:col-span-2 space-y-6">

          {/* Generate / TopUp pipeline */}
          {(mode === 'full' || mode === 'topup') && (isGenerating || drafts.length > 0) && (
            <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCcw className={`w-5 h-5 text-blue-500 ${isGenerating ? 'animate-spin' : ''}`} />
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Pipeline</h2>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{drafts.length} / {mode === 'topup' && examStatus ? examStatus.missing : 65}</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />
                </div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">{statusMessage}</p>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                <AnimatePresence initial={false}>
                  {drafts.map((q, i) => (
                    <motion.div key={q.q_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      className="p-5 bg-slate-950 border border-slate-800/50 rounded-2xl space-y-3 group">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Draft #{i+1} • {q.domain}</span>
                        <Trash2 className="w-3.5 h-3.5 text-slate-600 hover:text-red-500 cursor-pointer" onClick={() => setDrafts(drafts.filter(d => d.q_id !== q.q_id))} />
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{q.text}</p>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.entries(q.options).map(([key, value]) => (
                          <div key={key} className={`p-3 rounded-xl border text-[10px] font-medium ${
                            q.correct === key ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}><span className="font-black mr-2 opacity-50">{key}.</span>{value as React.ReactNode}</div>
                        ))}
                      </div>
                      <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Explanation</p>
                        <p className="text-[10px] text-slate-400">{q.explanation}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {drafts.length > 0 && !isGenerating && (
                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button 
                    onClick={handlePublish} 
                    disabled={isPublishing}
                    className="flex items-center gap-3 px-10 py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPublishing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Rocket className="w-4 h-4" />
                    )}
                    {isPublishing ? 'Publishing...' : 'Deploy to Catalog'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Enrich / Fix pipeline */}
          {(mode === 'enrich' || mode === 'fix') && (isGenerating || enrichFixResults.length > 0) && (
            <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {mode === 'enrich' ? <Sparkles className="w-5 h-5 text-emerald-500" /> : <Wrench className="w-5 h-5 text-amber-500" />}
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">{mode === 'enrich' ? 'Enrichment' : 'Fix'} Pipeline</h2>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{enrichFixResults.length} processed</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${enrichFixProgress}%` }}
                    className={`h-full rounded-full ${mode === 'enrich' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">{enrichFixStatus}</p>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {enrichFixResults.map((q) => (
                  <div key={q.q_id} className={`p-4 rounded-2xl border space-y-2 ${
                    q._error ? 'bg-red-500/5 border-red-500/20' : mode === 'enrich' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{q.q_id} • {q.domain}</span>
                      {q._error ? <span className="text-[9px] text-red-400 font-bold">Failed</span> : <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                    </div>
                    {mode === 'fix' && !q._error && <p className="text-[10px] text-slate-300 leading-relaxed">{q.text}</p>}
                    {!q._error && <p className="text-[10px] text-slate-400 leading-relaxed">{q.explanation}</p>}
                  </div>
                ))}
              </div>
              {enrichFixResults.length > 0 && !isGenerating && (
                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button 
                    onClick={handlePublishEnrichFix} 
                    disabled={isPublishing}
                    className="flex items-center gap-3 px-10 py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPublishing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Rocket className="w-4 h-4" />
                    )}
                    {isPublishing ? 'Publishing...' : 'Publish Updates'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!isGenerating && drafts.length === 0 && enrichFixResults.length === 0 && (
            <div className="h-[500px] bg-slate-950/20 border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-700">
                <LayoutGrid className="w-8 h-8" />
              </div>
              <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Workspace Empty</p>
              <p className="text-xs text-slate-600 max-w-xs">Select a mode above and configure the options to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAIFactory;
