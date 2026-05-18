import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Plus, 
  Filter, 
  Edit2, 
  Trash2, 
  Loader2,
  Database,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  X,
  Save,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService } from '../services/adminService';
import { RESOURCES_DATA } from '../data/resourcesData';

const normalizeOptions = (options: any): string[] => {
  if (Array.isArray(options)) return options;
  if (options && typeof options === 'object') {
    // Handle legacy object format { A: "text", B: "text", ... }
    return [options.A, options.B, options.C, options.D].filter(v => v !== undefined);
  }
  return ["", "", "", ""];
};

const AdminContentManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCert, setSelectedCert] = useState("all");
  const [expandedCerts, setExpandedCerts] = useState<Record<string, boolean>>({});
  const [expandedExams, setExpandedExams] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: rawQuestions, isLoading: loading, refetch } = useQuery<any[]>({
    queryKey: ['adminQuestions'],
    queryFn: () => adminService.getQuestions(),
  });

  const questions: any[] = useMemo(() => {
    if (!rawQuestions) return [];
    return rawQuestions.map((q: any) => ({
      ...q,
      options: normalizeOptions(q.options)
    }));
  }, [rawQuestions]);

  useEffect(() => {
    if (questions.length > 0 && Object.keys(expandedCerts).length === 0 && selectedCert === "all") {
      const firstCert = questions[0].cert_id;
      if (firstCert) setExpandedCerts({ [firstCert]: true });
    }
  }, [questions, expandedCerts, selectedCert]);

  // UX Fix: Auto-expand the selected certification so users see the questions immediately
  useEffect(() => {
    if (selectedCert !== "all") {
      setExpandedCerts(prev => ({ ...prev, [selectedCert]: true }));
    }
  }, [selectedCert]);

  const filteredQuestions = questions.filter((q: any) => {
    const matchesSearch = q.text?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          q.q_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCert = selectedCert === "all" || q.cert_id === selectedCert;
    return matchesSearch && matchesCert;
  });

  // Grouping logic
  const groupedData = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {};
    filteredQuestions.forEach((q: any) => {
      const cert = q.cert_id || 'UNKNOWN';
      const exam = q.exam_id || 'DEFAULT';
      if (!groups[cert]) groups[cert] = {};
      if (!groups[cert][exam]) groups[cert][exam] = [];
      groups[cert][exam].push(q);
    });
    return groups;
  }, [filteredQuestions]);

  const toggleCert = (certId: string) => {
    setExpandedCerts(prev => ({ ...prev, [certId]: !prev[certId] }));
  };

  const toggleExam = (certId: string, examId: string) => {
    const key = `${certId}_${examId}`;
    setExpandedExams(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleRow = (qId: string) => {
    setExpandedRows(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const getCertTitle = (certId: string) => {
    const lowerId = certId.toLowerCase();
    return RESOURCES_DATA[lowerId]?.title || certId;
  };

  const handleEdit = (question: any) => {
    setSelectedQuestion({ ...question });
    setIsEditorOpen(true);
  };

  const handleAdd = () => {
    setSelectedQuestion({
      q_id: `Q-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      cert_id: selectedCert !== "all" ? selectedCert : "SAA-C03",
      exam_id: "PRACTICE-1",
      text: "",
      options: ["", "", "", ""],
      correct: 0,
      domain: "",
      explanation: "",
      type: "QUESTION"
    });
    setIsEditorOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await adminService.upsertQuestion(selectedQuestion);
      
      await refetch();
      
      setIsEditorOpen(false);
      setSelectedQuestion(null);
    } catch (err: any) {
      alert("Save failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (q_id: string, exam_id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this question? This action cannot be undone.")) {
      try {
        await adminService.deleteQuestion(q_id, exam_id);
        await refetch();
      } catch (err: any) {
        alert("Deletion failed: " + err.message);
      }
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="space-y-10 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20">
                Content Engine
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Question Bank</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white">Question Manager</h1>
          </div>
          
          <button 
            onClick={handleAdd}
            className="flex items-center gap-3 px-8 py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-white/5 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Question
          </button>
        </div>

        <>
            {/* Filters Bar */}
        <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] flex flex-col lg:flex-row gap-6 items-center">
          <div className="flex-1 w-full relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Search by ID or question text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border-slate-800 rounded-2xl pl-14 pr-6 py-4 text-sm font-medium text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative group min-w-[200px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select 
                value={selectedCert}
                onChange={(e) => setSelectedCert(e.target.value)}
                className="w-full bg-slate-950 border-slate-800 rounded-2xl pl-12 pr-10 py-4 text-xs font-black uppercase tracking-widest text-slate-400 appearance-none focus:border-blue-500/50 transition-all cursor-pointer"
              >
                <option value="all">All Certifications</option>
                {Object.keys(RESOURCES_DATA).map(key => (
                  <option key={key} value={RESOURCES_DATA[key].code}>{RESOURCES_DATA[key].title}</option>
                ))}
              </select>
            </div>
            
            <div className="px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500">
              Total: <span className="text-white ml-1">{filteredQuestions.length}</span>
            </div>
          </div>
        </div>

        {/* Grouped Questions View */}
        <div className="space-y-8">
          {loading ? (
            <div className="p-20 bg-slate-950 border border-slate-800 rounded-[3rem] flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Syncing with DynamoDB...</p>
            </div>
          ) : Object.keys(groupedData).length === 0 ? (
            <div className="p-20 bg-slate-950 border border-slate-800 rounded-[3rem] text-center space-y-4">
               <Database className="w-12 h-12 text-slate-800 mx-auto" />
               <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No questions found matching your criteria</p>
            </div>
          ) : (
            Object.entries(groupedData).map(([certId, exams]) => (
              <div key={certId} className="space-y-4">
                {/* Certification Header */}
                <button 
                  onClick={() => toggleCert(certId)}
                  className="w-full flex items-center justify-between p-6 bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-[2rem] transition-all text-left group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center border border-slate-800 text-blue-500 group-hover:scale-110 transition-transform">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white uppercase tracking-tight">{getCertTitle(certId)}</h2>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{certId} Bank • {Object.values(exams).reduce((acc, curr) => acc + curr.length, 0)} Questions</p>
                    </div>
                  </div>
                  {expandedCerts[certId] ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </button>

                <AnimatePresence>
                  {expandedCerts[certId] && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-6 space-y-4 border-l-2 border-slate-800/50 ml-6 py-4">
                        {Object.entries(exams).map(([examId, qs]) => {
                          const examKey = `${certId}_${examId}`;
                          const isExpanded = expandedExams[examKey];
                          
                          return (
                            <div key={examId} className="space-y-4">
                              <button 
                                onClick={() => toggleExam(certId, examId)}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${isExpanded ? 'bg-slate-900 border-slate-700' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${isExpanded ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`} />
                                  <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{examId} ({qs.length} Questions)</h3>
                                </div>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                              </button>
                              
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="bg-slate-950 border border-slate-800 rounded-[2rem] overflow-hidden">
                                      <table className="w-full text-left border-collapse">
                                        <thead>
                                          <tr className="border-b border-slate-900 bg-slate-900/20">
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">ID</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Content Preview</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {qs.map((q) => (
                                            <React.Fragment key={q.q_id}>
                                              <tr className="border-b border-slate-900/50 hover:bg-slate-900/30 transition-colors group cursor-pointer" onClick={() => toggleRow(q.q_id)}>
                                                <td className="px-8 py-4 w-32">
                                                  <code className="text-[10px] font-black text-blue-500/80 uppercase tracking-wider">{q.q_id}</code>
                                                </td>
                                                <td className="px-8 py-4">
                                                  <p className="text-xs font-medium text-slate-400 line-clamp-1 group-hover:text-slate-200 transition-colors">
                                                    {q.text}
                                                  </p>
                                                </td>
                                                <td className="px-8 py-4" onClick={(e) => e.stopPropagation()}>
                                                  <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                      onClick={() => handleEdit(q)}
                                                      className="p-1.5 text-slate-600 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                                                    >
                                                      <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                      onClick={() => handleDelete(q.q_id, q.exam_id)}
                                                      className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                              <AnimatePresence>
                                                {expandedRows[q.q_id] && (
                                                  <tr>
                                                    <td colSpan={3} className="px-8 py-6 bg-slate-900/20">
                                                      <motion.div 
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="space-y-4"
                                                      >
                                                        <div className="space-y-2">
                                                          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                            <Info className="w-3 h-3" /> Full Question Text
                                                          </h4>
                                                          <p className="text-xs text-slate-300 leading-relaxed font-medium">{q.text}</p>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                          {q.options?.map((opt: string, i: number) => (
                                                            <div key={i} className={`p-3 rounded-xl border text-[11px] font-medium ${i === q.correct ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                                                              <span className="opacity-50 mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
                                                            </div>
                                                          ))}
                                                        </div>
                                                        {q.explanation && (
                                                          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1">
                                                            <h5 className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Logic & Explanation</h5>
                                                            <p className="text-[10px] text-slate-400 leading-relaxed">{q.explanation}</p>
                                                          </div>
                                                        )}
                                                      </motion.div>
                                                    </td>
                                                  </tr>
                                                )}
                                              </AnimatePresence>
                                            </React.Fragment>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>

        {/* Audit Notice */}
        <div className="flex items-center gap-3 p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem]">
          <AlertCircle className="w-5 h-5 text-blue-500/50" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
            Critical Notice: All modifications to the question bank are cryptographically logged to the system audit trail. 
            Ensure content accuracy before committing upserts to the master exam index.
          </p>
        </div>
        </>
      </div>

      {/* Slide-over Question Editor */}
      <AnimatePresence>
        {isEditorOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSaving && setIsEditorOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100]"
            />
            {/* Panel */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-slate-950 border-l border-slate-800 z-[101] shadow-2xl flex flex-col"
            >
              {/* Editor Header */}
              <div className="p-8 border-b border-slate-900 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Management Terminal</span>
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tighter">
                    {selectedQuestion?.q_id ? `Edit: ${selectedQuestion.q_id}` : 'Create New Question'}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsEditorOpen(false)}
                  className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Editor Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <form id="question-editor-form" onSubmit={handleSave} className="space-y-8">
                  {/* Identity Group */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Question ID</label>
                      <input 
                        type="text"
                        value={selectedQuestion?.q_id || ""}
                        onChange={(e) => setSelectedQuestion({...selectedQuestion, q_id: e.target.value.toUpperCase()})}
                        className="w-full bg-slate-900 border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-blue-500 transition-all"
                        placeholder="e.g. SAA-001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Exam ID</label>
                      <input 
                        type="text"
                        value={selectedQuestion?.exam_id || ""}
                        onChange={(e) => setSelectedQuestion({...selectedQuestion, exam_id: e.target.value.toUpperCase()})}
                        className="w-full bg-slate-900 border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-blue-500 transition-all"
                        placeholder="e.g. PRACTICE-1"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Certification Branch</label>
                    <select 
                      value={selectedQuestion?.cert_id || ""}
                      onChange={(e) => setSelectedQuestion({...selectedQuestion, cert_id: e.target.value})}
                      className="w-full bg-slate-900 border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-blue-500 transition-all appearance-none"
                    >
                      {Object.keys(RESOURCES_DATA).map(key => (
                        <option key={key} value={RESOURCES_DATA[key].code}>{RESOURCES_DATA[key].title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Content Group */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Question Content</label>
                    <textarea 
                      value={selectedQuestion?.text || ""}
                      onChange={(e) => setSelectedQuestion({...selectedQuestion, text: e.target.value})}
                      rows={4}
                      className="w-full bg-slate-900 border-slate-800 rounded-xl px-4 py-4 text-xs font-medium text-slate-300 focus:border-blue-500 transition-all leading-relaxed"
                      placeholder="Enter the scenario or technical question..."
                      required
                    />
                  </div>

                  {/* Options Group */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Multiple Choice Options</label>
                    <div className="space-y-3">
                      {selectedQuestion?.options?.map((opt: string, i: number) => (
                        <div key={i} className="flex gap-3">
                          <button 
                            type="button"
                            onClick={() => setSelectedQuestion({...selectedQuestion, correct: i})}
                            className={`w-12 h-12 rounded-xl border flex items-center justify-center font-black text-xs transition-all ${selectedQuestion.correct === i ? 'bg-green-500 border-green-500 text-slate-950' : 'bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-700'}`}
                          >
                            {String.fromCharCode(65 + i)}
                          </button>
                          <input 
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...selectedQuestion.options];
                              newOpts[i] = e.target.value;
                              setSelectedQuestion({...selectedQuestion, options: newOpts});
                            }}
                            className="flex-1 bg-slate-900 border-slate-800 rounded-xl px-4 py-3 text-xs font-medium text-white focus:border-blue-500 transition-all"
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Metadata Group */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Techncial Domain</label>
                      <input 
                        type="text"
                        value={selectedQuestion?.domain || ""}
                        onChange={(e) => setSelectedQuestion({...selectedQuestion, domain: e.target.value})}
                        className="w-full bg-slate-900 border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-blue-500 transition-all"
                        placeholder="e.g. Storage"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rationale Explanation</label>
                    <textarea 
                      value={selectedQuestion?.explanation || ""}
                      onChange={(e) => setSelectedQuestion({...selectedQuestion, explanation: e.target.value})}
                      rows={3}
                      className="w-full bg-slate-900 border-slate-800 rounded-xl px-4 py-3 text-xs font-medium text-slate-400 focus:border-blue-500 transition-all leading-relaxed"
                      placeholder="Explain why the correct option is the best choice..."
                    />
                  </div>
                </form>
              </div>

              {/* Editor Footer */}
              <div className="p-8 border-t border-slate-900 bg-slate-950/50 backdrop-blur-xl">
                <button 
                  type="submit"
                  form="question-editor-form"
                  disabled={isSaving}
                  className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Synchronizing...' : 'Commit Changes to Index'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminContentManager;
