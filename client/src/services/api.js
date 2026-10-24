// client/src/services/api.js
// Client API Service for The Dispatch Editorial Workflow Platform

import { CRON_SECRET } from '../constants/status';

/**
 * Authentication
 */
export async function loginUser(email, password = 'password123') {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Authentication failed');
  }
  return data;
}

/**
 * Dashboard Metrics & Analytics
 */
export async function getDashboardMetrics(token) {
  const res = await fetch('/api/dashboard', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load dashboard metrics');
  return json.data || json;
}

/**
 * Overdue Scheduled Article Alerts
 */
export async function getOverdueAlerts(token) {
  const res = await fetch('/api/alerts/overdue', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load overdue alerts');
  return {
    alerts: json.alerts || json.data || [],
    total: json.total !== undefined ? json.total : (json.alerts || json.data || []).length,
  };
}

export async function dismissOverdueAlert(token, articleId) {
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
  return json;
}

/**
 * Articles & Lifecycle
 */
export async function getArticles(token, { q = '', status = '', limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (limit) params.set('limit', String(limit));

  const res = await fetch(`/api/articles?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load articles');
  return json.data || [];
}

export async function createArticle(token, { title, body, sectionId }) {
  const res = await fetch('/api/articles', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title.trim(),
      body: body.trim() || 'Draft story notes and reporting body...',
      sectionId,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Story creation failed');
  return json.data || json;
}

export async function getArticleDetails(token, articleId) {
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

  if (!artRes.ok) throw new Error(artJson.message || 'Failed to fetch article details');

  return {
    article: artJson.data || artJson,
    timeline: timeRes.ok ? timeJson.data || [] : [],
    revisions: revRes.ok ? revJson.data || [] : [],
    comments: comRes.ok ? comJson.data || [] : [],
  };
}

export async function submitArticleForReview(token, articleId) {
  const res = await fetch(`/api/articles/${articleId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Submission failed');
  return json;
}

export async function approveArticle(token, articleId) {
  const res = await fetch(`/api/articles/${articleId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Approval failed');
  return json;
}

export async function publishArticleNow(token, articleId) {
  const res = await fetch(`/api/articles/${articleId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Publishing failed');
  return json;
}

export async function scheduleArticle(token, articleId, scheduledAt) {
  const res = await fetch(`/api/articles/${articleId}/schedule`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString() }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Scheduling failed');
  return json;
}

export async function unpublishArticle(token, articleId, reason) {
  const res = await fetch(`/api/articles/${articleId}/unpublish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: reason?.trim() || 'Editorial retraction / hold' }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Unpublish failed');
  return json;
}

export async function updateArticleDraft(token, articleId, { title, body }) {
  const res = await fetch(`/api/articles/${articleId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title.trim(),
      body: body.trim(),
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to save changes');
  return json;
}

export async function forkArticleRevision(token, articleId, { title, body }) {
  const res = await fetch(`/api/articles/${articleId}/revisions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title.trim(),
      body: body.trim(),
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to open new revision');
  return json;
}

export async function addArticleComment(token, articleId, content) {
  const res = await fetch(`/api/articles/${articleId}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: content.trim() }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to post comment');
  return json;
}

/**
 * Bulk Operations
 */
export async function bulkScheduleArticles(token, articleIds, scheduledAt) {
  const res = await fetch('/api/articles/bulk/schedule', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      articleIds,
      scheduledAt: new Date(scheduledAt).toISOString(),
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Bulk schedule failed');
  return json;
}

export async function bulkUnpublishArticles(token, articleIds, reason) {
  const res = await fetch('/api/articles/bulk/unpublish', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      articleIds,
      reason: reason?.trim() || 'Editorial bulk withdrawal',
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Bulk unpublish failed');
  return json;
}

/**
 * Editorial Sections & Desks
 */
export async function getSections(token) {
  const res = await fetch('/api/sections?includeArchived=true', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load sections');
  return json.data || json || [];
}

export async function createSection(token, { name, description }) {
  const res = await fetch('/api/sections', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name.trim(),
      description: description?.trim() || undefined,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create desk');
  return json;
}

export async function toggleArchiveSection(token, sectionId, isArchived) {
  const action = isArchived ? 'restore' : 'archive';
  const res = await fetch(`/api/sections/${sectionId}/${action}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Failed to ${action} desk`);
  return json;
}

/**
 * Editorial Calendar
 */
export async function getCalendarArticles(token, sectionId = '') {
  const params = new URLSearchParams();
  if (sectionId) params.set('sectionId', sectionId);
  const res = await fetch(`/api/calendar?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load calendar');
  return json.data || [];
}

export async function exportCalendarCsv(token, sectionId = '') {
  const params = new URLSearchParams();
  if (sectionId) params.set('sectionId', sectionId);
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
}

/**
 * Autonomous Background Scheduler
 */
export async function getSchedulerStatus() {
  const res = await fetch('/api/internal/cron/status', {
    headers: { 'x-cron-secret': CRON_SECRET },
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'Failed to fetch scheduler status');
  return json.data;
}

export async function triggerSchedulerPublish() {
  const res = await fetch('/api/internal/cron/publish', {
    method: 'POST',
    headers: {
      'x-cron-secret': CRON_SECRET,
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || 'Cron cycle failed');
  return json.data;
}
