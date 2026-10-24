import React, { useState } from 'react';
import {
  X,
  FileText,
  History,
  MessageSquare,
  ShieldCheck,
  Check,
  AlertCircle,
  FileEdit,
  Save,
  Layers,
  Send,
  ShieldAlert,
  CheckCheck,
  Globe,
  CalendarClock,
  Undo2,
  FilePlus,
  BookOpen,
  Eye,
  Code,
  CheckSquare,
  Clock,
  Hash,
  GitCompare,
} from 'lucide-react';
import { STATUS_CONFIG } from '../../constants/status';

export default function ArticleDetailModal({
  selectedArticle,
  onClose,
  currentUser,
  articleTimeline,
  articleRevisions,
  articleComments,
  workflowActionLoading,
  workflowActionFeedback,
  onSubmitForReview,
  onApproveArticle,
  onPublishNow,
  onScheduleSubmit,
  onUnpublishSubmit,
  onSaveDraftChanges,
  onOpenForkRevision,
  onAddComment,
}) {
  const [modalActiveTab, setModalActiveTab] = useState('overview'); // 'overview' | 'revisions' | 'comments' | 'timeline'
  const [contentMode, setContentMode] = useState('preview'); // 'preview' | 'source'
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editDraftTitle, setEditDraftTitle] = useState(selectedArticle?.title || '');
  const [editDraftBody, setEditDraftBody] = useState(
    selectedArticle?.body || selectedArticle?.workingRevision?.body || ''
  );
  const [savingDraft, setSavingDraft] = useState(false);

  const [scheduleModalDate, setScheduleModalDate] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  const [unpublishReasonInput, setUnpublishReasonInput] = useState('');
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [viewingRevisionDetail, setViewingRevisionDetail] = useState(null);
  const [diffTargetRevision, setDiffTargetRevision] = useState(null);

  // Pre-publication editorial checklist state (per article)
  const [checklist, setChecklist] = useState({
    factCheck: true,
    styleCheck: true,
    headlineCheck: true,
    legalCheck: false,
  });

  if (!selectedArticle) return null;

  const currentBody = selectedArticle.body || selectedArticle.workingRevision?.body || '';
  const wordCount = currentBody.trim() ? currentBody.trim().split(/\s+/).length : 0;
  const charCount = currentBody.length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const completedChecklistCount = Object.values(checklist).filter(Boolean).length;
  const checklistTotal = Object.keys(checklist).length;

  const isAuthorOfSelectedArticle =
    currentUser && selectedArticle.authorId === currentUser.id;

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    await onSaveDraftChanges(editDraftTitle, editDraftBody);
    setIsEditingDraft(false);
    setSavingDraft(false);
  };

  const handleScheduleClick = async () => {
    if (!scheduleModalDate) return;
    await onScheduleSubmit(scheduleModalDate);
    setShowScheduleForm(false);
  };

  const handleUnpublishClick = async () => {
    await onUnpublishSubmit(unpublishReasonInput);
    setShowUnpublishConfirm(false);
    setUnpublishReasonInput('');
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setSubmittingComment(true);
    await onAddComment(newCommentText);
    setNewCommentText('');
    setSubmittingComment(false);
  };

  // Simple line diff helper
  const computeSimpleDiff = (textOld, textNew) => {
    const linesOld = (textOld || '').split('\n');
    const linesNew = (textNew || '').split('\n');
    const diff = [];
    const max = Math.max(linesOld.length, linesNew.length);

    for (let i = 0; i < max; i++) {
      const o = linesOld[i];
      const n = linesNew[i];
      if (o === undefined) {
        diff.push({ type: 'added', text: n, lineNum: i + 1 });
      } else if (n === undefined) {
        diff.push({ type: 'removed', text: o, lineNum: i + 1 });
      } else if (o !== n) {
        diff.push({ type: 'removed', text: o, lineNum: i + 1 });
        diff.push({ type: 'added', text: n, lineNum: i + 1 });
      } else {
        diff.push({ type: 'unchanged', text: o, lineNum: i + 1 });
      }
    }
    return diff;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase border ${
                STATUS_CONFIG[selectedArticle.status]?.badge || 'bg-slate-100 text-slate-800'
              }`}
            >
              {selectedArticle.status}
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {selectedArticle.section?.name || 'General Desk'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono-code text-[11px]">
                <Clock className="w-3 h-3 text-slate-400" /> {readTimeMinutes}m read
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono-code text-[11px]">
                <Hash className="w-3 h-3 text-slate-400" /> {wordCount} words
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tab Navigation */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold bg-white dark:bg-[#111827] flex-shrink-0">
          <div className="flex items-center gap-4">
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

          {modalActiveTab === 'overview' && !isEditingDraft && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-[11px]">
              <button
                onClick={() => setContentMode('preview')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition ${
                  contentMode === 'preview'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Editorial Preview
              </button>
              <button
                onClick={() => setContentMode('source')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition ${
                  contentMode === 'source'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" /> Source View
              </button>
            </div>
          )}
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
                  <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white leading-tight">
                    {selectedArticle.title}
                  </h2>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <span>
                    By <strong className="text-slate-800 dark:text-slate-200">{selectedArticle.author?.name}</strong>
                  </span>
                  <span>•</span>
                  <span>Desk: {selectedArticle.section?.name || 'General'}</span>
                  <span>•</span>
                  <span className="font-mono-code">Sequence #{selectedArticle.scheduleSequence || 1}</span>
                </div>
              </div>

              {/* Scheduling Timestamp Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                    Target Drop Time
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {selectedArticle.publishAt ? new Date(selectedArticle.publishAt).toLocaleString() : 'Not scheduled'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                    Live Release Timestamp
                  </span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                    {selectedArticle.publishedAt ? new Date(selectedArticle.publishedAt).toLocaleString() : 'Awaiting publication'}
                  </span>
                </div>
              </div>

              {/* Article Content Render Area */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-[#0d1322] space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {contentMode === 'preview' ? 'Editorial Print Preview' : 'Source Document'}
                    </span>
                  </div>
                  {selectedArticle.status === 'DRAFT' && !isEditingDraft && (
                    <button
                      onClick={() => {
                        setIsEditingDraft(true);
                        setContentMode('source');
                      }}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <FileEdit className="w-3.5 h-3.5" /> Edit Copy
                    </button>
                  )}
                </div>

                {isEditingDraft ? (
                  <div className="space-y-3">
                    <textarea
                      rows={10}
                      value={editDraftBody}
                      onChange={(e) => setEditDraftBody(e.target.value)}
                      className="w-full text-xs p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{editDraftBody.trim() ? editDraftBody.trim().split(/\s+/).length : 0} words</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditingDraft(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveDraft}
                          disabled={savingDraft}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-1 shadow-sm"
                        >
                          <Save className="w-3.5 h-3.5" /> {savingDraft ? 'Saving...' : 'Save Draft'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : contentMode === 'preview' ? (
                  /* Editorial Rich Typography Layout */
                  <div className="space-y-4 py-2">
                    <div className="prose dark:prose-invert max-w-none">
                      {currentBody ? (
                        currentBody.split('\n\n').map((paragraph, idx) => {
                          if (idx === 0) {
                            return (
                              <p
                                key={idx}
                                className="font-serif text-base sm:text-lg text-slate-800 dark:text-slate-200 leading-relaxed first-letter:text-4xl first-letter:font-bold first-letter:text-emerald-700 dark:first-letter:text-emerald-400 first-letter:float-left first-letter:mr-2.5 first-letter:leading-none"
                              >
                                {paragraph}
                              </p>
                            );
                          }
                          return (
                            <p
                              key={idx}
                              className="font-serif text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed mt-4"
                            >
                              {paragraph}
                            </p>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 italic">No copy available for this story.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Raw Source Text */
                  <pre className="text-xs font-mono-code text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl overflow-x-auto">
                    {currentBody || 'Empty content.'}
                  </pre>
                )}
              </div>

              {/* Pre-Publication Checklist */}
              {['DRAFT', 'IN_REVIEW', 'APPROVED'].includes(selectedArticle.status) && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Editorial Sign-off Checklist
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        completedChecklistCount === checklistTotal
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {completedChecklistCount}/{checklistTotal} Signed Off
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={checklist.factCheck}
                        onChange={(e) => setChecklist({ ...checklist, factCheck: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-slate-700 dark:text-slate-300">Facts & sources verified</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={checklist.styleCheck}
                        onChange={(e) => setChecklist({ ...checklist, styleCheck: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-slate-700 dark:text-slate-300">House style & copy clean</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={checklist.headlineCheck}
                        onChange={(e) => setChecklist({ ...checklist, headlineCheck: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-slate-700 dark:text-slate-300">Headline adheres to guidelines</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={checklist.legalCheck}
                        onChange={(e) => setChecklist({ ...checklist, legalCheck: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-slate-700 dark:text-slate-300">Legal & embargo clearance</span>
                    </label>
                  </div>
                </div>
              )}

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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      This story is in working draft stage. When ready, submit it to the editorial board for review.
                    </p>
                    <button
                      id="submit-for-review-btn"
                      onClick={onSubmitForReview}
                      disabled={workflowActionLoading}
                      className="px-4 py-2 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
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
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Story is in the review queue. As an editor, verify reporting standards and approve for publication.
                          </p>
                          <button
                            id="approve-article-btn"
                            onClick={onApproveArticle}
                            disabled={workflowActionLoading}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
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
                            onClick={onPublishNow}
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
                              onClick={handleScheduleClick}
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
                            onClick={onPublishNow}
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
                              onClick={handleScheduleClick}
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
                                onClick={handleUnpublishClick}
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
                        onClick={onOpenForkRevision}
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
                            onClick={handleUnpublishClick}
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
          {/* TAB 2: REVISIONS HISTORY & DIFF VIEWER         */}
          {/* ---------------------------------------------- */}
          {modalActiveTab === 'revisions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Revision Snapshots & Diffs</h4>
                  <p className="text-xs text-slate-500">Every editorial iteration is permanently preserved.</p>
                </div>
                {selectedArticle.status === 'PUBLISHED' && (
                  <button
                    onClick={onOpenForkRevision}
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
                  {articleRevisions.map((rev) => {
                    const isSelected = viewingRevisionDetail?.id === rev.id;
                    const isDiffTarget = diffTargetRevision?.id === rev.id;

                    return (
                      <div
                        key={rev.id}
                        className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          isSelected
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800'
                        }`}
                      >
                        <div className="space-y-1">
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
                            {isDiffTarget && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                Diff Target
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-md">{rev.title}</p>
                          <span className="text-[11px] text-slate-400 font-mono-code block">
                            Created {new Date(rev.createdAt).toLocaleString()} by {rev.createdByUser?.name || 'Reporter'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              if (isSelected) {
                                setViewingRevisionDetail(null);
                                setDiffTargetRevision(null);
                              } else {
                                setViewingRevisionDetail(rev);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                              isSelected
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected ? 'Hide' : 'Inspect'}
                          </button>

                          <button
                            onClick={() => {
                              if (isDiffTarget) {
                                setDiffTargetRevision(null);
                              } else {
                                setDiffTargetRevision(rev);
                                if (!viewingRevisionDetail) {
                                  // Default compare against current article
                                  setViewingRevisionDetail({
                                    id: 'current',
                                    revisionNumber: 'Current',
                                    title: selectedArticle.title,
                                    body: currentBody,
                                  });
                                }
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                              isDiffTarget
                                ? 'bg-indigo-600 text-white'
                                : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                            }`}
                            title="Compare line-by-line diff"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                            {isDiffTarget ? 'Diffing' : 'Diff'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inspected Revision Snapshot or Line-by-Line Diff Viewer */}
              {viewingRevisionDetail && !diffTargetRevision && (
                <div className="mt-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-indigo-600" />
                      Snapshot: Revision #{viewingRevisionDetail.revisionNumber} ({viewingRevisionDetail.status})
                    </span>
                    <button
                      onClick={() => setViewingRevisionDetail(null)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto">
                    {viewingRevisionDetail.body || 'Empty body snapshot.'}
                  </div>
                </div>
              )}

              {diffTargetRevision && (
                <div className="mt-4 p-4 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-slate-900 text-slate-100 space-y-3 font-mono-code text-xs">
                  <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <GitCompare className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white">
                        Diff: Revision #{diffTargetRevision.revisionNumber} vs Current Copy
                      </span>
                    </div>
                    <button
                      onClick={() => setDiffTargetRevision(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-0.5 text-[11px] leading-relaxed">
                    {computeSimpleDiff(diffTargetRevision.body, currentBody).map((diffLine, idx) => (
                      <div
                        key={idx}
                        className={`px-2 py-0.5 rounded flex items-start gap-2 ${
                          diffLine.type === 'added'
                            ? 'bg-emerald-950/60 text-emerald-300'
                            : diffLine.type === 'removed'
                            ? 'bg-rose-950/60 text-rose-300 line-through'
                            : 'text-slate-400'
                        }`}
                      >
                        <span className="w-5 text-right opacity-40 select-none">{diffLine.lineNum}</span>
                        <span className="select-none font-bold w-3">
                          {diffLine.type === 'added' ? '+' : diffLine.type === 'removed' ? '-' : ' '}
                        </span>
                        <span className="flex-1 whitespace-pre-wrap">{diffLine.text}</span>
                      </div>
                    ))}
                  </div>
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
              <form onSubmit={handleCommentSubmit} className="space-y-2">
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
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center flex-shrink-0">
          <span className="text-[11px] text-slate-400 font-mono-code">
            Dispatch ID: {selectedArticle.id}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
          >
            Close Story
          </button>
        </div>
      </div>
    </div>
  );
}
