import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Newspaper,
  LayoutDashboard,
  AlertTriangle,
  FileText,
  FolderKanban,
  Clock,
  Calendar,
  CheckCircle2,
  FileEdit,
  RefreshCw,
  TrendingUp,
  Layers,
  UserCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Search,
  X,
  Menu,
  Bell,
  CalendarClock,
  Check,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  Filter,
  ArrowUpRight,
  ShieldAlert,
  Plus,
  PlusCircle,
  PenSquare,
  Download,
  Activity,
  Cpu,
  Undo2,
  CheckSquare,
  Square,
  Eye,
  MessageSquare,
  History,
  Archive,
  RotateCcw,
  Send,
  Save,
  FilePlus,
  AlertOctagon,
  Globe,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Sarah Jenkins (Editor)', email: 'editor@dispatch.com', role: 'EDITOR', desk: 'All Desks' },
  { label: 'David Zhao (Editor)', email: 'david.editor@dispatch.com', role: 'EDITOR', desk: 'All Desks' },
  { label: 'Maya Patel (Writer)', email: 'writer@dispatch.com', role: 'WRITER', desk: 'Tech & Politics' },
  { label: 'Elena Rostova (Writer)', email: 'elena.writer@dispatch.com', role: 'WRITER', desk: 'Culture Only' },
  { label: 'James Wilson (Writer)', email: 'james.writer@dispatch.com', role: 'WRITER', desk: 'Politics & Investigative' },
];

const STATUS_CONFIG = {
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

const CRON_SECRET = 'dispatch-internal-cron-secret-2026';

export default function App() {
  // Theme Toggle: 'light' | 'dark'
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dispatch_theme');
      if (saved) return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dispatch_theme', theme);
  }, [theme]);

  // Current session & navigation
  const [currentUser, setCurrentUser] = useState(DEMO_ACCOUNTS[0]);
  const [token, setToken] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'alerts' | 'articles' | 'calendar' | 'sections' | 'scheduler'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global Toast / Notice
  const [globalNotice, setGlobalNotice] = useState(null);

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [hoveredWeek, setHoveredWeek] = useState(null);

  // Overdue Alerts Data
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState(null);
  const [dismissingId, setDismissingId] = useState(null);
  const [dismissNotice, setDismissNotice] = useState(null);

  // Articles Feed & Filter
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesSearch, setArticlesSearch] = useState('');
  const [articlesStatusFilter, setArticlesStatusFilter] = useState('');
  const [selectedArticleIds, setSelectedArticleIds] = useState([]);
  const [showBulkScheduleModal, setShowBulkScheduleModal] = useState(false);
  const [bulkScheduleDate, setBulkScheduleDate] = useState('');
  const [showBulkUnpublishModal, setShowBulkUnpublishModal] = useState(false);
  const [bulkUnpublishReason, setBulkUnpublishReason] = useState('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkOutcome, setBulkOutcome] = useState(null);

  // Editorial Calendar Data
  const [calendarArticles, setCalendarArticles] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarSectionFilter, setCalendarSectionFilter] = useState('');
  const [calendarStatusFilter, setCalendarStatusFilter] = useState('all'); // 'all' | 'SCHEDULED' | 'PUBLISHED'
  const [calendarExportLoading, setCalendarExportLoading] = useState(false);

  // Autonomous Scheduler Engine Data
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [triggerCronLoading, setTriggerCronLoading] = useState(false);
  const [triggerCronResult, setTriggerCronResult] = useState(null);

  // Desks & Sections Data
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');
  const [createSectionLoading, setCreateSectionLoading] = useState(false);
  const [sectionActionId, setSectionActionId] = useState(null);

  // New Story Creation Modal
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStoryBody, setNewStoryBody] = useState('');
  const [newStorySectionId, setNewStorySectionId] = useState('');
  const [createStoryLoading, setCreateStoryLoading] = useState(false);
  const [createStoryError, setCreateStoryError] = useState(null);

  // Article Detail & Lifecycle Modal
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleModalLoading, setArticleModalLoading] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState('overview'); // 'overview' | 'revisions' | 'comments' | 'timeline'
  const [articleTimeline, setArticleTimeline] = useState([]);
  const [articleRevisions, setArticleRevisions] = useState([]);
  const [articleComments, setArticleComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [workflowActionLoading, setWorkflowActionLoading] = useState(false);
  const [workflowActionFeedback, setWorkflowActionFeedback] = useState(null);
  const [scheduleModalDate, setScheduleModalDate] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [unpublishReasonInput, setUnpublishReasonInput] = useState('');
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editDraftTitle, setEditDraftTitle] = useState('');
  const [editDraftBody, setEditDraftBody] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [showForkRevisionModal, setShowForkRevisionModal] = useState(false);
  const [forkRevisionTitle, setForkRevisionTitle] = useState('');
  const [forkRevisionBody, setForkRevisionBody] = useState('');
  const [forkingRevision, setForkingRevision] = useState(false);
  const [viewingRevisionDetail, setViewingRevisionDetail] = useState(null);

  // ----------------------------------------------------
  // Authentication
  // ----------------------------------------------------
  const authenticateUser = useCallback(async (account) => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email, password: 'password123' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }
      setToken(data.token);
      setCurrentUser({ ...account, ...data.user });
    } catch (err) {
      setDashboardError(`Login failed: ${err.message}`);
      setDashboardLoading(false);
    }
  }, []);

  // ----------------------------------------------------
  // Data Fetchers
  // ----------------------------------------------------
  const fetchDashboard = useCallback(async (authToken) => {
    if (!authToken) return;
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const res = await fetch('/api/dashboard', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load dashboard metrics');
      setDashboardData(json.data || json);
    } catch (err) {
      setDashboardError(err.message);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const fetchAlerts = useCallback(async (authToken) => {
    if (!authToken) return;
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const res = await fetch('/api/alerts/overdue', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load overdue alerts');
      const list = json.alerts || json.data || [];
      setAlerts(list);
      setAlertCount(json.total !== undefined ? json.total : list.length);
    } catch (err) {
      setAlertsError(err.message);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  const fetchArticles = useCallback(async (authToken) => {
    if (!authToken) return;
    setArticlesLoading(true);
    try {
      const params = new URLSearchParams();
      if (articlesSearch) params.set('q', articlesSearch);
      if (articlesStatusFilter) params.set('status', articlesStatusFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/articles?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      if (res.ok) {
        setArticles(json.data || []);
      }
    } catch (e) {
      console.error('Fetch articles error:', e);
    } finally {
      setArticlesLoading(false);
    }
  }, [articlesSearch, articlesStatusFilter]);

  const fetchSections = useCallback(async (authToken) => {
    if (!authToken) return;
    setSectionsLoading(true);
    try {
      const res = await fetch('/api/sections?includeArchived=true', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      if (res.ok) {
        setSections(json.data || json || []);
      }
    } catch (e) {
      console.error('Fetch sections error:', e);
    } finally {
      setSectionsLoading(false);
    }
  }, []);

  const fetchCalendar = useCallback(async (authToken, sectionId = '') => {
    if (!authToken) return;
    setCalendarLoading(true);
    try {
      const params = new URLSearchParams();
      if (sectionId) params.set('sectionId', sectionId);
      const res = await fetch(`/api/calendar?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      if (res.ok) {
        setCalendarArticles(json.data || []);
      }
    } catch (e) {
      console.error('Fetch calendar error:', e);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const fetchSchedulerStatus = useCallback(async () => {
    setSchedulerLoading(true);
    try {
      const res = await fetch('/api/internal/cron/status', {
        headers: { 'x-cron-secret': CRON_SECRET },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSchedulerStatus(json.data);
      }
    } catch (e) {
      console.error('Fetch scheduler status error:', e);
    } finally {
      setSchedulerLoading(false);
    }
  }, []);

  // ----------------------------------------------------
  // Initial Auth & State Sync
  // ----------------------------------------------------
  useEffect(() => {
    authenticateUser(DEMO_ACCOUNTS[0]);
  }, [authenticateUser]);

  useEffect(() => {
    if (token) {
      fetchDashboard(token);
      fetchAlerts(token);
      fetchSections(token);
      fetchSchedulerStatus();
    }
  }, [token, fetchDashboard, fetchAlerts, fetchSections, fetchSchedulerStatus]);

  useEffect(() => {
    if (token) {
      if (activeView === 'articles') {
        fetchArticles(token);
      } else if (activeView === 'calendar') {
        fetchCalendar(token, calendarSectionFilter);
      } else if (activeView === 'sections') {
        fetchSections(token);
      } else if (activeView === 'scheduler') {
        fetchSchedulerStatus();
      }
    }
  }, [token, activeView, calendarSectionFilter, fetchArticles, fetchCalendar, fetchSections, fetchSchedulerStatus]);

  // Periodic heartbeat polling for autonomous scheduler
  useEffect(() => {
    if (activeView === 'scheduler') {
      const timer = setInterval(() => {
        fetchSchedulerStatus();
      }, 15000);
      return () => clearInterval(timer);
    }
  }, [activeView, fetchSchedulerStatus]);

  // Refresh all feeds
  const handleRefreshAll = () => {
    if (token) {
      fetchDashboard(token);
      fetchAlerts(token);
      fetchSections(token);
      fetchSchedulerStatus();
      if (activeView === 'articles') fetchArticles(token);
      if (activeView === 'calendar') fetchCalendar(token, calendarSectionFilter);
    }
  };

  // ----------------------------------------------------
  // Dismiss Overdue Alert Action
  // ----------------------------------------------------
  const handleDismissAlert = async (articleId, title) => {
    if (!token) return;
    setDismissingId(articleId);
    setDismissNotice(null);
    setAlertsError(null);

    try {
      const res = await fetch(`/api/articles/${articleId}/alerts/dismiss`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to dismiss overdue alert');
      }

      setDismissNotice(`Alert dismissed for "${title}". Notification re-arms if rescheduled.`);
      await Promise.all([fetchAlerts(token), fetchDashboard(token)]);
    } catch (err) {
      setAlertsError(`Dismissal failed: ${err.message}`);
    } finally {
      setDismissingId(null);
    }
  };

  // ----------------------------------------------------
  // Autonomous Scheduler Manual Trigger
  // ----------------------------------------------------
  const handleTriggerSchedulerCycle = async () => {
    setTriggerCronLoading(true);
    setTriggerCronResult(null);
    try {
      const res = await fetch('/api/internal/cron/publish', {
        method: 'POST',
        headers: {
          'x-cron-secret': CRON_SECRET,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Cron cycle failed');

      setTriggerCronResult({
        success: true,
        data: json.data,
      });

      // Refresh all feeds to reflect published stories
      await Promise.all([
        fetchSchedulerStatus(),
        fetchDashboard(token),
        fetchAlerts(token),
        fetchArticles(token),
        fetchCalendar(token, calendarSectionFilter),
      ]);
    } catch (err) {
      setTriggerCronResult({
        success: false,
        error: err.message,
      });
    } finally {
      setTriggerCronLoading(false);
    }
  };

  // ----------------------------------------------------
  // Calendar CSV Export
  // ----------------------------------------------------
  const handleExportCalendarCsv = async () => {
    if (!token) return;
    setCalendarExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (calendarSectionFilter) params.set('sectionId', calendarSectionFilter);
      const res = await fetch(`/api/calendar/export.csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to generate calendar CSV export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `editorial-calendar-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setCalendarExportLoading(false);
    }
  };

  // ----------------------------------------------------
  // Story Creation ("+ New Story")
  // ----------------------------------------------------
  const handleOpenCreateStoryModal = () => {
    setNewStoryTitle('');
    setNewStoryBody('');
    setCreateStoryError(null);
    // Auto-select first accessible section
    const defaultSection = sections.find((s) => !s.isArchived);
    setNewStorySectionId(defaultSection ? defaultSection.id : '');
    setShowCreateStoryModal(true);
  };

  const handleCreateStory = async (e) => {
    e.preventDefault();
    if (!token || !newStoryTitle.trim() || !newStorySectionId) {
      setCreateStoryError('Title and reporting section are required.');
      return;
    }
    setCreateStoryLoading(true);
    setCreateStoryError(null);
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newStoryTitle.trim(),
          body: newStoryBody.trim() || 'Draft story notes and reporting body...',
          sectionId: newStorySectionId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Story creation failed');

      setShowCreateStoryModal(false);
      setGlobalNotice({
        type: 'success',
        message: `Draft story "${json.data?.title}" created successfully.`,
      });

      // Switch to articles view and open the newly created story
      setActiveView('articles');
      await Promise.all([fetchArticles(token), fetchDashboard(token)]);
      if (json.data?.id) {
        handleOpenArticle(json.data.id);
      }
    } catch (err) {
      setCreateStoryError(err.message);
    } finally {
      setCreateStoryLoading(false);
    }
  };

  // ----------------------------------------------------
  // Bulk Operations Handlers
  // ----------------------------------------------------
  const handleToggleSelectArticle = (articleId) => {
    setSelectedArticleIds((prev) =>
      prev.includes(articleId) ? prev.filter((id) => id !== articleId) : [...prev, articleId]
    );
  };

  const handleSelectAllArticles = () => {
    if (selectedArticleIds.length === articles.length) {
      setSelectedArticleIds([]);
    } else {
      setSelectedArticleIds(articles.map((a) => a.id));
    }
  };

  const handleBulkScheduleSubmit = async () => {
    if (!token || !bulkScheduleDate || selectedArticleIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/articles/bulk/schedule', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleIds: selectedArticleIds,
          scheduledAt: new Date(bulkScheduleDate).toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Bulk schedule failed');

      setShowBulkScheduleModal(false);
      setSelectedArticleIds([]);
      setBulkScheduleDate('');
      setBulkOutcome({
        type: 'schedule',
        summary: json.summary,
        message: json.message,
        results: json.results || [],
      });

      await Promise.all([
        fetchArticles(token),
        fetchDashboard(token),
        fetchAlerts(token),
        fetchCalendar(token, calendarSectionFilter),
      ]);
    } catch (err) {
      alert(`Bulk scheduling failed: ${err.message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUnpublishSubmit = async () => {
    if (!token || selectedArticleIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/articles/bulk/unpublish', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleIds: selectedArticleIds,
          reason: bulkUnpublishReason.trim() || 'Editorial bulk withdrawal',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Bulk unpublish failed');

      setShowBulkUnpublishModal(false);
      setSelectedArticleIds([]);
      setBulkUnpublishReason('');
      setBulkOutcome({
        type: 'unpublish',
        summary: json.summary,
        message: json.message,
        results: json.results || [],
      });

      await Promise.all([
        fetchArticles(token),
        fetchDashboard(token),
        fetchAlerts(token),
        fetchCalendar(token, calendarSectionFilter),
      ]);
    } catch (err) {
      alert(`Bulk unpublish failed: ${err.message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // Sections Management Handlers
  // ----------------------------------------------------
  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!token || !newSectionName.trim()) return;
    setCreateSectionLoading(true);
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSectionName.trim(),
          description: newSectionDesc.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to create desk');

      setShowCreateSectionModal(false);
      setNewSectionName('');
      setNewSectionDesc('');
      setGlobalNotice({ type: 'success', message: `Desk "${json.name}" created successfully.` });
      await fetchSections(token);
    } catch (err) {
      alert(`Section creation error: ${err.message}`);
    } finally {
      setCreateSectionLoading(false);
    }
  };

  const handleToggleArchiveSection = async (section) => {
    if (!token) return;
    setSectionActionId(section.id);
    const action = section.isArchived ? 'restore' : 'archive';
    try {
      const res = await fetch(`/api/sections/${section.id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || `Failed to ${action} desk`);

      setGlobalNotice({
        type: 'success',
        message: `Desk "${section.name}" ${section.isArchived ? 'restored to active rotation' : 'archived'}.`,
      });
      await fetchSections(token);
    } catch (err) {
      alert(`Desk action error: ${err.message}`);
    } finally {
      setSectionActionId(null);
    }
  };

  // ----------------------------------------------------
  // Article Detail Modal & Lifecycle Actions
  // ----------------------------------------------------
  const handleOpenArticle = async (articleId) => {
    if (!token) return;
    setArticleModalLoading(true);
    setWorkflowActionFeedback(null);
    setModalActiveTab('overview');
    setShowScheduleForm(false);
    setShowUnpublishConfirm(false);
    setIsEditingDraft(false);
    setShowForkRevisionModal(false);
    setViewingRevisionDetail(null);

    try {
      const [artRes, timeRes, revRes, comRes] = await Promise.all([
        fetch(`/api/articles/${articleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/articles/${articleId}/timeline`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/articles/${articleId}/revisions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/articles/${articleId}/comments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const artJson = await artRes.json();
      const timeJson = await timeRes.json();
      const revJson = await revRes.json();
      const comJson = await comRes.json();

      if (artRes.ok) {
        const art = artJson.data || artJson;
        setSelectedArticle(art);
        setEditDraftTitle(art.title || '');
        setEditDraftBody(art.body || art.workingRevision?.body || '');
      }
      if (timeRes.ok) setArticleTimeline(timeJson.data || []);
      if (revRes.ok) setArticleRevisions(revJson.data || []);
      if (comRes.ok) setArticleComments(comJson.data || []);
    } catch (err) {
      console.error('Failed to load article detail:', err);
    } finally {
      setArticleModalLoading(false);
    }
  };

  // Submit Article for Editorial Review (DRAFT -> IN_REVIEW)
  const handleSubmitArticleForReview = async () => {
    if (!token || !selectedArticle) return;
    setWorkflowActionLoading(true);
    setWorkflowActionFeedback(null);
    try {
      const res = await fetch(`/api/articles/${selectedArticle.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Submission failed');

      setWorkflowActionFeedback({
        type: 'success',
        message: 'Story successfully submitted for Editorial Board Review.',
      });
      await Promise.all([handleOpenArticle(selectedArticle.id), fetchArticles(token), fetchDashboard(token)]);
    } catch (err) {
      setWorkflowActionFeedback({ type: 'error', message: err.message });
    } finally {
      setWorkflowActionLoading(false);
    }
  };

  // Approve Article (IN_REVIEW -> APPROVED)
  const handleApproveArticle = async () => {
    if (!token || !selectedArticle) return;
    setWorkflowActionLoading(true);
    setWorkflowActionFeedback(null);
    try {
      const res = await fetch(`/api/articles/${selectedArticle.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Approval failed');

      setWorkflowActionFeedback({
        type: 'success',
        message: 'Story approved! Ready for immediate publication or scheduled drop.',
      });
      await Promise.all([handleOpenArticle(selectedArticle.id), fetchArticles(token), fetchDashboard(token)]);
    } catch (err) {
      setWorkflowActionFeedback({ type: 'error', message: err.message });
    } finally {
      setWorkflowActionLoading(false);
    }
  };

  // Publish Article Immediately (APPROVED or SCHEDULED -> PUBLISHED)
  const handlePublishNow = async () => {
    if (!token || !selectedArticle) return;
    setWorkflowActionLoading(true);
    setWorkflowActionFeedback(null);
    try {
      const res = await fetch(`/api/articles/${selectedArticle.id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Publishing failed');

      setWorkflowActionFeedback({
        type: 'success',
        message: 'Story published live to the Dispatch frontpage!',
      });
      await Promise.all([
        handleOpenArticle(selectedArticle.id),
        fetchArticles(token),
        fetchDashboard(token),
        fetchAlerts(token),
        fetchCalendar(token, calendarSectionFilter),
      ]);
    } catch (err) {
      setWorkflowActionFeedback({ type: 'error', message: err.message });
    } finally {
      setWorkflowActionLoading(false);
    }
  };

  // Schedule Article for Future Publication (APPROVED or SCHEDULED -> SCHEDULED)
  const handleScheduleSubmit = async () => {
    if (!token || !selectedArticle || !scheduleModalDate) return;
    setWorkflowActionLoading(true);
    setWorkflowActionFeedback(null);
    try {
      const res = await fetch(`/api/articles/${selectedArticle.id}/schedule`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduledAt: new Date(scheduleModalDate).toISOString() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Scheduling failed');

      setShowScheduleForm(false);
      setWorkflowActionFeedback({
        type: 'success',
        message: `Publication scheduled for ${new Date(scheduleModalDate).toLocaleString()}.`,
      });
      await Promise.all([
        handleOpenArticle(selectedArticle.id),
        fetchArticles(token),
        fetchDashboard(token),
        fetchAlerts(token),
        fetchCalendar(token, calendarSectionFilter),
      ]);
    } catch (err) {
      setWorkflowActionFeedback({ type: 'error', message: err.message });
    } finally {
      setWorkflowActionLoading(false);
    }
  };

  // Unpublish Article (SCHEDULED or PUBLISHED -> APPROVED)
  const handleUnpublishSubmit = async () => {
    if (!token || !selectedArticle) return;
    setWorkflowActionLoading(true);
    setWorkflowActionFeedback(null);
    try {
      const res = await fetch(`/api/articles/${selectedArticle.id}/unpublish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: unpublishReasonInput.trim() || 'Editorial retraction / hold' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Unpublish failed');

      setShowUnpublishConfirm(false);
      setUnpublishReasonInput('');
      setWorkflowActionFeedback({
        type: 'success',
        message: 'Story unpublished and returned to Approved state.',
      });
      await Promise.all([
        handleOpenArticle(selectedArticle.id),
        fetchArticles(token),
        fetchDashboard(token),
        fetchAlerts(token),
        fetchCalendar(token, calendarSectionFilter),
      ]);
    } catch (err) {
      setWorkflowActionFeedback({ type: 'error', message: err.message });
    } finally {
      setWorkflowActionLoading(false);
    }
  };

  // Save Working Draft Content (DRAFT status PATCH)
  const handleSaveDraftChanges = async () => {
    if (!token || !selectedArticle) return;
    setSavingDraft(true);
    setWorkflowActionFeedback(null);
    try {
      const res = await fetch(`/api/articles/${selectedArticle.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editDraftTitle.trim(),
          body: editDraftBody.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to save changes');

      setIsEditingDraft(false);
      setWorkflowActionFeedback({ type: 'success', message: 'Draft content updated.' });
      await handleOpenArticle(selectedArticle.id);
    } catch (err) {
      setWorkflowActionFeedback({ type: 'error', message: err.message });
    } finally {
      setSavingDraft(false);
    }
  };

  // Fork New Revision for Published Article
  const handleForkNewRevision = async () => {
    if (!token || !selectedArticle) return;
    setForkingRevision(true);
    try {
      const res = await fetch(`/api/articles/${selectedArticle.id}/revisions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: forkRevisionTitle.trim() || selectedArticle.title,
          body: forkRevisionBody.trim() || selectedArticle.body,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to open new revision');

      setShowForkRevisionModal(false);
      setWorkflowActionFeedback({
        type: 'success',
        message: 'New draft revision opened! Live published version remains untouched.',
      });
      await handleOpenArticle(selectedArticle.id);
    } catch (err) {
      alert(`Revision fork error: ${err.message}`);
    } finally {
      setForkingRevision(false);
    }
  };

  // Add Editorial Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!token || !selectedArticle || !newCommentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/articles/${selectedArticle.id}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newCommentText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to post comment');

      setNewCommentText('');
      // Reload comments and timeline
      const [comRes, timeRes] = await Promise.all([
        fetch(`/api/articles/${selectedArticle.id}/comments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/articles/${selectedArticle.id}/timeline`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const comJson = await comRes.json();
      const timeJson = await timeRes.json();
      if (comRes.ok) setArticleComments(comJson.data || []);
      if (timeRes.ok) setArticleTimeline(timeJson.data || []);
    } catch (err) {
      alert(`Comment error: ${err.message}`);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Computed Values
  const summary = dashboardData?.summary || {
    inReview: 0,
    scheduledThisWeek: 0,
    publishedThisWeek: 0,
    openDrafts: 0,
    overdueAlerts: alertCount,
  };

  const byStatus = dashboardData?.byStatus || [];
  const bySection = dashboardData?.bySection || [];
  const weeklyPublications = dashboardData?.weeklyPublications || [];
  const maxWeeklyCount = Math.max(1, ...weeklyPublications.map((w) => w.count));
  const totalVisibleArticles = byStatus.reduce((acc, s) => acc + s.count, 0);

  // Grouped Calendar Articles
  const filteredCalendarArticles = useMemo(() => {
    return calendarArticles.filter((art) => {
      if (calendarStatusFilter !== 'all' && art.status !== calendarStatusFilter) return false;
      return true;
    });
  }, [calendarArticles, calendarStatusFilter]);

  const groupedCalendarArticles = useMemo(() => {
    const groups = {};
    filteredCalendarArticles.forEach((art) => {
      const rawDate = art.publishAt || art.publishedAt || art.updatedAt;
      const dateKey = rawDate ? new Date(rawDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) : 'No Date Set';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(art);
    });
    return groups;
  }, [filteredCalendarArticles]);

  const isAuthorOfSelectedArticle =
    selectedArticle && currentUser && selectedArticle.authorId === currentUser.id;

  // Filter tabs for articles view
  const STATUS_FILTER_TABS = [
    { id: '', label: 'All Stories' },
    { id: 'IN_REVIEW', label: 'In Review' },
    { id: 'SCHEDULED', label: 'Scheduled' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'PUBLISHED', label: 'Published' },
    { id: 'DRAFT', label: 'Drafts' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex font-sans selection:bg-emerald-500 selection:text-white">
      {/* -------------------------------------------------- */}
      {/* SIDEBAR NAVIGATION (Desktop) */}
      {/* -------------------------------------------------- */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#0d1322] border-r border-slate-200/80 dark:border-slate-800/80 sticky top-0 h-screen z-30 select-none transition-colors duration-200">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-sm shadow-emerald-500/20">
              <Newspaper className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="font-serif-headline text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none block">
                The Dispatch
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                Newsroom System
              </span>
            </div>
          </div>
        </div>

        {/* Primary Story Creation Button */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/60">
          <button
            id="sidebar-new-story-btn"
            onClick={handleOpenCreateStoryModal}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-sm shadow-emerald-600/20 transition flex items-center justify-center gap-2"
          >
            <PenSquare className="w-4 h-4" />
            <span>New Story</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* 1. Overview */}
          <button
            id="nav-dashboard"
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeView === 'dashboard'
                ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </span>
            {activeView === 'dashboard' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </button>

          {/* 2. Overdue Alerts */}
          <button
            id="nav-alerts"
            onClick={() => setActiveView('alerts')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeView === 'alerts'
                ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <AlertTriangle className={`w-4 h-4 ${alertCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
              Overdue Alerts
            </span>
            {alertCount > 0 ? (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeView === 'alerts'
                    ? 'bg-amber-400 text-slate-900'
                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                }`}
              >
                {alertCount}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-normal">0</span>
            )}
          </button>

          {/* 3. Editorial Calendar */}
          <button
            id="nav-calendar"
            onClick={() => setActiveView('calendar')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeView === 'calendar'
                ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4" />
              Release Calendar
            </span>
            {activeView === 'calendar' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </button>

          {/* 4. Articles & Feed */}
          <button
            id="nav-articles"
            onClick={() => setActiveView('articles')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeView === 'articles'
                ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <FileText className="w-4 h-4" />
              Articles & Feed
            </span>
            {activeView === 'articles' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </button>

          {/* 5. Desks & Beats */}
          <button
            id="nav-sections"
            onClick={() => setActiveView('sections')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeView === 'sections'
                ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <FolderKanban className="w-4 h-4" />
              Desks & Beats
            </span>
            {activeView === 'sections' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </button>

          {/* 6. Autonomous Scheduler */}
          <button
            id="nav-scheduler"
            onClick={() => setActiveView('scheduler')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeView === 'scheduler'
                ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-emerald-500" />
              Cron Engine
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              30s
            </span>
          </button>
        </nav>

        {/* Sidebar Footer — User Context */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Role</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                currentUser.role === 'EDITOR'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800/50'
              }`}
            >
              {currentUser.role}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {currentUser.name || (currentUser.label ? currentUser.label.split(' ')[0] : 'User')}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{currentUser.desk}</p>
        </div>
      </aside>

      {/* -------------------------------------------------- */}
      {/* MAIN LAYOUT WRAPPER */}
      {/* -------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white/80 dark:bg-[#0d1322]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-20 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-colors duration-200">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Title */}
            <div>
              <span className="text-xs text-slate-400 font-medium">Newsroom / </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                {activeView === 'dashboard'
                  ? 'Editorial Dashboard'
                  : activeView === 'alerts'
                  ? 'Overdue Articles'
                  : activeView === 'calendar'
                  ? 'Editorial Calendar'
                  : activeView === 'articles'
                  ? 'Article Repository'
                  : activeView === 'sections'
                  ? 'Desks & Beats'
                  : 'Autonomous Scheduler'}
              </span>
            </div>
          </div>

          {/* Quick Demo Switcher, Theme Switcher & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Top Bar Quick Story Button */}
            <button
              id="header-new-story-btn"
              onClick={handleOpenCreateStoryModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Story</span>
            </button>

            {/* Demo User Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 px-2 font-medium hidden lg:flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Demo User:
              </span>
              <select
                id="demo-user-select"
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                value={currentUser.email}
                onChange={(e) => {
                  const selected = DEMO_ACCOUNTS.find((a) => a.email === e.target.value);
                  if (selected) authenticateUser(selected);
                }}
              >
                {DEMO_ACCOUNTS.map((acc) => (
                  <option key={acc.email} value={acc.email}>
                    {acc.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Minimalist Theme Segmented Switch */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <button
                id="theme-light-btn"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Switch to light mode"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-medium hidden sm:inline">Light</span>
              </button>
              <button
                id="theme-dark-btn"
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900 text-white shadow-sm font-semibold dark:bg-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Switch to dark mode"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-medium hidden sm:inline">Dark</span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              id="refresh-btn"
              onClick={handleRefreshAll}
              disabled={dashboardLoading || alertsLoading}
              title="Refresh Newsroom Data"
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  dashboardLoading || alertsLoading ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''
                }`}
              />
            </button>
          </div>
        </header>

        {/* Global Toast Notification */}
        {globalNotice && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800/70 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 font-medium animate-in fade-in">
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>{globalNotice.message}</span>
              <button onClick={() => setGlobalNotice(null)} className="ml-auto text-emerald-700 hover:text-emerald-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 px-4 py-3 space-y-1">
            <button
              onClick={() => {
                setActiveView('dashboard');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <LayoutDashboard className="w-4 h-4" /> Overview
            </button>
            <button
              onClick={() => {
                setActiveView('alerts');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
              onClick={() => {
                setActiveView('calendar');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Calendar className="w-4 h-4" /> Release Calendar
            </button>
            <button
              onClick={() => {
                setActiveView('articles');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <FileText className="w-4 h-4" /> Articles
            </button>
            <button
              onClick={() => {
                setActiveView('sections');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <FolderKanban className="w-4 h-4" /> Desks
            </button>
            <button
              onClick={() => {
                setActiveView('scheduler');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Cpu className="w-4 h-4 text-emerald-500" /> Cron Engine
            </button>
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* MAIN BODY CONTAINER */}
        {/* -------------------------------------------------- */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* ================================================ */}
          {/* VIEW 1: OVERDUE ALERTS PAGE                      */}
          {/* ================================================ */}
          {activeView === 'alerts' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/40">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Overdue Scheduled Articles</h2>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                        {alertCount} Active Alert{alertCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Stories that passed publication timestamp without release. Dismissal is per occurrence; rescheduling re-arms alerts.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => fetchAlerts(token)}
                  disabled={alertsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${alertsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Dismiss Toast Notice */}
              {dismissNotice && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>{dismissNotice}</span>
                  </div>
                  <button onClick={() => setDismissNotice(null)} className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Alerts List */}
              {alertsLoading && alerts.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                  <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">Checking scheduled publication pipelines...</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200/60 dark:border-emerald-800/40">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">You're all caught up.</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                    There are no overdue scheduled articles right now. All scheduled newsroom releases are on track.
                  </p>
                  <button
                    onClick={() => setActiveView('dashboard')}
                    className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-emerald-500 transition shadow-sm"
                  >
                    Return to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-white dark:bg-[#111827] rounded-2xl border border-amber-200/90 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-800 p-5 shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            {alert.overdueDurationHuman}
                          </span>
                          <span className="font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {alert.sectionName}
                          </span>
                          <span className="font-medium px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                            {alert.status}
                          </span>
                          <span className="font-mono-code text-[11px] text-slate-400 dark:text-slate-500">
                            Seq #{alert.scheduleSequence}
                          </span>
                        </div>
                        <h3
                          className="text-base font-bold text-slate-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer"
                          onClick={() => handleOpenArticle(alert.articleId)}
                        >
                          {alert.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>
                            Author: <strong className="text-slate-700 dark:text-slate-200">{alert.authorName}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Scheduled drop: <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(alert.publishAt).toLocaleString()}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end md:self-center flex-shrink-0">
                        <button
                          onClick={() => handleOpenArticle(alert.articleId)}
                          className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Story
                        </button>
                        {alert.dismissible ? (
                          <button
                            onClick={() => handleDismissAlert(alert.articleId, alert.title)}
                            disabled={dismissingId === alert.articleId}
                            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition shadow-sm flex items-center gap-1.5"
                          >
                            {dismissingId === alert.articleId ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dismissing...
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" /> Dismiss Alert
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic px-2">Editor dismiss only</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================ */}
          {/* VIEW 2: EDITORIAL DASHBOARD                      */}
          {/* ================================================ */}
          {activeView === 'dashboard' && (
            <div className="space-y-8">
              {/* User Scope Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-900 dark:to-[#0b1324] text-white rounded-2xl p-6 shadow-sm border border-slate-800 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                    <span>{currentUser.role === 'EDITOR' ? 'Editorial Leadership Desk' : 'Writer Beat Assignment'}</span>
                    <span>•</span>
                    <span>{currentUser.desk}</span>
                  </div>
                  <h2 className="text-xl font-bold mt-1">
                    Welcome back, {currentUser.name || (currentUser.label ? currentUser.label.split(' ')[0] : 'User')}
                  </h2>
                  <p className="text-xs text-slate-300 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    {currentUser.role === 'EDITOR'
                      ? 'Live newsroom throughput metrics, automated pipeline distributions, and 8-week production trajectory.'
                      : 'Scoped beat metrics for your assigned reporting desks and self-authored journalism.'}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <span
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase border ${
                      currentUser.role === 'EDITOR'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                  <span className="text-xs text-slate-400 bg-slate-800/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700">
                    Mon–Sun UTC Week
                  </span>
                </div>
              </div>

              {/* Overdue Alerts Warning Panel */}
              {alertCount > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {alertCount} Scheduled Article{alertCount === 1 ? '' : 's'} Overdue for Publication
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        These stories missed their release schedule. Review or dismiss in the alerts center.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveView('alerts')}
                    className="self-start sm:self-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    Review Overdue Alerts ({alertCount}) <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Key Production Metrics Cards */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Key Production Metrics
                  </h3>
                  {dashboardLoading && <span className="text-xs text-slate-400">Updating live...</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: In Review */}
                  <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
                        Under Review
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono-code">
                        {dashboardLoading && !dashboardData ? '—' : summary.inReview}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Pending Approval</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Stories in review queue</p>
                    </div>
                  </div>

                  {/* Card 2: Scheduled This Week */}
                  <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60">
                        This Week
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono-code">
                        {dashboardLoading && !dashboardData ? '—' : summary.scheduledThisWeek}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Scheduled Releases</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Upcoming release drops</p>
                    </div>
                  </div>

                  {/* Card 3: Published This Week */}
                  <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                        Live Stories
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono-code">
                        {dashboardLoading && !dashboardData ? '—' : summary.publishedThisWeek}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Published This Week</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Articles released live</p>
                    </div>
                  </div>

                  {/* Card 4: Open Drafts */}
                  <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        Reporter WIP
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                        <FileEdit className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono-code">
                        {dashboardLoading && !dashboardData ? '—' : summary.openDrafts}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Active Drafts</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Stories currently in drafting</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Eight-Week Publication Trend Chart */}
              <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h3 className="font-serif-headline text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Eight-Week Publication Activity
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Weekly volume trajectory across authorized reporting sections (Monday–Sunday UTC)
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-500 inline-block"></span> Current Week
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 dark:bg-emerald-700/60 inline-block"></span> Historical
                    </span>
                  </div>
                </div>

                {/* SVG Bar Chart */}
                <div className="h-48 w-full flex items-end gap-2 sm:gap-4 pt-8 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
                  {weeklyPublications.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      No publication history available yet.
                    </div>
                  ) : (
                    weeklyPublications.map((week, idx) => {
                      const isCurrent = idx === weeklyPublications.length - 1;
                      const heightPercent = maxWeeklyCount > 0 ? Math.max(8, (week.count / maxWeeklyCount) * 100) : 8;
                      const isHovered = hoveredWeek === idx;

                      return (
                        <div
                          key={week.week}
                          className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                          onMouseEnter={() => setHoveredWeek(idx)}
                          onMouseLeave={() => setHoveredWeek(null)}
                        >
                          {/* Tooltip */}
                          {isHovered && (
                            <div className="absolute -top-12 z-10 bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                              <span>{week.week}: </span>
                              <strong className="text-emerald-400">{week.count}</strong> stories published
                            </div>
                          )}

                          {/* Bar */}
                          <div
                            className={`w-full rounded-t-lg transition-all duration-300 ${
                              isCurrent
                                ? 'bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-500 dark:hover:bg-emerald-400 shadow-sm'
                                : 'bg-emerald-200 dark:bg-emerald-950 hover:bg-emerald-300 dark:hover:bg-emerald-900'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          ></div>

                          {/* Label */}
                          <span className="text-[10px] text-slate-400 font-medium mt-2 truncate w-full text-center">
                            {String(week.week || '').includes('-') ? `W${String(week.week).split('-')[1]}` : (week.week || '')}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Status & Section Allocations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif-headline text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      Workflow Distribution
                    </h3>
                    <span className="text-xs text-slate-500 font-mono-code">{totalVisibleArticles} Total Stories</span>
                  </div>
                  <div className="space-y-4">
                    {['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'].map((st) => {
                      const item = byStatus.find((s) => s.status === st) || { status: st, count: 0 };
                      const conf = STATUS_CONFIG[st] || STATUS_CONFIG.DRAFT;
                      const percentage = totalVisibleArticles > 0 ? Math.round((item.count / totalVisibleArticles) * 100) : 0;

                      return (
                        <div key={st} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${conf.dot}`}></span>
                              {conf.label}
                            </span>
                            <span className="font-mono-code text-slate-500 dark:text-slate-400">
                              {item.count} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${conf.bar}`} style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Desk Distribution */}
                <section className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif-headline text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FolderKanban className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                      Desk Allocation
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 rounded-full border border-sky-200 dark:border-sky-800/60">
                      {bySection.length} Desks Active
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {bySection.map((sec) => (
                      <div
                        key={sec.sectionId}
                        className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{sec.sectionName}</h4>
                          <span className="text-[10px] text-slate-400 font-mono-code">ID: {sec.sectionId.slice(0, 10)}...</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono-code">{sec.count}</span>
                          <span className="text-[10px] text-slate-500 block">stories</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ================================================ */}
          {/* VIEW 3: EDITORIAL CALENDAR                       */}
          {/* ================================================ */}
          {activeView === 'calendar' && (
            <div className="space-y-6">
              {/* Header with Filters & CSV Export */}
              <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Editorial Release Calendar
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Visual schedule of upcoming releases, embargos, and historical published journalism.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* CSV Export Button */}
                    <button
                      id="export-calendar-csv-btn"
                      onClick={handleExportCalendarCsv}
                      disabled={calendarExportLoading}
                      className="px-4 py-2 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <Download className={`w-3.5 h-3.5 ${calendarExportLoading ? 'animate-bounce' : ''}`} />
                      <span>{calendarExportLoading ? 'Exporting...' : 'Export Calendar (CSV)'}</span>
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {/* Status Toggle */}
                  <div className="flex items-center gap-1.5">
                    {['all', 'SCHEDULED', 'PUBLISHED'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setCalendarStatusFilter(mode)}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition capitalize ${
                          calendarStatusFilter === mode
                            ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {mode === 'all' ? 'All Releases' : mode.toLowerCase()}
                      </button>
                    ))}
                  </div>

                  {/* Desk Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Filter Desk:</span>
                    <select
                      value={calendarSectionFilter}
                      onChange={(e) => setCalendarSectionFilter(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">All Desks</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Calendar Timeline Groups */}
              {calendarLoading ? (
                <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                  <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
                  <p className="text-xs font-medium text-slate-500">Loading release calendar...</p>
                </div>
              ) : Object.keys(groupedCalendarArticles).length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No scheduled or published stories found.</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting the desk or status filter above.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedCalendarArticles).map(([dateLabel, items]) => (
                    <div key={dateLabel} className="space-y-3">
                      {/* Date Header */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-3 py-1 bg-slate-200/60 dark:bg-slate-800 rounded-lg">
                          {dateLabel}
                        </span>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                        <span className="text-xs text-slate-400 font-mono-code">{items.length} Stories</span>
                      </div>

                      {/* Items */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {items.map((art) => {
                          const targetTime = art.publishAt || art.publishedAt;
                          const isOverdue = art.status === 'SCHEDULED' && targetTime && new Date(targetTime) <= new Date();

                          return (
                            <div
                              key={art.id}
                              onClick={() => handleOpenArticle(art.id)}
                              className="p-4 bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm cursor-pointer transition flex flex-col justify-between space-y-3"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                                        STATUS_CONFIG[art.status]?.badge || 'bg-slate-100 text-slate-800'
                                      }`}
                                    >
                                      {art.status}
                                    </span>
                                    {isOverdue && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Overdue
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] font-mono-code text-slate-500 dark:text-slate-400">
                                    {targetTime ? new Date(targetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                  </span>
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 hover:text-emerald-600 transition">
                                  {art.title}
                                </h3>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                                <span>{art.section?.name || 'General Desk'}</span>
                                <span>By {art.author?.name}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================ */}
          {/* VIEW 4: ARTICLES REPOSITORY WITH BULK ACTIONS    */}
          {/* ================================================ */}
          {activeView === 'articles' && (
            <div className="space-y-6">
              {/* Filter Tabs & Search Bar */}
              <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Article Repository</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Explore stories across drafting, review, scheduled drop, and published stages.
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search title or body..."
                      value={articlesSearch}
                      onChange={(e) => setArticlesSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                    />
                    {articlesSearch && (
                      <button
                        onClick={() => setArticlesSearch('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Pill Tabs & Bulk Select Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {STATUS_FILTER_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setArticlesStatusFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                          articlesStatusFilter === tab.id
                            ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Select All Checkbox */}
                  {currentUser.role === 'EDITOR' && articles.length > 0 && (
                    <button
                      onClick={handleSelectAllArticles}
                      className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                    >
                      {selectedArticleIds.length === articles.length && articles.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Select All ({articles.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk Action Result Notification Modal */}
              {bulkOutcome && (
                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Bulk Operation Complete: {bulkOutcome.message}
                    </span>
                    <button onClick={() => setBulkOutcome(null)} className="text-indigo-700 hover:text-indigo-900">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {bulkOutcome.summary && (
                    <div className="flex items-center gap-4 text-indigo-900 dark:text-indigo-300 font-mono-code text-[11px]">
                      <span>Processed: {bulkOutcome.summary.totalRequested}</span>
                      <span>Success: {bulkOutcome.summary.scheduledCount || bulkOutcome.summary.unpublishedCount || 0}</span>
                      <span>Failed: {bulkOutcome.summary.failedCount || 0}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Articles Grid */}
              {articlesLoading ? (
                <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                  <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
                  <p className="text-xs font-medium text-slate-500">Querying stories...</p>
                </div>
              ) : articles.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                  <p className="text-sm text-slate-500">No articles matched your filter or search criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {articles.map((art) => {
                    const isSelected = selectedArticleIds.includes(art.id);

                    return (
                      <div
                        key={art.id}
                        className={`p-4 bg-white dark:bg-[#111827] rounded-xl border transition flex items-center justify-between gap-4 ${
                          isSelected
                            ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
                            : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* Checkbox (Editor only) */}
                        {currentUser.role === 'EDITOR' && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectArticle(art.id);
                            }}
                            className="cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                            )}
                          </div>
                        )}

                        {/* Article Info */}
                        <div
                          className="space-y-1.5 flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleOpenArticle(art.id)}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${
                                STATUS_CONFIG[art.status]?.badge || 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {art.status}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {art.section?.name || 'General Desk'}
                            </span>
                            {art.status === 'SCHEDULED' && art.publishAt && (
                              <span className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-200/60 dark:border-indigo-800/60">
                                <CalendarClock className="w-3 h-3" /> {new Date(art.publishAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate hover:text-emerald-600 transition">
                            {art.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            By {art.author?.name} • Updated {new Date(art.updatedAt).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Action Trigger */}
                        <button
                          onClick={() => handleOpenArticle(art.id)}
                          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Floating Bulk Action Bar */}
              {selectedArticleIds.length > 0 && currentUser.role === 'EDITOR' && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 dark:bg-[#0f172a] text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
                  <span className="text-xs font-bold font-mono-code text-emerald-400">
                    {selectedArticleIds.length} Stories Selected
                  </span>
                  <div className="h-4 w-px bg-slate-700"></div>
                  <button
                    id="bulk-schedule-trigger-btn"
                    onClick={() => setShowBulkScheduleModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    Bulk Schedule
                  </button>
                  <button
                    id="bulk-unpublish-trigger-btn"
                    onClick={() => setShowBulkUnpublishModal(true)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Bulk Unpublish
                  </button>
                  <button
                    onClick={() => setSelectedArticleIds([])}
                    className="text-xs text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================================================ */}
          {/* VIEW 5: DESKS & BEATS                            */}
          {/* ================================================ */}
          {activeView === 'sections' && (
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
                    onClick={() => setShowCreateSectionModal(true)}
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
                            onClick={() => handleToggleArchiveSection(sec)}
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
          )}

          {/* ================================================ */}
          {/* VIEW 6: AUTONOMOUS SCHEDULER ENGINE MONITOR     */}
          {/* ================================================ */}
          {activeView === 'scheduler' && (
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
                    onClick={handleTriggerSchedulerCycle}
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
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-[#0d1322] border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
          <p>The Dispatch • Modern Editorial Workflow Platform (React + Express + Neon PostgreSQL)</p>
        </footer>
      </div>

      {/* ================================================== */}
      {/* MODAL: NEW STORY CREATION                          */}
      {/* ================================================== */}
      {showCreateStoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full flex flex-col overflow-hidden animate-in fade-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <PenSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Draft New Story</h3>
              </div>
              <button
                onClick={() => setShowCreateStoryModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStory} className="p-6 space-y-4 text-xs">
              {createStoryError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
                  {createStoryError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Story Headline / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Council Moves to Sunset $400M Riverfront Subsidy"
                  value={newStoryTitle}
                  onChange={(e) => setNewStoryTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Reporting Desk / Section *</label>
                <select
                  value={newStorySectionId}
                  onChange={(e) => setNewStorySectionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  <option value="">Select an assigned desk...</option>
                  {sections
                    .filter((s) => !s.isArchived)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Initial Article Body Content</label>
                <textarea
                  rows={6}
                  placeholder="Draft your story content, reporting notes, or opening paragraphs..."
                  value={newStoryBody}
                  onChange={(e) => setNewStoryBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-sans"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateStoryModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStoryLoading || !newStoryTitle.trim() || !newStorySectionId}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shadow-sm"
                >
                  {createStoryLoading ? 'Creating Draft...' : 'Create Draft Story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* MODAL: CREATE NEW SECTION                          */}
      {/* ================================================== */}
      {showCreateSectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full flex flex-col overflow-hidden animate-in fade-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Desk</h3>
              </div>
              <button
                onClick={() => setShowCreateSectionModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSection} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Desk Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Investigative Beat, Foreign Bureau"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows={3}
                  placeholder="Focus areas, editorial oversight, coverage mandate..."
                  value={newSectionDesc}
                  onChange={(e) => setNewSectionDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSectionModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSectionLoading || !newSectionName.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shadow-sm"
                >
                  {createSectionLoading ? 'Creating...' : 'Create Desk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* MODAL: BULK SCHEDULE DIALOG                        */}
      {/* ================================================== */}
      {showBulkScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full flex flex-col overflow-hidden animate-in fade-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Schedule ({selectedArticleIds.length} Stories)
                </h3>
              </div>
              <button
                onClick={() => setShowBulkScheduleModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Choose the future target release date and time for all selected stories. Stories currently in <strong>APPROVED</strong> or <strong>SCHEDULED</strong> status will transition; other statuses will be reported as skipped.
              </p>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Scheduled Release Timestamp *</label>
                <input
                  type="datetime-local"
                  required
                  value={bulkScheduleDate}
                  onChange={(e) => setBulkScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkScheduleModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkScheduleSubmit}
                  disabled={bulkActionLoading || !bulkScheduleDate}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shadow-sm"
                >
                  {bulkActionLoading ? 'Scheduling...' : 'Confirm Bulk Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* MODAL: BULK UNPUBLISH CONFIRMATION                 */}
      {/* ================================================== */}
      {showBulkUnpublishModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full flex flex-col overflow-hidden animate-in fade-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Undo2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Unpublish ({selectedArticleIds.length} Stories)
                </h3>
              </div>
              <button
                onClick={() => setShowBulkUnpublishModal(false)}
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
                  onClick={() => setShowBulkUnpublishModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkUnpublishSubmit}
                  disabled={bulkActionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shadow-sm"
                >
                  {bulkActionLoading ? 'Unpublishing...' : 'Confirm Bulk Unpublish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* MODAL: FULL LIFECYCLE ARTICLE DETAIL & WORKFLOW    */}
      {/* ================================================== */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase border ${
                    STATUS_CONFIG[selectedArticle.status]?.badge || 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {selectedArticle.status}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  {selectedArticle.section?.name || 'General Desk'}
                </span>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Navigation */}
            <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 text-xs font-semibold bg-white dark:bg-[#111827] flex-shrink-0">
              <button
                onClick={() => setModalActiveTab('overview')}
                className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
                  modalActiveTab === 'overview'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" /> Story & Workflow
              </button>
              <button
                onClick={() => setModalActiveTab('revisions')}
                className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
                  modalActiveTab === 'revisions'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" /> Revisions ({articleRevisions.length})
              </button>
              <button
                onClick={() => setModalActiveTab('comments')}
                className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
                  modalActiveTab === 'comments'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" /> Editorial Desk ({articleComments.length})
              </button>
              <button
                onClick={() => setModalActiveTab('timeline')}
                className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
                  modalActiveTab === 'timeline'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" /> Audit Trail ({articleTimeline.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1 text-sm text-slate-700 dark:text-slate-300">
              {/* Feedback Alert */}
              {workflowActionFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                    workflowActionFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-300 border-red-200 dark:border-red-800'
                  }`}
                >
                  {workflowActionFeedback.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                  <span>{workflowActionFeedback.message}</span>
                </div>
              )}

              {/* ---------------------------------------------- */}
              {/* TAB 1: STORY & WORKFLOW CONTROLS              */}
              {/* ---------------------------------------------- */}
              {modalActiveTab === 'overview' && (
                <div className="space-y-6">
                  {/* Title & Metadata Header */}
                  <div>
                    {isEditingDraft ? (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Edit Headline</label>
                        <input
                          type="text"
                          value={editDraftTitle}
                          onChange={(e) => setEditDraftTitle(e.target.value)}
                          className="w-full text-base font-bold px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    ) : (
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                        {selectedArticle.title}
                      </h2>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Author: <strong className="text-slate-800 dark:text-slate-200">{selectedArticle.author?.name}</strong> • Schedule Sequence #{selectedArticle.scheduleSequence || 1}
                    </p>
                  </div>

                  {/* Scheduling Timestamp Summary Card */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Scheduled Target Drop:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedArticle.publishAt ? new Date(selectedArticle.publishAt).toLocaleString() : 'None set'}
                      </span>
                    </div>
                    {selectedArticle.publishedAt && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Live Release Timestamp:</span>
                        <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                          {new Date(selectedArticle.publishedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Article Body Content */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-[#0d1322] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Article Body
                      </span>
                      {selectedArticle.status === 'DRAFT' && !isEditingDraft && (
                        <button
                          onClick={() => setIsEditingDraft(true)}
                          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <FileEdit className="w-3.5 h-3.5" /> Edit Content
                        </button>
                      )}
                    </div>

                    {isEditingDraft ? (
                      <div className="space-y-3">
                        <textarea
                          rows={8}
                          value={editDraftBody}
                          onChange={(e) => setEditDraftBody(e.target.value)}
                          className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setIsEditingDraft(false)}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveDraftChanges}
                            disabled={savingDraft}
                            className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" /> {savingDraft ? 'Saving...' : 'Save Draft'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
                        {selectedArticle.body || selectedArticle.workingRevision?.body || 'No body content available.'}
                      </p>
                    )}
                  </div>

                  {/* ------------------------------------------ */}
                  {/* WORKFLOW STATE MACHINE LIFECYCLE BAR       */}
                  {/* ------------------------------------------ */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Editorial Lifecycle Controls ({selectedArticle.status})
                    </span>

                    {/* DRAFT STATE */}
                    {selectedArticle.status === 'DRAFT' && (
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          This story is currently in working draft stage. When ready, submit it to the editorial board for review.
                        </p>
                        <button
                          id="submit-for-review-btn"
                          onClick={handleSubmitArticleForReview}
                          disabled={workflowActionLoading}
                          className="px-4 py-2 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Send className="w-3.5 h-3.5" /> Submit for Review
                        </button>
                      </div>
                    )}

                    {/* IN_REVIEW STATE */}
                    {selectedArticle.status === 'IN_REVIEW' && (
                      <div className="space-y-3 pt-1">
                        {currentUser.role === 'EDITOR' ? (
                          isAuthorOfSelectedArticle ? (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl text-xs space-y-1">
                              <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                <ShieldAlert className="w-4 h-4 text-amber-600" />
                                Author Self-Approval Prohibition
                              </span>
                              <p className="text-amber-800 dark:text-amber-400">
                                You authored this story. To uphold editorial integrity, another editor must review and approve it.
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Story is in the review queue. As an editor, you can review reporting standards and approve for publication.
                              </p>
                              <button
                                id="approve-article-btn"
                                onClick={handleApproveArticle}
                                disabled={workflowActionLoading}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <CheckCheck className="w-3.5 h-3.5" /> Approve Story
                              </button>
                            </div>
                          )
                        ) : (
                          <p className="text-xs text-amber-700 dark:text-amber-400 italic">
                            Submitted to the Editorial Board. An editor will review and approve.
                          </p>
                        )}
                      </div>
                    )}

                    {/* APPROVED STATE */}
                    {selectedArticle.status === 'APPROVED' && (
                      <div className="space-y-3 pt-1">
                        {currentUser.role === 'EDITOR' ? (
                          <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <button
                                id="publish-live-now-btn"
                                onClick={handlePublishNow}
                                disabled={workflowActionLoading}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5"
                              >
                                <Globe className="w-3.5 h-3.5" /> Publish Immediately
                              </button>
                              <button
                                onClick={() => setShowScheduleForm(!showScheduleForm)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5"
                              >
                                <CalendarClock className="w-3.5 h-3.5" /> Schedule Release
                              </button>
                            </div>

                            {showScheduleForm && (
                              <div className="mt-3 p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row gap-2">
                                <input
                                  type="datetime-local"
                                  value={scheduleModalDate}
                                  onChange={(e) => setScheduleModalDate(e.target.value)}
                                  className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                  onClick={handleScheduleSubmit}
                                  disabled={!scheduleModalDate || workflowActionLoading}
                                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                                >
                                  Confirm Schedule
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-sky-700 dark:text-sky-300">
                            Story has been approved by the editorial board. Ready for scheduled release.
                          </p>
                        )}
                      </div>
                    )}

                    {/* SCHEDULED STATE */}
                    {selectedArticle.status === 'SCHEDULED' && (
                      <div className="space-y-3 pt-1">
                        {currentUser.role === 'EDITOR' ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={handlePublishNow}
                                disabled={workflowActionLoading}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5"
                              >
                                <Globe className="w-3.5 h-3.5" /> Publish Now
                              </button>
                              <button
                                onClick={() => setShowScheduleForm(!showScheduleForm)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5"
                              >
                                <CalendarClock className="w-3.5 h-3.5" /> Reschedule
                              </button>
                              <button
                                onClick={() => setShowUnpublishConfirm(!showUnpublishConfirm)}
                                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5"
                              >
                                <Undo2 className="w-3.5 h-3.5" /> Cancel Schedule
                              </button>
                            </div>

                            {showScheduleForm && (
                              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row gap-2">
                                <input
                                  type="datetime-local"
                                  value={scheduleModalDate}
                                  onChange={(e) => setScheduleModalDate(e.target.value)}
                                  className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                  onClick={handleScheduleSubmit}
                                  disabled={!scheduleModalDate || workflowActionLoading}
                                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                                >
                                  Update Schedule
                                </button>
                              </div>
                            )}

                            {showUnpublishConfirm && (
                              <div className="p-3 bg-red-50/60 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/60 space-y-2">
                                <p className="text-xs text-red-900 dark:text-red-300">
                                  Withdraw this story back to Approved status?
                                </p>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Optional reason for unpublishing..."
                                    value={unpublishReasonInput}
                                    onChange={(e) => setUnpublishReasonInput(e.target.value)}
                                    className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                                  />
                                  <button
                                    onClick={handleUnpublishSubmit}
                                    disabled={workflowActionLoading}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                                  >
                                    Confirm
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-indigo-700 dark:text-indigo-300">
                            Scheduled for automated publication by the Dispatch autonomous publishing engine.
                          </p>
                        )}
                      </div>
                    )}

                    {/* PUBLISHED STATE */}
                    {selectedArticle.status === 'PUBLISHED' && (
                      <div className="space-y-3 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => {
                              setForkRevisionTitle(selectedArticle.title);
                              setForkRevisionBody(selectedArticle.body || '');
                              setShowForkRevisionModal(true);
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5"
                          >
                            <FilePlus className="w-3.5 h-3.5" /> Fork New Revision
                          </button>

                          {currentUser.role === 'EDITOR' && (
                            <button
                              onClick={() => setShowUnpublishConfirm(!showUnpublishConfirm)}
                              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5"
                            >
                              <Undo2 className="w-3.5 h-3.5" /> Unpublish Story
                            </button>
                          )}
                        </div>

                        {showUnpublishConfirm && (
                          <div className="p-3 bg-red-50/60 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/60 space-y-2">
                            <p className="text-xs text-red-900 dark:text-red-300">
                              Take down this published article and revert to Approved status?
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Reason for retracting live article..."
                                value={unpublishReasonInput}
                                onChange={(e) => setUnpublishReasonInput(e.target.value)}
                                className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                              <button
                                onClick={handleUnpublishSubmit}
                                disabled={workflowActionLoading}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                              >
                                Confirm Take Down
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ---------------------------------------------- */}
              {/* TAB 2: REVISIONS HISTORY                       */}
              {/* ---------------------------------------------- */}
              {modalActiveTab === 'revisions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Revision Snapshots</h4>
                      <p className="text-xs text-slate-500">Every editorial iteration is permanently preserved.</p>
                    </div>
                    {selectedArticle.status === 'PUBLISHED' && (
                      <button
                        onClick={() => {
                          setForkRevisionTitle(selectedArticle.title);
                          setForkRevisionBody(selectedArticle.body || '');
                          setShowForkRevisionModal(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-1"
                      >
                        <FilePlus className="w-3.5 h-3.5" /> New Revision
                      </button>
                    )}
                  </div>

                  {articleRevisions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No revisions found.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {articleRevisions.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-3 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono-code">
                                Revision #{rev.revisionNumber}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                                  STATUS_CONFIG[rev.status]?.badge || 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {rev.status}
                              </span>
                            </div>
                            <p className="text-slate-500 truncate max-w-md">{rev.title}</p>
                            <span className="text-[11px] text-slate-400 font-mono-code block">
                              Created {new Date(rev.createdAt).toLocaleString()} by {rev.createdByUser?.name || 'Reporter'}
                            </span>
                          </div>

                          <button
                            onClick={() => setViewingRevisionDetail(viewingRevisionDetail?.id === rev.id ? null : rev)}
                            className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold"
                          >
                            {viewingRevisionDetail?.id === rev.id ? 'Hide' : 'Inspect'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inspected Revision Snapshot Body Preview */}
                  {viewingRevisionDetail && (
                    <div className="mt-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-indigo-950 dark:text-indigo-200">
                          Snapshot: Revision #{viewingRevisionDetail.revisionNumber} ({viewingRevisionDetail.status})
                        </span>
                        <button
                          onClick={() => setViewingRevisionDetail(null)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                        {viewingRevisionDetail.body || 'Empty body snapshot.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------- */}
              {/* TAB 3: EDITORIAL COMMENTS                      */}
              {/* ---------------------------------------------- */}
              {modalActiveTab === 'comments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Editorial Discussion</h4>
                      <p className="text-xs text-slate-500">Peer commentary between reporters and editorial leads.</p>
                    </div>
                  </div>

                  {/* Comment Submission Form */}
                  <form onSubmit={handleAddComment} className="space-y-2">
                    <textarea
                      rows={3}
                      placeholder="Add editorial feedback, fact-checking note, or legal review comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingComment || !newCommentText.trim()}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {submittingComment ? 'Posting...' : 'Post Editorial Note'}
                      </button>
                    </div>
                  </form>

                  {/* Comments Feed */}
                  <div className="space-y-3 pt-2">
                    {articleComments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No editorial comments yet.</p>
                    ) : (
                      articleComments.map((com) => (
                        <div
                          key={com.id}
                          className="p-3 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {com.user?.name || 'Staff Member'}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                                {com.user?.role}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono-code">
                              {new Date(com.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {com.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ---------------------------------------------- */}
              {/* TAB 4: IMMUTABLE AUDIT TIMELINE                */}
              {/* ---------------------------------------------- */}
              {modalActiveTab === 'timeline' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Immutable Audit Trail</h4>
                    <p className="text-xs text-slate-500">Every state transition, approval, and alert dismissal is cryptographically logged.</p>
                  </div>

                  <div className="space-y-2 border-l-2 border-slate-200 dark:border-slate-800 pl-4 py-1">
                    {articleTimeline.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No timeline events recorded.</p>
                    ) : (
                      articleTimeline.map((ev) => (
                        <div key={ev.id} className="text-xs space-y-0.5 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{ev.eventType}</span>
                            <span className="text-[11px] text-slate-400 font-mono-code">
                              {new Date(ev.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400">{ev.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
              >
                Close Story
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* MODAL: FORK NEW REVISION                           */}
      {/* ================================================== */}
      {showForkRevisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Fork Working Revision</h3>
              </div>
              <button
                onClick={() => setShowForkRevisionModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Opening a new revision creates a working draft for updates or corrections without taking down or mutating the live published story.
              </p>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Updated Title</label>
                <input
                  type="text"
                  value={forkRevisionTitle}
                  onChange={(e) => setForkRevisionTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Updated Body</label>
                <textarea
                  rows={6}
                  value={forkRevisionBody}
                  onChange={(e) => setForkRevisionBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForkRevisionModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleForkNewRevision}
                  disabled={forkingRevision}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shadow-sm"
                >
                  {forkingRevision ? 'Forking...' : 'Create Working Revision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
