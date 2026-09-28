import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  UserPlus,
  Waves,
} from 'lucide-react';
import { useAuth, UserProfile } from '../context/AuthContext';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const {
    signIn,
    signUp,
    resetPassword,
    isConfigured,
    isLoading: isAuthLoading,
    authError,
    clearAuthError,
    signInLocalMock,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');

  // Sign In fields
  const [email, setEmail] = useState<string>('investigator@coastguard.gov.in');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Sign Up fields
  const [signUpFullName, setSignUpFullName] = useState<string>('');
  const [signUpEmail, setSignUpEmail] = useState<string>('');
  const [signUpPassword, setSignUpPassword] = useState<string>('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState<string>('');
  const [signUpOrganization, setSignUpOrganization] = useState<string>('Indian Maritime Surveillance Authority');

  // Forgot Password fields
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotSuccess, setForgotSuccess] = useState<boolean>(false);

  // UI status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setLocalError(null);
    setConfirmationNotice(null);
    setForgotSuccess(false);
    clearAuthError();
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    const res = await signIn(email, password);
    setIsSubmitting(false);

    if (res.ok) {
      onLoginSuccess();
    } else if (res.error) {
      setLocalError(res.error);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setConfirmationNotice(null);

    if (!signUpFullName.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!signUpEmail || !signUpPassword) {
      setLocalError('Please fill in all required sign-up fields.');
      return;
    }
    if (signUpPassword.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const res = await signUp(signUpEmail, signUpPassword, signUpFullName, signUpOrganization);
    setIsSubmitting(false);

    if (res.ok) {
      if (res.requiresConfirmation) {
        setConfirmationNotice(
          `Account created successfully. A confirmation link has been sent to ${signUpEmail}. Please confirm your email before signing in.`
        );
      } else {
        onLoginSuccess();
      }
    } else if (res.error) {
      setLocalError(res.error);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!forgotEmail) {
      setLocalError('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);
    const res = await resetPassword(forgotEmail);
    setIsSubmitting(false);

    if (res.ok) {
      setForgotSuccess(true);
    } else if (res.error) {
      setLocalError(res.error);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Side: Maritime & Satellite System Branding */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ecf8f6] border border-[#b9dfd9] text-[#237e73] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Monitoring System • Operational
              </span>

              {isConfigured ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold">
                  ✓ Supabase Auth Active
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-semibold">
                  Unconfigured Auth • Preview Mode
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E76F51]/15 border border-[#E76F51]/35 text-[#D85B3D] flex items-center justify-center font-bold">
                  <Waves className="w-6 h-6 animate-pulse-slow" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123B4A] tracking-tight">
                  OceanTrace <span className="text-[#176B87]">AI</span>
                </h1>
              </div>

              <h2 className="text-lg font-bold text-[#123B4A] mt-2">
                Maritime oil spill intelligence system
              </h2>

              <p className="text-xs font-semibold text-[#0F667A] mt-1">
                Satellite intelligence • AIS correlation • Maritime investigation
              </p>
            </div>

            <p className="text-sm text-[#647780] leading-relaxed font-sans">
              A maritime investigation platform for detecting probable marine oil spills from Synthetic Aperture Radar (SAR) imagery, analysing spill movement via hydrodynamic backtracking, and correlating vessel trajectories for review.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-white border border-[#D9E3E7] flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-cyan-500 shrink-0" />
              <span className="text-xs text-[#123B4A]">Sentinel-1 SAR neural network</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#D9E3E7] flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-teal-500 shrink-0" />
              <span className="text-xs text-[#123B4A]">Hydrodynamic drift vector model</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#E8F2F4] border border-[#BFD8DF] text-xs text-[#647780] space-y-2">
            <div className="flex items-start gap-2 text-[#123B4A]">
              <Shield className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
              <p>
                <strong>Security notice:</strong> Authenticated access strictly isolates user investigation records using database Row Level Security.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Portal Panel */}
        <div className="lg:col-span-6">
          <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[#BFD8DF] shadow-sm space-y-5 relative overflow-hidden">
            
            {/* Header */}
            <div className="border-b border-[#D9E3E7] pb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-[#176b87] tracking-wide">
                  Authorization portal
                </span>
                <h3 className="text-xl font-extrabold text-[#123B4A] mt-0.5">
                  {mode === 'signin' && 'Sign in to OceanTrace'}
                  {mode === 'signup' && 'Create Investigator Account'}
                  {mode === 'forgot' && 'Reset Password'}
                </h3>
              </div>
              <div className="p-2 rounded-lg bg-[#E8F2F4] border border-[#BFD8DF] text-[#176B87]">
                <Lock className="w-5 h-5" />
              </div>
            </div>

            {displayError && (
              <div role="alert" className="p-3 rounded-lg bg-[#fff1ed] border border-[#f0c0b3] text-xs text-[#c45d42] flex items-center gap-2 font-sans">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{displayError}</span>
              </div>
            )}

            {confirmationNotice && (
              <div role="status" className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 flex items-start gap-2 font-sans">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{confirmationNotice}</span>
              </div>
            )}

            {/* SIGN IN FORM */}
            {mode === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-4 text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-[#173B43] font-semibold">Official email address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="investigator@coastguard.gov.in"
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#F6F3ED] border border-[#BFD8DF] text-[#173B43] placeholder-[#87979D] focus:outline-none focus:border-[#176B87] text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[#173B43] font-semibold">Password</label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] text-[#176B87] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-[#F6F3ED] border border-[#BFD8DF] text-[#173B43] placeholder-[#87979D] focus:outline-none focus:border-[#176B87] text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isAuthLoading}
                  className="w-full py-3 rounded-lg bg-[#176B87] hover:bg-[#123B4A] text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authenticating…</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Sign in</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2 border-t border-[#D9E3E7]">
                  <span className="text-slate-500">Need an investigator account? </span>
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-[#176B87] font-bold hover:underline"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            )}

            {/* SIGN UP FORM */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3 text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-[#173B43] font-semibold">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={signUpFullName}
                    onChange={(e) => setSignUpFullName(e.target.value)}
                    placeholder="Capt. Rajesh Kumar"
                    className="w-full px-3 py-2 rounded-lg bg-[#F6F3ED] border border-[#BFD8DF] text-[#173B43] text-xs focus:outline-none focus:border-[#176B87]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#173B43] font-semibold">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="r.kumar@coastguard.gov.in"
                    className="w-full px-3 py-2 rounded-lg bg-[#F6F3ED] border border-[#BFD8DF] text-[#173B43] text-xs focus:outline-none focus:border-[#176B87]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[#173B43] font-semibold">Password *</label>
                    <input
                      type="password"
                      required
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3 py-2 rounded-lg bg-[#F6F3ED] border border-[#BFD8DF] text-[#173B43] text-xs focus:outline-none focus:border-[#176B87]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#173B43] font-semibold">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 rounded-lg bg-[#F6F3ED] border border-[#BFD8DF] text-[#173B43] text-xs focus:outline-none focus:border-[#176B87]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[#173B43] font-semibold">Institution / Organization</label>
                  <input
                    type="text"
                    value={signUpOrganization}
                    onChange={(e) => setSignUpOrganization(e.target.value)}
                    placeholder="Indian Maritime Surveillance Authority"
                    className="w-full px-3 py-2 rounded-lg bg-[#F6F3ED] border border-[#BFD8DF] text-[#173B43] text-xs focus:outline-none focus:border-[#176B87]"
                  />
                </div>

                <div className="p-2.5 rounded bg-[#E8F2F4] border border-[#BFD8DF] text-[11px] text-[#176B87] space-y-0.5">
                  <div><strong>Default Role:</strong> Investigator</div>
                  <div className="text-[10px] text-slate-500">New accounts strictly default to Investigator. Role assignment cannot be self-modified.</div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isAuthLoading}
                  className="w-full py-2.5 rounded-lg bg-[#176B87] hover:bg-[#123B4A] text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Account…</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Investigator Account</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2 border-t border-[#D9E3E7]">
                  <span className="text-slate-500">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-[#176B87] font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs font-sans">
                {forgotSuccess ? (
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-700">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Reset Link Sent</span>
                    </div>
                    <p className="text-xs">
                      If an account exists for <strong>{forgotEmail}</strong>, password reset instructions have been sent to that address.
                    </p>
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="mt-2 text-xs font-bold text-[#176B87] hover:underline block"
                    >
                      ← Return to Sign In
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-600 text-xs">
                      Enter your registered official email address to receive password reset instructions.
                    </p>
                    <div className="space-y-1">
                      <label className="text-[#173B43] font-semibold">Registered email</label>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="investigator@coastguard.gov.in"
                        className="w-full px-3 py-2.5 rounded-lg bg-[#F6F3ED] border border-[#BFD8DF] text-[#173B43] text-xs focus:outline-none focus:border-[#176B87]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-lg bg-[#176B87] hover:bg-[#123B4A] text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>Send Reset Link</span>
                      )}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => switchMode('signin')}
                        className="text-[#176B87] font-bold hover:underline"
                      >
                        ← Back to Sign In
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
