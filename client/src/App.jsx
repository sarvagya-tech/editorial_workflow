import React, { useState, useEffect, useCallback } from 'react';

// Constants
import { DEMO_ACCOUNTS } from './constants/accounts';

// Services
import {
  loginUser,
  getDashboardMetrics,
  getOverdueAlerts,
  dismissOverdueAlert,
  getArticles,
  createArticle,
  getArticleDetails,
  submitArticleForReview,
  approveArticle,
  publishArticleNow,
  scheduleArticle,
  unpublishArticle,
  updateArticleDraft,
  forkArticleRevision,
  addArticleComment,
  bulkScheduleArticles,
  bulkUnpublishArticles,
  getSections,
  createSection,
  toggleArchiveSection,
  getCalendarArticles,
  exportCalendarCsv,
  getSchedulerStatus,
  triggerSchedulerPublish,
  registerUser,
} from './services/api';

// Common Components
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import MobileMenu from './components/common/MobileMenu';
import Toast from './components/common/Toast';

// Views
import LandingPageView from './components/views/LandingPageView';
import DashboardView from './components/views/DashboardView';
import AlertsView from './components/views/AlertsView';
import CalendarView from './components/views/CalendarView';
import ArticlesView from './components/views/ArticlesView';
import SectionsView from './components/views/SectionsView';
import SchedulerView from './components/views/SchedulerView';

// Modals
import AuthModal from './components/modals/AuthModal';
import CreateStoryModal from './components/modals/CreateStoryModal';
import CreateSectionModal from './components/modals/CreateSectionModal';
import BulkScheduleModal from './components/modals/BulkScheduleModal';
import BulkUnpublishModal from './components/modals/BulkUnpublishModal';
import ForkRevisionModal from './components/modals/ForkRevisionModal';
import ArticleDetailModal from './components/modals/ArticleDetailModal';
import CommandPalette from './components/common/CommandPalette';
import ShortcutsModal from './components/modals/ShortcutsModal';

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

  // Current session & navigation (defaults to logged-out for visitors)
  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dispatch_token') || null;
    }
    return null;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dispatch_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return null;
  });

  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'alerts' | 'articles' | 'calendar' | 'sections' | 'scheduler' | 'landing'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication & Onboarding Modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('demo');
  const [authModalError, setAuthModalError] = useState(null);
  const [authModalLoading, setAuthModalLoading] = useState(false);

  // Global Toast / Notice
  const [globalNotice, setGlobalNotice] = useState(null);

  // Command Palette & Keyboard Shortcuts
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);

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
  const [articleTimeline, setArticleTimeline] = useState([]);
  const [articleRevisions, setArticleRevisions] = useState([]);
  const [articleComments, setArticleComments] = useState([]);
  const [workflowActionLoading, setWorkflowActionLoading] = useState(false);
  const [workflowActionFeedback, setWorkflowActionFeedback] = useState(null);
  const [showForkRevisionModal, setShowForkRevisionModal] = useState(false);
  const [forkRevisionTitle, setForkRevisionTitle] = useState('');
  const [forkRevisionBody, setForkRevisionBody] = useState('');
  const [forkingRevision, setForkingRevision] = useState(false);

  // Global Keyboard Shortcuts (Cmd+K, ?, n, d, a, c, s, t)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!token || activeView === 'landing') return;

      // Command Palette: Cmd+K / Ctrl+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }

      // Check if user is typing in an input, textarea, or contentEditable
      const targetTag = e.target.tagName?.toLowerCase();
      const isInput =
        targetTag === 'input' ||
        targetTag === 'textarea' ||
        targetTag === 'select' ||
        e.target.isContentEditable;
      if (isInput) return;

      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleOpenCreateStoryModal();
      } else if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey) {
        setActiveView('dashboard');
      } else if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey) {
        setActiveView('articles');
      } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        setActiveView('calendar');
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        setActiveView('sections');
      } else if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) {
        setActiveView('scheduler');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ----------------------------------------------------
  // Authentication & Session Management
  // ----------------------------------------------------
  const authenticateUser = useCallback(async (account) => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await loginUser(account.email, 'password123');
      const userObj = { ...account, ...data.user };
      setToken(data.token);
      setCurrentUser(userObj);
      localStorage.setItem('dispatch_token', data.token);
      localStorage.setItem('dispatch_user', JSON.stringify(userObj));
      return data;
    } catch (err) {
      setDashboardError(`Login failed: ${err.message}`);
      setDashboardLoading(false);
      throw err;
    }
  }, []);

  const handleLogin = async (email, password, demoAccount = null) => {
    setAuthModalLoading(true);
    setAuthModalError(null);
    try {
      const data = await loginUser(email, password);
      const matched = demoAccount || DEMO_ACCOUNTS.find((a) => a.email === email) || {
        label: data.user?.name || email,
        name: data.user?.name || email,
        email: email,
        role: data.user?.role || 'WRITER',
        desk: data.user?.role === 'EDITOR' ? 'All Desks' : 'General Reporting',
      };
      const userObj = { ...matched, ...data.user };
      setToken(data.token);
      setCurrentUser(userObj);
      localStorage.setItem('dispatch_token', data.token);
      localStorage.setItem('dispatch_user', JSON.stringify(userObj));
      setShowAuthModal(false);
      setActiveView('dashboard');
      setGlobalNotice({
        type: 'success',
        message: `Welcome back, ${userObj.name || userObj.label}!`,
      });
    } catch (err) {
      setAuthModalError(err.message || 'Authentication failed');
    } finally {
      setAuthModalLoading(false);
    }
  };

  const handleRegister = async ({ name, email, password }) => {
    setAuthModalLoading(true);
    setAuthModalError(null);
    try {
      const data = await registerUser({ name, email, password });
      const userObj = {
        label: data.user.name,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role || 'WRITER',
        desk: 'General Reporting',
      };
      setToken(data.token);
      setCurrentUser(userObj);
      localStorage.setItem('dispatch_token', data.token);
      localStorage.setItem('dispatch_user', JSON.stringify(userObj));
      setShowAuthModal(false);
      setActiveView('dashboard');
      setGlobalNotice({
        type: 'success',
        message: `Account created! Welcome to The Dispatch, ${name}.`,
      });
    } catch (err) {
      setAuthModalError(err.message || 'Registration failed');
    } finally {
      setAuthModalLoading(false);
    }
  };

  const handleSignOut = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('dispatch_token');
    localStorage.removeItem('dispatch_user');
    setActiveView('dashboard');
    setGlobalNotice({
      type: 'success',
      message: 'You have signed out of The Dispatch workspace.',
    });
  };

  // ----------------------------------------------------
  // Data Fetchers
  // ----------------------------------------------------
  const fetchDashboard = useCallback(async (authToken) => {
    if (!authToken) return;
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await getDashboardMetrics(authToken);
      setDashboardData(data);
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
      const { alerts: list, total } = await getOverdueAlerts(authToken);
      setAlerts(list);
      setAlertCount(total);
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
      const data = await getArticles(authToken, {
        q: articlesSearch,
        status: articlesStatusFilter,
        limit: 50,
      });
      setArticles(data);
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
      const data = await getSections(authToken);
      setSections(data);
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
      const data = await getCalendarArticles(authToken, sectionId);
      setCalendarArticles(data);
    } catch (e) {
      console.error('Fetch calendar error:', e);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const fetchScheduler = useCallback(async () => {
    setSchedulerLoading(true);
    try {
      const data = await getSchedulerStatus();
      setSchedulerStatus(data);
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
    if (token) {
      fetchDashboard(token);
      fetchAlerts(token);
      fetchSections(token);
      fetchScheduler();
    }
  }, [token, fetchDashboard, fetchAlerts, fetchSections, fetchScheduler]);

  useEffect(() => {
    if (token) {
      if (activeView === 'articles') {
        fetchArticles(token);
      } else if (activeView === 'calendar') {
        fetchCalendar(token, calendarSectionFilter);
      } else if (activeView === 'sections') {
        fetchSections(token);
      } else if (activeView === 'scheduler') {
        fetchScheduler();
      }
    }
  }, [token, activeView, calendarSectionFilter, fetchArticles, fetchCalendar, fetchSections, fetchScheduler]);

  // Periodic heartbeat polling for autonomous scheduler
  useEffect(() => {
    if (activeView === 'scheduler') {
      const timer = setInterval(() => {
        fetchScheduler();
      }, 15000);
      return () => clearInterval(timer);
    }
  }, [activeView, fetchScheduler]);

  // Refresh all feeds
  const handleRefreshAll = () => {
    if (token) {
      fetchDashboard(token);
      fetchAlerts(token);
      fetchSections(token);
      fetchScheduler();
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
      await dismissOverdueAlert(token, articleId);
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
      const data = await triggerSchedulerPublish();
      setTriggerCronResult({
        success: true,
        data,
      });

      // Refresh all feeds to reflect published stories
      await Promise.all([
        fetchScheduler(),
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
      await exportCalendarCsv(token, calendarSectionFilter);
      setGlobalNotice({ type: 'success', message: 'Editorial release calendar exported to CSV successfully.' });
    } catch (err) {
      setGlobalNotice({ type: 'error', message: `Calendar export failed: ${err.message}` });
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
      const story = await createArticle(token, {
        title: newStoryTitle,
        body: newStoryBody,
        sectionId: newStorySectionId,
      });

      setShowCreateStoryModal(false);
      setGlobalNotice({
        type: 'success',
        message: `Draft story "${story?.title}" created successfully.`,
      });

      setActiveView('articles');
      await Promise.all([fetchArticles(token), fetchDashboard(token)]);
      if (story?.id) {
        handleOpenArticle(story.id);
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
      const json = await bulkScheduleArticles(token, selectedArticleIds, bulkScheduleDate);

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
      setGlobalNotice({ type: 'error', message: `Bulk scheduling failed: ${err.message}` });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUnpublishSubmit = async () => {
    if (!token || selectedArticleIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const json = await bulkUnpublishArticles(token, selectedArticleIds, bulkUnpublishReason);

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
      setGlobalNotice({ type: 'error', message: `Bulk unpublish failed: ${err.message}` });
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
      const json = await createSection(token, {
        name: newSectionName,
        description: newSectionDesc,
      });

      setShowCreateSectionModal(false);
      setNewSectionName('');
      setNewSectionDesc('');
      setGlobalNotice({ type: 'success', message: `Desk "${json.name}" created successfully.` });
      await fetchSections(token);
    } catch (err) {
      setGlobalNotice({ type: 'error', message: `Section creation failed: ${err.message}` });
    } finally {
      setCreateSectionLoading(false);
    }
  };

  const handleToggleArchiveSection = async (section) => {
    if (!token) return;
    setSectionActionId(section.id);
    try {
      await toggleArchiveSection(token, section.id, section.isArchived);
      setGlobalNotice({
        type: 'success',
        message: `Desk "${section.name}" ${section.isArchived ? 'restored to active rotation' : 'archived'}.`,
      });
      await fetchSections(token);
    } catch (err) {
      setGlobalNotice({ type: 'error', message: `Desk action failed: ${err.message}` });
    } finally {
      setSectionActionId(null);
    }
  };

  // ----------------------------------------------------
  // Article Detail Modal & Lifecycle Actions
  // ----------------------------------------------------
  const handleOpenArticle = async (articleId, preserveFeedback = false) => {
    if (!token) return;
    if (!preserveFeedback) {
      setWorkflowActionFeedback(null);
    }
    setShowForkRevisionModal(false);

    try {
      const details = await getArticleDetails(token, articleId);
      setSelectedArticle(details.article);
      setArticleTimeline(details.timeline);
      setArticleRevisions(details.revisions);
      setArticleComments(details.comments);
    } catch (err) {
      console.error('Failed to load article detail:', err);
    }
  };

  const handleSubmitArticleForReview = async () => {
    if (!token || !selectedArticle) return;
    setWorkflowActionLoading(true);
    setWorkflowActionFeedback(null);
    try {
      await submitArticleForReview(token, selectedArticle.id);
      setWorkflowActionFeedback({
        type: 'success',
        message: 'Story successfully submitted for Editorial Board Review.',
      });
      await Promise.all([handleOpenArticle(selectedArticle.id, true), fetchArticles(token), fetchDashboard(token)]);
    } catch (err) {
      setWorkflowActionFeedback({ type: 'error', message: err.message });
    } finally {
      setWorkflowActionLoading(false);
    }
  };

  const handleApproveArticle = async () => {
    if (!token || !selectedArticle) return;
    setWorkflowActionLoading(true);
    setWorkflowActionFeedback(null);
    try {
      await approveArticle(token, selectedArticle.id);
      setWorkflowActionFeedback({
        type: 'success',
        message: 'Story approved! Ready for immediate publication or scheduled drop.',
      });
      await Promise.all([handleOpenArticle(selectedArticle.id, true), fetchArticles(token), fetchDashboard(token)]);
    } catch (err) {
      setWorkflowActionFeedback({ type: 'error', message: err.message });
    } finally {
      setWorkflowActionLoading(false);
    }
  };

  const handlePublishNow = async () => {
    if (!token || !selectedArticle) return;
    setWorkflowActionLoading(true);
    setWorkflowActionFeedback(null);
    try {
      await publishArticleNow(token, selectedArticle.id);
      setWorkflowActionFeedback({
        type: 'success',
        message: 'Story published live to the Dispatch frontpage!',
      });
      await Promise.all([
        handleOpenArticle(selectedArticle.id, true),
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

  const handleScheduleSubmit = async (scheduleDate) => {
    if (!token || !selectedArticle || !scheduleDate) return;
    setWorkflowActionLoading(true);
    setWorkflowActionFeedback(null);
    try {
      await scheduleArticle(token, selectedArticle.id, scheduleDate);
      setWorkflowActionFeedback({
        type: 'success',
        message: `Publication scheduled for ${new Date(scheduleDate).toLocaleString()}.`,
      });
      await Promise.all([
        handleOpenArticle(selectedArticle.id, true),
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

  const handleUnpublishSubmit = async (reason) => {
    if (!token || !selectedArticle) return;
    setWorkflowActionLoading(true);
    setWorkflowActionFeedback(null);
    try {
      await unpublishArticle(token, selectedArticle.id, reason);
      setWorkflowActionFeedback({
        type: 'success',
        message: 'Story unpublished and returned to Approved state.',
      });
      await Promise.all([
        handleOpenArticle(selectedArticle.id, true),
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

  const handleSaveDraftChanges = async (title, body) => {
    if (!token || !selectedArticle) return;
    setWorkflowActionFeedback(null);
    try {
      await updateArticleDraft(token, selectedArticle.id, { title, body });
      setWorkflowActionFeedback({ type: 'success', message: 'Draft content updated.' });
      await handleOpenArticle(selectedArticle.id, true);
    } catch (err) {
      setWorkflowActionFeedback({ type: 'error', message: err.message });
    }
  };

  const handleForkNewRevision = async () => {
    if (!token || !selectedArticle) return;
    setForkingRevision(true);
    try {
      await forkArticleRevision(token, selectedArticle.id, {
        title: forkRevisionTitle || selectedArticle.title,
        body: forkRevisionBody || selectedArticle.body,
      });

      setShowForkRevisionModal(false);
      setWorkflowActionFeedback({
        type: 'success',
        message: 'New draft revision opened! Live published version remains untouched.',
      });
      await handleOpenArticle(selectedArticle.id);
    } catch (err) {
      setGlobalNotice({ type: 'error', message: `Revision creation failed: ${err.message}` });
    } finally {
      setForkingRevision(false);
    }
  };

  const handleAddComment = async (content) => {
    if (!token || !selectedArticle || !content.trim()) return;
    try {
      await addArticleComment(token, selectedArticle.id, content);
      const details = await getArticleDetails(token, selectedArticle.id);
      setArticleComments(details.comments);
      setArticleTimeline(details.timeline);
    } catch (err) {
      setGlobalNotice({ type: 'error', message: `Comment error: ${err.message}` });
    }
  };

  // ----------------------------------------------------
  // Render: Public Landing Page for Logged-Out Visitors
  // or when an authenticated user selects "Product Tour"
  // ----------------------------------------------------
  if (!token || activeView === 'landing') {
    return (
      <>
        <LandingPageView
          theme={theme}
          setTheme={setTheme}
          currentUser={currentUser}
          token={token}
          onOpenAuthModal={(tab = 'demo') => {
            setAuthModalTab(tab);
            setAuthModalError(null);
            setShowAuthModal(true);
          }}
          onNavigateToWorkspace={() => setActiveView('dashboard')}
          onSignOut={handleSignOut}
          onQuickDemoLogin={(account) => handleLogin(account.email, 'password123', account)}
        />

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialTab={authModalTab}
          onLogin={handleLogin}
          onRegister={handleRegister}
          loading={authModalLoading}
          error={authModalError}
          setError={setAuthModalError}
        />

        <Toast notice={globalNotice} onDismiss={() => setGlobalNotice(null)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex font-sans selection:bg-emerald-500 selection:text-white">
      {/* Sidebar Navigation (Desktop) */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        alertCount={alertCount}
        currentUser={currentUser}
        onOpenCreateStory={handleOpenCreateStoryModal}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          activeView={activeView}
          currentUser={currentUser}
          onUserSelect={authenticateUser}
          theme={theme}
          setTheme={setTheme}
          onRefresh={handleRefreshAll}
          loading={dashboardLoading || alertsLoading}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          onOpenCreateStory={handleOpenCreateStoryModal}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onOpenShortcuts={() => setShowShortcutsModal(true)}
          onNavigateToLanding={() => setActiveView('landing')}
          onSignOut={handleSignOut}
        />

        {/* Global Toast Notification */}
        <Toast notice={globalNotice} onDismiss={() => setGlobalNotice(null)} />

        {/* Mobile Navigation Drawer */}
        <MobileMenu
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          activeView={activeView}
          setActiveView={setActiveView}
          alertCount={alertCount}
        />

        {/* Main Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {activeView === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              dashboardData={dashboardData}
              dashboardLoading={dashboardLoading}
              dashboardError={dashboardError}
              alertCount={alertCount}
              onNavigateToAlerts={() => setActiveView('alerts')}
              onRetry={() => fetchDashboard(token)}
            />
          )}

          {activeView === 'alerts' && (
            <AlertsView
              alerts={alerts}
              alertCount={alertCount}
              alertsLoading={alertsLoading}
              alertsError={alertsError}
              dismissNotice={dismissNotice}
              setDismissNotice={setDismissNotice}
              dismissingId={dismissingId}
              onDismissAlert={handleDismissAlert}
              onRefreshAlerts={() => fetchAlerts(token)}
              onOpenArticle={handleOpenArticle}
              onReturnToDashboard={() => setActiveView('dashboard')}
            />
          )}

          {activeView === 'calendar' && (
            <CalendarView
              calendarArticles={calendarArticles}
              calendarLoading={calendarLoading}
              calendarSectionFilter={calendarSectionFilter}
              setCalendarSectionFilter={setCalendarSectionFilter}
              calendarStatusFilter={calendarStatusFilter}
              setCalendarStatusFilter={setCalendarStatusFilter}
              calendarExportLoading={calendarExportLoading}
              onExportCsv={handleExportCalendarCsv}
              sections={sections}
              onOpenArticle={handleOpenArticle}
            />
          )}

          {activeView === 'articles' && (
            <ArticlesView
              articles={articles}
              articlesLoading={articlesLoading}
              articlesSearch={articlesSearch}
              setArticlesSearch={setArticlesSearch}
              articlesStatusFilter={articlesStatusFilter}
              setArticlesStatusFilter={setArticlesStatusFilter}
              selectedArticleIds={selectedArticleIds}
              onToggleSelectArticle={handleToggleSelectArticle}
              onSelectAllArticles={handleSelectAllArticles}
              bulkOutcome={bulkOutcome}
              setBulkOutcome={setBulkOutcome}
              currentUser={currentUser}
              onOpenArticle={handleOpenArticle}
              onOpenBulkSchedule={() => setShowBulkScheduleModal(true)}
              onOpenBulkUnpublish={() => setShowBulkUnpublishModal(true)}
              onClearBulkSelection={() => setSelectedArticleIds([])}
            />
          )}

          {activeView === 'sections' && (
            <SectionsView
              sections={sections}
              sectionsLoading={sectionsLoading}
              currentUser={currentUser}
              sectionActionId={sectionActionId}
              onOpenCreateSection={() => setShowCreateSectionModal(true)}
              onToggleArchiveSection={handleToggleArchiveSection}
              token={token}
              onToast={(msg) => setGlobalNotice({ message: msg, type: 'success' })}
            />
          )}

          {activeView === 'scheduler' && (
            <SchedulerView
              schedulerStatus={schedulerStatus}
              triggerCronLoading={triggerCronLoading}
              triggerCronResult={triggerCronResult}
              setTriggerCronResult={setTriggerCronResult}
              onTriggerCycle={handleTriggerSchedulerCycle}
            />
          )}
        </main>

        {/* Newsroom Footer */}
        <footer className="bg-white dark:bg-[#0d1322] border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
          <p>The Dispatch • Modern Editorial Workflow Platform (React + Express + Neon PostgreSQL)</p>
        </footer>
      </div>

      {/* Modals */}
      <CreateStoryModal
        isOpen={showCreateStoryModal}
        onClose={() => setShowCreateStoryModal(false)}
        title={newStoryTitle}
        setTitle={setNewStoryTitle}
        sectionId={newStorySectionId}
        setSectionId={setNewStorySectionId}
        body={newStoryBody}
        setBody={setNewStoryBody}
        sections={sections}
        loading={createStoryLoading}
        error={createStoryError}
        onSubmit={handleCreateStory}
      />

      <CreateSectionModal
        isOpen={showCreateSectionModal}
        onClose={() => setShowCreateSectionModal(false)}
        name={newSectionName}
        setName={setNewSectionName}
        description={newSectionDesc}
        setDescription={setNewSectionDesc}
        loading={createSectionLoading}
        onSubmit={handleCreateSection}
      />

      <BulkScheduleModal
        isOpen={showBulkScheduleModal}
        onClose={() => setShowBulkScheduleModal(false)}
        selectedCount={selectedArticleIds.length}
        bulkScheduleDate={bulkScheduleDate}
        setBulkScheduleDate={setBulkScheduleDate}
        loading={bulkActionLoading}
        onSubmit={handleBulkScheduleSubmit}
      />

      <BulkUnpublishModal
        isOpen={showBulkUnpublishModal}
        onClose={() => setShowBulkUnpublishModal(false)}
        selectedCount={selectedArticleIds.length}
        bulkUnpublishReason={bulkUnpublishReason}
        setBulkUnpublishReason={setBulkUnpublishReason}
        loading={bulkActionLoading}
        onSubmit={handleBulkUnpublishSubmit}
      />

      <ForkRevisionModal
        isOpen={showForkRevisionModal}
        onClose={() => setShowForkRevisionModal(false)}
        title={forkRevisionTitle}
        setTitle={setForkRevisionTitle}
        body={forkRevisionBody}
        setBody={setForkRevisionBody}
        loading={forkingRevision}
        onSubmit={handleForkNewRevision}
      />

      <ArticleDetailModal
        selectedArticle={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        currentUser={currentUser}
        articleTimeline={articleTimeline}
        articleRevisions={articleRevisions}
        articleComments={articleComments}
        workflowActionLoading={workflowActionLoading}
        workflowActionFeedback={workflowActionFeedback}
        onSubmitForReview={handleSubmitArticleForReview}
        onApproveArticle={handleApproveArticle}
        onPublishNow={handlePublishNow}
        onScheduleSubmit={handleScheduleSubmit}
        onUnpublishSubmit={handleUnpublishSubmit}
        onSaveDraftChanges={handleSaveDraftChanges}
        onOpenForkRevision={() => {
          setForkRevisionTitle(selectedArticle?.title || '');
          setForkRevisionBody(selectedArticle?.body || '');
          setShowForkRevisionModal(true);
        }}
        onAddComment={handleAddComment}
      />

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        activeView={activeView}
        setActiveView={setActiveView}
        onNavigate={(view) => setActiveView(view)}
        currentUser={currentUser}
        onUserSelect={authenticateUser}
        onSwitchUser={authenticateUser}
        theme={theme}
        setTheme={setTheme}
        onOpenCreateStory={handleOpenCreateStoryModal}
        onOpenCreateSection={() => setShowCreateSectionModal(true)}
        onExportCalendarCsv={handleExportCalendarCsv}
        articles={articles}
        onOpenArticle={handleOpenArticle}
        onOpenStory={(article) => handleOpenArticle(article.id)}
      />

      {/* Keyboard Shortcuts Guide Modal (?) */}
      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
