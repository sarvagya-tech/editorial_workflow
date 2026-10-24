import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  Trash2,
  RefreshCw,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { DEMO_ACCOUNTS } from '../../constants/accounts';

export default function ManageDeskModal({
  isOpen,
  onClose,
  section,
  token,
  onToast,
}) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedWriterEmail, setSelectedWriterEmail] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Available writers from demo accounts
  const demoWriters = DEMO_ACCOUNTS.filter((a) => a.role === 'WRITER');

  const fetchAssignments = async () => {
    if (!section || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sections/${section.id}/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        setAssignments(json.data || json || []);
      }
    } catch (err) {
      console.error('Failed to fetch desk assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && section) {
      fetchAssignments();
    }
  }, [isOpen, section]);

  const handleAssignWriter = async () => {
    if (!selectedWriterEmail) return;
    setAssigning(true);
    try {
      // Find writer ID by querying profile or using assigned list
      // In the backend, assignWriter expects writerId.
      // Let's first resolve the writer ID from the user list or assignments
      const targetUser = demoWriters.find((w) => w.email === selectedWriterEmail);
      if (!targetUser) return;

      // Make request with email or ID lookup
      const res = await fetch(`/api/sections/${section.id}/assignments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ writerId: targetUser.id || targetUser.email }),
      });
      const json = await res.json();
      if (res.ok) {
        onToast(`Writer assigned to ${section.name} successfully!`, 'success');
        setSelectedWriterEmail('');
        fetchAssignments();
      } else {
        onToast(json.message || json.error || 'Failed to assign writer', 'error');
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveWriter = async (writerId, writerName) => {
    if (!confirm(`Remove ${writerName} from ${section.name}?`)) return;
    setActionLoadingId(writerId);
    try {
      const res = await fetch(`/api/sections/${section.id}/assignments/${writerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        onToast(`Removed writer from ${section.name}`, 'info');
        fetchAssignments();
      } else {
        onToast(json.message || json.error || 'Failed to remove writer', 'error');
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen || !section) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111827] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Beat Writers: {section.name}
              </h3>
              <p className="text-[11px] text-slate-400">
                Lead Editor: {section.ownerEditor?.name || 'Managing Board'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Assignments List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Assigned Reporters & Writers ({assignments.length})
            </span>
            {loading && <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />}
          </div>

          <div className="max-h-52 overflow-y-auto space-y-2 border border-slate-100 dark:border-slate-800/80 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/40">
            {assignments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No beat writers are currently assigned to this desk.
              </div>
            ) : (
              assignments.map((asg) => {
                const writer = asg.writer || asg.user || {};
                const isBusy = actionLoadingId === writer.id;

                return (
                  <div
                    key={asg.id}
                    className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-[11px]">
                        {(writer.name || 'W').charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {writer.name || 'Reporter'}
                        </div>
                        <div className="text-[10px] text-slate-400">{writer.email}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveWriter(writer.id, writer.name)}
                      disabled={isBusy}
                      title="Remove from desk"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Add Writer Form */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Assign Staff Writer to Beat:
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedWriterEmail}
              onChange={(e) => setSelectedWriterEmail(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select a reporter / writer...</option>
              {demoWriters.map((w) => (
                <option key={w.email} value={w.email}>
                  {w.label} ({w.desk})
                </option>
              ))}
            </select>
            <button
              onClick={handleAssignWriter}
              disabled={!selectedWriterEmail || assigning}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{assigning ? 'Adding...' : 'Assign'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Only assigned writers may author and submit story drafts for this beat.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
