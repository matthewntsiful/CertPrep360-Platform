import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Trophy, Zap, ArrowRight, ShieldCheck, Star, Award, Shield, Layout as LayoutIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CERT_CATEGORIES = [
  {
    name: "Foundational",
    description: "Begin your cloud journey with essential concepts",
    color: "text-emerald-500",
    icon: ShieldCheck,
    certs: [
      { id: 'clf-c02', code: 'CLF-C02', title: 'Cloud Practitioner', questions: 0, exams: 0 },
      { id: 'aif-c01', code: 'AIF-C01', title: 'AI Practitioner', questions: 0, exams: 0 }
    ]
  },
  {
    name: "Associate",
    description: "Build a strong technical foundation in specific roles",
    color: "text-blue-500",
    icon: Award,
    certs: [
      { id: 'saa-c03', code: 'SAA-C03', title: 'Solutions Architect', questions: 1075, exams: 16 },
      { id: 'dva-c02', code: 'DVA-C02', title: 'Developer', questions: 0, exams: 0 },
      { id: 'coe-c01', code: 'COE-C01', title: 'CloudOps Engineer', questions: 0, exams: 0 },
      { id: 'dea-c01', code: 'DEA-C01', title: 'Data Engineer', questions: 0, exams: 0 },
      { id: 'mle-c01', code: 'MLE-C01', title: 'Machine Learning Engineer', questions: 0, exams: 0 }
    ]
  },
  {
    name: "Professional",
    description: "Demonstrate advanced technical skills and experience",
    color: "text-purple-500",
    icon: Star,
    certs: [
      { id: 'sap-c02', code: 'SAP-C01/02', title: 'Solutions Architect', questions: 0, exams: 0 },
      { id: 'dop-c02', code: 'DOP-C02', title: 'DevOps Engineer', questions: 0, exams: 0 },
      { id: 'gdp-c01', code: 'AIP-C01', title: 'Generative AI Developer', questions: 0, exams: 0 }
    ]
  },
  {
    name: "Specialty",
    description: "Deep dive into specialized technical domains",
    color: "text-red-500",
    icon: Shield,
    certs: [
      { id: 'ans-c01', code: 'ANS-C01', title: 'Advanced Networking', questions: 0, exams: 0 },
      { id: 'scs-c02', code: 'SCS-C02', title: 'Security', questions: 0, exams: 0 },
      { id: 'mls-c01', code: 'MLS-C01', title: 'Machine Learning', questions: 0, exams: 0 }
    ]
  }
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('All');

  const categories = ['All', 'Foundational', 'Associate', 'Professional', 'Specialty'];

  const filteredCategories = CERT_CATEGORIES.map(category => ({
    ...category,
    certs: category.certs.filter(cert => {
      const matchesSearch = cert.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           cert.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || category.name === activeCategory;
      return matchesSearch && matchesCategory;
    })
  })).filter(category => category.certs.length > 0);

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="text-center space-y-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold tracking-widest uppercase border border-orange-500/20 mb-6 font-mono">
            <Zap className="w-3 h-3" /> All Major Certifications Injected
          </span>
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
            AWS Exam Hub. <br />
            <span className="text-orange-500 underline decoration-orange-500/30 underline-offset-8">360° Mastery.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
            The architect's choice for professional certification. Choose your domain, master the content, and pass the first time.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {user ? (
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-10 py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-2xl shadow-orange-500/40"
            >
              Back to Dashboard <LayoutIcon className="w-6 h-6" />
            </button>
          ) : (
            <button 
              onClick={() => document.getElementById('certifications')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-10 py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-2xl shadow-orange-500/40"
            >
              Get Started <ArrowRight className="w-6 h-6" />
            </button>
          )}
        </motion.div>
      </section>

      {/* Certification Portal */}
      <section id="certifications" className="space-y-12 px-4">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter">Your Learning Path</h2>
          <p className="text-slate-500 text-lg">We've expanded to include all 11+ AWS certifications, from Foundational to Specialty domains.</p>
        </div>

        {/* Search and Filters */}
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <BookOpen className="w-5 h-5 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Search by code (e.g. SAA) or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                  activeCategory === category 
                  ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white hover:border-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-16">
          {filteredCategories.length > 0 ? filteredCategories.map((category) => (
            <div key={category.name} className="space-y-8">
              <div className="flex items-center gap-4 px-4">
                <category.icon className={`w-8 h-8 ${category.color}`} />
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">{category.name}</h3>
                  <p className="text-sm text-slate-500">{category.description}</p>
                </div>
                <div className="flex-1 h-px bg-slate-800 ml-4 hidden md:block"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {category.certs.map((cert, i) => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.05 * i }}
                    onClick={() => {
                      if (cert.questions > 0) {
                        navigate(`/exam/${cert.id}/01`);
                      } else {
                        navigate(`/resources/${cert.id}`);
                      }
                    }}
                    className={`group relative p-8 rounded-3xl bg-slate-900 border transition-all cursor-pointer overflow-hidden ${
                      cert.questions > 0 
                      ? 'border-slate-800 hover:border-orange-500/50 hover:bg-slate-800/40 hover:shadow-2xl hover:shadow-orange-500/10' 
                      : 'border-slate-800/50 hover:border-blue-500/40 hover:bg-slate-800/20'
                    }`}
                  >
                    {/* Background ID Watermark */}
                    <div className={`absolute -right-4 -top-4 text-7xl font-black rotate-12 select-none transition-colors ${
                       cert.questions > 0 ? 'text-white/[0.03] group-hover:text-orange-500/[0.05]' : 'text-white/[0.01]'
                    }`}>
                      {cert.id.split('-')[0].toUpperCase()}
                    </div>

                    <div className="flex items-start justify-between mb-8">
                      <div className={`w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center border transition-all p-3 ${
                        cert.questions > 0 ? 'border-slate-700 group-hover:border-orange-500/50 group-hover:bg-slate-700' : 'border-slate-800'
                      }`}>
                        <img 
                          src={`/assets/badges/${cert.id.split('-')[0]}.png`} 
                          alt={cert.title}
                          className="w-full h-full object-contain transition-all duration-500 group-hover:scale-110"
                        />
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
                        cert.questions > 0 ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {cert.questions > 0 ? 'Live Exam' : 'Study Roadmap'}
                      </div>
                    </div>
                    
                    <h4 className="text-xl font-bold mb-1 leading-tight text-white">{cert.title}</h4>
                    <p className="text-slate-500 text-sm font-mono mb-6 uppercase tracking-wider">{cert.code}</p>
                    
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-800 group-hover:border-slate-700 transition-colors">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Questions</div>
                        <div className={`text-lg font-bold font-mono ${cert.questions > 0 ? 'text-white' : 'text-slate-700'}`}>{cert.questions}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Engines</div>
                        <div className={`text-lg font-bold font-mono ${cert.exams > 0 ? 'text-white' : 'text-slate-700'}`}>{cert.exams}</div>
                      </div>
                    </div>

                    <div className={`mt-8 flex items-center gap-2 text-xs font-black transition-all uppercase tracking-widest ${
                      cert.questions > 0 ? 'text-orange-500 group-hover:gap-4' : 'text-blue-500 group-hover:gap-4'
                    }`}>
                      {cert.questions > 0 ? (
                        <>Launch Session <ArrowRight className="w-4 h-4" /></>
                      ) : (
                        <>View Study Resources <ArrowRight className="w-4 h-4" /></>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-slate-900/50 rounded-[3rem] border border-slate-800 border-dashed">
              <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-400">No matching certifications found</h3>
              <p className="text-slate-500 text-sm mt-2">Try adjusting your search or category filters</p>
            </div>
          )}
        </div>
      </section>

      {/* Industrial Grade Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-12 py-20 px-10 bg-slate-900/40 rounded-[3rem] border border-slate-800 mx-4">
        {[
          {
            icon: BookOpen,
            title: "Study Protocol",
            desc: "Advanced logic that provides deep-tier explanations and architectural insights for every wrong answer.",
            color: "text-orange-500"
          },
          {
            icon: Trophy,
            title: "Simulated Deployment",
            desc: "Every exam runs against our high-fidelity timer and domain-weighted question engine.",
            color: "text-blue-500"
          },
          {
            icon: Zap,
            title: "Elastic Results",
            desc: "Persistent results and real-time performance analytics synced across all AWS certificates.",
            color: "text-green-500"
          }
        ].map((feature, i) => (
          <div key={i} className="space-y-6 group">
            <div className={`w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center ${feature.color} group-hover:scale-110 transition-transform`}>
              <feature.icon className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{feature.title}</h3>
            <p className="text-slate-400 leading-relaxed font-normal">
              {feature.desc}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Home;
