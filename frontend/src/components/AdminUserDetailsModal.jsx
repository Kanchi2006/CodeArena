import React, { useState, useEffect } from 'react';
import CertificateBadge from './CertificateBadge';

export default function AdminUserDetailsModal({ userId, onClose, onActionSuccess }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (userId) fetchDetails();
  }, [userId]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/certificates/users/${userId}/details`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setDetails(data);
      }
    } catch (err) {
      console.error('Failed to fetch user details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (milestone) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/certificates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ userId, milestone })
      });
      const result = await res.json();
      if (res.ok) {
        setNotice({ type: 'success', text: result.message });
        fetchDetails();
        if (onActionSuccess) onActionSuccess();
      } else {
        setNotice({ type: 'error', text: result.error || 'Failed to generate certificate.' });
      }
    } catch (err) {
      setNotice({ type: 'error', text: 'Network error generating certificate.' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleRevokeToggle = async (certId, currentRevoked) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/certificates/revoke/${certId}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const result = await res.json();
      if (res.ok) {
        setNotice({ type: 'success', text: result.message });
        fetchDetails();
        if (onActionSuccess) onActionSuccess();
      } else {
        setNotice({ type: 'error', text: result.error || 'Failed to update certificate.' });
      }
    } catch (err) {
      setNotice({ type: 'error', text: 'Network error updating certificate.' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  if (loading || !details) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full text-center space-y-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium">Loading developer certificate profile...</p>
        </div>
      </div>
    );
  }

  const { user, solvedCount, acceptedSubmissions, milestoneBreakdown, nextMilestone, progressPercent } = details;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 relative my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              {(user.display_name || user.username).substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
                <span>{user.display_name || user.username}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">@{user.username}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{user.email} • Platform {user.role}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            &times;
          </button>
        </div>

        {notice && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              notice.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">&times;</button>
          </div>
        )}

        {/* Overview Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400 font-medium">Accepted Problems</div>
            <div className="text-2xl font-black text-blue-400 font-mono mt-1">{solvedCount}</div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400 font-medium">Next Milestone Target</div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">
              {nextMilestone ? `${nextMilestone} Problems` : 'Max Reached 🎉'}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400 font-medium">Progress to Next Tier</div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{progressPercent}%</div>
          </div>
        </div>

        {/* Next Tier Progress Bar */}
        {nextMilestone && (
          <div className="space-y-1.5 bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>Overall Progress toward {nextMilestone} Problems</span>
              <span className="font-mono text-blue-400">{solvedCount} / {nextMilestone} ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Milestones Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Milestones Audit Status</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {milestoneBreakdown.map((item) => {
              const { milestone, title, isReached, status, certificate } = item;
              const isIssued = status === 'ISSUED';
              const isEligible = status === 'ELIGIBLE';
              const isRevoked = status === 'REVOKED';

              return (
                <div
                  key={milestone}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    isIssued
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : isEligible
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : isRevoked
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-slate-950 border-slate-800/80 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <CertificateBadge milestone={milestone} theme={item.theme} size={36} isLocked={!isReached} />
                    <div>
                      <div className="text-xs font-bold text-white">#{milestone} {title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {isIssued
                          ? `Code: ${certificate?.verification_code}`
                          : isEligible
                          ? 'Reached milestone - Pending generation'
                          : isRevoked
                          ? 'Revoked by admin'
                          : `Needs ${milestone - solvedCount} more accepted problems`}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isEligible && (
                      <button
                        onClick={() => handleGenerate(milestone)}
                        disabled={actionLoading}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-lg transition-all shadow-md shadow-amber-500/20"
                      >
                        Generate
                      </button>
                    )}
                    {isIssued && (
                      <button
                        onClick={() => handleRevokeToggle(certificate.id, false)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-[11px] font-semibold rounded-lg transition-all"
                      >
                        Revoke
                      </button>
                    )}
                    {isRevoked && (
                      <button
                        onClick={() => handleRevokeToggle(certificate.id, true)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-semibold rounded-lg transition-all"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accepted Problems Log */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Accepted Problems ({acceptedSubmissions.length})
          </h4>
          {acceptedSubmissions.length === 0 ? (
            <div className="text-xs text-slate-500 italic py-2">No accepted submissions recorded yet.</div>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {acceptedSubmissions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800/60 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="font-semibold text-white">{sub.problem_title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {sub.difficulty}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
