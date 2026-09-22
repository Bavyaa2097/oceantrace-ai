import React, { useState } from 'react';
import { Lock, Mail, User, Building, X, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onAuthSuccess: (user: { name: string; email: string; organization: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState<string>('investigator@coastguard.gov.in');
  const [loginPassword, setLoginPassword] = useState<string>('••••••••••••');
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Signup Form States
  const [signupName, setSignupName] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupOrg, setSignupOrg] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState<string>('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setErrorMsg('Please provide both email and password.');
      return;
    }

    const userData = {
      name: loginEmail.split('@')[0].toUpperCase(),
      email: loginEmail,
      organization: 'Indian Maritime Surveillance Authority',
    };

    localStorage.setItem('oceantrace_user', JSON.stringify(userData));
    onAuthSuccess(userData);
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupOrg || !signupPassword) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const userData = {
      name: signupName,
      email: signupEmail,
      organization: signupOrg,
    };

    localStorage.setItem('oceantrace_user', JSON.stringify(userData));
    onAuthSuccess(userData);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md glass-panel rounded-2xl border border-cyan-500/40 p-6 sm:p-8 shadow-2xl space-y-6 bg-navy-900/95 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold">
                SIH26143 AUTHENTICATION
              </span>
            </div>
            <h2 className="text-xl font-bold font-mono text-white mt-1">
              {mode === 'login' ? 'SIGN IN TO OCEANTRACE AI' : 'CREATE SURVEILLANCE ACCOUNT'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'login' ? 'Access maritime oil spill correlation platform' : 'Register official enforcement profile'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/80 border border-red-500/40 text-xs text-red-300 font-mono">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs font-sans">
            <div className="space-y-1">
              <label className="text-slate-300 font-mono">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="officer@coastguard.gov.in"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-mono">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Remember Me</span>
              </label>

              <button
                type="button"
                onClick={() => alert("Password reset link sent to demo registered email.")}
                className="text-cyan-400 hover:underline font-mono"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>SIGN IN TO DASHBOARD</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('signup');
                }}
                className="text-cyan-400 font-bold hover:underline font-mono"
              >
                Create Account
              </button>
            </div>
          </form>
        ) : (
          /* SIGNUP FORM */
          <form onSubmit={handleSignupSubmit} className="space-y-3 text-xs font-sans">
            <div className="space-y-1">
              <label className="text-slate-300 font-mono">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Capt. Rajesh Kumar"
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-mono">Official Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="r.kumar@maritime.gov.in"
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-mono">Organization / Agency</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={signupOrg}
                  onChange={(e) => setSignupOrg(e.target.value)}
                  placeholder="Indian Coast Guard / Pollution Control"
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-300 font-mono">Password</label>
                <input
                  type="password"
                  required
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-mono">Confirm</label>
                <input
                  type="password"
                  required
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>CREATE ACCOUNT</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>

            <div className="text-center pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('login');
                }}
                className="text-cyan-400 font-bold hover:underline font-mono"
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

