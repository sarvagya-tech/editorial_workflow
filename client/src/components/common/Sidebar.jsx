import React from 'react';
import {
  Newspaper,
  PenSquare,
  LayoutDashboard,
  AlertTriangle,
  Calendar,
  FileText,
  FolderKanban,
  Cpu,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export default function Sidebar({
  activeView,
  setActiveView,
  alertCount = 0,
  currentUser,
  onOpenCreateStory,
  onSignOut,
}) {
  const isEditor = currentUser?.role === 'EDITOR';

  const navGroups = [
    {
      title: 'Editorial Command',
      items: [
        {
          id: 'dashboard',
          label: 'Overview',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'alerts',
          label: 'Overdue Alerts',
          icon: AlertTriangle,
          badge: alertCount > 0 ? alertCount : null,
          badgeAlert: true,
        },
        {
          id: 'calendar',
          label: 'Release Calendar',
          icon: Calendar,
          badge: null,
        },
      ],
    },
    {
      title: 'Stories & Desks',
      items: [
        {
          id: 'articles',
          label: 'Articles & Feed',
          icon: FileText,
          badge: null,
        },
        {
          id: 'sections',
          label: 'Desks & Beats',
          icon: FolderKanban,
          badge: null,
        },
      ],
    },
    {
      title: 'Infrastructure',
      items: [
        {
          id: 'scheduler',
          label: 'Cron Scheduler',
          icon: Cpu,
          badgeText: '30s',
          isLivePulse: true,
        },
      ],
    },
  ];

  const userInitial = (currentUser?.name || currentUser?.label || 'U').charAt(0).toUpperCase();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#0d1322] border-r border-slate-200/80 dark:border-slate-800/80 sticky top-0 h-screen z-30 select-none transition-colors duration-200 flex-shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-[#0d1322]/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Newspaper className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif-headline text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                The Dispatch
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block mt-0.5">
              Newsroom Workspace
            </span>
          </div>
        </div>
      </div>

      {/* Primary Story Creation Button */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/60">
        <button
          id="sidebar-new-story-btn"
          onClick={onOpenCreateStory}
          className="w-full py-2.5 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-between group active:scale-[0.98]"
        >
          <span className="flex items-center gap-2">
            <PenSquare className="w-4 h-4 transition-transform group-hover:rotate-6" />
            <span>New Story Draft</span>
          </span>
          <kbd className="text-[10px] font-mono-code font-bold bg-white/20 px-1.5 py-0.5 rounded text-white">
            N
          </kbd>
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {group.title}
            </h4>
            <div className="space-y-0.5 pt-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;

                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => setActiveView(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? 'text-white'
                            : item.badgeAlert && alertCount > 0
                            ? 'text-amber-500'
                            : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>

                    {/* Badge or indicator */}
                    {item.badge !== null && item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badgeAlert && alertCount > 0
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {item.badgeText && (
                      <span
                        className={`flex items-center gap-1.5 text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        }`}
                      >
                        {item.isLivePulse && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-white' : 'bg-emerald-500'
                            } animate-pulse`}
                          />
                        )}
                        {item.badgeText}
                      </span>
                    )}

                    {isActive && !item.badge && !item.badgeText && (
                      <ChevronRight className="w-3.5 h-3.5 text-white/70" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Enhanced Sidebar Footer — User Persona Card */}
      <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/40">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs flex-shrink-0 ${
                isEditor
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
              }`}
            >
              {userInitial}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {currentUser?.name || (currentUser?.label ? currentUser.label.split(' ')[0] : 'Staff')}
                </p>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                    isEditor
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-sky-50 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300'
                  }`}
                >
                  {currentUser?.role || 'USER'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                {currentUser?.desk || 'General Desk'}
              </p>
            </div>
          </div>

          {onSignOut && (
            <button
              onClick={onSignOut}
              title="Sign out of newsroom"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition flex-shrink-0"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
