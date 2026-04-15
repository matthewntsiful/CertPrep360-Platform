import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Gavel, Scale, AlertTriangle, Copyright, ExternalLink } from 'lucide-react';

const Terms = () => {
  const principles = [
    {
      icon: Copyright,
      title: "Content Licensing",
      content: "All study materials, roadmap architectures, and practice questions remain the intellectual property of CertPrep360. Users are granted a non-transferable license for personal exam preparation."
    },
    {
      icon: AlertTriangle,
      title: "Fair Use Policy",
      content: "Automated scraping, bulk downloading, or distribution of our proprietary exam simulations is strictly prohibited and monitored via activity logging."
    },
    {
      icon: Scale,
      title: "Certification Disclaimer",
      content: "CertPrep360 is an independent study platform. Completion of our roadmaps does not guarantee passing official AWS exams, though it is architected for maximum success probability."
    },
    {
      icon: Gavel,
      title: "Terms of Engagement",
      content: "Access to the platform is governed by professional conduct. Interference with the exam engine or abuse of support systems will result in immediate suspension of privileges."
    }
  ];

  return (
    <div className="space-y-12 pb-20">
      <section className="text-center space-y-4 pt-12">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <FileText className="text-blue-500 w-8 h-8" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Terms of <span className="text-blue-500">Engagement</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          The legal framework governing elite AWS certification training.
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
            Version 1.2
          </span>
          <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-500">
            Professional Use
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {principles.map((p, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="p-8 bg-slate-900/30 border border-slate-800 rounded-3xl hover:border-blue-500/30 transition-all"
          >
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-6">
              <p.icon className="text-blue-500 w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-4">{p.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              {p.content}
            </p>
          </motion.div>
        ))}
      </div>

      <section className="max-w-4xl mx-auto space-y-8">
        <div className="p-10 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Shield className="w-40 h-40" />
          </div>
          
          <h2 className="text-2xl font-bold mb-8">Detailed Terms</h2>
          <div className="space-y-8 text-sm text-slate-400">
            <div className="space-y-4">
              <h4 className="text-white font-bold uppercase tracking-widest text-xs">Section 1: User Account Protocol</h4>
              <p>Candidates are responsible for maintaining the confidentiality of their platform credentials. Multi-user sharing of single accounts is considered a violation of the professional license and may trigger automated protection lockouts.</p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-white font-bold uppercase tracking-widest text-xs">Section 2: Intellectual Property</h4>
              <p>The "CertPrep360" brand, including its proprietary exam engine logic and architectural study roadmaps, is protected under international copyright law. Reproduction in secondary training materials is strictly prohibited without explicit written consent.</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-white font-bold uppercase tracking-widest text-xs">Section 3: Limitation of Liability</h4>
              <p>CertPrep360 provides information on an "as-is" basis. While we strive for 100% accuracy in our AWS curriculum, the platform is not responsible for discrepancies between our practice materials and the official certification exams administered by AWS.</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-slate-500 text-xs">
            Questions regarding these terms? <a href="#" className="text-blue-500 hover:underline">Contact Legal Counsel</a>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Terms;
