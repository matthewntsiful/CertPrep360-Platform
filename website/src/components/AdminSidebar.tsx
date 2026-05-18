import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  Cpu, 
  Users, 
  BarChart3, 
  Settings, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

const AdminSidebar: React.FC = () => {
  const links = [
    { to: "/admin", icon: LayoutDashboard, label: "Command Center", exact: true },
    { to: "/admin/ai-generator", icon: Cpu, label: "AI Content Factory" },
    { to: "/admin/content", icon: Database, label: "Question Manager" },
    { to: "/admin/users", icon: Users, label: "User Lifecycle" },
    { to: "/admin/analytics", icon: BarChart3, label: "Platform Intel" },
    { to: "/admin/settings", icon: Settings, label: "System Config" },
  ];

  return (
    <div className="w-72 h-[calc(100vh-8rem)] sticky top-24 hidden lg:flex flex-col gap-6">
      <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 flex-1 flex flex-col gap-8 shadow-2xl">
        {/* Admin Branding */}
        <div className="flex items-center gap-3 px-4 py-2 bg-orange-500/10 rounded-2xl border border-orange-500/20">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 via-orange-500 to-yellow-500 flex items-center justify-center shadow-[0_2px_10px_rgba(249,115,22,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)]">
            <ShieldCheck className="w-4 h-4 text-white drop-shadow-sm" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Root Access</span>
            <span className="text-xs font-bold text-white uppercase tracking-widest">Admin Hub</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={({ isActive }) => `
                flex items-center justify-between p-4 rounded-2xl transition-all group
                ${isActive 
                  ? 'bg-white text-slate-950 shadow-xl shadow-white/5' 
                  : 'text-slate-500 hover:text-white hover:bg-slate-800/50'}
              `}
            >
              <div className="flex items-center gap-3">
                <link.icon className={`w-5 h-5 transition-transform group-hover:scale-110`} />
                <span className="text-xs font-black uppercase tracking-widest">{link.label}</span>
              </div>
              <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-all`} />
            </NavLink>
          ))}
        </nav>

        {/* System Health Pulse */}
        <div className="mt-auto p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Systems Operational</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Global US-East-1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
