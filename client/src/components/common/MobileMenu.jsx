import {
  LayoutDashboard,
  AlertTriangle,
  Calendar,
  FileText,
  FolderKanban,
} from 'lucide-react';

export default function MobileMenu({
  mobileMenuOpen,
  setMobileMenuOpen,
  activeView,
  setActiveView,
  alertCount,
}) {
  if (!mobileMenuOpen) return null;

  const navigateTo = (view) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="md:hidden bg-white dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 px-4 py-3 space-y-1">
      <button
        onClick={() => navigateTo('dashboard')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
          activeView === 'dashboard'
            ? 'bg-slate-900 text-white dark:bg-slate-800'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <LayoutDashboard className="w-4 h-4" /> Overview
      </button>

      <button
        onClick={() => navigateTo('alerts')}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${
          activeView === 'alerts'
            ? 'bg-slate-900 text-white dark:bg-slate-800'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Overdue Alerts
        </span>
        {alertCount > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-400 text-slate-900 rounded-full">
            {alertCount}
          </span>
        )}
      </button>

      <button
        onClick={() => navigateTo('calendar')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
          activeView === 'calendar'
            ? 'bg-slate-900 text-white dark:bg-slate-800'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <Calendar className="w-4 h-4" /> Release Calendar
      </button>

      <button
        onClick={() => navigateTo('articles')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
          activeView === 'articles'
            ? 'bg-slate-900 text-white dark:bg-slate-800'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <FileText className="w-4 h-4" /> Articles
      </button>

      <button
        onClick={() => navigateTo('sections')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
          activeView === 'sections'
            ? 'bg-slate-900 text-white dark:bg-slate-800'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <FolderKanban className="w-4 h-4" /> Desks
      </button>
    </div>
  );
}
