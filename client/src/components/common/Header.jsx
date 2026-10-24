import React, { useState, useEffect } from 'react';
import {
  Menu,
  Plus,
  UserCheck,
  Sun,
  Moon,
  RefreshCw,
  Search,
  Command,
  HelpCircle,
  Radio,
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
  onOpenCreateStory,
  onOpenCommandPalette,
  onOpenShortcuts,
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
    <header className="bg-white/80 dark:bg-[#0d1322]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-20 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Toggle mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb / Title */}
        <div className="flex items-center gap-3">
          <div>
            <span className="text-xs text-slate-400 font-medium">Newsroom / </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
              {getViewTitle()}
            </span>
          </div>

          {/* Live Edition Ticker Badge */}
          <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Edition Live
            </span>
            <span className="text-[11px] font-mono-code text-slate-400">{timeString}</span>
          </div>
        </div>
      </div>

      {/* Quick Search, Demo Switcher, Theme Switcher & Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Spotlight Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60 rounded-xl transition shadow-xs cursor-pointer"
          title="Open Command Palette (Ctrl+K or ⌘K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline font-medium text-slate-600 dark:text-slate-300">Quick Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono-code font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
            ⌘K
          </kbd>
        </button>

        {/* Top Bar Quick Story Button */}
        <button
          id="header-new-story-btn"
          onClick={onOpenCreateStory}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Story</span>
        </button>

        {/* Demo User Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs border border-slate-200/60 dark:border-slate-700/60">
          <span className="text-slate-500 dark:text-slate-400 px-2 font-medium hidden lg:flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" /> Persona:
          </span>
          <select
            id="demo-user-select"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            value={currentUser.email}
            onChange={(e) => {
              const selected = DEMO_ACCOUNTS.find((a) => a.email === e.target.value);
              if (selected) onUserSelect(selected);
            }}
          >
            {DEMO_ACCOUNTS.map((acc) => (
              <option key={acc.email} value={acc.email}>
                {acc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Theme Segmented Switch */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
          <button
            id="theme-light-btn"
            onClick={() => setTheme('light')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title="Switch to light mode"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-medium hidden sm:inline">Light</span>
          </button>
          <button
            id="theme-dark-btn"
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              theme === 'dark'
                ? 'bg-slate-900 text-white shadow-sm font-semibold dark:bg-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title="Switch to dark mode"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-medium hidden sm:inline">Dark</span>
          </button>
        </div>

        {/* Shortcuts Helper Button */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts (?)"
          className="hidden md:flex p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition shadow-xs"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Refresh Button */}
        <button
          id="refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh Newsroom Data"
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
        </button>
      </div>
    </header>
  );
}
