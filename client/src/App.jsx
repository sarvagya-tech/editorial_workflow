import React, { useState, useEffect, useCallback } from 'react';
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
  ShieldAlert,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Sarah Jenkins (Editor)', email: 'editor@dispatch.com', role: 'EDITOR', desk: 'All Desks' },
  { label: 'David Zhao (Editor)', email: 'david.editor@dispatch.com', role: 'EDITOR', desk: 'All Desks' },
  { label: 'Maya Patel (Writer)', email: 'writer@dispatch.com', role: 'WRITER', desk: 'Tech & Politics' },
  { label: 'Elena Rostova (Writer)', email: 'elena.writer@dispatch.com', role: 'WRITER', desk: 'Culture Only' },
  { label: 'James Wilson (Writer)', email: 'james.writer@dispatch.com', role: 'WRITER', desk: 'Politics & Investigative' },
];

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-300', bar: 'bg-slate-400' },
  IN_REVIEW: { label: 'In Review', color: 'bg-amber-50 text-amber-700 border-amber-300', bar: 'bg-amber-500' },
  APPROVED: { label: 'Approved', color: 'bg-sky-50 text-sky-700 border-sky-300', bar: 'bg-sky-500' },
  SCHEDULED: { label: 'Scheduled', color: 'bg-indigo-50 text-indigo-700 border-indigo-300', bar: 'bg-indigo-500' },
  PUBLISHED: { label: 'Published', color: 'bg-emerald-50 text-emerald-700 border-emerald-300', bar: 'bg-emerald-500' },
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(DEMO_ACCOUNTS[0]);
  const [token, setToken] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'alerts' | 'articles' | 'sections'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Articles & Detail Modal
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesSearch, setArticlesSearch] = useState('');
  const [articlesStatusFilter, setArticlesStatusFilter] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleTimeline, setArticleTimeline] = useState([]);
  const [articleModalLoading, setArticleModalLoading] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleActionLoading, setRescheduleActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Sections Data
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);

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

  const fetchAlertCountOnly = useCallback(async (authToken) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/alerts/count', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      if (res.ok && typeof json.count === 'number') {
        setAlertCount(json.count);
      }
    } catch (e) {
      // silent fallback
    }
  }, []);

  const fetchArticles = useCallback(async (authToken) => {
    if (!authToken) return;
    setArticlesLoading(true);
    try {
      const params = new URLSearchParams();
      if (articlesSearch) params.set('q', articlesSearch);
      if (articlesStatusFilter) params.set('status', articlesStatusFilter);
      params.set('limit', '25');

      const res = await fetch(`/api/articles?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      if (res.ok) {
        setArticles(json.data || []);
      }
    } catch (e) {
      // fallback
    } finally {
      setArticlesLoading(false);
    }
  }, [articlesSearch, articlesStatusFilter]);

  const fetchSections = useCallback(async (authToken) => {
    if (!authToken) return;
    setSectionsLoading(true);
    try {
      const res = await fetch('/api/sections', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      if (res.ok) {
        setSections(json.data || []);
      }
    } catch (e) {
      // fallback
    } finally {
      setSectionsLoading(false);
    }
  }, []);

  // ----------------------------------------------------
  // Initial Auth & Token Reactions
  // ----------------------------------------------------
  useEffect(() => {
    authenticateUser(DEMO_ACCOUNTS[0]);
  }, [authenticateUser]);

  useEffect(() => {
    if (token) {
      fetchDashboard(token);
      fetchAlerts(token);
    }
  }, [token, fetchDashboard, fetchAlerts]);

  useEffect(() => {
    if (token && activeView === 'articles') {
      fetchArticles(token);
    }
    if (token && activeView === 'sections') {
      fetchSections(token);
    }
  }, [token, activeView, fetchArticles, fetchSections]);

  // Refresh all relevant feeds
  const handleRefreshAll = () => {
    if (token) {
      fetchDashboard(token);
      fetchAlerts(token);
      if (activeView === 'articles') fetchArticles(token);
      if (activeView === 'sections') fetchSections(token);
    }
  };

  // ----------------------------------------------------
  // Dismiss Alert Action
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

      setDismissNotice(`Overdue alert for "${title}" successfully dismissed.`);
      // Refresh alerts list, alert count, and dashboard metrics seamlessly without page reload
      await Promise.all([fetchAlerts(token), fetchDashboard(token)]);
    } catch (err) {
      setAlertsError(`Dismissal failed: ${err.message}`);
    } finally {
      setDismissingId(null);
    }
  };

  // ----------------------------------------------------
  // View Article Details & Timeline
  // ----------------------------------------------------
  const handleOpenArticle = async (articleId) => {
    if (!token) return;
    setArticleModalLoading(true);
    setActionFeedback(null);
    try {
      const [artRes, timeRes] = await Promise.all([
        fetch(`/api/articles/${articleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/articles/${articleId}/timeline`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const artJson = await artRes.json();
      const timeJson = await timeRes.json();

      if (artRes.ok) {
        setSelectedArticle(artJson.data || artJson);
      }
      if (timeRes.ok) {
        setArticleTimeline(timeJson.data || []);
      }
    } catch (err) {
      console.error('Failed to load article detail:', err);
    } finally {
      setArticleModalLoading(false);
    }
  };

  // Reschedule Article from Detail Modal
  const handleRescheduleArticle = async (articleId) => {
    if (!token || !rescheduleDate) return;
    setRescheduleActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/schedule`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduledAt: new Date(rescheduleDate).toISOString() }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Rescheduling failed');
      }

      setActionFeedback({
        type: 'success',
        message: `Article successfully rescheduled to ${new Date(rescheduleDate).toLocaleString()}.`,
      });

      // Refresh all state
      await Promise.all([
        handleOpenArticle(articleId),
        fetchAlerts(token),
        fetchDashboard(token),
      ]);
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setRescheduleActionLoading(false);
    }
  };

  // Publish due article from Detail Modal
  const handlePublishDueArticle = async (articleId) => {
    if (!token) return;
    setRescheduleActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Publishing failed');
      }

      setActionFeedback({
        type: 'success',
        message: 'Article successfully published to live website!',
      });

      await Promise.all([
        handleOpenArticle(articleId),
        fetchAlerts(token),
        fetchDashboard(token),
      ]);
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setRescheduleActionLoading(false);
    }
  };

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

  // ----------------------------------------------------
  // RENDER APP SHELL
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 sticky top-0 h-screen z-30 select-none">
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-sm">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif-headline text-xl font-bold tracking-tight text-slate-900 leading-none">
                The Dispatch
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Newsroom
            </span>
          </div>
        </div>

        {/* Primary Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {/* 1. Dashboard */}
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              activeView === 'dashboard'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <span className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </span>
            {activeView === 'dashboard' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </button>

          {/* 2. Overdue Alerts */}
          <button
            onClick={() => setActiveView('alerts')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              activeView === 'alerts'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <span className="flex items-center gap-3">
              <AlertTriangle className={`w-4 h-4 ${alertCount > 0 ? 'text-amber-500' : ''}`} />
              Overdue Alerts
            </span>
            {alertCount > 0 ? (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold transition ${
                  activeView === 'alerts'
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {alertCount}
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-normal">0</span>
            )}
          </button>

          {/* 3. Articles */}
          <button
            onClick={() => setActiveView('articles')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              activeView === 'articles'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <span className="flex items-center gap-3">
              <FileText className="w-4 h-4" />
              Articles
            </span>
            {activeView === 'articles' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </button>

          {/* 4. Sections */}
          <button
            onClick={() => setActiveView('sections')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              activeView === 'sections'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <span className="flex items-center gap-3">
              <FolderKanban className="w-4 h-4" />
              Desks & Sections
            </span>
            {activeView === 'sections' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </button>
        </nav>

        {/* Sidebar Footer — User Context */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Session Scope</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                currentUser.role === 'EDITOR'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}
            >
              {currentUser.role}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-800 truncate">{currentUser.name || currentUser.label.split(' ')[0]}</p>
          <p className="text-[11px] text-slate-500 truncate">{currentUser.desk}</p>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Title */}
            <div>
              <span className="text-xs text-slate-400 font-medium">Newsroom / </span>
              <span className="text-sm font-bold text-slate-900 capitalize">
                {activeView === 'dashboard'
                  ? 'Editorial Analytics'
                  : activeView === 'alerts'
                  ? 'Overdue Articles'
                  : activeView === 'articles'
                  ? 'Article Repository'
                  : 'Section Directory'}
              </span>
            </div>
          </div>

          {/* Quick Demo Switcher & Header Controls */}
          <div className="flex items-center gap-3">
            {/* Demo Role Switcher */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs">
              <span className="text-slate-500 px-2 font-medium hidden sm:flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Demo Role:
              </span>
              <select
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

            {/* Refresh Button */}
            <button
              onClick={handleRefreshAll}
              disabled={dashboardLoading || alertsLoading}
              title="Refresh Newsroom Data"
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${dashboardLoading || alertsLoading ? 'animate-spin text-emerald-600' : ''}`}
              />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1">
            <button
              onClick={() => {
                setActiveView('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                activeView === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </span>
            </button>

            <button
              onClick={() => {
                setActiveView('alerts');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                activeView === 'alerts' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Overdue Alerts
              </span>
              {alertCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-400 text-slate-900">
                  {alertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveView('articles');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                activeView === 'articles' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> Articles
              </span>
            </button>

            <button
              onClick={() => {
                setActiveView('sections');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                activeView === 'sections' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4" /> Sections
              </span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* VIEW 1: OVERDUE ALERTS PAGE */}
          {activeView === 'alerts' && (
            <div className="space-y-6">
              {/* Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-900">Overdue articles</h2>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          {alertCount} Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        These scheduled articles have passed their scheduled publication time without being published.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fetchAlerts(token)}
                    disabled={alertsLoading}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${alertsLoading ? 'animate-spin' : ''}`} />
                    Refresh List
                  </button>
                </div>
              </div>

              {/* Dismiss Success Toast Notice */}
              {dismissNotice && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{dismissNotice}</span>
                  </div>
                  <button onClick={() => setDismissNotice(null)} className="text-emerald-700 hover:text-emerald-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Alerts Error Alert */}
              {alertsError && (
                <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{alertsError}</span>
                  </div>
                  <button
                    onClick={() => fetchAlerts(token)}
                    className="text-xs underline font-semibold text-red-800"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Alerts List */}
              {alertsLoading && alerts.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
                  <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-600">Checking scheduled publication pipelines...</p>
                </div>
              ) : alerts.length === 0 ? (
                /* Empty State */
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">You're all caught up.</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                    There are no overdue scheduled articles right now. All scheduled newsroom releases are on track.
                  </p>
                  <button
                    onClick={() => setActiveView('dashboard')}
                    className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
                  >
                    Return to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-white rounded-2xl border border-amber-200/90 hover:border-amber-300 p-5 shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Article & Scheduling Info */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {/* Semantic Overdue Warning Pill */}
                          <span className="font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            {alert.overdueDurationHuman}
                          </span>

                          {/* Section Badge */}
                          <span className="font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {alert.sectionName}
                          </span>

                          {/* Workflow Status */}
                          <span className="font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {alert.status}
                          </span>

                          {/* Occurrence Sequence */}
                          <span className="font-mono-code text-[11px] text-slate-400">
                            Seq #{alert.scheduleSequence}
                          </span>
                        </div>

                        {/* Article Title */}
                        <h3 className="text-base font-bold text-slate-900 hover:text-emerald-700 transition cursor-pointer"
                            onClick={() => handleOpenArticle(alert.articleId)}>
                          {alert.title}
                        </h3>

                        {/* Meta information */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>
                            Author: <strong className="text-slate-700 font-semibold">{alert.authorName}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Scheduled drop: <span className="font-medium text-slate-700">{new Date(alert.publishAt).toLocaleString()}</span>
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2.5 self-end md:self-center flex-shrink-0">
                        {/* Open Article Detail */}
                        <button
                          onClick={() => handleOpenArticle(alert.articleId)}
                          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Article
                        </button>

                        {/* Dismiss Action (Editor only) */}
                        {alert.dismissible ? (
                          <button
                            onClick={() => handleDismissAlert(alert.articleId, alert.title)}
                            disabled={dismissingId === alert.articleId}
                            title="Dismiss this overdue notification for its current schedule occurrence"
                            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition shadow-sm flex items-center gap-1.5"
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
                          <span className="text-[11px] text-slate-400 italic px-2">Editor dismiss only</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: EDITORIAL DASHBOARD */}
          {activeView === 'dashboard' && (
            <div className="space-y-8">
              {/* User Scope Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                    <span>{currentUser.role === 'EDITOR' ? 'Editorial Desk Leadership' : 'Writer Assignment View'}</span>
                    <span>•</span>
                    <span>{currentUser.desk}</span>
                  </div>
                  <h2 className="text-xl font-bold mt-1">
                    Welcome back, {currentUser.name || currentUser.label.split(' ')[0]}
                  </h2>
                  <p className="text-sm text-slate-300 mt-1">
                    {currentUser.role === 'EDITOR'
                      ? 'Displaying newsroom-wide production metrics, scheduled pipelines, and multi-desk status distributions.'
                      : 'Displaying scoped metrics for your assigned newsroom desks and self-authored reporting.'}
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
                  <span className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                    UTC Calendar Week: Mon–Sun
                  </span>
                </div>
              </div>

              {/* Overdue Alerts Warning Panel (Dashboard Integration) */}
              {alertCount > 0 && (
                <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {alertCount} Scheduled Article{alertCount === 1 ? '' : 's'} Overdue for Publication
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        These pieces passed their release time without being published. Immediate editorial review or dismissal required.
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

              {/* Error Banner */}
              {dashboardError && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span className="text-sm font-medium">{dashboardError}</span>
                  </div>
                  <button
                    onClick={() => fetchDashboard(token)}
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-900 px-3 py-1 rounded-lg font-medium transition"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Key Production Metrics Cards */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Key Production Metrics
                  </h3>
                  {dashboardLoading && <span className="text-xs text-slate-400">Updating live...</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Card 1: In Review */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        Pipeline
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {dashboardLoading && !dashboardData ? '—' : summary.inReview}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-800 mt-1">In Review</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Submitted for editor approval</p>
                    </div>
                  </div>

                  {/* Card 2: Scheduled This Week */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                        This Week
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Calendar className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {dashboardLoading && !dashboardData ? '—' : summary.scheduledThisWeek}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-800 mt-1">Scheduled This Week</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Queued for automated live drop</p>
                    </div>
                  </div>

                  {/* Card 3: Published This Week */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        Published
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {dashboardLoading && !dashboardData ? '—' : summary.publishedThisWeek}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-800 mt-1">Published This Week</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Live articles released this calendar week</p>
                    </div>
                  </div>

                  {/* Card 4: Open Drafts */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        WIP
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                        <FileEdit className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {dashboardLoading && !dashboardData ? '—' : summary.openDrafts}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-800 mt-1">Open Drafts</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Active reporter drafting queue</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Eight-Week Publication Trend Chart */}
              <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h3 className="font-serif-headline text-lg font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      Eight-Week Publication Activity
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Weekly output volume across authorized sections (Monday–Sunday UTC)
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block"></span> Current Week
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block"></span> Historical Weeks
                    </span>
                  </div>
                </div>

                {/* SVG Bar Chart */}
                <div className="pt-4 pb-2">
                  <div className="h-56 flex items-end justify-between gap-3 sm:gap-6 border-b border-slate-200 px-2">
                    {weeklyPublications.map((week, idx) => {
                      const isCurrentWeek = idx === weeklyPublications.length - 1;
                      const heightPercent = Math.max(8, Math.round((week.count / maxWeeklyCount) * 100));

                      return (
                        <div
                          key={week.weekStart}
                          className="flex-1 flex flex-col items-center h-full justify-end group relative"
                          onMouseEnter={() => setHoveredWeek(week)}
                          onMouseLeave={() => setHoveredWeek(null)}
                        >
                          {/* Tooltip */}
                          <div className="absolute -top-10 bg-slate-900 text-white text-xs px-2.5 py-1 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                            Week of {week.weekStart}: <span className="font-bold">{week.count} published</span>
                          </div>

                          {/* Count Label */}
                          <span className="text-xs font-bold text-slate-700 mb-1.5 group-hover:text-emerald-600 transition">
                            {week.count}
                          </span>

                          {/* Bar */}
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 ${
                              isCurrentWeek
                                ? 'bg-emerald-600 group-hover:bg-emerald-500 ring-2 ring-emerald-200'
                                : 'bg-emerald-400/80 group-hover:bg-emerald-500'
                            }`}
                          ></div>
                        </div>
                      );
                    })}
                  </div>

                  {/* X-Axis Labels */}
                  <div className="flex items-center justify-between gap-3 sm:gap-6 px-2 mt-3 text-xs font-medium text-slate-500">
                    {weeklyPublications.map((week, idx) => {
                      const isCurrentWeek = idx === weeklyPublications.length - 1;
                      const formattedLabel = new Date(`${week.weekStart}T00:00:00Z`).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      });

                      return (
                        <div
                          key={week.weekStart}
                          className={`flex-1 text-center truncate ${
                            isCurrentWeek ? 'font-bold text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {formattedLabel}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Status Breakdown & Section Breakdown Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Status Breakdown */}
                <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-serif-headline text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-600" />
                        Workflow Status Distribution
                      </h3>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                        Total: {totalVisibleArticles} Articles
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-6">
                      Active distribution across the 5 canonical state-machine stages
                    </p>

                    <div className="space-y-4">
                      {byStatus.map((st) => {
                        const conf = STATUS_CONFIG[st.status] || {
                          label: st.status,
                          color: 'bg-slate-100 text-slate-700 border-slate-200',
                          bar: 'bg-slate-400',
                        };
                        const percentage = totalVisibleArticles > 0 ? Math.round((st.count / totalVisibleArticles) * 100) : 0;

                        return (
                          <div key={st.status} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${conf.bar}`}></span>
                                {conf.label}
                              </span>
                              <span className="font-mono-code text-slate-600">
                                <span className="font-bold text-slate-900">{st.count}</span> ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${conf.bar}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
                    <span>Canonical State Machine Order</span>
                    <span>Draft → Review → Approved → Scheduled → Published</span>
                  </div>
                </section>

                {/* Section Coverage Breakdown */}
                <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-serif-headline text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FolderKanban className="w-5 h-5 text-sky-600" />
                        Editorial Section Coverage
                      </h3>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-100">
                        {bySection.length} Desks Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-6">
                      Article allocations by reporting desk within your authorization scope
                    </p>

                    {bySection.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-500">No active desks accessible for this role.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {bySection.map((sec) => {
                          const percentage = totalVisibleArticles > 0 ? Math.round((sec.count / totalVisibleArticles) * 100) : 0;

                          return (
                            <div
                              key={sec.sectionId}
                              className="p-3 rounded-xl border border-slate-200/70 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition flex items-center justify-between"
                            >
                              <div>
                                <h4 className="text-sm font-bold text-slate-800">{sec.sectionName}</h4>
                                <span className="text-xs text-slate-500 font-mono-code">
                                  Desk ID: {sec.sectionId.slice(0, 12)}...
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-base font-extrabold text-slate-900 font-mono-code">
                                  {sec.count}
                                </span>
                                <span className="text-xs text-slate-500 block">
                                  {percentage}% of visible
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
                    <span>Archived Desks Policy: Excluded</span>
                    <span>Zero-Disclosure Enforced</span>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* VIEW 3: ARTICLES BROWSER */}
          {activeView === 'articles' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Articles Repository</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Browse newsroom stories across drafting, review, and publication stages.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search articles..."
                      value={articlesSearch}
                      onChange={(e) => setArticlesSearch(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <select
                    value={articlesStatusFilter}
                    onChange={(e) => setArticlesStatusFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
              </div>

              {articlesLoading ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
                  <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-600">Loading stories...</p>
                </div>
              ) : articles.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
                  <p className="text-sm text-slate-500">No articles match your query.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {articles.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => handleOpenArticle(art.id)}
                      className="p-4 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-sm cursor-pointer transition flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${
                              STATUS_CONFIG[art.status]?.color || 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {art.status}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {art.section?.name || 'Unassigned'}
                          </span>
                          {art.status === 'SCHEDULED' && art.publishAt && (
                            <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1">
                              <CalendarClock className="w-3 h-3" /> {new Date(art.publishAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{art.title}</h4>
                        <p className="text-xs text-slate-500">
                          By {art.author?.name} • Updated {new Date(art.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: SECTIONS & DESKS DIRECTORY */}
          {activeView === 'sections' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Newsroom Desks & Sections</h2>
                <p className="text-xs text-slate-500 mt-0.5">Editorial desk hierarchy and assigned beat owners.</p>
              </div>

              {sectionsLoading ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
                  <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-600">Loading editorial desks...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {sections.map((sec) => (
                    <div
                      key={sec.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          Active Desk
                        </span>
                        <FolderKanban className="w-5 h-5 text-slate-400" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{sec.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2">{sec.description || 'General newsroom coverage.'}</p>
                      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between font-mono-code">
                        <span>Lead: {sec.ownerEditor?.name || 'Editorial Board'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <p>The Dispatch • Editorial Workflow Platform (React + Express + Neon PostgreSQL)</p>
        </footer>
      </div>

      {/* ARTICLE DETAIL MODAL */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase border ${
                    STATUS_CONFIG[selectedArticle.status]?.color || 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {selectedArticle.status}
                </span>
                <span className="text-xs text-slate-500 font-semibold">{selectedArticle.section?.name}</span>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1 text-sm text-slate-700">
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">{selectedArticle.title}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Reported by <strong className="text-slate-800">{selectedArticle.author?.name}</strong> • Schedule Sequence #{selectedArticle.scheduleSequence}
                </p>
              </div>

              {/* Feedback Alert */}
              {actionFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                    actionFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-red-50 text-red-900 border-red-200'
                  }`}
                >
                  {actionFeedback.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <span>{actionFeedback.message}</span>
                </div>
              )}

              {/* Scheduling Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheduled Release:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedArticle.publishAt
                      ? new Date(selectedArticle.publishAt).toLocaleString()
                      : 'None set'}
                  </span>
                </div>
                {selectedArticle.publishedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Published Timestamp:</span>
                    <span className="font-semibold text-emerald-800">
                      {new Date(selectedArticle.publishedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Body Content Preview */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Article Body</span>
                <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {selectedArticle.body || selectedArticle.workingRevision?.body}
                </p>
              </div>

              {/* Editorial Actions (Editor Only) */}
              {currentUser.role === 'EDITOR' && selectedArticle.status === 'SCHEDULED' && (
                <div className="bg-indigo-50/50 border border-indigo-200 p-4 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-indigo-900 block flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-indigo-700" />
                    Editor Scheduling Controls
                  </span>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="datetime-local"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => handleRescheduleArticle(selectedArticle.id)}
                      disabled={!rescheduleDate || rescheduleActionLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shadow-sm"
                    >
                      Reschedule Story
                    </button>
                  </div>

                  {/* Publish Now Button (if past publication time) */}
                  {selectedArticle.publishAt && new Date(selectedArticle.publishAt) <= new Date() && (
                    <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between">
                      <span className="text-xs text-indigo-900">Release time arrived:</span>
                      <button
                        onClick={() => handlePublishDueArticle(selectedArticle.id)}
                        disabled={rescheduleActionLoading}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shadow-sm"
                      >
                        Publish Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Audit Timeline */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Immutable Audit Timeline
                </span>
                <div className="space-y-2 border-l-2 border-slate-200 pl-4 py-1">
                  {articleTimeline.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No events recorded.</p>
                  ) : (
                    articleTimeline.map((ev) => (
                      <div key={ev.id} className="text-xs space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{ev.eventType}</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(ev.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-600">{ev.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
