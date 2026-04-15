import React from 'react';
import { motion } from 'framer-motion';
import { Map, Shield, Layout, BookOpen, GraduationCap, Link as LinkIcon, Database, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Sitemap = () => {
  const links = [
    {
      title: "Core Platform",
      icon: Layout,
      items: [
        { name: "Home Dashboard", path: "/" },
        { name: "Certification Portal", path: "/#certifications" },
        { name: "Practice Engines", path: "/login" },
        { name: "Identity Management", path: "/login" }
      ]
    },
    {
      title: "Certification Tracks",
      icon: GraduationCap,
      items: [
        { name: "Cloud Practitioner", path: "/resources/clf-c02" },
        { name: "Solutions Architect Assoc", path: "/resources/saa-c03" },
        { name: "Developer Associate", path: "/resources/dva-c02" },
        { name: "CloudOps Engineer Assoc", path: "/resources/coe-c01" },
        { name: "Data Engineer Assoc", path: "/resources/dea-c01" },
        { name: "ML Engineer Assoc", path: "/resources/mle-c01" }
      ]
    },
    {
      title: "Advanced Tracks",
      icon: Shield,
      items: [
        { name: "Solutions Architect Prof", path: "/resources/sap-c02" },
        { name: "DevOps Engineer Prof", path: "/resources/dop-c02" },
        { name: "Generative AI Developer", path: "/resources/gdp-c01" },
        { name: "Security Specialty", path: "/resources/scs-c02" },
        { name: "Advanced Networking", path: "/resources/ans-c01" }
      ]
    },
    {
      title: "Site Infrastructure",
      icon: Database,
      items: [
        { name: "Privacy Protocol", path: "/privacy" },
        { name: "Terms of Engagement", path: "/terms" },
        { name: "System Health", path: "/status" },
        { name: "Site Index", path: "/sitemap" }
      ]
    }
  ];

  return (
    <div className="space-y-12 pb-20">
      <section className="text-center space-y-4 pt-12">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <Map className="text-emerald-500 w-8 h-8" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Platform <span className="text-emerald-500">Sitemap</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Complete structural directory of the CertPrep360 universe.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto px-4">
        {links.map((group, groupIndex) => (
          <motion.div
            key={groupIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <group.icon className="w-5 h-5 text-emerald-500" />
              <h3 className="font-black uppercase tracking-widest text-xs text-white">{group.title}</h3>
            </div>
            <ul className="space-y-3">
              {group.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Link 
                    to={item.path}
                    className="flex items-center justify-between group text-slate-400 hover:text-white transition-colors py-1"
                  >
                    <span className="text-sm font-medium">{item.name}</span>
                    <LinkIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      <section className="max-w-4xl mx-auto mt-20 p-1 bg-gradient-to-r from-emerald-500/20 via-slate-800 to-emerald-500/20 rounded-[2.5rem]">
        <div className="bg-slate-950 rounded-[2.4rem] p-12 text-center space-y-6">
          <Zap className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="text-3xl font-bold">Ready to accelerate?</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Choose your track from the map above and begin your journey to becoming an AWS certified elite.
          </p>
          <div className="pt-6">
            <Link 
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20"
            >
              Start Free Practice
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Sitemap;
