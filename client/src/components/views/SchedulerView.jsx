import React from 'react';
import {
  Cpu,
  RefreshCw,
  X,
  ShieldCheck,
} from 'lucide-react';

export default function SchedulerView({
  schedulerStatus,
  triggerCronLoading,
  triggerCronResult,
  setTriggerCronResult,
  onTriggerCycle,
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Autonomous Publishing Engine</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Worker Active • 30s Polling
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              In-process resilient scheduler synchronizing with Neon PostgreSQL clock (<code className="font-mono-code">SELECT NOW()</code>) for zero-drift automated releases.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="trigger-scheduler-now-btn"
            onClick={onTriggerCycle}
            disabled={triggerCronLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${triggerCronLoading ? 'animate-spin' : ''}`} />
            <span>{triggerCronLoading ? 'Executing Cycle...' : 'Trigger Cycle Now'}</span>
          </button>
        </div>
      </div>

      {/* Trigger Result Notice */}
      {triggerCronResult && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-1.5 ${
            triggerCronResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
          }`}
        >
          <div className="flex items-center justify-between font-bold">
            <span>
              {triggerCronResult.success
                ? `Manual Cycle Run Succeeded (${triggerCronResult.data?.durationMs || 0} ms)`
                : `Trigger Failed: ${triggerCronResult.error}`}
            </span>
            <button onClick={() => setTriggerCronResult(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
          {triggerCronResult.data && (
            <div className="flex gap-4 font-mono-code text-[11px]">
              <span>Processed: {triggerCronResult.data.processedCount}</span>
              <span>Published Live: {triggerCronResult.data.publishedCount}</span>
              <span>Skipped: {triggerCronResult.data.skippedCount}</span>
              <span>Failed: {triggerCronResult.data.failedCount}</span>
            </div>
          )}
        </div>
      )}

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Worker State</span>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {schedulerStatus?.isRunning ? 'RUNNING' : 'IDLE'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Autonomous in-process worker</p>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Polling Frequency</span>
          <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white font-mono-code">
            {schedulerStatus?.intervalMs ? `${schedulerStatus.intervalMs / 1000}s` : '30s'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Continuous interval cycle</p>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Cycles Executed</span>
          <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white font-mono-code">
            {schedulerStatus?.totalCyclesRun || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Since service start</p>
        </div>

        <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Last Run Timestamp</span>
          <div className="mt-2 text-xs font-bold text-slate-900 dark:text-white font-mono-code truncate">
            {schedulerStatus?.lastRunAt ? new Date(schedulerStatus.lastRunAt).toLocaleTimeString() : 'Awaiting Cycle'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {schedulerStatus?.lastRunAt ? new Date(schedulerStatus.lastRunAt).toLocaleDateString() : 'Active'}
          </p>
        </div>
      </div>

      {/* Technical Architecture Details Card */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm space-y-4">
        <h3 className="font-serif-headline text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Reliability & Fault-Tolerance Guarantees
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Database Clock Sync</span>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              All eligibility evaluations query Neon PostgreSQL directly (<code className="font-mono-code">SELECT NOW()</code>) to eliminate local application server clock drift.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Row-Level Locking</span>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Uses <code className="font-mono-code">FOR UPDATE SKIP LOCKED</code> inside interactive database transactions to prevent duplicate publishing across horizontal replicas.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Constant-Time Cron Auth</span>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              External webhooks and cron triggers are authenticated using cryptographic constant-time comparison (<code className="font-mono-code">crypto.timingSafeEqual</code>) protecting against timing attacks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
