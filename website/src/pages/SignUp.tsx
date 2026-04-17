import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, UserPlus, ArrowRight, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

type FormStep = 'SIGNUP' | 'VERIFY';

const SignUp: React.FC = () => {
  const { register, confirmRegister, resendCode } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<FormStep>('SIGNUP');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');
    try {
      await register({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          }
        }
      });
      setStep('VERIFY');
      setSuccess('Verification code sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');
    try {
      await confirmRegister({
        username: email,
        confirmationCode: verificationCode
      });
      setSuccess('Email verified! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendCode({ username: email });
      setSuccess('New code sent!');
    } catch (err: any) {
      setError('Could not resend code');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full space-y-8 bg-slate-900/50 backdrop-blur-xl p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative z-10"
      >
        <AnimatePresence mode="wait">
          {step === 'SIGNUP' ? (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
                  <UserPlus className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Create Account</h2>
                <p className="text-slate-400 text-sm">Join the next generation of AWS Architects</p>
              </div>

              <form className="space-y-6" onSubmit={handleSignUp}>
                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-600"
                      placeholder="Email address"
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-600"
                      placeholder="Secure Password"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> Password Requirements
                  </div>
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                    Min 8 chars, 1 Uppercase, 1 Number, 1 Symbol
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="group relative w-full flex justify-center py-4 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-500/20 disabled:opacity-50"
                >
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Identity'}
                  {!authLoading && <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-white hover:text-blue-500 transition-colors">Sign In</Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6 font-black text-2xl text-white">
                  6
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Verify Email</h2>
                <p className="text-slate-400 text-sm">We've sent a code to <span className="text-white font-bold">{email}</span></p>
              </div>

              <form className="space-y-6" onSubmit={handleVerify}>
                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
                    {error}
                  </div>
                )}
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
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-xl text-white text-center text-2xl font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-800"
                    placeholder="000000"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="group relative w-full flex justify-center py-4 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Verification'}
                </button>
              </form>

              <div className="text-center space-y-4">
                <p className="text-sm text-slate-500">Didn't receive a code?</p>
                <button
                  onClick={handleResend}
                  className="text-xs font-black uppercase tracking-widest text-white hover:text-emerald-500 transition-colors"
                >
                  Resend Verification Code
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default SignUp;
