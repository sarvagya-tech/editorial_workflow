import React from 'react';
import { Menu, Plus, UserCheck, Sun, Moon, RefreshCw } from 'lucide-react';
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
}) {
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
        <div>
          <span className="text-xs text-slate-400 font-medium">Newsroom / </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
            {getViewTitle()}
          </span>
        </div>
      </div>

      {/* Quick Actions, Demo Switcher, Theme Switcher & Refresh */}
      <div className="flex items-center gap-2.5">
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
            <UserCheck className="w-3.5 h-3.5" /> Demo User:
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

        {/* Minimalist Theme Segmented Switch */}
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
