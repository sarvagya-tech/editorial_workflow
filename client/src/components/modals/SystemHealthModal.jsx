import React from 'react';
import {
  X,
  Cpu,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Database,
  Activity,
  Layers,
} from 'lucide-react';

export default function SystemHealthModal({
  isOpen,
  onClose,
  schedulerStatus,
  triggerCronLoading,
  triggerCronResult,
  setTriggerCronResult,
  onTriggerCycle,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111827] w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Newsroom System Health & Telemetry
              </h3>
              <p className="text-[11px] text-slate-400">
                Production worker diagnostics and database synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Autonomous Worker
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {schedulerStatus?.isRunning ? 'ACTIVE (In-Process)' : 'STANDBY'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono-code">
                Polling interval: {schedulerStatus?.intervalMs ? `${schedulerStatus.intervalMs / 1000}s` : '30s'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                PostgreSQL Clock
              </span>
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  SYNCHRONIZED
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono-code">
                Neon DB clock (SELECT NOW())
              </p>
            </div>
          </div>

          {/* Infrastructure Guarantees */}
          <div className="space-y-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 p-4 bg-white dark:bg-[#0f172a]">
            <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Production Safeguards
            </h4>
            <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>
                  <strong>Audit Log Immutability:</strong> PostgreSQL engine triggers strictly prevent modification or deletion of timeline events.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>
                  <strong>Zero-Drift Execution:</strong> Article publication timestamp checks reference PostgreSQL DB clock rather than local machine time.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>
                  <strong>Optimistic Concurrency Control:</strong> Sequence numbers and version locking prevent race conditions across worker ticks.
                </span>
              </div>
            </div>
          </div>

          {/* Trigger Cycle Notice */}
          {triggerCronResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                triggerCronResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>
                  {triggerCronResult.success
                    ? `Manual Tick Succeeded (${triggerCronResult.data?.durationMs || 0} ms)`
                    : `Cycle Failed: ${triggerCronResult.error}`}
                </span>
                <button onClick={() => setTriggerCronResult(null)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {triggerCronResult.data && (
                <div className="flex gap-3 font-mono-code text-[10px]">
                  <span>Processed: {triggerCronResult.data.processedCount}</span>
                  <span>Published: {triggerCronResult.data.publishedCount}</span>
                  <span>Skipped: {triggerCronResult.data.skippedCount}</span>
                </div>
              )}
            </div>
          )}

          {/* Manual Diagnostics Trigger */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Total autonomous cycles: {schedulerStatus?.totalCyclesRun || 0}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onTriggerCycle}
                disabled={triggerCronLoading}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${triggerCronLoading ? 'animate-spin' : ''}`} />
                <span>{triggerCronLoading ? 'Testing...' : 'Run Test Tick'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-emerald-500 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
