import React from 'react';
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
} from 'lucide-react';
import { STATUS_CONFIG, STATUS_FILTER_TABS } from '../../constants/status';

export default function ArticlesView({
  articles,
  articlesLoading,
  articlesSearch,
  setArticlesSearch,
  articlesStatusFilter,
  setArticlesStatusFilter,
  selectedArticleIds,
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
  return (
    <div className="space-y-6">
      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Article Repository</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Explore stories across drafting, review, scheduled drop, and published stages.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search title or body..."
              value={articlesSearch}
              onChange={(e) => setArticlesSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
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

        {/* Filter Pill Tabs & Bulk Select Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setArticlesStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  articlesStatusFilter === tab.id
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Select All Checkbox */}
          {currentUser.role === 'EDITOR' && articles.length > 0 && (
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

      {/* Bulk Action Result Notification Banner */}
      {bulkOutcome && (
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-2">
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

      {/* Articles Grid */}
      {articlesLoading ? (
        <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-500">Querying stories...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          <p className="text-sm text-slate-500">No articles matched your filter or search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {articles.map((art) => {
            const isSelected = selectedArticleIds.includes(art.id);

            return (
              <div
                key={art.id}
                className={`p-4 bg-white dark:bg-[#111827] rounded-xl border transition flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Checkbox (Editor only) */}
                {currentUser.role === 'EDITOR' && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectArticle(art.id);
                    }}
                    className="cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                )}

                {/* Article Info */}
                <div
                  className="space-y-1.5 flex-1 min-w-0 cursor-pointer"
                  onClick={() => onOpenArticle(art.id)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${
                        STATUS_CONFIG[art.status]?.badge || 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {art.status}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {art.section?.name || 'General Desk'}
                    </span>
                    {art.status === 'SCHEDULED' && art.publishAt && (
                      <span className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-200/60 dark:border-indigo-800/60">
                        <CalendarClock className="w-3 h-3" /> {new Date(art.publishAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate hover:text-emerald-600 transition">
                    {art.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    By {art.author?.name} • Updated {new Date(art.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Action Trigger */}
                <button
                  onClick={() => onOpenArticle(art.id)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedArticleIds.length > 0 && currentUser.role === 'EDITOR' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 dark:bg-[#0f172a] text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
          <span className="text-xs font-bold font-mono-code text-emerald-400">
            {selectedArticleIds.length} Stories Selected
          </span>
          <div className="h-4 w-px bg-slate-700"></div>
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
