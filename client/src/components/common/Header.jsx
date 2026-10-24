import React, { useState, useEffect } from 'react';
import {
  Menu,
  Sun,
  Moon,
  RefreshCw,
  Search,
  HelpCircle,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { DEMO_ACCOUNTS } from '../../constants/accounts';

export default function Header({
  activeView,
  currentUser,
  onUserSelect,
  theme,
  setTheme,
  onRefresh,
  loading,
  mobileMenuOpen,
  setMobileMenuOpen,
  onOpenCommandPalette,
  onOpenShortcuts,
  onNavigateToLanding,
  onSignOut,
}) {
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utc = now.toUTCString().slice(17, 22) + ' UTC';
      setTimeString(utc);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const getViewTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Editorial Dashboard';
      case 'alerts':
        return 'Overdue Articles';
      case 'calendar':
        return 'Editorial Calendar';
      case 'articles':
        return 'Article Repository';
      case 'sections':
        return 'Desks & Beats';
      case 'scheduler':
        return 'Autonomous Scheduler';
      default:
        return 'Newsroom';
    }
  };

  return (
    <header className="bg-white/80 dark:bg-[#0d1322]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-20 h-14 flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Left: Mobile Toggle & Clean Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Toggle mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 truncate">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
            Newsroom
          </span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
          <h1 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {getViewTitle()}
          </h1>

          {/* Minimal Live Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 pl-2.5 border-l border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono-code text-slate-400 dark:text-slate-500">{timeString}</span>
          </div>
        </div>
      </div>

      {/* Right: Quick Search, Persona Switcher & Utilities */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Quick Search Spotlight Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100/70 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 rounded-lg transition"
          title="Search or jump to... (⌘K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs font-normal">Search...</span>
          <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono-code font-semibold px-1 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400">
            ⌘K
          </kbd>
        </button>

        {/* Minimal User Persona Chip */}
        <div className="relative flex items-center bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 rounded-lg px-2 py-1 transition">
          <div className="w-5 h-5 rounded-full bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            {currentUser?.name ? currentUser.name[0] : 'U'}
          </div>
          <select
            id="demo-user-select"
            className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none pl-1.5 pr-4 py-0 appearance-none"
            value={currentUser.email}
            onChange={(e) => {
              const selected = DEMO_ACCOUNTS.find((a) => a.email === e.target.value);
              if (selected) onUserSelect(selected);
            }}
            title="Switch staff account"
          >
            {DEMO_ACCOUNTS.map((acc) => (
              <option
                key={acc.email}
                value={acc.email}
                className="bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 py-1"
              >
                {acc.name} ({acc.role})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none -ml-3 flex-shrink-0" />
        </div>

        {/* Subtle Divider */}
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Action Icon Group */}
        <div className="flex items-center gap-0.5">
          {/* Single Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            id={theme === 'dark' ? 'theme-light-btn' : 'theme-dark-btn'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Keyboard Shortcuts Helper */}
          <button
            onClick={onOpenShortcuts}
            title="Keyboard shortcuts (?)"
            className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="View keyboard shortcuts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Refresh Data */}
          <button
            id="refresh-btn"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh newsroom data"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
            aria-label="Refresh newsroom data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-500' : ''}`}
            />
          </button>

          {/* Sign Out Button */}
          <button
            id="sign-out-btn"
            onClick={onSignOut}
            title="Sign out of newsroom"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
