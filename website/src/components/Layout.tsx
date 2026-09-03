
import React, { useEffect, useState } from 'react';
import { Shield, Menu, X, Twitter, Linkedin, Github, Zap, LogOut } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CommandPalette } from './CommandPalette';
import { NetworkBackground } from './NetworkBackground';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, initializing, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    if (target === 'certifications') {
      e.preventDefault();
      if (location.pathname !== '/') {
        navigate('/#certifications');
      } else {
        document.getElementById('certifications')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (location.hash === '#certifications' && location.pathname === '/') {
      setTimeout(() => {
        document.getElementById('certifications')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-orange-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <CommandPalette />
      <NetworkBackground />

      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-tr from-orange-600 via-orange-500 to-yellow-500 rounded-xl flex items-center justify-center group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 shadow-[0_4px_15px_rgba(249,115,22,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] group-hover:shadow-[0_8px_25px_rgba(249,115,22,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)]">
              <Shield className="text-white w-5 h-5 drop-shadow-md" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-slate-50 transition-colors duration-300">
              CertPrep<span className="text-orange-500 group-hover:text-orange-400 group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all duration-300">360</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            {user && <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>}
            {isAdmin && <Link to="/admin" className="text-orange-500 hover:text-orange-400 transition-colors font-bold">Admin Hub</Link>}
            <a href="#certifications" onClick={(e) => handleNavClick(e, 'certifications')} className="hover:text-white transition-colors">Certifications</a>
          </nav>

          <div className="flex items-center gap-3">
            {initializing ? (
              <div className="w-24 h-9 bg-slate-900 animate-pulse rounded-lg" />
            ) : user ? (
              <>
                <button onClick={() => navigate('/dashboard')} className="hidden md:flex px-4 py-2 bg-slate-900 border border-slate-800 hover:border-orange-500/50 text-white rounded-lg text-sm font-bold transition-all items-center gap-2">
                  <Zap className="w-3 h-3 text-orange-500" /> Dashboard
                </button>
                <button onClick={() => logout()} className="hidden md:flex px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-bold transition-all items-center gap-2">
                  <LogOut className="w-3 h-3" /> Log Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden md:block px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">Log in</Link>
                <button onClick={() => navigate('/login')} className="hidden md:block px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20">Get Started</button>
              </>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-slate-400 hover:text-white transition-colors">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 py-6 space-y-4">
            <Link to="/" className="block py-3 text-sm font-medium text-slate-400 hover:text-white border-b border-slate-800/50 transition-colors">Home</Link>
            {user && <Link to="/dashboard" className="block py-3 text-sm font-medium text-slate-400 hover:text-white border-b border-slate-800/50 transition-colors">Dashboard</Link>}
            {isAdmin && <Link to="/admin" className="block py-3 text-sm font-bold text-orange-500 hover:text-orange-400 border-b border-slate-800/50 transition-colors">Admin Hub</Link>}
            <a href="#certifications" onClick={(e) => { handleNavClick(e, 'certifications'); setMobileOpen(false); }} className="block py-3 text-sm font-medium text-slate-400 hover:text-white border-b border-slate-800/50 transition-colors">Certifications</a>
            {user ? (
              <button onClick={() => logout()} className="w-full mt-2 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            ) : (
              <button onClick={() => { navigate('/login'); setMobileOpen(false); }} className="w-full mt-2 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold">Get Started</button>
            )}
          </div>
        )}
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        {children}
      </main>

      <footer className="border-t border-slate-800 pt-20 pb-10 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 group">
                <div className="w-8 h-8 bg-gradient-to-tr from-orange-600 via-orange-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-[0_2px_10px_rgba(249,115,22,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)]">
                  <Shield className="text-white w-4 h-4" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-2xl tracking-tight text-white">CertPrep<span className="text-orange-500">360</span></span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Elite-tier AWS certification preparation. Industrial-grade practice exams and deep architectural roadmaps for the serious cloud engineer.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-orange-500 hover:border-orange-500/50 transition-all">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-orange-500 hover:border-orange-500/50 transition-all">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-orange-500 hover:border-orange-500/50 transition-all">
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Platform Column */}
            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Platform</h4>
              <ul className="space-y-4 text-sm text-slate-400 font-medium">
                <li><Link to="/" className="hover:text-orange-500 transition-colors">Exam Hub</Link></li>
                <li><a href="#certifications" onClick={(e) => handleNavClick(e, 'certifications')} className="hover:text-orange-500 transition-colors">Study Roadmaps</a></li>
                <li><Link to="/login" className="hover:text-orange-500 transition-colors">Practice Engines</Link></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Enterprise Portal</a></li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Resources</h4>
              <ul className="space-y-4 text-sm text-slate-400 font-medium">
                <li><Link to="/knowledge-base" className="hover:text-orange-500 transition-colors">Knowledge Base</Link></li>
                <li><Link to="/sample-questions" className="hover:text-orange-500 transition-colors">Sample Questions</Link></li>
                <li><Link to="/community" className="hover:text-orange-500 transition-colors">Community Forum</Link></li>
                <li><Link to="/support" className="hover:text-orange-500 transition-colors">Contact Support</Link></li>
              </ul>
            </div>

            {/* System Status / Legal */}
            <div className="space-y-8">
              <div>
                <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Legals</h4>
                <ul className="space-y-4 text-sm text-slate-400 font-medium">
                  <li><Link to="/privacy" className="hover:text-orange-500 transition-colors">Privacy Protocol</Link></li>
                  <li><Link to="/terms" className="hover:text-orange-500 transition-colors">Terms of Engagement</Link></li>
                </ul>
              </div>
              <Link 
                to="/status"
                className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3 hover:bg-emerald-500/10 transition-all group"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Systems Operational</span>
              </Link>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <p>© {new Date().getFullYear()} CertPrep360 Platform. All rights reserved.</p>
            <p className="text-slate-600 text-[9px] font-medium normal-case tracking-normal text-center max-w-lg">
              AWS certification badges are trademarks of Amazon Web Services, Inc. CertPrep360 is not affiliated with, endorsed by, or sponsored by Amazon Web Services. All certification names and logos are property of their respective owners.
            </p>
            <div className="flex gap-8">
              <Link to="/sitemap" className="hover:text-white transition-colors">Sitemap</Link>
              <Link to="/status" className="hover:text-white transition-colors">Status</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
