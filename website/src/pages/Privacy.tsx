import { motion } from 'framer-motion';
import { Lock, Eye, Database, Server } from 'lucide-react';

const Privacy = () => {
  const sections = [
    {
      icon: Eye,
      title: "Data Collection Protocol",
      content: "We collect performance data from practice exams, architectural roadmap progress, and account authentication metadata to optimize your certification journey."
    },
    {
      icon: Database,
      title: "Retention Standards",
      content: "Your practice session data is retained for the duration of your active subscription plus 12 months for historical progress analysis, unless otherwise requested."
    },
    {
      icon: Lock,
      title: "Cryptographic Security",
      content: "All user credentials and progress logs are encrypted at rest using AES-256 standards. Transit is secured via TLS 1.3 protocol."
    },
    {
      icon: Server,
      title: "Third-Party Integration",
      content: "We utilize AWS-native services for data storage. No practice exam results are shared with third-party marketing entities."
    }
  ];

  return (
    <div className="space-y-12 pb-20">
      <section className="text-center space-y-4 pt-12">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
            <Lock className="text-orange-500 w-8 h-8" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Privacy <span className="text-orange-500">Protocol</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Industrial-grade data protection standards for elite cloud engineers.
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
            Last Updated: April 2024
          </span>
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-500">
            GDPR Compliant
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {sections.map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl hover:border-orange-500/30 transition-all group"
          >
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <section.icon className="text-orange-500 w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-4">{section.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              {section.content}
            </p>
          </motion.div>
        ))}
      </div>

      <section className="max-w-3xl mx-auto p-10 bg-slate-900 border border-slate-800 rounded-3xl space-y-6">
        <h2 className="text-2xl font-bold">Comprehensive Policy</h2>
        <div className="prose prose-invert prose-slate max-w-none text-sm text-slate-400 space-y-4">
          <p>
            The CertPrep360 Platform ("we", "us", "our") is committed to protecting the intellectual property and personal progress of candidates exploring AWS certifications. This Privacy Protocol outlines our rigorous approach to data sovereignty.
          </p>
          <p>
            <strong>1. Scope of Engagement:</strong> This policy applies to all interactions within the CertPrep360 application environment, including the Exam Engine and Architectural Roadmap interfaces.
          </p>
          <p>
            <strong>2. Candidate Sovereignty:</strong> You retain the right to export your practice exam history and roadmap achievements at any time. Requests for total data eradication will be processed within 72 hours of verification.
          </p>
          <p>
            <strong>3. Security Architecture:</strong> Our backend is architected to minimize data exposure. Personal Identifiable Information (PII) is decoupled from performance metrics to ensure anonymity during community benchmarking.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Privacy;
