import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, Database, FileText, Settings, ShieldAlert, Cpu, BookOpen, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // Toggle the menu when ⌘K is pressed, or close on Escape
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-start justify-center pt-[15vh]">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={() => setOpen(false)} />
      
      <Command 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center px-4 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-2" />
          <Command.Input 
            placeholder="Type a command or search..." 
            autoFocus
            className="flex-1 h-14 bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-500 text-lg w-full"
          />
          <div className="px-2 py-1 bg-slate-800 rounded text-[10px] font-mono text-slate-400">ESC</div>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <Command.Empty className="py-12 text-center text-slate-400">No results found.</Command.Empty>

          <Command.Group heading="Navigation" className="text-xs font-semibold text-slate-500 px-2 py-3 [&_[cmdk-group-heading]]:mb-2 [&_[cmdk-group-heading]]:px-2">
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/dashboard'))} 
              className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer aria-selected:bg-orange-500/10 aria-selected:text-orange-500 text-slate-300 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/exams'))} 
              className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer aria-selected:bg-orange-500/10 aria-selected:text-orange-500 text-slate-300 transition-colors"
            >
              <Database className="w-4 h-4" />
              <span>Exam Hub (SAA-C03)</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/history'))} 
              className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer aria-selected:bg-orange-500/10 aria-selected:text-orange-500 text-slate-300 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Exam History</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/knowledge-base'))} 
              className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer aria-selected:bg-orange-500/10 aria-selected:text-orange-500 text-slate-300 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Knowledge Base</span>
            </Command.Item>
          </Command.Group>

          {isAdmin && (
            <Command.Group heading="Admin Operations" className="text-xs font-semibold text-slate-500 px-2 py-3 [&_[cmdk-group-heading]]:mb-2 [&_[cmdk-group-heading]]:px-2 border-t border-slate-800/50 mt-2">
              <Command.Item 
                onSelect={() => runCommand(() => navigate('/admin'))} 
                className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer aria-selected:bg-red-500/10 aria-selected:text-red-400 text-slate-300 transition-colors"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Command Center</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate('/admin/ai-generator'))} 
                className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer aria-selected:bg-red-500/10 aria-selected:text-red-400 text-slate-300 transition-colors"
              >
                <Cpu className="w-4 h-4" />
                <span>AI Content Factory</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate('/admin/users'))} 
                className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer aria-selected:bg-red-500/10 aria-selected:text-red-400 text-slate-300 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>User Management</span>
              </Command.Item>
            </Command.Group>
          )}

          <Command.Group heading="Settings" className="text-xs font-semibold text-slate-500 px-2 py-3 [&_[cmdk-group-heading]]:mb-2 [&_[cmdk-group-heading]]:px-2 border-t border-slate-800/50 mt-2">
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/profile'))} 
              className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer aria-selected:bg-slate-800 aria-selected:text-white text-slate-300 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Profile Settings</span>
            </Command.Item>
          </Command.Group>

        </Command.List>
      </Command>
    </div>
  );
};
