import React from 'react';
import { PenSquare, X, Sparkles, Clock, Hash, FileText } from 'lucide-react';

const STORY_TEMPLATES = [
  {
    name: 'Breaking News',
    desc: 'Lede, inverted pyramid, official quotes',
    template: `[CITY, STATE] — Opening summary sentence detailing what occurred, who is involved, and immediate impacts.\n\nKey Facts & Developments:\n• First critical fact or emergency response status\n• Eyewitness or agency confirmation\n• Timeline of events\n\nOfficial Statement:\n"Direct quote from department spokesperson or principal figure," stated officials.\n\nWhat's Next:\nNext scheduled press briefing or expected updates as the story unfolds.`,
  },
  {
    name: 'Investigative / Deep Dive',
    desc: 'Narrative hook, data findings, accountability',
    template: `Narrative opening establishing the central tension, human perspective, or systemic pattern.\n\nThe Investigation:\nOver a multi-month inquiry reviewing internal records and regulatory filings, The Dispatch discovered...\n\nKey Findings:\n1. Primary documentary disclosure\n2. Financial or operational discrepancies\n3. Stakeholder impacts\n\nAgency Response:\nWhen presented with our findings, leadership provided the following response...\n\nImplications & Context:\nHistorical precedent and upcoming legislative or oversight hearings.`,
  },
];

export default function CreateStoryModal({
  isOpen,
  onClose,
  title,
  setTitle,
  sectionId,
  setSectionId,
  body,
  setBody,
  sections,
  loading,
  error,
  onSubmit,
}) {
  if (!isOpen) return null;

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const handleApplyTemplate = (tmpl) => {
    if (body.trim() && !window.confirm('Replace current text with template?')) {
      return;
    }
    setBody(tmpl.template);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in duration-150 max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <PenSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Draft New Story</h3>
              <p className="text-xs text-slate-500">Initiate a new editorial draft in the newsroom workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">Story Headline / Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. City Council Moves to Sunset $400M Riverfront Subsidy"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-serif text-sm font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300">Reporting Desk / Section *</label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
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

          {/* Quick Structure Templates */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Editorial Structure Templates
              </span>
              <span className="text-[11px] text-slate-400">Optional starter scaffold</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STORY_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition flex items-start gap-2"
                >
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                      {tmpl.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block line-clamp-1">{tmpl.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300">Initial Article Body Content</label>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono-code">
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" /> {wordCount} words
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {readTimeMinutes}m read
                </span>
              </div>
            </div>
            <textarea
              rows={8}
              placeholder="Draft your story content, reporting notes, or opening paragraphs..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-sans leading-relaxed"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !sectionId}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5"
            >
              <PenSquare className="w-3.5 h-3.5" />
              {loading ? 'Creating Draft...' : 'Create Draft Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
