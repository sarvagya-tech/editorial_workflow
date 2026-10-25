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
  RefreshCw,
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

  const isEditor = currentUser?.role === 'EDITOR';
  const userName = currentUser?.name || (currentUser?.label ? currentUser.label.split(' ')[0] : 'Staff');

  // Filter top stories requiring attention
  const priorityArticles = articles
    .filter((a) => a.status === 'IN_REVIEW' || a.status === 'SCHEDULED' || a.status === 'DRAFT')
    .sort((a, b) => {
      const order = { IN_REVIEW: 1, SCHEDULED: 2, DRAFT: 3 };
      return (order[a.status] || 99) - (order[b.status] || 99);
    })
    .slice(0, 5);

  // 8-week volume stats
  const totalEightWeeks = weeklyPublications.reduce((acc, w) => acc + (w.count || 0), 0);
  const avgPerWeek = weeklyPublications.length > 0 ? (totalEightWeeks / weeklyPublications.length).toFixed(1) : 0;

  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* ----------------------------------------------------
          1. CLEAN MODERN PAGE HEADER
      ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>{todayFormatted}</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {isEditor ? 'Editorial Leadership Desk' : `${currentUser?.desk || 'General'} Beat`}
            </span>
          </div>
          <h1 className="font-serif-headline text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {userName}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isEditor
              ? 'Real-time throughput, editorial review queues, and automated publication schedules across all desks.'
              : `Reporting beat console for ${currentUser?.desk}. Author drafts, submit revisions, and track releases.`}
          </p>
        </div>

        {/* Action Button Cluster */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-shrink-0">
          {onOpenCreateStory && (
            <button
              onClick={onOpenCreateStory}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-xs transition flex items-center gap-2"
            >
              <PenSquare className="w-3.5 h-3.5" />
              <span>New Story</span>
            </button>
          )}

          {onNavigateToCalendar && (
            <button
              onClick={onNavigateToCalendar}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Calendar</span>
            </button>
          )}

          {alertCount > 0 && onNavigateToAlerts && (
            <button
              onClick={onNavigateToAlerts}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>{alertCount} Overdue</span>
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------
          2. MINIMALIST OVERDUE ALERTS NOTICE (IF ANY)
      ---------------------------------------------------- */}
      {alertCount > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white">
                {alertCount} Scheduled Article{alertCount === 1 ? '' : 's'} Passed Target Timestamp
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                Review overdue items or dismiss notifications to clear this warning.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToAlerts}
            className="self-start sm:self-auto px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
          >
            Inspect Alerts ({alertCount}) <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Error Notice */}
      {dashboardError && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-red-200 dark:border-red-900/40 p-3.5 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{dashboardError}</span>
          </div>
          <button
            onClick={onRetry}
            className="px-2.5 py-1 bg-red-100 dark:bg-red-950 hover:bg-red-200 text-red-800 dark:text-red-300 rounded-lg font-medium transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* ----------------------------------------------------
          3. MODERN MINIMAL KEY METRICS CARDS
      ---------------------------------------------------- */}
      <section className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: In Review */}
          <div
            onClick={() => onNavigateToArticles?.('IN_REVIEW')}
            className="group bg-white dark:bg-[#111827] rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Pending Review
              </span>
              <Clock className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
            </div>

            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono-code text-slate-900 dark:text-white tracking-tight">
                {dashboardLoading && !dashboardData ? '—' : summary.inReview}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                Awaiting editorial approval
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              <span>Inspect queue</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 2: Scheduled */}
          <div
            onClick={() => onNavigateToArticles?.('SCHEDULED')}
            className="group bg-white dark:bg-[#111827] rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Scheduled This Week
              </span>
              <Calendar className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </div>

            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono-code text-slate-900 dark:text-white tracking-tight">
                {dashboardLoading && !dashboardData ? '—' : summary.scheduledThisWeek}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                Locked publication drops
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              <span>View calendar</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 3: Published Live */}
          <div
            onClick={() => onNavigateToArticles?.('PUBLISHED')}
            className="group bg-white dark:bg-[#111827] rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Published Live
              </span>
              <CheckCircle2 className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
            </div>

            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono-code text-slate-900 dark:text-white tracking-tight">
                {dashboardLoading && !dashboardData ? '—' : summary.publishedThisWeek}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                Live journalism this week
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              <span>Browse archive</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 4: Open Drafts */}
          <div
            onClick={() => onNavigateToArticles?.('DRAFT')}
            className="group bg-white dark:bg-[#111827] rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                Reporter WIP
              </span>
              <FileEdit className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
            </div>

            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono-code text-slate-900 dark:text-white tracking-tight">
                {dashboardLoading && !dashboardData ? '—' : summary.openDrafts}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                Active drafts in preparation
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              <span>View drafts</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          4. STORIES REQUIRING ATTENTION (PRIORITY QUEUE)
      ---------------------------------------------------- */}
      {priorityArticles.length > 0 && (
        <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/70 dark:border-slate-800/80 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Active Review Queue & Releases
              </h2>
              <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {priorityArticles.length} stories
              </span>
            </div>

            <button
              onClick={() => onNavigateToArticles?.('')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition flex items-center gap-1"
            >
              All Stories <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {priorityArticles.map((art) => {
              const conf = STATUS_CONFIG[art.status] || STATUS_CONFIG.DRAFT;
              const wordCount = (art.body || '').split(/\s+/).filter(Boolean).length;
              const readTime = Math.max(1, Math.ceil(wordCount / 200));

              return (
                <div
                  key={art.id}
                  onClick={() => onOpenArticle?.(art.id)}
                  className="px-5 py-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${conf.badge}`}>
                        {conf.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {art.section?.name || 'General Desk'}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        By {art.author?.name || 'Staff Reporter'}
                      </span>
                    </div>

                    <h3 className="font-serif-headline text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                      {art.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs flex-shrink-0">
                    <div className="text-right hidden md:block">
                      <span className="text-[11px] text-slate-400 font-mono-code">
                        {wordCount} words • {readTime}m read
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Updated {new Date(art.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenArticle?.(art.id);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition flex items-center gap-1 shadow-xs"
                    >
                      <span>Review</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ----------------------------------------------------
          5. PUBLICATION TRAJECTORY (8-WEEK CHART)
      ---------------------------------------------------- */}
      <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Publication Trajectory
              </h2>
              <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                8-Week Trend
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Weekly verified releases published live to audiences (Mon–Sun UTC).
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono-code self-start sm:self-auto">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Volume</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{totalEightWeeks} Stories</span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Average</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{avgPerWeek} / wk</span>
            </div>
          </div>
        </div>

        {/* Minimal Bar Chart */}
        <div className="h-44 w-full flex items-end gap-2 sm:gap-4 pt-8 pb-2 px-1 border-b border-slate-100 dark:border-slate-800/80">
          {weeklyPublications.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              No historical publications recorded yet.
            </div>
          ) : (
            weeklyPublications.map((week, idx) => {
              const isCurrent = idx === weeklyPublications.length - 1;
              const heightPercent = maxWeeklyCount > 0 ? Math.max(8, (week.count / maxWeeklyCount) * 100) : 8;
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
                    <div className="absolute -top-12 z-20 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none border border-slate-700 animate-fadeIn">
                      <span className="text-slate-300 font-mono-code">{week.week}: </span>
                      <strong className="text-emerald-400">{week.count}</strong> stories live
                    </div>
                  )}

                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      isCurrent
                        ? 'bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-500'
                        : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />

                  {/* Week Label */}
                  <span className="text-[10px] text-slate-400 font-mono-code mt-2 truncate w-full text-center">
                    {String(week.week || '').includes('-') ? `W${String(week.week).split('-')[1]}` : (week.week || '')}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ----------------------------------------------------
          6. PIPELINE FUNNEL & REPORTING DESKS (2 COLUMNS)
      ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Editorial Pipeline Distribution */}
        <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Workflow Lifecycle Distribution
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Story distribution from initial draft through to publication.
              </p>
            </div>
            <span className="text-xs font-mono-code text-slate-500 dark:text-slate-400 font-semibold">
              {totalVisibleArticles} Total
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'].map((st) => {
              const item = byStatus.find((s) => s.status === st) || { status: st, count: 0 };
              const conf = STATUS_CONFIG[st] || STATUS_CONFIG.DRAFT;
              const percentage = totalVisibleArticles > 0 ? Math.round((item.count / totalVisibleArticles) * 100) : 0;

              return (
                <div
                  key={st}
                  onClick={() => onNavigateToArticles?.(st)}
                  className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
                      {conf.label}
                    </span>
                    <span className="font-mono-code text-slate-500 dark:text-slate-400">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${conf.bar}`}
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Desk Allocations */}
        <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  Active Reporting Desks
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Coverage breakdown across newsroom beats.
                </p>
              </div>
              {onNavigateToDesks && (
                <button
                  onClick={onNavigateToDesks}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-1"
                >
                  Manage Desks <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {bySection.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No active desks assigned.
                </div>
              ) : (
                bySection.map((sec) => (
                  <div
                    key={sec.sectionId}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{sec.sectionName}</div>
                      <span className="text-[10px] text-slate-400 font-mono-code">Bureau Desk</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 dark:text-white font-mono-code text-sm">
                        {sec.count}
                      </span>
                      <span className="text-[10px] text-slate-400 block -mt-0.5">stories</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Security & Zero-Drift Telemetry Note */}
          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Audit Log Immutable
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-teal-500" /> Database Clock Synchronized
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
