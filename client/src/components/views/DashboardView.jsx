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
} from 'lucide-react';
import { STATUS_CONFIG } from '../../constants/status';

export default function DashboardView({
  currentUser,
  dashboardData,
  dashboardLoading,
  dashboardError,
  alertCount,
  onNavigateToAlerts,
  onRetry,
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

  return (
    <div className="space-y-8">
      {/* User Scope Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-900 dark:to-[#0b1324] text-white rounded-2xl p-6 shadow-sm border border-slate-800 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span>{currentUser.role === 'EDITOR' ? 'Editorial Leadership Desk' : 'Writer Beat Assignment'}</span>
            <span>•</span>
            <span>{currentUser.desk}</span>
          </div>
          <h2 className="text-xl font-bold mt-1">
            Welcome back, {currentUser.name || (currentUser.label ? currentUser.label.split(' ')[0] : 'User')}
          </h2>
          <p className="text-xs text-slate-300 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {currentUser.role === 'EDITOR'
              ? 'Live newsroom throughput metrics, automated pipeline distributions, and 8-week production trajectory.'
              : 'Scoped beat metrics for your assigned reporting desks and self-authored journalism.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase border ${
              currentUser.role === 'EDITOR'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
            }`}
          >
            {currentUser.role}
          </span>
          <span className="text-xs text-slate-400 bg-slate-800/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700">
            Mon–Sun UTC Week
          </span>
        </div>
      </div>

      {/* Overdue Alerts Warning Panel */}
      {alertCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {alertCount} Scheduled Article{alertCount === 1 ? '' : 's'} Overdue for Publication
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                These stories missed their release schedule. Review or dismiss in the alerts center.
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

      {/* Error Banner */}
      {dashboardError && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-sm font-medium">{dashboardError}</span>
          </div>
          <button
            onClick={onRetry}
            className="text-xs bg-red-100 dark:bg-red-900 hover:bg-red-200 text-red-900 dark:text-red-100 px-3 py-1 rounded-lg font-medium transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Key Production Metrics Cards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Key Production Metrics
          </h3>
          {dashboardLoading && <span className="text-xs text-slate-400">Updating live...</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: In Review */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
                Under Review
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono-code">
                {dashboardLoading && !dashboardData ? '—' : summary.inReview}
              </span>
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Pending Approval</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Stories in review queue</p>
            </div>
          </div>

          {/* Card 2: Scheduled This Week */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60">
                This Week
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono-code">
                {dashboardLoading && !dashboardData ? '—' : summary.scheduledThisWeek}
              </span>
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Scheduled Releases</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Upcoming release drops</p>
            </div>
          </div>

          {/* Card 3: Published This Week */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                Live Stories
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono-code">
                {dashboardLoading && !dashboardData ? '—' : summary.publishedThisWeek}
              </span>
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Published This Week</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Articles released live</p>
            </div>
          </div>

          {/* Card 4: Open Drafts */}
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Reporter WIP
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                <FileEdit className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono-code">
                {dashboardLoading && !dashboardData ? '—' : summary.openDrafts}
              </span>
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Active Drafts</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Stories currently in drafting</p>
            </div>
          </div>
        </div>
      </section>

      {/* Eight-Week Publication Trend Chart */}
      <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="font-serif-headline text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Eight-Week Publication Activity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Weekly volume trajectory across authorized reporting sections (Monday–Sunday UTC)
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-500 inline-block"></span> Current Week
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 dark:bg-emerald-700/60 inline-block"></span> Historical
            </span>
          </div>
        </div>

        {/* SVG Bar Chart */}
        <div className="h-48 w-full flex items-end gap-2 sm:gap-4 pt-8 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
          {weeklyPublications.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
              No publication history available yet.
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
                    <div className="absolute -top-12 z-10 bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                      <span>{week.week}: </span>
                      <strong className="text-emerald-400">{week.count}</strong> stories published
                    </div>
                  )}

                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      isCurrent
                        ? 'bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-500 dark:hover:bg-emerald-400 shadow-sm'
                        : 'bg-emerald-200 dark:bg-emerald-950 hover:bg-emerald-300 dark:hover:bg-emerald-900'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  ></div>

                  {/* Label */}
                  <span className="text-[10px] text-slate-400 font-medium mt-2 truncate w-full text-center">
                    {String(week.week || '').includes('-') ? `W${String(week.week).split('-')[1]}` : (week.week || '')}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Status & Section Allocations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif-headline text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Workflow Distribution
            </h3>
            <span className="text-xs text-slate-500 font-mono-code">{totalVisibleArticles} Total Stories</span>
          </div>
          <div className="space-y-4">
            {['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'].map((st) => {
              const item = byStatus.find((s) => s.status === st) || { status: st, count: 0 };
              const conf = STATUS_CONFIG[st] || STATUS_CONFIG.DRAFT;
              const percentage = totalVisibleArticles > 0 ? Math.round((item.count / totalVisibleArticles) * 100) : 0;

              return (
                <div key={st} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${conf.dot}`}></span>
                      {conf.label}
                    </span>
                    <span className="font-mono-code text-slate-500 dark:text-slate-400">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${conf.bar}`} style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Desk Distribution */}
        <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif-headline text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              Desk Allocation
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 rounded-full border border-sky-200 dark:border-sky-800/60">
              {bySection.length} Desks Active
            </span>
          </div>
          <div className="space-y-2.5">
            {bySection.map((sec) => (
              <div
                key={sec.sectionId}
                className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{sec.sectionName}</h4>
                  <span className="text-[10px] text-slate-400 font-mono-code">ID: {sec.sectionId.slice(0, 10)}...</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono-code">{sec.count}</span>
                  <span className="text-[10px] text-slate-500 block">stories</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
