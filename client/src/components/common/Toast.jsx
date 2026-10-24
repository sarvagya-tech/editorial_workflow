import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export default function Toast({ notice, onDismiss }) {
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!notice) return null;

  const isSuccess = notice.type === 'success';
  const isInfo = notice.type === 'info';

  return (
    <div
      className={`border-b px-4 py-2.5 flex items-center justify-between text-xs font-medium animate-in fade-in ${
        isSuccess
          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200'
          : isInfo
          ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800/70 text-sky-900 dark:text-sky-200'
          : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/70 text-red-900 dark:text-red-200'
      }`}
    >
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        {isSuccess ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        ) : isInfo ? (
          <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
        )}
        <span>{notice.message}</span>
        <button
          onClick={onDismiss}
          className="ml-auto text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          aria-label="Dismiss message"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
