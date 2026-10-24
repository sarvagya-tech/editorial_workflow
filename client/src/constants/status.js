export const STATUS_CONFIG = {
  DRAFT: {
    label: 'Draft',
    badge: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    bar: 'bg-slate-400 dark:bg-slate-500',
    dot: 'bg-slate-400',
  },
  IN_REVIEW: {
    label: 'In Review',
    badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/60',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  APPROVED: {
    label: 'Approved',
    badge: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800/60',
    bar: 'bg-sky-500',
    dot: 'bg-sky-500',
  },
  SCHEDULED: {
    label: 'Scheduled',
    badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800/60',
    bar: 'bg-indigo-500',
    dot: 'bg-indigo-500',
  },
  PUBLISHED: {
    label: 'Published',
    badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
  ARCHIVED: {
    label: 'Archived',
    badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700',
    bar: 'bg-zinc-400',
    dot: 'bg-zinc-400',
  },
};

export const STATUS_FILTER_TABS = [
  { id: '', label: 'All Stories' },
  { id: 'IN_REVIEW', label: 'In Review' },
  { id: 'SCHEDULED', label: 'Scheduled' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'DRAFT', label: 'Drafts' },
];

export const CRON_SECRET = 'dispatch-internal-cron-secret-2026';
