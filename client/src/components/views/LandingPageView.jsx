import React, { useState } from 'react';
import {
  Newspaper,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Calendar,
  PenSquare,
  FileText,
  Search,
  Sparkles,
  Users,
  LayoutDashboard,
  Layers,
  CheckSquare,
  History,
  Lock,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  Sun,
  Moon,
  AlertTriangle,
  Cpu,
  BarChart3,
  ExternalLink,
  BookOpen,
  ArrowUpRight,
} from 'lucide-react';
import { DEMO_ACCOUNTS } from '../../constants/accounts';

export default function LandingPageView({
  theme,
  setTheme,
  currentUser,
  token,
  onOpenAuthModal,
  onNavigateToWorkspace,
  onSignOut,
  onQuickDemoLogin,
}) {
  const [activePreviewTab, setActivePreviewTab] = useState('dashboard'); // 'dashboard' | 'queue' | 'calendar' | 'checklist'

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* ----------------------------------------------------
          1. NAVBAR
      ---------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0d1322]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Product Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  The Dispatch
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Workflow Platform
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Digital Newsroom Workspace
              </span>
            </div>
          </div>

          {/* Navigation Anchors */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button
              onClick={() => scrollToSection('workflow')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('roles')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              For Writers & Editors
            </button>
            <button
              onClick={() => scrollToSection('preview')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              Platform Tour
            </button>
          </nav>

          {/* Right Action Group */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Authenticated State vs Logged-out State */}
            {token ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 text-xs">
                  <div className="w-5 h-5 rounded-full bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {currentUser?.name ? currentUser.name[0] : 'U'}
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                    {currentUser?.name || 'Staff User'}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase">({currentUser?.role})</span>
                </div>

                <button
                  onClick={onNavigateToWorkspace}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={onSignOut}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuthModal('login')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuthModal('demo')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-emerald-600/20 transition flex items-center gap-1.5"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------
          2. HERO SECTION
      ---------------------------------------------------- */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
        {/* Subtle Ambient Newsroom Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Eyebrow Positioning Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Digital Newsroom Editorial Management</span>
            <span className="text-slate-400 dark:text-slate-500">·</span>
            <span className="text-slate-500 dark:text-slate-400 font-normal">Internal newsroom platform, not a public reader</span>
          </div>

          {/* Core Headline & Supporting Message */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              From first draft to <span className="text-emerald-600 dark:text-emerald-400 italic">final publication</span>.
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              One workspace for writers and editors to create, review, approve, schedule, and track newsroom stories.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => (token ? onNavigateToWorkspace() : onOpenAuthModal('demo'))}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2 group"
            >
              <span>{token ? 'Enter Active Workspace' : 'Open Workspace'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </button>
            <button
              onClick={() => scrollToSection('workflow')}
              className="w-full sm:w-auto px-5 py-3 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl border border-slate-200 dark:border-slate-700/80 transition flex items-center justify-center gap-2"
            >
              <span>See How It Works</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Instant Test Drive Pills */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-400">Instant Test Drive:</span>
            <button
              onClick={() => onQuickDemoLogin(DEMO_ACCOUNTS[0])}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold hover:bg-emerald-100 transition flex items-center gap-1.5"
            >
              <span>Editor: Sarah Jenkins</span>
              <ArrowUpRight className="w-3 h-3 opacity-70" />
            </button>
            <button
              onClick={() => onQuickDemoLogin(DEMO_ACCOUNTS[2])}
              className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 font-semibold hover:bg-sky-100 transition flex items-center gap-1.5"
            >
              <span>Reporter: Maya Patel</span>
              <ArrowUpRight className="w-3 h-3 opacity-70" />
            </button>
          </div>

          {/* ----------------------------------------------------
              HERO WORKSPACE PREVIEW CARD (Realistic UI)
          ---------------------------------------------------- */}
          <div className="pt-8">
            <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-left max-w-5xl mx-auto">
              {/* Preview Window Header */}
              <div className="px-4 py-3 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                    dispatch://newsroom.workspace/editorial-pipeline
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Autonomous Cron Active</span>
                </div>
              </div>

              {/* Status Counter Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900/30">
                <div className="p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1. Draft</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-200">1 Story</span>
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">2. In Review</span>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400">1 Story</span>
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider block">3. Approved</span>
                  <span className="text-base font-bold text-sky-600 dark:text-sky-400">1 Story</span>
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">4. Scheduled</span>
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">1 Story</span>
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">5. Published</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">1 Story</span>
                </div>
              </div>

              {/* Sample Story Rows */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-4 space-y-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        PUBLISHED
                      </span>
                      <span className="text-xs text-slate-400 font-medium">Climate & Energy</span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Maya Patel</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      Next-Gen Small Modular Reactors Cleared for Hyperscale AI Data Campuses
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-shrink-0">
                    <span className="text-slate-400 text-[11px] font-mono">1,120 words</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold">
                      Live on Frontpage
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                        SCHEDULED
                      </span>
                      <span className="text-xs text-slate-400 font-medium">Technology & AI</span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Sarah Jenkins (Ed.)</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      Global Antitrust Taskforce Finalizes Interoperability Standards for Frontier Models
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
                      Scheduled for Tomorrow 09:00 UTC
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                        IN_REVIEW
                      </span>
                      <span className="text-xs text-slate-400 font-medium">Metro Infrastructure</span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">James Wilson</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      Urban Micro-Forestry Initiatives Cut Metropolitan Heat Island Indices by 4.2°C
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-shrink-0">
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold">
                      4/4 Signed Off
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Guardrail Note */}
              <div className="p-3 bg-slate-100/50 dark:bg-slate-900/50 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-4">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Two-Person Approval Rule & Immutable Audit Trail Active
                </span>
                <span className="hidden sm:inline font-mono">PostgreSQL Ledger Protected</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          3. HOW IT WORKS (The 5-Stage Editorial Pipeline)
      ---------------------------------------------------- */}
      <section id="workflow" className="py-20 border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-[#0d1322]/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Editorial Pipeline Architecture
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              A Structured 5-Stage Publishing Flow
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Designed for newsroom accuracy and accountability. Story approval and story publication are distinct, deliberate steps.
            </p>
          </div>

          {/* 5-Step Pipeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Stage 1 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <PenSquare className="w-4 h-4 text-slate-500" /> Draft
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Beat writers create and edit stories within assigned desks. Real-time character/word counts and automatic revision snapshotting.
              </p>
            </div>

            {/* Stage 2 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-500" /> In Review
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Writers submit drafts to the Editorial Board. Copy editing locks to preserve review integrity while editors inspect sources.
              </p>
            </div>

            {/* Stage 3 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-sky-500" /> Approved
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                An eligible editor verifies the 4-point checklist (facts, style, legal, photo rights). Two-person rule prevents self-approval.
              </p>
            </div>

            {/* Stage 4 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" /> Scheduled
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                An editor coordinates a release slate or embargo time. Queued in the calendar with automatic overdue alert monitors.
              </p>
            </div>

            {/* Stage 5 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                5
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-500" /> Published
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Autonomous publishing daemon or direct editor action pushes the story live to the public reader frontpage.
              </p>
            </div>
          </div>

          {/* Non-Technical Callout: Why Approval != Publication */}
          <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <span className="font-bold block">Why Approval and Publication are Distinct Actions:</span>
              <p className="leading-relaxed">
                In professional newsrooms, an investigation or breaking report can be fully fact-checked, copy-edited, and approved by senior editors days before its scheduled news drop or embargo expiration. Separating Approval from Publication ensures journalistic rigor without holding up coordinated publishing schedules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          4. FEATURE HIGHLIGHTS (Verified Implemented Features)
      ---------------------------------------------------- */}
      <section id="features" className="py-20 border-t border-slate-200 dark:border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Newsroom Capabilities
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Every Tool Necessary for Editorial Governance
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Every feature below is implemented and tested in the live Dispatch application.
            </p>
          </div>

          {/* 8 Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Revisions & Simple Diffs
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Track full version lineage with working revision branches. Compare side-by-side line additions and deletions.
              </p>
            </div>

            {/* 2 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-400 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Two-Person Approval Guard
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Authors are prevented by server policy from self-approving their own stories. Includes 4-point editorial sign-off checklist.
              </p>
            </div>

            {/* 3 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Desks & Beat Scoping
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Organize reporting into Technology, Climate, Metro, and Culture desks. Assign writers and manage desk archiving.
              </p>
            </div>

            {/* 4 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Autonomous Cron Publisher
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Background worker checks pending scheduled drops every 30 seconds with clock synchronization and manual trigger fallback.
              </p>
            </div>

            {/* 5 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Search className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Full-Text Search & Filters
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                High-performance search across story titles and body text with status filters, section tabs, and command palette (⌘K).
              </p>
            </div>

            {/* 6 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bulk Workflow Actions
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Batch-schedule multiple stories or perform emergency retractions with mandatory audit reasons and partial-failure safety.
              </p>
            </div>

            {/* 7 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-400 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Newsroom Dashboard & KPIs
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Real-time status breakdown gauges, newsroom velocity metrics, desk distribution, and overdue alert summary cards.
              </p>
            </div>

            {/* 8 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Immutable Audit Trail
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Append-only PostgreSQL ledger triggers record every transition, timestamp, and acting editor with strict data immutability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          5. WRITERS VS EDITORS (Role Clarification)
      ---------------------------------------------------- */}
      <section id="roles" className="py-20 border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-[#0d1322]/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Role-Based Access Control
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Clear Division of Newsroom Responsibilities
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Writers focus on reporting; editors safeguard standards and control publication.
            </p>
          </div>

          {/* Two Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: Beat Writers */}
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-400 flex items-center justify-center">
                    <PenSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Beat Writers & Reporters
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Story Drafting & Content Creation
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  WRITER
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  What Beat Writers Do:
                </p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Create new story drafts with headline, summary, and rich body copy.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Submit draft stories to the Editorial Board for official review.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Track word counts, character counts, and estimated read times.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Participate in Editorial Desk discussion threads with desk editors.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>View version history and compare line-by-line revisions.</span>
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Strict Safeguard:</span>
                Writers cannot self-approve their own articles, schedule release dates, or publish stories directly to the public frontpage.
              </div>
            </div>

            {/* Card 2: Editors */}
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Managing & Senior Editors
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Quality Gatekeeping & Publication
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  EDITOR
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  What Editors Do:
                </p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Review newsroom submissions across all reporting beats and desks.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Enforce house style, fact-checking, and legal sign-off checklist.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Grant formal story approval under the two-person verification rule.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Schedule release times with quick presets or publish stories live immediately.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Retract/unpublish stories with required audit justifications.</span>
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-emerald-900 dark:text-emerald-300">
                <span className="font-bold block mb-0.5">Editorial Authority:</span>
                Editors manage desk assignments, trigger autonomous cron runs, and export publication slates to CSV.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          6. INTERACTIVE PRODUCT PREVIEW
      ---------------------------------------------------- */}
      <section id="preview" className="py-20 border-t border-slate-200 dark:border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Section Header */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Interactive Workspace Tour
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Explore the Real Newsroom Screens
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Click the tabs below to preview the actual working interfaces inside The Dispatch.
            </p>
          </div>

          {/* Interactive Preview Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            <button
              onClick={() => setActivePreviewTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activePreviewTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Editorial Dashboard
            </button>
            <button
              onClick={() => setActivePreviewTab('queue')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activePreviewTab === 'queue'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" /> Story Review Queue
            </button>
            <button
              onClick={() => setActivePreviewTab('calendar')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activePreviewTab === 'calendar'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" /> Calendar & Slates
            </button>
            <button
              onClick={() => setActivePreviewTab('checklist')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                activePreviewTab === 'checklist'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Sign-off Checklist & Audit
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            {activePreviewTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Executive Newsroom Overview
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Real-time throughput metrics, status distribution, and velocity tracking.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 w-fit">
                    Live Neon PostgreSQL Sync
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Stories</span>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">5</p>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">100% active</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Live Published</span>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">1</p>
                    <span className="text-[11px] text-slate-500">Frontpage article</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Queued / Scheduled</span>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">1</p>
                    <span className="text-[11px] text-slate-500">Autonomous drop</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Awaiting Review</span>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">1</p>
                    <span className="text-[11px] text-slate-500">Ready for sign-off</span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'queue' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Repository & Review Queue
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Multi-field filters, status badges, and bulk actions toolbar.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      Filter: All Desks
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Next-Gen Small Modular Reactors Cleared for Hyperscale AI Data Campuses
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Desk: Climate & Energy · Author: Maya Patel · 1,120 words
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                      PUBLISHED
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Global Antitrust Taskforce Finalizes Interoperability Standards for Frontier AI Models
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Desk: Technology & AI · Author: Sarah Jenkins · 980 words
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                      SCHEDULED
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'calendar' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Editorial Calendar & Publication Slates
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Chronological schedule of upcoming publication drops with CSV export capability.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 w-fit">
                    <Calendar className="w-3.5 h-3.5" /> CSV Export Enabled
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      Upcoming Drop: Tomorrow 09:00 UTC
                    </span>
                    <span className="text-slate-400">Autonomous Daemon Worker Assigned</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    "Global Antitrust Taskforce Finalizes Interoperability Standards for Frontier AI Models"
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Lead Desk: Technology & AI · Approved by Senior Editor David Zhao
                  </p>
                </div>
              </div>
            )}

            {activePreviewTab === 'checklist' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Pre-Publication Checklist & Immutable Audit Trail
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enforces newsroom standards before an eligible editor can grant approval.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 w-fit">
                    4/4 Signed Off
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Facts & primary sources verified</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">House style and headline standards cleared</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Legal counsel clearance received</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Photo & asset license rights cleared</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          7. FINAL CALL TO ACTION
      ---------------------------------------------------- */}
      <section className="py-20 border-t border-slate-200 dark:border-slate-800/80 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
            <Newspaper className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Modernize Your Newsroom's Publishing Pipeline
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Experience structured story tracking, role-based safeguards, and autonomous scheduling from first draft to final publication.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => (token ? onNavigateToWorkspace() : onOpenAuthModal('demo'))}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>{token ? 'Enter Active Workspace' : 'Open Workspace with Demo Access'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onOpenAuthModal('login')}
              className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl border border-slate-700 transition"
            >
              Staff Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------
          8. FOOTER
      ---------------------------------------------------- */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070b13] text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-100 dark:border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-bold text-slate-900 dark:text-white">
                  The Dispatch
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  v1.0.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Editorial Workflow & Digital Newsroom Management System.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 font-medium">
              <button onClick={() => scrollToSection('workflow')} className="hover:text-slate-900 dark:hover:text-white transition">
                Workflow Pipeline
              </button>
              <button onClick={() => scrollToSection('features')} className="hover:text-slate-900 dark:hover:text-white transition">
                Features
              </button>
              <button onClick={() => scrollToSection('roles')} className="hover:text-slate-900 dark:hover:text-white transition">
                Writers vs Editors
              </button>
              <button onClick={() => scrollToSection('preview')} className="hover:text-slate-900 dark:hover:text-white transition">
                Platform Tour
              </button>
              <button onClick={() => onOpenAuthModal('login')} className="hover:text-slate-900 dark:hover:text-white transition">
                Staff Login
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <p>
              © {new Date().getFullYear()} The Dispatch. All rights reserved. Designed for digital newsrooms.
            </p>
            <p className="font-mono">
              Neon PostgreSQL · Node.js/Express · React · Tailwind CSS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
