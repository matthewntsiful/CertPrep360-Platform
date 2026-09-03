import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ShieldCheck, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { useNavigate, Link } from 'react-router-dom';

type Step = 'REQUEST' | 'CONFIRM';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('REQUEST');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Move to confirm step immediately — don't make user wait for the API
    setStep('CONFIRM');
    setSuccess('If that email is registered, a reset code is on its way.');
    resetPassword({ username: email }).catch(() => {
      // silently ignore — user already sees the confirm step
    });
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
      setSuccess('Password reset! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-slate-900/50 backdrop-blur-xl p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative z-10"
      >
        <AnimatePresence mode="wait">
          {step === 'REQUEST' ? (
            <motion.div key="request" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-gradient-to-tr from-orange-600 via-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-6 shadow-[0_8px_30px_rgba(249,115,22,0.3)]">
                  <Mail className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Reset Password</h2>
                <p className="text-slate-400 text-sm">Enter your email and we'll send a reset code</p>
              </div>

              <form className="space-y-6" onSubmit={handleRequest}>
                {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">{error}</div>}
                {success && !error && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {success}
                  </div>
                )}
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-600"
                    placeholder="Email address"
                  />
                </div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-4 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-orange-500/20"
                >
                  Send Reset Code
                  <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              </form>

              <p className="text-center text-sm text-slate-500">
                Remember it?{' '}
                <Link to="/login" className="font-bold text-white hover:text-orange-500 transition-colors">Sign In</Link>
              </p>
            </motion.div>
          ) : (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
                  <ShieldCheck className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">New Password</h2>
                <p className="text-slate-400 text-sm">Enter the code sent to <span className="text-white font-bold">{email}</span></p>
              </div>

              <form className="space-y-6" onSubmit={handleConfirm}>
                {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">{error}</div>}
                {success && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {success}
                  </div>
                )}
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-xl text-white text-center text-2xl font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-800"
                    placeholder="000000"
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-600"
                    placeholder="New password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-4 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
