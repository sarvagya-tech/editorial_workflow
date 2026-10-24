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

  if (!selectedArticle) return null;

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

  return (
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
            onClick={onClose}
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
                        onClick={handleSaveDraft}
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
                      onClick={onSubmitForReview}
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
                            onClick={onApproveArticle}
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
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end flex-shrink-0">
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
