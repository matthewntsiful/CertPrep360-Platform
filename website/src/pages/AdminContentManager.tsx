import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Edit2, 
  Trash2, 
  Loader2,
  Database,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService } from '../services/adminService';

const AdminContentManager: React.FC = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCert, setSelectedCert] = useState("all");

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const data = await adminService.getQuestions();
        setQuestions(data);
      } catch (err) {
        console.error("Failed to fetch questions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          q.q_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCert = selectedCert === "all" || q.cert_id === selectedCert;
    return matchesSearch && matchesCert;
  });

  const handleDelete = async (q_id: string, exam_id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this question? This action cannot be undone.")) {
      try {
        await adminService.deleteQuestion(q_id, exam_id);
        setQuestions(questions.filter(q => q.q_id !== q_id));
      } catch (err: any) {
        alert("Deletion failed: " + err.message);
      }
    }
  };

  return (
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
        
        <button className="flex items-center gap-3 px-8 py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-white/5 hover:scale-105 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

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
              <option value="SAA-C03">AWS Architect Assoc.</option>
              <option value="CLF-C02">AWS Cloud Practitioner</option>
              <option value="DEA-C01">AWS Data Engineer</option>
            </select>
          </div>
          
          <div className="px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500">
            Total: <span className="text-white ml-1">{filteredQuestions.length}</span>
          </div>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-[3rem] overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Syncing with DynamoDB...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-20 text-center space-y-4">
             <Database className="w-12 h-12 text-slate-800 mx-auto" />
             <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No questions found matching your criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">ID / Exam</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Question Content</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Certification</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredQuestions.map((q) => (
                    <motion.tr 
                      key={q.q_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-slate-900 hover:bg-slate-900/30 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <code className="text-[10px] font-black text-blue-500 uppercase tracking-wider">{q.q_id}</code>
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{q.exam_id}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 max-w-md">
                        <p className="text-sm font-medium text-slate-300 line-clamp-2 leading-relaxed group-hover:text-white transition-colors">
                          {q.text}
                        </p>
                        {q.domain && (
                          <span className="inline-block mt-2 px-2 py-0.5 rounded bg-slate-800 text-[8px] font-black uppercase tracking-widest text-slate-500">
                            {q.domain}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                         <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           {q.cert_id}
                         </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(q.q_id, q.exam_id)}
                            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
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
    </div>
  );
};

export default AdminContentManager;
