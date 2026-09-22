import React, { useState } from 'react';
import { Waves, Play, LogOut, ToggleLeft, ToggleRight, LogIn, ChevronDown, Moon, Sun, Menu, X } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDemoMode: boolean;
  setIsDemoMode: (demo: boolean) => void;
  onRunDemoScenario: () => void;
  isDemoRunning: boolean;
  currentUser: { name: string; email: string; role: string; organization: string } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  isNightMode: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isDemoMode,
  setIsDemoMode,
  onRunDemoScenario,
  isDemoRunning,
  currentUser,
  onOpenAuth,
  onLogout,
  isNightMode,
  onToggleTheme,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);

  const navTabs = [
    { id: 'landing', label: 'Home' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'spill-analysis', label: 'Spill Analysis' },
    { id: 'drift-analysis', label: 'Drift & Origin' },
    { id: 'vessel-intelligence', label: 'Vessels' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'trajectory', label: 'Trajectory' },
    { id: 'reports', label: 'Reports' },
    { id: 'ai-pipeline', label: 'AI Pipeline' },
  ];

  return (
    <header className="ocean-navbar sticky top-0 z-50 bg-white border-b border-[#D9E3E7] shadow-[0_4px_18px_-14px_rgba(18,59,74,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Left: Product Identity & Logo */}
          <div
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0 pr-2"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 group-hover:bg-blue-600/30 transition-all">
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-[#123B4A]">
                  OceanTrace <span className="text-[#176B87]">AI</span>
                </span>
                <span className="hidden xl:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#1a2540] text-slate-400 border border-[#26334d] rounded">
                  SIH26143
                </span>
              </div>
              <p className="text-[10px] text-[#647780] hidden xl:block leading-none">
                AI Spill Detection & Vessel Correlation
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-0.5 overflow-x-auto scrollbar-none py-1">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#E8F2F4] text-[#176B87] border border-[#BFD8DF] font-semibold'
                    : 'text-[#647780] hover:text-[#123B4A] hover:bg-[#F4F7F8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#D9E3E7] bg-[#F4F7F8] text-[#176B87] hover:border-[#176B87] transition-all"
              aria-label={isNightMode ? 'Switch to bright mode' : 'Switch to night mode'}
              title={isNightMode ? 'Bright mode' : 'Night mode'}
            >
              {isNightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowMobileMenu((current) => !current)}
              className="mobile-menu-toggle hidden items-center justify-center w-8 h-8 rounded-lg border border-[#D9E3E7] bg-[#F4F7F8] text-[#176B87]"
              aria-label={showMobileMenu ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            {/* Demo Run Button */}
            <button
              onClick={onRunDemoScenario}
              disabled={isDemoRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all whitespace-nowrap ${
                isDemoRunning
                  ? 'bg-[#FFF7E6] text-[#A66F11] border border-[#E8C978] cursor-wait'
                  : 'bg-[#176B87] hover:bg-[#123B4A] text-white shadow-sm'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isDemoRunning ? '' : 'fill-current'}`} />
              <span>{isDemoRunning ? 'RUNNING...' : 'RUN DEMO'}</span>
            </button>

            {/* Mode Toggle */}
            <button
              onClick={() => setIsDemoMode(!isDemoMode)}
              className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border border-[#D9E3E7] bg-[#F4F7F8] text-[#647780] hover:border-[#A9C3CA] hover:text-[#123B4A] transition-all"
              title="Toggle Demo Mode or Live Data Mode"
            >
              {isDemoMode ? (
                <>
                  <ToggleRight className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-blue-400">DEMO</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400">LIVE</span>
                </>
              )}
            </button>

            {/* User Profile & Role Badge */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#D9E3E7] bg-white hover:border-[#176B87] text-[#123B4A] text-[11px] transition-all"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-400/50 text-blue-300 flex items-center justify-center font-bold text-[9px]">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="text-left hidden sm:block leading-tight">
                    <span className="font-bold block text-white text-[11px] max-w-[90px] truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[9px] text-blue-400 block font-mono">
                      {currentUser.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-60 glass-panel rounded-xl border border-[#26334d] p-3 shadow-xl space-y-3 z-[600]">
                    <div className="border-b border-[#1e2a42] pb-2 space-y-1">
                      <div className="font-bold text-white text-xs font-mono">{currentUser.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                      <div className="inline-block px-2 py-0.5 rounded bg-blue-600/15 border border-blue-500/30 text-blue-300 font-mono text-[10px] font-bold">
                        {currentUser.role.toUpperCase()}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{currentUser.organization}</div>
                    </div>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 border border-red-500/20 text-red-400 text-xs font-bold font-mono transition-all flex items-center justify-between"
                    >
                      <span>SIGN OUT / LOGOUT</span>
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E8F2F4] hover:bg-[#D9E3E7] text-[#176B87] border border-[#BFD8DF] text-[11px] font-bold transition-all whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>SIGN IN</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`mobile-navigation ${showMobileMenu ? 'is-open' : ''}`}>
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setShowMobileMenu(false);
              }}
              className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 bg-[#131b2e]'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="mobile-navigation-actions">
            <button
              onClick={() => {
                onRunDemoScenario();
                setShowMobileMenu(false);
              }}
              disabled={isDemoRunning}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#176B87] text-white text-[11px] font-bold"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isDemoRunning ? 'RUNNING...' : 'RUN DEMO'}
            </button>
            <button
              onClick={() => {
                onToggleTheme();
                setShowMobileMenu(false);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#D9E3E7] bg-[#F4F7F8] text-[#176B87] text-[11px] font-semibold"
            >
              {isNightMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {isNightMode ? 'Bright mode' : 'Night mode'}
            </button>
            {currentUser ? (
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  onLogout();
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#F0C0B3] bg-[#FFF1ED] text-[#C45D42] text-[11px] font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  onOpenAuth();
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#BFD8DF] bg-[#E8F2F4] text-[#176B87] text-[11px] font-semibold"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
