import React, { useState } from 'react';
import {
  TrendingUp,
  Clock,
  Calendar,
  CheckCircle2,
  FileEdit,
  AlertTriangle,
  ArrowRight,
  Layers,
  FolderKanban,
  AlertCircle,
  PenSquare,
  Sparkles,
  BookOpen,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { STATUS_CONFIG } from '../../constants/status';

export default function DashboardView({
  currentUser,
  dashboardData,
  dashboardLoading,
  dashboardError,
  alertCount = 0,
  onNavigateToAlerts,
  onRetry,
  articles = [],
  onOpenArticle,
  onOpenCreateStory,
  onNavigateToCalendar,
  onNavigateToArticles,
  onNavigateToDesks,
}) {
  const [hoveredWeek, setHoveredWeek] = useState(null);

  const summary = dashboardData?.summary || {
    inReview: 0,
    scheduledThisWeek: 0,
    publishedThisWeek: 0,
    openDrafts: 0,
    overdueAlerts: alertCount,
  };

  const byStatus = dashboardData?.byStatus || [];
  const bySection = dashboardData?.bySection || [];
  const weeklyPublications = dashboardData?.weeklyPublications || [];
  const maxWeeklyCount = Math.max(1, ...weeklyPublications.map((w) => w.count));
  const totalVisibleArticles = byStatus.reduce((acc, s) => acc + s.count, 0);

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = currentUser?.name || (currentUser?.label ? currentUser.label.split(' ')[0] : 'Editor');
  const isEditor = currentUser?.role === 'EDITOR';

  // Find priority stories requiring attention (IN_REVIEW first, then SCHEDULED, then DRAFT)
  const priorityArticles = articles
    .filter((a) => a.status === 'IN_REVIEW' || a.status === 'SCHEDULED' || a.status === 'DRAFT')
    .sort((a, b) => {
      const order = { IN_REVIEW: 1, SCHEDULED: 2, DRAFT: 3 };
      return (order[a.status] || 99) - (order[b.status] || 99);
    })
    .slice(0, 4);

  // 8-week total and average calculation
  const totalEightWeeks = weeklyPublications.reduce((acc, w) => acc + (w.count || 0), 0);
  const avgPerWeek = weeklyPublications.length > 0 ? (totalEightWeeks / weeklyPublications.length).toFixed(1) : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ----------------------------------------------------
          1. NEWSROOM COMMAND HERO BANNER
      ---------------------------------------------------- */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 dark:from-slate-950 dark:via-[#0d1322] dark:to-[#0f1d36] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800/80 dark:border-slate-800/90">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-60 h-60 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isEditor ? 'Editorial Leadership Desk' : 'Assigned Reporting Bureau'}
              </span>
              <span className="text-xs text-slate-400 font-medium">•</span>
              <span className="text-xs text-slate-300 font-semibold">{currentUser?.desk || 'General Coverage'}</span>
            </div>

            <h1 className="font-serif-headline text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              {getGreeting()}, {userName}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 dark:text-slate-400 leading-relaxed">
              {isEditor
                ? 'Welcome to The Dispatch editorial control desk. Manage story assignments, collaborative revisions, embargo dates, and autonomous publishing pipelines.'
                : `Active beat reporting console for ${currentUser?.desk}. Author new investigative drafts, track editor feedback, and monitor scheduled release drops.`}
            </p>
          </div>

          {/* Quick Action Shortcuts inside Hero */}
          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
            {onOpenCreateStory && (
              <button
                onClick={onOpenCreateStory}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 group active:scale-[0.98]"
              >
                <PenSquare className="w-4 h-4 transition-transform group-hover:rotate-6" />
                <span>New Story Draft</span>
              </button>
            )}

            {onNavigateToCalendar && (
              <button
                onClick={onNavigateToCalendar}
                className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 font-semibold text-xs rounded-xl transition flex items-center gap-2 active:scale-[0.98]"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Calendar</span>
              </button>
            )}

            {alertCount > 0 && onNavigateToAlerts && (
              <button
                onClick={onNavigateToAlerts}
                className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 active:scale-[0.98]"
              >
                <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                <span>Alerts ({alertCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. OVERDUE ALERTS BANNER (IF ANY)
      ---------------------------------------------------- */}
      {alertCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {alertCount} Scheduled Article{alertCount === 1 ? '' : 's'} Overdue for Release
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                These stories passed their publication timestamp without release. Review reasons or dismiss in the alerts center.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToAlerts}
            className="self-start sm:self-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            Review Overdue Alerts ({alertCount}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {dashboardError && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-xs font-semibold">{dashboardError}</span>
          </div>
          <button
            onClick={onRetry}
            className="text-xs bg-red-100 dark:bg-red-900 hover:bg-red-200 text-red-900 dark:text-red-100 px-3 py-1 rounded-xl font-semibold transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* ----------------------------------------------------
          3. KEY PRODUCTION METRICS CARDS
      ---------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-serif-headline text-lg font-bold text-slate-900 dark:text-white">
              Editorial Pipeline Throughput
            </h2>
            <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              Live
            </span>
          </div>
          {dashboardLoading && <span className="text-xs text-slate-400 animate-pulse">Synchronizing metrics...</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: In Review */}
          <div
            onClick={() => onNavigateToArticles?.('IN_REVIEW')}
            className="group bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-amber-400 dark:hover:border-amber-600/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/60 uppercase tracking-wider">
                  Review Queue
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center transition-transform group-hover:scale-110">
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono-code">
                  {dashboardLoading && !dashboardData ? '—' : summary.inReview}
                </span>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Pending Approval</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Articles submitted for editorial sign-off
                </p>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-semibold text-amber-700 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
              <span>Inspect review queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: Scheduled This Week */}
          <div
            onClick={() => onNavigateToArticles?.('SCHEDULED')}
            className="group bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 uppercase tracking-wider">
                  Locked Release
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-transform group-hover:scale-110">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono-code">
                  {dashboardLoading && !dashboardData ? '—' : summary.scheduledThisWeek}
                </span>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Scheduled Drops</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Locked stories awaiting target timestamps
                </p>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
              <span>View scheduled feed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3: Published This Week */}
          <div
            onClick={() => onNavigateToArticles?.('PUBLISHED')}
            className="group bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-600/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 uppercase tracking-wider">
                  Live Journalism
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-110">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono-code">
                  {dashboardLoading && !dashboardData ? '—' : summary.publishedThisWeek}
                </span>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Published This Week</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Live articles distributed to audience
                </p>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
              <span>Explore live archive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 4: Open Drafts */}
          <div
            onClick={() => onNavigateToArticles?.('DRAFT')}
            className="group bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-sky-400 dark:hover:border-sky-600/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-200 dark:border-sky-800/60 uppercase tracking-wider">
                  Reporter WIP
                </span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center transition-transform group-hover:scale-110">
                  <FileEdit className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono-code">
                  {dashboardLoading && !dashboardData ? '—' : summary.openDrafts}
                </span>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Active Drafts</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Works in progress across reporting desks
                </p>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-semibold text-sky-700 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
              <span>View draft workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          4. URGENT / ACTIVE STORIES QUEUE
      ---------------------------------------------------- */}
      {priorityArticles.length > 0 && (
        <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h3 className="font-serif-headline text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                Stories Requiring Attention
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Immediate editorial review queue and impending release embargos.
              </p>
            </div>
            <button
              onClick={() => onNavigateToArticles?.('')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 self-start sm:self-auto"
            >
              All stories <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {priorityArticles.map((art) => {
              const conf = STATUS_CONFIG[art.status] || STATUS_CONFIG.DRAFT;
              const wordCount = (art.body || '').split(/\s+/).filter(Boolean).length;
              const readTime = Math.max(1, Math.ceil(wordCount / 200));

              return (
                <div
                  key={art.id}
                  onClick={() => onOpenArticle?.(art.id)}
                  className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${conf.badge}`}>
                        {conf.label}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {art.section?.name || 'General Desk'}
                      </span>
                    </div>

                    <h4 className="font-serif-headline text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {art.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {art.body?.slice(0, 140) || 'No lead content authored yet.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span>By {art.author?.name || 'Reporter'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {readTime}m read
                      </span>
                    </div>

                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      Inspect <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ----------------------------------------------------
          5. EIGHT-WEEK PUBLICATION TRAJECTORY CHART
      ---------------------------------------------------- */}
      <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-7 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif-headline text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Publication Trajectory
              </h3>
              <span className="text-[11px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                8-Week Window
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Weekly verified article release volume across authorized reporting desks (Mon–Sun UTC).
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono-code">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Released</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">{totalEightWeeks} Stories</span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Weekly Avg</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{avgPerWeek} / wk</span>
            </div>
          </div>
        </div>

        {/* SVG Bar Chart with Rich Interactive Hover */}
        <div className="h-52 w-full flex items-end gap-2 sm:gap-4 pt-10 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
          {weeklyPublications.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              No historical publication cycles recorded yet.
            </div>
          ) : (
            weeklyPublications.map((week, idx) => {
              const isCurrent = idx === weeklyPublications.length - 1;
              const heightPercent = maxWeeklyCount > 0 ? Math.max(10, (week.count / maxWeeklyCount) * 100) : 10;
              const isHovered = hoveredWeek === idx;

              return (
                <div
                  key={week.week}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  onMouseEnter={() => setHoveredWeek(idx)}
                  onMouseLeave={() => setHoveredWeek(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-14 z-20 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold py-1.5 px-3 rounded-xl shadow-xl whitespace-nowrap pointer-events-none border border-slate-700/60 animate-fadeIn">
                      <span className="text-slate-300 font-mono-code">{week.week}: </span>
                      <strong className="text-emerald-400">{week.count}</strong> stories live
                    </div>
                  )}

                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-xl transition-all duration-300 ${
                      isCurrent
                        ? 'bg-gradient-to-t from-emerald-600 to-teal-500 dark:from-emerald-600 dark:to-teal-400 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-200 dark:bg-slate-800 hover:bg-emerald-200 dark:hover:bg-slate-700'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />

                  {/* Label */}
                  <span className="text-[10px] text-slate-400 font-mono-code font-semibold mt-2.5 truncate w-full text-center">
                    {String(week.week || '').includes('-') ? `W${String(week.week).split('-')[1]}` : (week.week || '')}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ----------------------------------------------------
          6. PIPELINE FUNNEL & DESK ALLOCATIONS (2 COLUMNS)
      ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Funnel */}
        <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-serif-headline text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Editorial Governance Pipeline
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Multi-state lifecycle distribution across all reporting desks.
              </p>
            </div>
            <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {totalVisibleArticles} Total
            </span>
          </div>

          <div className="space-y-4">
            {['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'].map((st) => {
              const item = byStatus.find((s) => s.status === st) || { status: st, count: 0 };
              const conf = STATUS_CONFIG[st] || STATUS_CONFIG.DRAFT;
              const percentage = totalVisibleArticles > 0 ? Math.round((item.count / totalVisibleArticles) * 100) : 0;

              return (
                <div
                  key={st}
                  onClick={() => onNavigateToArticles?.(st)}
                  className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${conf.dot}`} />
                      {conf.label}
                    </span>
                    <span className="font-mono-code text-slate-500 dark:text-slate-400">
                      {item.count} stories ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${conf.bar}`}
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Desk Allocation */}
        <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-serif-headline text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  Active Reporting Desks
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Editorial bureau allocations and story volume.
                </p>
              </div>
              {onNavigateToDesks && (
                <button
                  onClick={onNavigateToDesks}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-1"
                >
                  Manage <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {bySection.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No active bureaus found.
                </div>
              ) : (
                bySection.map((sec) => (
                  <div
                    key={sec.sectionId}
                    className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/60 transition"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{sec.sectionName}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">Bureaus & assigned staff</span>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono-code block">
                          {sec.count}
                        </span>
                        <span className="text-[10px] text-slate-400 block -mt-1">stories</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Infrastructure Guarantee Note */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Database Audit Trigger Protected
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-teal-500" /> Zero-Drift Clock Sync
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
