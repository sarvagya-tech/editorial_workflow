import React, { useMemo } from 'react';
import {
  Search,
  X,
  RefreshCw,
  CheckSquare,
  Square,
  CalendarClock,
  ChevronRight,
  Sparkles,
  Undo2,
  BookOpen,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react';
import { STATUS_CONFIG, STATUS_FILTER_TABS } from '../../constants/status';

export default function ArticlesView({
  articles = [],
  articlesLoading,
  articlesSearch,
  setArticlesSearch,
  articlesStatusFilter,
  setArticlesStatusFilter,
  selectedArticleIds = [],
  onToggleSelectArticle,
  onSelectAllArticles,
  bulkOutcome,
  setBulkOutcome,
  currentUser,
  onOpenArticle,
  onOpenBulkSchedule,
  onOpenBulkUnpublish,
  onClearBulkSelection,
}) {
  // Compute counts per status
  const countsByStatus = useMemo(() => {
    const map = {
      '': articles.length,
      DRAFT: 0,
      IN_REVIEW: 0,
      APPROVED: 0,
      SCHEDULED: 0,
      PUBLISHED: 0,
    };
    articles.forEach((a) => {
      if (map[a.status] !== undefined) {
        map[a.status]++;
      }
    });
    return map;
  }, [articles]);

  const isEditor = currentUser?.role === 'EDITOR';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Filter Bar */}
      <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Article Repository</h1>
              <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {articles.length} stories
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Explore stories across drafting, review, scheduled drop, and published stages.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, dek, or body copy..."
              value={articlesSearch}
              onChange={(e) => setArticlesSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
            {articlesSearch && (
              <button
                onClick={() => setArticlesSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs & Select All */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTER_TABS.map((tab) => {
              const isActive = articlesStatusFilter === tab.id;
              const count = countsByStatus[tab.id];

              return (
                <button
                  key={tab.id}
                  onClick={() => setArticlesStatusFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  {count !== undefined && (
                    <span
                      className={`text-[10px] font-mono-code px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Select All Checkbox (Editor Only) */}
          {isEditor && articles.length > 0 && (
            <button
              onClick={onSelectAllArticles}
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
            >
              {selectedArticleIds.length === articles.length && articles.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
              )}
              <span>Select All ({articles.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Result Notification */}
      {bulkOutcome && (
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Bulk Operation Complete: {bulkOutcome.message}
            </span>
            <button onClick={() => setBulkOutcome(null)} className="text-indigo-700 hover:text-indigo-900">
              <X className="w-4 h-4" />
            </button>
          </div>
          {bulkOutcome.summary && (
            <div className="flex items-center gap-4 text-indigo-900 dark:text-indigo-300 font-mono-code text-[11px]">
              <span>Processed: {bulkOutcome.summary.totalRequested}</span>
              <span>Success: {bulkOutcome.summary.scheduledCount || bulkOutcome.summary.unpublishedCount || 0}</span>
              <span>Failed: {bulkOutcome.summary.failedCount || 0}</span>
            </div>
          )}
        </div>
      )}

      {/* Articles List / Table */}
      {articlesLoading ? (
        <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/70 dark:border-slate-800/80">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-500">Querying stories...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-xs">
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">No articles matched your criteria.</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting the status filter or clearing your search term.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/70 dark:border-slate-800/80 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden shadow-xs">
          {articles.map((art) => {
            const isSelected = selectedArticleIds.includes(art.id);
            const wordCount = (art.body || '').split(/\s+/).filter(Boolean).length;
            const readingTime = Math.max(1, Math.ceil(wordCount / 200));
            const conf = STATUS_CONFIG[art.status] || STATUS_CONFIG.DRAFT;

            return (
              <div
                key={art.id}
                onClick={() => onOpenArticle?.(art.id)}
                className={`p-4 sm:p-4.5 transition-all flex items-center justify-between gap-4 cursor-pointer group ${
                  isSelected
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Checkbox (Editor Only) */}
                {isEditor && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectArticle(art.id);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0 cursor-pointer p-0.5"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="w-4.5 h-4.5 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                )}

                {/* Article Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${conf.badge}`}>
                      {conf.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {art.section?.name || 'General Desk'}
                    </span>
                    {art.status === 'SCHEDULED' && art.publishAt && (
                      <span className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-200/60 dark:border-indigo-800/60">
                        <CalendarClock className="w-3 h-3" /> {new Date(art.publishAt).toLocaleDateString()}
                      </span>
                    )}
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono-code">
                      <BookOpen className="w-3 h-3 text-slate-400" /> {readingTime}m read • {wordCount} words
                    </span>
                  </div>

                  <h3 className="font-serif-headline text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {art.title}
                  </h3>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    By <span className="font-medium text-slate-700 dark:text-slate-300">{art.author?.name || 'Reporter'}</span> • Updated {new Date(art.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Inspect Action */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="hidden sm:inline text-xs font-medium text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Open
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedArticleIds.length > 0 && isEditor && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-[#0f172a]/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-fadeIn">
          <span className="text-xs font-bold font-mono-code text-emerald-400">
            {selectedArticleIds.length} Stories Selected
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <button
            id="bulk-schedule-trigger-btn"
            onClick={onOpenBulkSchedule}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Bulk Schedule
          </button>
          <button
            id="bulk-unpublish-trigger-btn"
            onClick={onOpenBulkUnpublish}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Bulk Unpublish
          </button>
          <button
            onClick={onClearBulkSelection}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
