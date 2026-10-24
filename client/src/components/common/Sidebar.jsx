import React from 'react';
import {
  Newspaper,
  PenSquare,
  LayoutDashboard,
  AlertTriangle,
  Calendar,
  FileText,
  FolderKanban,
  Cpu,
} from 'lucide-react';

export default function Sidebar({
  activeView,
  setActiveView,
  alertCount,
  currentUser,
  onOpenCreateStory,
}) {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#0d1322] border-r border-slate-200/80 dark:border-slate-800/80 sticky top-0 h-screen z-30 select-none transition-colors duration-200">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <Newspaper className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="font-serif-headline text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none block">
              The Dispatch
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
              Newsroom System
            </span>
          </div>
        </div>
      </div>

      {/* Primary Story Creation Button */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/60">
        <button
          id="sidebar-new-story-btn"
          onClick={onOpenCreateStory}
          className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-sm shadow-emerald-600/20 transition flex items-center justify-center gap-2"
        >
          <PenSquare className="w-4 h-4" />
          <span>New Story</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* 1. Overview */}
        <button
          id="nav-dashboard"
          onClick={() => setActiveView('dashboard')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
            activeView === 'dashboard'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </span>
          {activeView === 'dashboard' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
        </button>

        {/* 2. Overdue Alerts */}
        <button
          id="nav-alerts"
          onClick={() => setActiveView('alerts')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
            activeView === 'alerts'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <AlertTriangle className={`w-4 h-4 ${alertCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
            Overdue Alerts
          </span>
          {alertCount > 0 ? (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeView === 'alerts'
                  ? 'bg-amber-400 text-slate-900'
                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
              }`}
            >
              {alertCount}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-normal">0</span>
          )}
        </button>

        {/* 3. Editorial Calendar */}
        <button
          id="nav-calendar"
          onClick={() => setActiveView('calendar')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
            activeView === 'calendar'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4" />
            Release Calendar
          </span>
          {activeView === 'calendar' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
        </button>

        {/* 4. Articles & Feed */}
        <button
          id="nav-articles"
          onClick={() => setActiveView('articles')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
            activeView === 'articles'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <FileText className="w-4 h-4" />
            Articles & Feed
          </span>
          {activeView === 'articles' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
        </button>

        {/* 5. Desks & Beats */}
        <button
          id="nav-sections"
          onClick={() => setActiveView('sections')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
            activeView === 'sections'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <FolderKanban className="w-4 h-4" />
            Desks & Beats
          </span>
          {activeView === 'sections' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
        </button>

        {/* 6. Autonomous Scheduler */}
        <button
          id="nav-scheduler"
          onClick={() => setActiveView('scheduler')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
            activeView === 'scheduler'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-emerald-500" />
            Cron Engine
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            30s
          </span>
        </button>
      </nav>

      {/* Sidebar Footer — User Context */}
      <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Role</span>
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
              currentUser.role === 'EDITOR'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                : 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800/50'
            }`}
          >
            {currentUser.role}
          </span>
        </div>
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
          {currentUser.name || (currentUser.label ? currentUser.label.split(' ')[0] : 'User')}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{currentUser.desk}</p>
      </div>
    </aside>
  );
}
