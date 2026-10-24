import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  FileText,
  Calendar,
  FolderKanban,
  AlertTriangle,
  Cpu,
  Plus,
  UserCheck,
  Sun,
  Moon,
  Download,
  ArrowRight,
  Sparkles,
  Command,
  Compass,
} from 'lucide-react';
import { DEMO_ACCOUNTS } from '../../constants/accounts';

export default function CommandPalette({
  isOpen,
  onClose,
  activeView,
  setActiveView,
  onNavigate,
  currentUser,
  onUserSelect,
  onSwitchUser,
  theme,
  setTheme,
  onOpenCreateStory,
  onOpenCreateSection,
  onExportCalendarCsv,
  articles = [],
  onOpenArticle,
  onOpenStory,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const navigate = (view) => {
    if (setActiveView) setActiveView(view);
    else if (onNavigate) onNavigate(view);
  };

  const switchUser = (user) => {
    if (onUserSelect) onUserSelect(user);
    else if (onSwitchUser) onSwitchUser(user);
  };

  const openStory = (id) => {
    if (onOpenArticle) onOpenArticle(id);
    else if (onOpenStory) onOpenStory({ id });
  };

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Construct command items
  const navigationItems = [
    {
      id: 'nav-dashboard',
      label: 'Go to Overview / Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => navigate('dashboard'),
    },
    {
      id: 'nav-articles',
      label: 'Go to Articles & Story Repository',
      category: 'Navigation',
      icon: FileText,
      action: () => navigate('articles'),
    },
    {
      id: 'nav-calendar',
      label: 'Go to Release Calendar',
      category: 'Navigation',
      icon: Calendar,
      action: () => navigate('calendar'),
    },
    {
      id: 'nav-sections',
      label: 'Go to Desks & Beats',
      category: 'Navigation',
      icon: FolderKanban,
      action: () => navigate('sections'),
    },
    {
      id: 'nav-alerts',
      label: 'Go to Overdue Alerts',
      category: 'Navigation',
      icon: AlertTriangle,
      action: () => navigate('alerts'),
    },
    {
      id: 'nav-scheduler',
      label: 'Go to Autonomous Scheduler Engine',
      category: 'Navigation',
      icon: Cpu,
      action: () => navigate('scheduler'),
    },
    {
      id: 'nav-landing',
      label: 'View Product Tour & Overview',
      category: 'Navigation',
      icon: Compass,
      action: () => navigate('landing'),
    },
  ];

  const actionItems = [
    ...(onOpenCreateStory
      ? [
          {
            id: 'act-new-story',
            label: 'Create New Story Draft',
            category: 'Actions',
            icon: Plus,
            badge: 'Editor & Writer',
            action: () => onOpenCreateStory(),
          },
        ]
      : []),
    ...(currentUser?.role === 'EDITOR'
      ? [
          ...(onOpenCreateSection
            ? [
                {
                  id: 'act-new-desk',
                  label: 'Create New Editorial Desk',
                  category: 'Actions',
                  icon: Plus,
                  badge: 'Editor Only',
                  action: () => onOpenCreateSection(),
                },
              ]
            : []),
          ...(onExportCalendarCsv
            ? [
                {
                  id: 'act-export-csv',
                  label: 'Export Editorial Calendar (CSV)',
                  category: 'Actions',
                  icon: Download,
                  badge: 'Export',
                  action: () => onExportCalendarCsv(),
                },
              ]
            : []),
        ]
      : []),
    ...(setTheme
      ? [
          {
            id: 'act-toggle-theme',
            label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
            category: 'Preferences',
            icon: theme === 'dark' ? Sun : Moon,
            action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
          },
        ]
      : []),
  ];

  const userItems = DEMO_ACCOUNTS.map((acc) => ({
    id: `user-${acc.email}`,
    label: `Switch User: ${acc.label} (${acc.role})`,
    category: 'Switch Role / Persona',
    icon: UserCheck,
    active: currentUser?.email === acc.email,
    action: () => switchUser(acc),
  }));

  // Article search results (top 5 matching articles)
  const articleItems = (articles || [])
    .filter((a) =>
      query.trim()
        ? a.title.toLowerCase().includes(query.toLowerCase()) ||
          (a.body && a.body.toLowerCase().includes(query.toLowerCase()))
        : false
    )
    .slice(0, 5)
    .map((a) => ({
      id: `art-${a.id}`,
      label: `Story: ${a.title}`,
      subtitle: `${a.section?.name || 'General'} • ${a.status} • by ${a.author?.name || 'Staff'}`,
      category: 'Matching Stories',
      icon: Sparkles,
      action: () => openStory(a.id),
    }));

  const allItems = [...navigationItems, ...actionItems, ...userItems, ...articleItems].filter((item) => {
    if (!query.trim()) return item.category !== 'Matching Stories';
    return (
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase()))
    );
  });

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (allItems.length || 1)) % (allItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111827] w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, search stories, or switch desks..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono-code font-semibold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching commands or stories for <span className="font-semibold text-slate-700 dark:text-slate-300">"{query}"</span>.
            </div>
          ) : (
            allItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="font-semibold truncate">{item.label}</div>
                      {item.subtitle && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.subtitle}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 font-mono-code">
                      {item.category}
                    </span>
                    {item.badge && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.badge}
                      </span>
                    )}
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to dismiss</span>
          </div>
          <span className="font-mono-code text-[10px]">The Dispatch Newsroom CLI</span>
        </div>
      </div>
    </div>
  );
}
