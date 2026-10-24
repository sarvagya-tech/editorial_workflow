import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Clock,
  ExternalLink,
} from 'lucide-react';

export default function AlertsView({
  alerts,
  alertCount,
  alertsLoading,
  alertsError,
  dismissNotice,
  setDismissNotice,
  dismissingId,
  onDismissAlert,
  onRefreshAlerts,
  onOpenArticle,
  onReturnToDashboard,
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/40">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Overdue Scheduled Articles</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                {alertCount} Active Alert{alertCount === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Stories that passed publication timestamp without release. Dismissal is per occurrence; rescheduling re-arms alerts.
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshAlerts}
          disabled={alertsLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${alertsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Dismiss Toast Notice */}
      {dismissNotice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{dismissNotice}</span>
          </div>
          <button onClick={() => setDismissNotice(null)} className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Alerts Error Alert */}
      {alertsError && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>{alertsError}</span>
          </div>
          <button onClick={onRefreshAlerts} className="text-xs underline font-semibold text-red-800 dark:text-red-300">
            Retry
          </button>
        </div>
      )}

      {/* Alerts List */}
      {alertsLoading && alerts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Checking scheduled publication pipelines...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200/60 dark:border-emerald-800/40">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">You're all caught up.</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            There are no overdue scheduled articles right now. All scheduled newsroom releases are on track.
          </p>
          <button
            onClick={onReturnToDashboard}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-emerald-500 transition shadow-sm"
          >
            Return to Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white dark:bg-[#111827] rounded-2xl border border-amber-200/90 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-800 p-5 shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    {alert.overdueDurationHuman}
                  </span>
                  <span className="font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {alert.sectionName}
                  </span>
                  <span className="font-medium px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                    {alert.status}
                  </span>
                  <span className="font-mono-code text-[11px] text-slate-400 dark:text-slate-500">
                    Seq #{alert.scheduleSequence}
                  </span>
                </div>
                <h3
                  className="text-base font-bold text-slate-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer"
                  onClick={() => onOpenArticle(alert.articleId)}
                >
                  {alert.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Author: <strong className="text-slate-700 dark:text-slate-200">{alert.authorName}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Scheduled drop: <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(alert.publishAt).toLocaleString()}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end md:self-center flex-shrink-0">
                <button
                  onClick={() => onOpenArticle(alert.articleId)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Story
                </button>
                {alert.dismissible ? (
                  <button
                    onClick={() => onDismissAlert(alert.articleId, alert.title)}
                    disabled={dismissingId === alert.articleId}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition shadow-sm flex items-center gap-1.5"
                  >
                    {dismissingId === alert.articleId ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dismissing...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Dismiss Alert
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 italic px-2">Editor dismiss only</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
