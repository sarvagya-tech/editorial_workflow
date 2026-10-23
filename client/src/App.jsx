import React, { useState, useEffect, useCallback } from 'react';
import {
  Newspaper,
  Clock,
  Calendar,
  CheckCircle2,
  FileEdit,
  RefreshCw,
  TrendingUp,
  Layers,
  FolderKanban,
  ShieldAlert,
  UserCheck,
  AlertCircle,
  ExternalLink,
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
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredWeek, setHoveredWeek] = useState(null);

  // Authenticate as selected demo account
  const authenticateUser = useCallback(async (account) => {
    setLoading(true);
    setError(null);
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
      setError(`Login failed: ${err.message}`);
      setLoading(false);
    }
  }, []);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async (authToken) => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to load dashboard metrics');
      }
      setDashboardData(json.data || json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial login
  useEffect(() => {
    authenticateUser(DEMO_ACCOUNTS[0]);
  }, [authenticateUser]);

  // Load dashboard when token updates
  useEffect(() => {
    if (token) {
      fetchDashboard(token);
    }
  }, [token, fetchDashboard]);

  const summary = dashboardData?.summary || {
    inReview: 0,
    scheduledThisWeek: 0,
    publishedThisWeek: 0,
    openDrafts: 0,
  };

  const byStatus = dashboardData?.byStatus || [];
  const bySection = dashboardData?.bySection || [];
  const weeklyPublications = dashboardData?.weeklyPublications || [];

  const maxWeeklyCount = Math.max(1, ...weeklyPublications.map((w) => w.count));
  const totalVisibleArticles = byStatus.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif-headline text-2xl font-bold tracking-tight text-slate-900 leading-none">
                  The Dispatch
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800">
                  Newsroom
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Editorial Workflow Management & Analytics</p>
            </div>
          </div>

          {/* Quick Demo Switcher & Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs">
              <span className="text-slate-500 px-2 font-medium flex items-center gap-1">
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

            <button
              onClick={() => fetchDashboard(token)}
              disabled={loading}
              title="Refresh Analytics"
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
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

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button
              onClick={() => fetchDashboard(token)}
              className="text-xs bg-red-100 hover:bg-red-200 text-red-900 px-3 py-1 rounded-lg font-medium transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. Four Summary Metric Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Key Production Metrics
            </h3>
            {loading && <span className="text-xs text-slate-400">Updating live...</span>}
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
                  {loading && !dashboardData ? '—' : summary.inReview}
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
                  {loading && !dashboardData ? '—' : summary.scheduledThisWeek}
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
                  {loading && !dashboardData ? '—' : summary.publishedThisWeek}
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
                  {loading && !dashboardData ? '—' : summary.openDrafts}
                </span>
                <h4 className="text-sm font-semibold text-slate-800 mt-1">Open Drafts</h4>
                <p className="text-xs text-slate-500 mt-0.5">Active reporter drafting queue</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Eight-Week Publication Trend Chart */}
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

        {/* 3. Status Breakdown & Section Breakdown Grid */}
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
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>The Dispatch • Editorial Workflow Platform (React + Express + Neon PostgreSQL)</p>
      </footer>
    </div>
  );
}
