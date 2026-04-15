
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Shield } from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';

const PauseOverlay: React.FC = () => {
  const { status, toggleTimer } = useExamStore();

  return (
    <AnimatePresence>
      {status === 'paused' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="max-w-md w-full bg-slate-900 border border-slate-800 p-12 rounded-[2rem] text-center space-y-8 shadow-2xl relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-500/20 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative">
              <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight mb-2">Session Paused</h2>
              <p className="text-slate-400">Take a breather. Your progress and timer are safely held.</p>
            </div>

            <button
              onClick={toggleTimer}
              className="w-full py-4 bg-white text-slate-950 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.03] active:scale-[0.98] shadow-xl shadow-white/5"
            >
              <Play className="w-5 h-5 fill-current" /> Resume Practice
            </button>
            
            <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em] font-extrabold">
              CertPrep360 Platform
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PauseOverlay;
