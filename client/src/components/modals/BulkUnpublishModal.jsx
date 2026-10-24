import React from 'react';
import { Undo2, X } from 'lucide-react';

export default function BulkUnpublishModal({
  isOpen,
  onClose,
  selectedCount,
  bulkUnpublishReason,
  setBulkUnpublishReason,
  loading,
  onSubmit,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full flex flex-col overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Undo2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Bulk Unpublish ({selectedCount} Stories)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            Are you sure you want to withdraw or cancel publication for all selected stories? Stories currently in <strong>SCHEDULED</strong> or <strong>PUBLISHED</strong> will return to <strong>APPROVED</strong>.
          </p>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">Reason for Withdrawal (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Breaking development hold, editorial revision requested"
              value={bulkUnpublishReason}
              onChange={(e) => setBulkUnpublishReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shadow-sm"
            >
              {loading ? 'Unpublishing...' : 'Confirm Bulk Unpublish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
