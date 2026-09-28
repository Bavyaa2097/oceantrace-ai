import React, { useState } from 'react';
import { Waves, LogOut, LogIn, ChevronDown, Menu, X } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: { name: string; email: string; role: string; organization: string } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  workspaceMode?: boolean;
  showDesktopNavigation?: boolean;
  workspaceStatusLabels?: Record<string, string | null>;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth,
  onLogout,
  workspaceMode = false,
  showDesktopNavigation = true,
  workspaceStatusLabels = {},
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);

  const navTabs = [
    { id: 'landing', label: 'Home', accent: 'tab-home' },
    { id: 'dashboard', label: 'Dashboard', accent: 'tab-dashboard' },
    { id: 'spill-analysis', label: 'Spill Analysis', accent: 'tab-spill' },
    { id: 'drift-analysis', label: 'Drift & Origin', accent: 'tab-drift' },
    { id: 'vessel-intelligence', label: 'Vessels', accent: 'tab-vessels' },
    { id: 'timeline', label: 'Timeline', accent: 'tab-timeline' },
    { id: 'trajectory', label: 'Trajectory', accent: 'tab-trajectory' },
    { id: 'reports', label: 'Reports', accent: 'tab-reports' },
    { id: 'ai-pipeline', label: 'AI Pipeline', accent: 'tab-pipeline' },
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
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#e6efed] border border-[#b9d5d0] text-[#176b87] group-hover:bg-[#d8e9e5] transition-all">
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-[#123B4A]">
                  OceanTrace <span className="text-[#176B87]">AI</span>
                </span>
              </div>
              <p className="text-[10px] text-[#647780] hidden xl:block leading-none">
                Maritime environmental monitoring
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className={`${workspaceMode || !showDesktopNavigation ? 'hidden' : 'hidden md:flex'} flex-1 items-center justify-center space-x-1 px-4 overflow-x-auto scrollbar-none py-1`}>
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab ${tab.accent} px-3 py-1.5 text-[11px] font-medium rounded-md whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'is-active font-semibold'
                    : ''
                }`}
              >
                <span className="block">{tab.label}</span>
                {workspaceStatusLabels[tab.id] && (
                  <span className="mt-0.5 block text-[9px] opacity-75">{workspaceStatusLabels[tab.id]}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowMobileMenu((current) => !current)}
              className="mobile-menu-toggle hidden items-center justify-center w-8 h-8 rounded-lg border border-[#D9E3E7] bg-[#F4F7F8] text-[#176B87]"
              aria-label={showMobileMenu ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
                    <span className="font-bold block text-[#173b43] text-[11px] max-w-[90px] truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[9px] text-[#176b87] block">
                      {currentUser.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-60 glass-panel rounded-xl border border-[#26334d] p-3 shadow-xl space-y-3 z-[600]">
                    <div className="border-b border-[#1e2a42] pb-2 space-y-1">
                      <div className="font-bold text-[#173b43] text-xs">{currentUser.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                      <div className="inline-block px-2 py-0.5 rounded bg-[#e8f2f4] border border-[#bfd8df] text-[#176b87] text-[10px] font-semibold">
                        {currentUser.role}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{currentUser.organization}</div>
                    </div>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-[#fff1ed] hover:bg-[#ffe3db] border border-[#f0c0b3] text-[#c45d42] text-xs font-semibold transition-all flex items-center justify-between"
                    >
                      <span>Sign out</span>
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
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`mobile-navigation ${showMobileMenu ? 'is-open' : ''}`}>
          {workspaceMode ? (
            <div className="mobile-workspace-navigation">
              {[
                { heading: 'WORKSPACE', ids: ['dashboard'] },
                { heading: 'INVESTIGATION', ids: ['spill-analysis', 'drift-analysis', 'vessel-intelligence', 'timeline', 'trajectory'] },
                { heading: 'OUTPUT', ids: ['reports', 'ai-pipeline'] },
              ].map((section) => (
                <section key={section.heading}>
                  <h2>{section.heading}</h2>
                  <div>
                    {navTabs.filter((tab) => section.ids.includes(tab.id)).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setShowMobileMenu(false);
                        }}
                        className={`nav-tab ${tab.accent} ${activeTab === tab.id ? 'is-active' : ''}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setShowMobileMenu(false);
              }}
              className={`nav-tab ${tab.accent} whitespace-nowrap px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                activeTab === tab.id ? 'is-active' : ''
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="mobile-navigation-actions">
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
