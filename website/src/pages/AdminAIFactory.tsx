import React, { useState, useEffect } from 'react';
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
  LayoutGrid,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService } from '../services/adminService';
import { RESOURCES_DATA } from '../data/resourcesData';
import type { JobStatus, QualityReport } from '../types/exam';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drafts, setDrafts] = useState<AIGeneratedQuestion[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [mode, setMode] = useState<'full' | 'topup' | 'enrich' | 'fix' | 'regenerate'>('full');
  const [examStatus, setExamStatus] = useState<{
    existing: number, 
    missing: number, 
    startFrom: number,
    missingNumbers: number[]
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [existingExams, setExistingExams] = useState<string[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  // Regenerate mode state
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [parseGuideResult, setParseGuideResult] = useState<any | null>(null);
  const [isParsingGuide, setIsParsingGuide] = useState(false);
  const [warnAcknowledged, setWarnAcknowledged] = useState(false);

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

  const handleModeSwitch = (newMode: 'full' | 'topup' | 'enrich' | 'fix' | 'regenerate') => {
    setMode(newMode);
    setExamStatus(null);
    setDrafts([]);
    setStatusMessage('');
    setJobId(null);
    setJobStatus(null);
    setQualityReport(null);
    setConfirmDelete(false);
    setParseGuideResult(null);
    setWarnAcknowledged(false);
    if (newMode === 'topup' || newMode === 'enrich' || newMode === 'fix' || newMode === 'regenerate') loadExistingExams(selectedCert);
  };

  const handleCertChange = (certId: string) => {
    setSelectedCert(certId);
    setExamStatus(null);
    setDrafts([]);
    if (mode === 'topup' || mode === 'enrich' || mode === 'fix' || mode === 'regenerate') loadExistingExams(certId);
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setExamStatus(null);
    try {
      const questions = await adminService.getQuestions(selectedCert, examId);
      const qs = Array.isArray(questions) ? questions : [];
      const existing = qs.length;
      const missing = Math.max(0, 65 - existing);

      // Extract existing question numbers (e.g. from SAA-C03-EXAM-04_Q005, get 5)
      const existingQNumbers = qs.map((q: any) => {
        const match = q.q_id.match(/_Q(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      }).filter((n): n is number => n !== null);

      // Find missing numbers in the 1-65 sequence
      const missingNumbers: number[] = [];
      for (let num = 1; num <= 65; num++) {
        if (!existingQNumbers.includes(num)) {
          missingNumbers.push(num);
        }
      }
      
      // If we somehow need to generate more than 65 (or if sequence is already full but missing is positive),
      // append sequential numbers beyond 65
      let nextNum = 66;
      while (missingNumbers.length < missing) {
        if (!existingQNumbers.includes(nextNum)) {
          missingNumbers.push(nextNum);
        }
        nextNum++;
      }

      setExamStatus({ 
        existing, 
        missing, 
        startFrom: existing + 1,
        missingNumbers 
      });
    } catch (err: any) {
      setExamStatus({ 
        existing: 0, 
        missing: 65, 
        startFrom: 1,
        missingNumbers: Array.from({ length: 65 }, (_, idx) => idx + 1)
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleGenerate = async () => {
    if (mode !== 'full') return;

    setJobId(null);
    setJobStatus(null);
    setQualityReport(null);
    setWarnAcknowledged(false);

    try {
      // Use the exam-guide batch pipeline for full generation
      const result = await adminService.startBatchGeneration(selectedCert, examId, false);
      setJobId(result.jobId);
      setJobStatus({
        job_id: result.jobId,
        cert_id: selectedCert,
        exam_id: examId,
        status: 'in_progress',
        questions_generated: 0,
        questions_skipped: 0,
        current_domain: '',
        started_at: new Date().toISOString(),
        completed_at: null,
        error: null,
      });
      toast.success('Generation started — exam-guide pipeline active');
    } catch (err: any) {
      // If exam already exists (409), offer to use regenerate mode
      if (err.message?.includes('409') || err.message?.includes('already has questions')) {
        toast.error('Exam already has questions. Use Regenerate mode to rebuild from scratch, or Top Up to fill missing slots.');
      } else {
        toast.error(`Failed to start generation: ${err.message}`);
      }
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
          exam_id: examId, // Ensure consistent exam_id
          cert_id: selectedCert // Ensure consistent cert_id
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
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiScanProgress, setAiScanProgress] = useState(0);

  const ARTIFACTS = /[a-z]{2,4}\s*$|\s+[a-z]{1,3}\s*$|\.\s*[a-z]{1,4}\s*$/;

  // Comprehensive issue detector for Fix mode
  const detectIssues = (qs: any[]) => {
    return qs.map(q => {
      const issues: string[] = [];
      const optionKeys = Object.keys(q.options || {});
      const optionValues = Object.values(q.options || {}) as string[];
      const correctField = String(q.correct || '');

      // Fewer than 4 options
      if (optionKeys.length < 4) issues.push(`only ${optionKeys.length} options`);

      // Multi-letter correct field (e.g. "AB", "A,B") — ambiguous
      if (correctField.length > 1 && /^[A-D,\s]+$/.test(correctField)) {
        issues.push(`multi-answer correct field: "${correctField}"`);
      }

      // Correct field references a non-existent option
      const singleCorrect = correctField.replace(/[^A-D]/g, '').charAt(0);
      if (singleCorrect && !optionKeys.includes(singleCorrect)) {
        issues.push(`correct answer "${correctField}" not in options`);
      }

      // Short or truncated question text
      if ((q.text || '').length < 60) issues.push('question text too short');

      // Text artifact (garbled trailing text)
      if (ARTIFACTS.test(q.text || '')) issues.push('text artifact detected');

      // Short or truncated options
      const shortOpts = optionKeys.filter(k => (q.options[k] || '').length < 10);
      if (shortOpts.length > 0) issues.push(`short options: ${shortOpts.join(', ')}`);

      // Duplicate option values
      const uniqueVals = new Set(optionValues.map(v => v.trim().toLowerCase()));
      if (uniqueVals.size < optionValues.length) issues.push('duplicate option values');

      // Missing or very short explanation
      if (!q.explanation || q.explanation.length < 100) issues.push('missing/short explanation');

      return issues.length > 0 ? { ...q, _issues: issues } : null;
    }).filter(Boolean) as any[];
  };

  const loadQuestionsForExam = async () => {
    setEnrichFixLoading(true);
    setEnrichFixResults([]);
    setScanIssues([]);
    try {
      const questions = await adminService.getQuestions(selectedCert, examId);
      const qs = Array.isArray(questions) ? questions : [];
      setEnrichFixQuestions(qs);
      if (mode === 'fix') {
        setScanIssues(detectIssues(qs));
      }
    } catch { setEnrichFixQuestions([]); }
    finally { setEnrichFixLoading(false); }
  };

  const handleTrimExam = async () => {
    try {
      const result = await adminService.trimExam(selectedCert, examId);
      toast.success(result.message);
      // Reload questions after trim
      loadQuestionsForExam();
    } catch (err: any) {
      toast.error(`Trim failed: ${err.message}`);
    }
  };

  // AI-powered scan: sends each question to Claude to detect typos, grammar, factual errors
  const handleAiScan = async () => {
    if (enrichFixQuestions.length === 0) return;
    setIsAiScanning(true);
    setAiScanProgress(0);
    // Start with structural issues already found
    const structuralIssues = detectIssues(enrichFixQuestions);
    const structuralIds = new Set(structuralIssues.map((q: any) => q.q_id));
    // AI scan the questions that passed structural check (concurrency 5)
    const toScan = enrichFixQuestions.filter(q => !structuralIds.has(q.q_id));
    const aiIssues: any[] = [];
    const concurrency = 5;
    for (let i = 0; i < toScan.length; i += concurrency) {
      const batch = toScan.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map(q => adminService.scanQuestion(selectedCert, q).then(r => ({ q, r })))
      );
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value.r.hasIssues) {
          aiIssues.push({ ...res.value.q, _issues: res.value.r.issues, _aiScan: true, _severity: res.value.r.severity });
        }
      }
      setAiScanProgress(Math.round(((i + batch.length) / toScan.length) * 100));
    }
    // Merge: structural issues + AI-detected issues
    const allIssues = [...structuralIssues, ...aiIssues];
    setScanIssues(allIssues);
    setIsAiScanning(false);
    toast.success(`AI scan complete — ${aiIssues.length} additional issues found`);
  };
  useEffect(() => {
    if (!jobId || jobStatus?.status === 'completed' || jobStatus?.status === 'failed' || jobStatus?.status === 'cancelled') return;
    const interval = setInterval(async () => {
      try {
        const status = await adminService.getJobStatus(jobId);
        setJobStatus(status);
        if (status.status === 'completed') {
          // Fetch quality report for regenerate and full modes
          if (mode === 'regenerate' || mode === 'full') {
            const report = await adminService.getQualityReport(examId);
            setQualityReport(report);
          }
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Job status poll error:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [jobId, jobStatus?.status, examId, mode]);

  // Top Up via batch pipeline — uses exam-guide diversity + dedup for missing slots
  const handleTopUpBatch = async () => {
    if (!examStatus || examStatus.missing === 0) return;
    setJobId(null);
    setJobStatus(null);
    setQualityReport(null);
    try {
      const result = await adminService.startBatchGeneration(selectedCert, examId, true);
      setJobId(result.jobId);
      setJobStatus({ job_id: result.jobId, cert_id: selectedCert, exam_id: examId, status: 'in_progress', questions_generated: 0, questions_skipped: 0, current_domain: '', started_at: new Date().toISOString(), completed_at: null, error: null });
      toast.success(`Top Up started — filling ${examStatus.missing} missing slots`);
    } catch (err: any) {
      toast.error(`Failed to start Top Up: ${err.message}`);
    }
  };

  const handleRegenerate = async () => {
    setConfirmDelete(false);
    setJobStatus(null);
    setQualityReport(null);
    setWarnAcknowledged(false);
    try {
      const result = await adminService.startRegeneration(selectedCert, examId);
      setJobId(result.jobId);
      setJobStatus({ job_id: result.jobId, cert_id: selectedCert, exam_id: examId, status: 'in_progress', questions_generated: 0, questions_skipped: 0, current_domain: '', started_at: new Date().toISOString(), completed_at: null, error: null });
      toast.success('Regeneration started');
    } catch (err: any) {
      toast.error(`Failed to start regeneration: ${err.message}`);
    }
  };

  const handleCancelJob = async () => {
    if (!jobId) return;
    try {
      await adminService.cancelJob(jobId);
      setJobStatus(prev => prev ? { ...prev, status: 'cancelled' } : null);
      toast.success('Job cancelled');
    } catch (err: any) {
      toast.error(`Failed to cancel: ${err.message}`);
    }
  };

  const handleParseGuide = async () => {
    setIsParsingGuide(true);
    setParseGuideResult(null);
    try {
      const result = await adminService.parseExamGuide(selectedCert);
      setParseGuideResult(result);
      toast.success(`Parsed ${result.taskStatementCount} task statements`);
    } catch (err: any) {
      toast.error(`Parse failed: ${err.message}`);
    } finally {
      setIsParsingGuide(false);
    }
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
      if (q._enriched) {
        fields.explanation = q.explanation;
        fields.resources = q.resources;
        if (q.primary_service) fields.primary_service = q.primary_service;
        if (q.scenario_type) fields.scenario_type = q.scenario_type;
      }
      if (q._fixed) {
        fields.text = q.text;
        fields.options = q.options;
        fields.correct = q.correct;
        fields.explanation = q.explanation;
        fields.resources = q.resources;
      }
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { id: 'full',       icon: Wand2,      label: 'Generate',   desc: 'New exam from scratch',        color: 'purple', active: 'bg-purple-600 border-purple-500 text-white', inactive: 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-purple-500/40' },
          { id: 'topup',      icon: RefreshCcw, label: 'Top Up',     desc: 'Fill missing questions',       color: 'blue',   active: 'bg-blue-600 border-blue-500 text-white',   inactive: 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-blue-500/40' },
          { id: 'enrich',     icon: Sparkles,   label: 'Enrich',     desc: 'Add explanations & resources', color: 'emerald', active: 'bg-emerald-600 border-emerald-500 text-white', inactive: 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-emerald-500/40' },
          { id: 'fix',        icon: Wrench,     label: 'Fix',        desc: 'Repair wording issues',        color: 'amber',  active: 'bg-amber-600 border-amber-500 text-white',  inactive: 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-amber-500/40' },
          { id: 'regenerate', icon: RotateCcw,  label: 'Regenerate', desc: 'Delete & rebuild from exam guide', color: 'rose', active: 'bg-rose-600 border-rose-500 text-white', inactive: 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-rose-500/40' },
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
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Exam ID</p>
              <input
                type="text"
                value={examId}
                onChange={(e) => setExamId(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm font-medium text-white"
                placeholder={`e.g. ${selectedCert}-EXAM-01`}
              />
              <p className="text-[9px] text-slate-600 uppercase tracking-widest">Uses exam-guide pipeline: diversity enforcement, deduplication, quality validation</p>
              {/* Cancel button while running */}
              {jobId && jobStatus?.status === 'in_progress' && (
                <button onClick={handleCancelJob}
                  className="w-full py-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-purple-500/40 hover:text-purple-400 transition-all">
                  Cancel Job
                </button>
              )}
              <button onClick={handleGenerate} disabled={!examId || jobStatus?.status === 'in_progress'}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-50">
                {jobStatus?.status === 'in_progress' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
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
                  {examStatus.missing > 0 && <p className="text-[9px] text-slate-500 normal-case font-medium mt-1">Uses exam-guide pipeline with diversity enforcement</p>}
                </div>
              )}
              {/* Cancel button while running */}
              {jobId && jobStatus?.status === 'in_progress' && (
                <button onClick={handleCancelJob}
                  className="w-full py-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-blue-500/40 hover:text-blue-400 transition-all">
                  Cancel Job
                </button>
              )}
              <button onClick={handleTopUpBatch} disabled={!examStatus || examStatus.missing === 0 || (jobStatus?.status === 'in_progress')}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-50">
                {jobStatus?.status === 'in_progress' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
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
                Structural Scan
              </button>
              {/* AI scan button — only shown after structural scan loads questions */}
              {enrichFixQuestions.length > 0 && (
                <button onClick={handleAiScan} disabled={isAiScanning || enrichFixLoading}
                  className="w-full py-3 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-purple-600/30 transition-all disabled:opacity-50">
                  {isAiScanning ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> AI Scanning... {aiScanProgress}%</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> AI Deep Scan (typos + grammar)</>
                  )}
                </button>
              )}
              {enrichFixQuestions.length > 0 && (
                <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest space-y-1">
                  <p>Total: {enrichFixQuestions.length}</p>
                  <p>Issues found: {scanIssues.length}</p>
                  {scanIssues.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {['only', 'multi-answer', 'not in options', 'too short', 'artifact', 'short options', 'duplicate', 'explanation'].map(category => {
                        const count = scanIssues.filter((q: any) => q._issues?.some((i: string) => i.includes(category))).length;
                        return count > 0 ? (
                          <p key={category} className="text-[9px] text-amber-300/70">
                            • {count}× {category === 'only' ? 'missing options (<4)' : category === 'multi-answer' ? 'multi-answer correct field' : category === 'not in options' ? 'invalid correct answer' : category === 'too short' ? 'short question text' : category === 'artifact' ? 'text artifacts' : category === 'short options' ? 'truncated options' : category === 'duplicate' ? 'duplicate options' : 'missing explanation'}
                          </p>
                        ) : null;
                      })}
                      {scanIssues.filter((q: any) => q._aiScan).length > 0 && (
                        <p className="text-[9px] text-purple-400/70">
                          • {scanIssues.filter((q: any) => q._aiScan).length}× typos/grammar/factual (AI detected)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Trim button — shown when exam has >65 questions */}
              {enrichFixQuestions.length > 65 && (
                <button onClick={handleTrimExam}
                  className="w-full py-3 bg-rose-600/20 border border-rose-500/30 text-rose-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-600/30 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                  Trim to 65 Questions (currently {enrichFixQuestions.length})
                </button>
              )}
              <button onClick={() => handleFix(scanIssues)} disabled={isGenerating || scanIssues.length === 0}
                className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-50">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                Fix {scanIssues.length} Issues
              </button>
            </div>
          )}

          {/* Regenerate controls */}
          {mode === 'regenerate' && (
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-4">

              {/* Parse Guide utility */}
              <button onClick={handleParseGuide} disabled={isParsingGuide}
                className="w-full py-3 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 disabled:opacity-50">
                {isParsingGuide ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                Parse Exam Guide
              </button>

              {parseGuideResult && (
                <div className="p-4 rounded-2xl border bg-blue-500/10 border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest space-y-1">
                  <p>Domains: {parseGuideResult.domainCount}</p>
                  <p>Task Statements: {parseGuideResult.taskStatementCount}</p>
                  <p>In-Scope Services: {parseGuideResult.inScopeServiceCount}</p>
                  <p>Out-of-Scope: {parseGuideResult.outOfScopeServiceCount}</p>
                </div>
              )}

              {/* Confirmation step */}
              {!confirmDelete && !jobId && (
                <button onClick={() => setConfirmDelete(true)}
                  className="w-full py-4 bg-rose-600/20 border border-rose-500/30 text-rose-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-rose-600/30 transition-all">
                  <RotateCcw className="w-4 h-4" />
                  Regenerate Exam
                </button>
              )}

              {confirmDelete && !jobId && (
                <div className="space-y-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                    ⚠ This will delete all existing questions for {examId} and regenerate from scratch.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={handleRegenerate}
                      className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 transition-all">
                      Confirm Delete & Regenerate
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Cancel button while running */}
              {jobId && jobStatus?.status === 'in_progress' && (
                <button onClick={handleCancelJob}
                  className="w-full py-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-rose-500/40 hover:text-rose-400 transition-all">
                  Cancel Job
                </button>
              )}
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
              {mode === 'regenerate' && 'Deletes all existing questions and rebuilds the exam from the official exam guide PDF with diversity enforcement.'}
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
                    {/* Show issues that were fixed */}
                    {mode === 'fix' && q._issues && q._issues.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {q._issues.map((issue: string, idx: number) => (
                          <span key={idx} className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">{issue}</span>
                        ))}
                      </div>
                    )}
                    {mode === 'fix' && !q._error && <p className="text-[10px] text-slate-300 leading-relaxed">{q.text}</p>}
                    {/* Show primary_service tag from enrich */}
                    {mode === 'enrich' && !q._error && q.primary_service && (
                      <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">{q.primary_service} • {q.scenario_type}</span>
                    )}
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

          {/* Generate pipeline output (uses batch job) */}
          {mode === 'full' && jobStatus && (
            <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wand2 className={`w-5 h-5 text-purple-500 ${jobStatus.status === 'in_progress' ? 'animate-pulse' : ''}`} />
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Generation Pipeline</h2>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                  jobStatus.status === 'completed' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                  jobStatus.status === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  jobStatus.status === 'cancelled' ? 'bg-slate-500/10 border-slate-500/20 text-slate-400' :
                  'bg-purple-500/10 border-purple-500/20 text-purple-400'
                }`}>{jobStatus.status}</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((jobStatus.questions_generated / 65) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span>{jobStatus.questions_generated} / 65 generated</span>
                  <span>{jobStatus.questions_skipped} skipped</span>
                </div>
                {jobStatus.current_domain && jobStatus.status === 'in_progress' && (
                  <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest animate-pulse">
                    Processing: {jobStatus.current_domain}
                  </p>
                )}
                {jobStatus.error && (
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Error: {jobStatus.error}</p>
                )}
              </div>
              {/* Quality Report on completion */}
              {qualityReport && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Quality Report</h3>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                      qualityReport.result === 'PASS' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                      qualityReport.result === 'WARN' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>{qualityReport.result}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Domain Balance</p>
                      <p className={`text-lg font-black mt-1 ${qualityReport.domain_balance_score > 0.05 ? 'text-red-400' : 'text-green-400'}`}>
                        {(qualityReport.domain_balance_score * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Service Diversity</p>
                      <p className={`text-lg font-black mt-1 ${qualityReport.service_diversity_score < 0.40 ? 'text-red-400' : 'text-green-400'}`}>
                        {(qualityReport.service_diversity_score * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Duplicate Rate</p>
                      <p className={`text-lg font-black mt-1 ${qualityReport.duplicate_rate > 0.02 ? 'text-red-400' : 'text-green-400'}`}>
                        {(qualityReport.duplicate_rate * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {qualityReport.failures.length > 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-1">
                      <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Failures</p>
                      {qualityReport.failures.map((f, i) => <p key={i} className="text-[10px] text-red-300">{f}</p>)}
                    </div>
                  )}
                  {qualityReport.warnings.length > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1">
                      <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Warnings</p>
                      {qualityReport.warnings.map((w, i) => <p key={i} className="text-[10px] text-amber-300">{w}</p>)}
                    </div>
                  )}
                  {qualityReport.result === 'WARN' && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={warnAcknowledged} onChange={e => setWarnAcknowledged(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-950 text-purple-500" />
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                        I acknowledge the warnings and want to publish anyway
                      </span>
                    </label>
                  )}
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest">
                    Questions are already stored in DynamoDB — no publish step needed.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Top Up pipeline output (reuses job status panel) */}
          {mode === 'topup' && jobStatus && (
            <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCcw className={`w-5 h-5 text-blue-500 ${jobStatus.status === 'in_progress' ? 'animate-spin' : ''}`} />
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Top Up Pipeline</h2>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                  jobStatus.status === 'completed' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                  jobStatus.status === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  jobStatus.status === 'cancelled' ? 'bg-slate-500/10 border-slate-500/20 text-slate-400' :
                  'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}>{jobStatus.status}</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((jobStatus.questions_generated / 65) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span>{jobStatus.questions_generated} generated</span>
                  <span>{jobStatus.questions_skipped} skipped</span>
                </div>
                {jobStatus.current_domain && jobStatus.status === 'in_progress' && (
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">
                    Processing: {jobStatus.current_domain}
                  </p>
                )}
                {jobStatus.error && (
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Error: {jobStatus.error}</p>
                )}
              </div>
              {jobStatus.status === 'completed' && (
                <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">
                  ✓ Top Up complete — {jobStatus.questions_generated} questions added
                </p>
              )}
            </div>
          )}

          {/* Regenerate pipeline output */}
          {mode === 'regenerate' && jobStatus && (
            <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] space-y-6">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RotateCcw className={`w-5 h-5 text-rose-500 ${jobStatus.status === 'in_progress' ? 'animate-spin' : ''}`} />
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Regeneration Pipeline</h2>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                  jobStatus.status === 'completed' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                  jobStatus.status === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  jobStatus.status === 'cancelled' ? 'bg-slate-500/10 border-slate-500/20 text-slate-400' :
                  'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}>{jobStatus.status}</span>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((jobStatus.questions_generated / 65) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span>{jobStatus.questions_generated} / 65 generated</span>
                  <span>{jobStatus.questions_skipped} skipped</span>
                </div>
                {jobStatus.current_domain && jobStatus.status === 'in_progress' && (
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest animate-pulse">
                    Processing: {jobStatus.current_domain}
                  </p>
                )}
                {jobStatus.error && (
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Error: {jobStatus.error}</p>
                )}
              </div>

              {/* Quality Report */}
              {qualityReport && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Quality Report</h3>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                      qualityReport.result === 'PASS' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                      qualityReport.result === 'WARN' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>{qualityReport.result}</span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Domain Balance</p>
                      <p className={`text-lg font-black mt-1 ${qualityReport.domain_balance_score > 0.05 ? 'text-red-400' : 'text-green-400'}`}>
                        {(qualityReport.domain_balance_score * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Service Diversity</p>
                      <p className={`text-lg font-black mt-1 ${qualityReport.service_diversity_score < 0.40 ? 'text-red-400' : 'text-green-400'}`}>
                        {(qualityReport.service_diversity_score * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Duplicate Rate</p>
                      <p className={`text-lg font-black mt-1 ${qualityReport.duplicate_rate > 0.02 ? 'text-red-400' : 'text-green-400'}`}>
                        {(qualityReport.duplicate_rate * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Domain breakdown table */}
                  {qualityReport.domain_breakdown.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Domain Breakdown</p>
                      {qualityReport.domain_breakdown.map(d => (
                        <div key={d.domain} className="flex items-center gap-3 text-[10px]">
                          <span className="text-slate-400 flex-1 truncate">{d.domain}</span>
                          <span className="text-slate-500 w-12 text-right">{(d.actual_pct * 100).toFixed(0)}%</span>
                          <span className="text-slate-600 w-12 text-right">/{(d.target_pct * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Failures */}
                  {qualityReport.failures.length > 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-1">
                      <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Failures</p>
                      {qualityReport.failures.map((f, i) => (
                        <p key={i} className="text-[10px] text-red-300">{f}</p>
                      ))}
                    </div>
                  )}

                  {/* Warnings */}
                  {qualityReport.warnings.length > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1">
                      <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Warnings</p>
                      {qualityReport.warnings.map((w, i) => (
                        <p key={i} className="text-[10px] text-amber-300">{w}</p>
                      ))}
                    </div>
                  )}

                  {/* Uncovered services */}
                  {qualityReport.uncovered_services.length > 0 && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                        Uncovered Services ({qualityReport.uncovered_services.length})
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {qualityReport.uncovered_services.slice(0, 10).join(', ')}
                        {qualityReport.uncovered_services.length > 10 ? ` +${qualityReport.uncovered_services.length - 10} more` : ''}
                      </p>
                    </div>
                  )}

                  {/* WARN acknowledgment checkbox */}
                  {qualityReport.result === 'WARN' && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={warnAcknowledged} onChange={e => setWarnAcknowledged(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-950 text-amber-500" />
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                        I acknowledge the warnings and want to publish anyway
                      </span>
                    </label>
                  )}

                  {/* Publish button */}
                  <div className="pt-2">
                    <button
                      disabled={
                        qualityReport.result === 'FAIL' ||
                        (qualityReport.result === 'WARN' && !warnAcknowledged) ||
                        isPublishing
                      }
                      onClick={handlePublish}
                      className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:scale-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                      {qualityReport.result === 'FAIL' ? 'Cannot Publish — Quality Check Failed' : 'Publish Exam'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Regenerate empty state (no job started yet) */}
          {mode === 'regenerate' && !jobStatus && (
            <div className="h-[500px] bg-slate-950/20 border-2 border-dashed border-rose-900/30 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center border border-rose-900/30 text-rose-900">
                <RotateCcw className="w-8 h-8" />
              </div>
              <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Regenerate Mode</p>
              <p className="text-xs text-slate-600 max-w-xs">Select an exam and click "Regenerate Exam" to delete and rebuild from the official exam guide.</p>
            </div>
          )}

          {/* Empty state */}
          {!jobStatus && drafts.length === 0 && enrichFixResults.length === 0 && mode !== 'regenerate' && (
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
