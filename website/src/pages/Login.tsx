import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Lock, LogIn, Chrome, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signInWithRedirect } from '@aws-amplify/auth';

const Login: React.FC = () => {
  const { login, user, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Safeguard: If the user is already authenticated, don't stay on the login page
  useEffect(() => {
    if (!initializing && user) {
      console.log('User already authenticated, redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [user, initializing, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
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
    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
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
      await login({ username: email, password });
      clearTimeout(warningTimer);
      navigate(from, { replace: true });
    } catch (err: any) {
      clearTimeout(warningTimer);
      setError(err.message || 'Failed to login');
    } finally {
      setAuthLoading(false);
      setShowSlowWarning(false);
    }
  };

  const handleSocialLogin = async () => {
    setShowSlowWarning(false);
    setAuthLoading(true);
    
    // Show warning for OAuth as well
    const warningTimer = setTimeout(() => {
      setShowSlowWarning(true);
    }, 3000);

    try {
      await signInWithRedirect({ provider: 'Google' });
      clearTimeout(warningTimer);
    } catch (err: any) {
      clearTimeout(warningTimer);
      setError(err.message || 'Google sign-in failed');
      setAuthLoading(false);
      setShowSlowWarning(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-slate-900/50 backdrop-blur-xl p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl"
      >
        <div className="text-center group">
          <div className="mx-auto h-16 w-16 bg-gradient-to-tr from-orange-600 via-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 shadow-[0_8px_30px_rgba(249,115,22,0.3),inset_0_2px_2px_rgba(255,255,255,0.4)] group-hover:shadow-[0_15px_40px_rgba(249,115,22,0.5),inset_0_2px_2px_rgba(255,255,255,0.4)] cursor-pointer">
            <Shield className="h-8 w-8 text-white drop-shadow-lg" strokeWidth={2.5} />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Welcome Back</h2>
          <p className="text-slate-400 text-sm">Secure access to your AWS training environment</p>
        </div>

        {/* Temporary notice promoting Google sign-in */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-blue-400 text-sm font-medium text-center flex items-center justify-center gap-2">
            <Chrome className="w-4 h-4" />
            <span>Recommended: Use Google for instant sign-in</span>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleSocialLogin}
            disabled={authLoading}
            className="flex items-center justify-center gap-3 w-full py-4 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-500/20 disabled:opacity-50"
          >
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Chrome className="w-5 h-5" />
            )}
            Continue with Google
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] font-bold">
            <span className="bg-slate-900 px-4 text-slate-500">Or use email</span>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
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
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">Processing authentication...</p>
                  <p className="text-xs text-amber-400">This may take up to 30 seconds due to email verification. Please wait.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${emailError ? 'text-red-500' : 'text-slate-500 group-focus-within:text-orange-500'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  className={`block w-full pl-12 pr-4 py-4 bg-slate-950 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all placeholder:text-slate-600 ${
                    emailError 
                      ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' 
                      : 'border-slate-800 focus:ring-orange-500/20 focus:border-orange-500'
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
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${passwordError ? 'text-red-500' : 'text-slate-500 group-focus-within:text-orange-500'}`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  className={`block w-full pl-12 pr-4 py-4 bg-slate-950 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all placeholder:text-slate-600 ${
                    passwordError 
                      ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' 
                      : 'border-slate-800 focus:ring-orange-500/20 focus:border-orange-500'
                  }`}
                  placeholder="Password"
                />
              </div>
              {passwordError && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-medium pl-1">
                  {passwordError}
                </motion.p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="flex items-center">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-orange-500 focus:ring-orange-500/20" />
              <label className="ml-2 block text-sm text-slate-400">Remember me</label>
            </div>
            <Link to="/forgot-password" className="text-sm font-bold text-orange-500 hover:text-orange-400">Forgot?</Link>
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="group relative w-full flex justify-center items-center gap-2 py-4 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-orange-500/20 disabled:opacity-50 disabled:hover:scale-100"
          >
            {authLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <LogIn className="h-5 w-5 text-orange-300 group-hover:text-white" />
                </span>
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Not registered yet?{' '}
          <Link to="/signup" className="font-bold text-white hover:text-orange-500 transition-colors">Create Account</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
