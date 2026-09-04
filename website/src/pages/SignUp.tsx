import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, UserPlus, ArrowRight, CheckCircle2, ShieldCheck, Loader2, AlertCircle, Clock, Chrome } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithRedirect } from '@aws-amplify/auth';

type FormStep = 'SIGNUP' | 'VERIFY';

const SignUp: React.FC = () => {
  const { register, confirmRegister, resendCode, user, initializing: authCheckLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<FormStep>('SIGNUP');

  useEffect(() => {
    if (!authCheckLoading && user) navigate('/dashboard', { replace: true });
  }, [user, authCheckLoading, navigate]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleGoogleSignUp = async () => {
    try {
      setAuthLoading(true);
      await signInWithRedirect({ provider: 'Google' });
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed');
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');
    setEmailError('');
    setPasswordError('');
    setShowSlowWarning(false);

    let hasError = false;
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address.');
      hasError = true;
    }
    if (!password || password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      hasError = true;
    } else if (!/[A-Z]/.test(password)) {
      setPasswordError('Password must contain at least one uppercase letter.');
      hasError = true;
    } else if (!/[0-9]/.test(password)) {
      setPasswordError('Password must contain at least one number.');
      hasError = true;
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setPasswordError('Password must contain at least one symbol.');
      hasError = true;
    }

    if (hasError) {
      setAuthLoading(false);
      return;
    }

    // Show warning if taking longer than 3 seconds
    const warningTimer = setTimeout(() => {
      setShowSlowWarning(true);
    }, 3000);

    try {
      await register({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name: name.trim() || email.split('@')[0],
          }
        }
      });
      clearTimeout(warningTimer);
      setStep('VERIFY');
      setSuccess('Verification code sent to your email. Please check your inbox (and spam folder).');
    } catch (err: any) {
      clearTimeout(warningTimer);
      setError(err.message || 'Failed to sign up');
    } finally {
      setAuthLoading(false);
      setShowSlowWarning(false);
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
              <div className="text-center group">
                <div className="mx-auto h-16 w-16 bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 shadow-[0_8px_30px_rgba(59,130,246,0.3),inset_0_2px_2px_rgba(255,255,255,0.4)] group-hover:shadow-[0_15px_40px_rgba(59,130,246,0.5),inset_0_2px_2px_rgba(255,255,255,0.4)] cursor-pointer">
                  <UserPlus className="h-8 w-8 text-white drop-shadow-lg" strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Create Account</h2>
                <p className="text-slate-400 text-sm">Join the next generation of AWS Architects</p>
              </div>

              {/* Temporary notice promoting Google sign-in */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-400 text-sm font-bold text-center flex items-center justify-center gap-2 mb-2">
                  <Chrome className="w-5 h-5" />
                  <span>Recommended: Sign up with Google</span>
                </p>
                <p className="text-emerald-300/60 text-xs text-center">Instant access - no email verification needed</p>
              </div>

              {/* Google Sign Up Button - Prominent placement */}
              <button
                onClick={handleGoogleSignUp}
                disabled={authLoading}
                type="button"
                className="w-full flex items-center justify-center gap-3 py-4 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-500/20 disabled:opacity-50"
              >
                {authLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Chrome className="w-5 h-5" />
                )}
                <span>Sign Up with Google</span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] font-bold">
                  <span className="bg-slate-900 px-4 text-slate-500">Or use email</span>
                </div>
              </div>

              <form className="space-y-6" onSubmit={handleSignUp}>
                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
                    {error}
                  </div>
                )}
                
                <AnimatePresence>
                  {showSlowWarning && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-medium flex items-start gap-3"
                    >
                      <Clock className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <p className="font-bold mb-1">Creating your account...</p>
                        <p className="text-xs text-amber-400">Sending verification email. This may take up to 30 seconds.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  <div className="relative group">
                    <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-600"
                      placeholder="Full name"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="relative group">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${emailError ? 'text-red-500' : 'text-slate-500 group-focus-within:text-blue-500'}`} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                        className={`block w-full pl-12 pr-4 py-4 bg-slate-950 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all placeholder:text-slate-600 ${
                          emailError 
                            ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' 
                            : 'border-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                        }`}
                        placeholder="Email address"
                      />
                    </div>
                    {emailError && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-medium pl-1">
                        {emailError}
                      </motion.p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="relative group">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${passwordError ? 'text-red-500' : 'text-slate-500 group-focus-within:text-blue-500'}`} />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                        className={`block w-full pl-12 pr-4 py-4 bg-slate-950 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all placeholder:text-slate-600 ${
                          passwordError 
                            ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' 
                            : 'border-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                        }`}
                        placeholder="Secure Password"
                      />
                    </div>
                    {passwordError && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-medium pl-1">
                        {passwordError}
                      </motion.p>
                    )}
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
                  <Mail className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Verify Email</h2>
                <p className="text-slate-400 text-sm mb-2">We've sent a 6-digit code to</p>
                <p className="text-white font-bold mb-4">{email}</p>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-400 flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Email may take up to 30 seconds to arrive. Check spam folder if needed.</span>
                  </p>
                </div>
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
