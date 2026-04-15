
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ExternalLink, 
  BookOpen, 
  Shield, 
  Download, 
  PlayCircle, 
  CheckCircle2,
  Clock,
  Target,
  CreditCard
} from 'lucide-react';
import { RESOURCES_DATA } from '../data/resourcesData';

const Resources: React.FC = () => {
  const { certId } = useParams<{ certId: string }>();
  const navigate = useNavigate();
  const cert = certId ? RESOURCES_DATA[certId] : null;

  if (!cert) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center border border-slate-800">
          <Shield className="w-10 h-10 text-slate-700" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Resource Not Found</h2>
          <p className="text-slate-500">We couldn't find study resources for this certification path yet.</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-white text-slate-950 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-16 py-12 px-4">
      {/* Header */}
      <header className="space-y-8">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="flex flex-col md:flex-row items-start gap-8">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-32 h-32 rounded-[2.5rem] bg-slate-900 border border-slate-800 flex items-center justify-center p-6 shadow-2xl"
          >
            <img 
               src={`/assets/badges/${cert.certId.split('-')[0]}.png`} 
               alt={cert.title}
               className="w-full h-full object-contain"
            />
          </motion.div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full text-xs font-black uppercase tracking-widest">
                {cert.level} Level
              </span>
              <span className="text-slate-500 font-mono text-sm uppercase tracking-widest">{cert.code}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">{cert.title}</h1>
            <p className="text-slate-400 text-lg max-w-2xl">{cert.summary}</p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-1 hover:border-slate-700 transition-colors">
          <Clock className="w-5 h-5 text-orange-500 mx-auto mb-2" />
          <div className="text-xl font-bold font-mono">{cert.duration}</div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Duration</p>
        </div>
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-1 hover:border-slate-700 transition-colors">
          <Target className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
          <div className="text-xl font-bold font-mono">{cert.passingScore}</div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Passing Score</p>
        </div>
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-1 hover:border-slate-700 transition-colors">
          <BookOpen className="w-5 h-5 text-blue-500 mx-auto mb-2" />
          <div className="text-xl font-bold font-mono">65</div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Questions</p>
        </div>
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-1 hover:border-slate-700 transition-colors">
          <CreditCard className="w-5 h-5 text-purple-500 mx-auto mb-2" />
          <div className="text-xl font-bold font-mono">{cert.fee}</div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Exam Fee</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Resource List */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3">
            <ExternalLink className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold tracking-tight">Official AWS Resources</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {cert.officialLinks.map((link, idx) => (
              <motion.a 
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 * idx }}
                className="flex items-center justify-between p-6 bg-slate-900 border border-slate-800 rounded-[2rem] group hover:border-orange-500/50 hover:bg-slate-800/40 transition-all"
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    link.type === 'guide' ? 'bg-red-500/10 text-red-500' :
                    link.type === 'course' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-orange-500/10 text-orange-500'
                  }`}>
                    {link.type === 'guide' ? <Download className="w-6 h-6" /> :
                     link.type === 'course' ? <PlayCircle className="w-6 h-6" /> :
                     <ExternalLink className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="font-bold group-hover:text-white transition-colors">{link.title}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">
                      {link.type === 'guide' ? 'PDF Exam Guide' : 
                       link.type === 'course' ? 'AWS Skill Builder' : 'Official Portal'}
                    </div>
                  </div>
                </div>
                <ArrowLeft className="w-5 h-5 text-slate-700 rotate-180 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
              </motion.a>
            ))}
          </div>

          {/* SAA-C03 CTA */}
          <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-orange-500/5 to-slate-950 border border-orange-500/20 flex flex-col md:flex-row items-center justify-between gap-8 mt-12">
            <div className="space-y-2 text-center md:text-left">
              <h4 className="text-xl font-black italic tracking-tighter">Practice for free while you wait!</h4>
              <p className="text-sm text-slate-500">The Architect Associate track shares 70% of the core service knowledge required for {cert.code}.</p>
            </div>
            <button 
              onClick={() => navigate('/exam/saa-c03/SAA-C03_Minimal_Exam_01')}
              className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-orange-500/20 whitespace-nowrap"
            >
              Try SAA-C03 Exams
            </button>
          </div>
        </div>

        {/* Domain Weights */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-bold tracking-tight">Exam Domains</h2>
          </div>
          
          <div className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 space-y-8">
            {cert.domains.map((domain, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-slate-400 max-w-[80%] leading-relaxed">{domain.name}</span>
                  <span className="text-emerald-500">{domain.percent}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${domain.percent}%` }}
                    className="h-full bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resources;
