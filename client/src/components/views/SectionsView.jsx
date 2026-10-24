import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  RefreshCw,
  RotateCcw,
  Archive,
  Users,
  UserCheck,
  FileText,
} from 'lucide-react';
import ManageDeskModal from '../modals/ManageDeskModal';

export default function SectionsView({
  sections,
  sectionsLoading,
  currentUser,
  sectionActionId,
  onOpenCreateSection,
  onToggleArchiveSection,
  token,
  onToast,
  dashboardData,
}) {
  const [managingSection, setManagingSection] = useState(null);

  // Map section article counts from dashboard data if available
  const sectionCounts = {};
  (dashboardData?.bySection || []).forEach((s) => {
    sectionCounts[s.sectionId] = s.count;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Editorial Desks & Sections</h2>
            <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {sections.length} Desks
            </span>
          </div>
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
          {sections.map((sec) => {
            const storyCount = sectionCounts[sec.id] || 0;

            return (
              <div
                key={sec.id}
                className={`bg-white dark:bg-[#111827] rounded-2xl border p-5.5 shadow-sm space-y-4 transition flex flex-col justify-between ${
                  sec.isArchived
                    ? 'border-zinc-200 dark:border-zinc-800 opacity-70 bg-zinc-50/50 dark:bg-zinc-900/30'
                    : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-2.5">
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
                    <span className="text-[11px] text-slate-400 font-mono-code flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" /> {storyCount} Stories
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{sec.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {sec.description || 'General newsroom reporting desk.'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono-code">Lead: {sec.ownerEditor?.name || 'Managing Board'}</span>
                    {currentUser.role === 'EDITOR' && (
                      <button
                        onClick={() => setManagingSection(sec)}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 text-[11px]"
                      >
                        <Users className="w-3 h-3" /> Manage Writers
                      </button>
                    )}
                  </div>

                  {currentUser.role === 'EDITOR' && (
                    <div className="flex items-center justify-end pt-1">
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
                            <RotateCcw className="w-3.5 h-3.5" /> Restore Desk
                          </>
                        ) : (
                          <>
                            <Archive className="w-3.5 h-3.5" /> Archive Desk
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Beat Writers Management Modal */}
      {managingSection && (
        <ManageDeskModal
          isOpen={Boolean(managingSection)}
          onClose={() => setManagingSection(null)}
          section={managingSection}
          token={token}
          onToast={onToast}
        />
      )}
    </div>
  );
}
