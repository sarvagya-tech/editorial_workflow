import React from 'react';
import {
  FolderKanban,
  Plus,
  RefreshCw,
  RotateCcw,
  Archive,
} from 'lucide-react';

export default function SectionsView({
  sections,
  sectionsLoading,
  currentUser,
  sectionActionId,
  onOpenCreateSection,
  onToggleArchiveSection,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Editorial Desks & Sections</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Reporting desks, editorial board leads, and assigned beat areas.
          </p>
        </div>

        {currentUser.role === 'EDITOR' && (
          <button
            id="create-desk-btn"
            onClick={onOpenCreateSection}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Desk</span>
          </button>
        )}
      </div>

      {sectionsLoading ? (
        <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-500">Loading editorial desks...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map((sec) => (
            <div
              key={sec.id}
              className={`bg-white dark:bg-[#111827] rounded-2xl border p-5 shadow-sm space-y-3 transition flex flex-col justify-between ${
                sec.isArchived
                  ? 'border-zinc-200 dark:border-zinc-800 opacity-70'
                  : 'border-slate-200/80 dark:border-slate-800/80'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      sec.isArchived
                        ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                        : 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800/60'
                    }`}
                  >
                    {sec.isArchived ? 'Archived Desk' : 'Active Desk'}
                  </span>
                  <FolderKanban className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{sec.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {sec.description || 'General newsroom reporting desk.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono-code">
                  Lead: {sec.ownerEditor?.name || 'Board'}
                </span>
                {currentUser.role === 'EDITOR' && (
                  <button
                    onClick={() => onToggleArchiveSection(sec)}
                    disabled={sectionActionId === sec.id}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                      sec.isArchived
                        ? 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        : 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                    }`}
                  >
                    {sec.isArchived ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5" /> Archive
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
