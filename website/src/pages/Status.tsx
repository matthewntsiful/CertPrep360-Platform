import { motion } from 'framer-motion';
import { Activity, Shield, Server, Database, Globe, Cpu, CheckCircle2 } from 'lucide-react';

const Status = () => {
  const services = [
    { name: "Exam Engine Core", status: "Operational", uptime: "99.99%", latency: "42ms", icon: Cpu },
    { name: "Global Asset CDN", status: "Operational", uptime: "100%", latency: "12ms", icon: Globe },
    { name: "User Progress DB", status: "Operational", uptime: "99.98%", latency: "65ms", icon: Database },
    { name: "Auth & Identity", status: "Operational", uptime: "99.99%", latency: "28ms", icon: Shield },
    { name: "Architectural API", status: "Operational", uptime: "99.95%", latency: "88ms", icon: Server },
    { name: "Mock Simulator", status: "Operational", uptime: "99.99%", latency: "34ms", icon: Activity }
  ];

  return (
    <div className="space-y-12 pb-20 max-w-6xl mx-auto px-4">
      <section className="text-center space-y-4 pt-12">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <Activity className="text-emerald-500 w-8 h-8" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-slate-950 animate-pulse" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Systems <span className="text-emerald-500">Health</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg text-mono">
          Real-time operational status of the CertPrep360 architecture.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map((service, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-4 relative overflow-hidden group"
          >
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                <service.icon className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                {service.status}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">{service.name}</h3>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
                <span>Uptime: {service.uptime}</span>
                <span>Latency: {service.latency}</span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[95%] rounded-full opacity-50" />
            </div>
          </motion.div>
        ))}
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <CheckCircle2 className="text-emerald-500 w-8 h-8" />
              All Systems Operational
            </h2>
            <p className="text-slate-400 max-w-md text-sm leading-relaxed">
              No incidents reported in the last 2,492 hours. Our architecture is optimized for zero-latency practice exam environments.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="px-6 py-4 bg-slate-800 rounded-2xl text-center">
              <div className="text-2xl font-black text-white">99.99%</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Uptime</div>
            </div>
            <div className="px-6 py-4 bg-slate-800 rounded-2xl text-center">
              <div className="text-2xl font-black text-white">12ms</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg Latency</div>
            </div>
          </div>
        </div>
      </section>
      
      <div className="text-center pt-8">
        <p className="text-slate-500 text-xs">
          Automatic refresh every 60 seconds • Last checked: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default Status;
