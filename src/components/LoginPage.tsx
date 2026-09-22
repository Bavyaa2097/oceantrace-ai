import React, { useState } from 'react';
import { Waves, Shield, Lock, Mail, Eye, EyeOff, KeyRound, CheckCircle2, AlertTriangle, ArrowRight, Building, RefreshCw, Cpu, Layers } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: { name: string; email: string; role: 'Investigator' | 'Administrator' | 'Viewer / Authority'; organization: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState<string>('investigator@coastguard.gov.in');
  const [password, setPassword] = useState<string>('••••••••••••');
  const [role, setRole] = useState<'Investigator' | 'Administrator' | 'Viewer / Authority'>('Investigator');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter your official email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      setIsLoading(false);
      const userObj = {
        name: email.split('@')[0].toUpperCase(),
        email,
        role,
        organization: role === 'Administrator' ? 'System Operations Command' : role === 'Viewer / Authority' ? 'Directorate General of Shipping' : 'Indian Maritime Surveillance Authority',
      };
      localStorage.setItem('oceantrace_user', JSON.stringify(userObj));
      onLoginSuccess(userObj);
    }, 700);
  };

  const handleDemoLogin = (demoRole: 'Investigator' | 'Administrator' | 'Viewer / Authority') => {
    setIsLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      setIsLoading(false);
      let demoUser = {
        name: 'CAPT. RAJESH KUMAR',
        email: 'r.kumar@coastguard.gov.in',
        role: demoRole,
        organization: 'Indian Coast Guard Intelligence',
      };

      if (demoRole === 'Administrator') {
        demoUser = {
          name: 'SYSADMIN OFFICER',
          email: 'admin@oceantrace.gov.in',
          role: demoRole,
          organization: 'System Operations & Audit Command',
        };
      } else if (demoRole === 'Viewer / Authority') {
        demoUser = {
          name: 'DIRECTOR GENERAL',
          email: 'dg@shipping.gov.in',
          role: demoRole,
          organization: 'Directorate General of Shipping (Read-Only)',
        };
      }

      localStorage.setItem('oceantrace_user', JSON.stringify(demoUser));
      onLoginSuccess(demoUser);
    }, 500);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Side: Maritime & Satellite System Branding */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-4">
            {/* System Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECF8F6] border border-[#B9DFD9] text-[#237E73] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Monitoring System • Operational
              </span>

              <span className="px-3 py-1 rounded-full bg-[#E8F2F4] border border-[#BFD8DF] text-[#176B87] text-xs font-semibold">
                SIH 2026 • Prototype
              </span>
            </div>

            {/* Title Header */}
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
              An AI-assisted platform for detecting probable marine oil spills from Synthetic Aperture Radar (SAR) imagery, analysing spill movement via hydrodynamic backtracking, and correlating maritime vessel trajectories for investigation.
            </p>
          </div>

          {/* Key Capabilities Bullet Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-white border border-[#D9E3E7] flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs text-[#123B4A]">Sentinel-1 SAR neural network</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#D9E3E7] flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="text-xs text-[#123B4A]">Hydrodynamic drift vector model</span>
            </div>
          </div>

          {/* Security & Prototype Notices */}
          <div className="p-4 rounded-xl bg-[#E8F2F4] border border-[#BFD8DF] text-xs text-[#647780] space-y-2">
            <div className="flex items-start gap-2 text-[#123B4A]">
              <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p>
                <strong>Security notice:</strong> This prototype is intended for authorized users. Access to satellite imagery, vessel information, investigation records and system data may be restricted based on user role.
              </p>
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-900">
              Prototype developed for SIH 2026 (SIH26143). Not an actual government system.
            </div>
          </div>
        </div>

        {/* Right Side: Secure Access Portal Card */}
        <div className="lg:col-span-6">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-[#BFD8DF] shadow-lg space-y-6 relative overflow-hidden">
            
            {/* Card Header */}
            <div className="border-b border-[#D9E3E7] pb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                  Authorization portal
                </span>
                <h3 className="text-xl font-extrabold text-[#123B4A] mt-0.5">
                  Secure Access Portal
                </h3>
              </div>
              <div className="p-2 rounded-lg bg-[#E8F2F4] border border-[#BFD8DF] text-[#176B87]">
                <Lock className="w-5 h-5" />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-950/80 border border-red-500/40 text-xs text-red-300 font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
              
              {/* Email / Username Field */}
              <div className="space-y-1">
                <label className="text-[#173B43] font-semibold">Official email / username</label>
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

              {/* Password Field with Eye Visibility Toggle */}
              <div className="space-y-1">
                <label className="text-[#173B43] font-semibold">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-[#F6F3ED] border border-[#BFD8DF] text-[#173B43] placeholder-[#87979D] focus:outline-none focus:border-[#176B87] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role Dropdown */}
              <div className="space-y-1">
                <label className="text-[#173B43] font-semibold">Access role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#F6F3ED] border border-[#BFD8DF] text-[#0F667A] font-semibold text-xs focus:outline-none focus:border-[#176B87] cursor-pointer"
                >
                  <option value="Investigator">Investigator (Full Spill Analysis & AIS Tracking)</option>
                  <option value="Administrator">Administrator (System Activity & Data Feeds)</option>
                  <option value="Viewer / Authority">Viewer / Authority (Read-Only GIS & Summaries)</option>
                </select>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-[11px] pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[#60727A]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-[#F6F3ED] border-[#BFD8DF] text-[#176B87] focus:ring-0"
                  />
                  <span>Remember Me</span>
                </label>

                <button
                  type="button"
                  onClick={() => alert("Password reset link sent to demo registered email.")}
                  className="text-[#176B87] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Sign In Button with Loading State */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-[#0F667A] to-[#2F8F83] hover:from-[#0F4C5C] hover:to-[#237E73] text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AUTHENTICATING SECURE PORTAL...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>SIGN IN TO SYSTEM</span>
                  </>
                )}
              </button>

              {/* Optional Organization SSO Button */}
              <button
                type="button"
                onClick={() => handleDemoLogin('Investigator')}
                className="w-full py-2.5 rounded-lg bg-[#F6F3ED] hover:bg-[#E2ECE9] border border-[#BFD8DF] text-[#0F667A] text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Building className="w-4 h-4 text-cyan-400" />
                <span>USE ORGANIZATION SSO</span>
              </button>
            </form>

            {/* SIH JUDGE DEMO ACCESS SECTION */}
            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                  SIH JUDGE QUICK DEMO ACCESS
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
                  1-CLICK LOGIN
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('Investigator')}
                  className="p-2.5 rounded-lg bg-[#EAF5F4] hover:bg-[#D8ECE8] border border-[#B7D7DB] text-[#0F667A] font-bold text-[11px] transition-all text-center"
                >
                  Investigator Demo
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('Administrator')}
                  className="p-2.5 rounded-lg bg-[#FFF1ED] hover:bg-[#FFE3DB] border border-[#F0C0B3] text-[#C45D42] font-bold text-[11px] transition-all text-center"
                >
                  Admin Demo
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('Viewer / Authority')}
                  className="p-2.5 rounded-lg bg-[#F6F3ED] hover:bg-[#E2ECE9] border border-[#D9E3E7] text-[#60727A] font-bold text-[11px] transition-all text-center"
                >
                  Viewer Demo
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
