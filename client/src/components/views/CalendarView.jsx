import React, { useMemo } from 'react';
import {
  Calendar,
  Download,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { STATUS_CONFIG } from '../../constants/status';

export default function CalendarView({
  calendarArticles,
  calendarLoading,
  calendarSectionFilter,
  setCalendarSectionFilter,
  calendarStatusFilter,
  setCalendarStatusFilter,
  calendarExportLoading,
  onExportCsv,
  sections,
  onOpenArticle,
}) {
  // Filtered Articles based on status
  const filteredCalendarArticles = useMemo(() => {
    return calendarArticles.filter((art) => {
      if (calendarStatusFilter !== 'all' && art.status !== calendarStatusFilter) return false;
      return true;
    });
  }, [calendarArticles, calendarStatusFilter]);

  // Grouped by formatted Date
  const groupedCalendarArticles = useMemo(() => {
    const groups = {};
    filteredCalendarArticles.forEach((art) => {
      const rawDate = art.publishAt || art.publishedAt || art.updatedAt;
      const dateKey = rawDate
        ? new Date(rawDate).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'No Date Set';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(art);
    });
    return groups;
  }, [filteredCalendarArticles]);

  return (
    <div className="space-y-6">
      {/* Header with Filters & CSV Export */}
      <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Editorial Release Calendar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visual schedule of upcoming releases, embargos, and historical published journalism.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* CSV Export Button */}
            <button
              id="export-calendar-csv-btn"
              onClick={onExportCsv}
              disabled={calendarExportLoading}
              className="px-4 py-2 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${calendarExportLoading ? 'animate-bounce' : ''}`} />
              <span>{calendarExportLoading ? 'Exporting...' : 'Export Calendar (CSV)'}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Status Toggle */}
          <div className="flex items-center gap-1.5">
            {['all', 'SCHEDULED', 'PUBLISHED'].map((mode) => (
              <button
                key={mode}
                onClick={() => setCalendarStatusFilter(mode)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition capitalize ${
                  calendarStatusFilter === mode
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {mode === 'all' ? 'All Releases' : mode.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Desk Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Filter Desk:</span>
            <select
              value={calendarSectionFilter}
              onChange={(e) => setCalendarSectionFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">All Desks</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Timeline Groups */}
      {calendarLoading ? (
        <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-500">Loading release calendar...</p>
        </div>
      ) : Object.keys(groupedCalendarArticles).length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No scheduled or published stories found.</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting the desk or status filter above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedCalendarArticles).map(([dateLabel, items]) => (
            <div key={dateLabel} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-3 py-1 bg-slate-200/60 dark:bg-slate-800 rounded-lg">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                <span className="text-xs text-slate-400 font-mono-code">{items.length} Stories</span>
              </div>

              {/* Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((art) => {
                  const targetTime = art.publishAt || art.publishedAt;
                  const isOverdue = art.status === 'SCHEDULED' && targetTime && new Date(targetTime) <= new Date();

                  return (
                    <div
                      key={art.id}
                      onClick={() => onOpenArticle(art.id)}
                      className="p-4 bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm cursor-pointer transition flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                                STATUS_CONFIG[art.status]?.badge || 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {art.status}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Overdue
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono-code text-slate-500 dark:text-slate-400">
                            {targetTime
                              ? new Date(targetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 hover:text-emerald-600 transition">
                          {art.title}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                        <span>{art.section?.name || 'General Desk'}</span>
                        <span>By {art.author?.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
