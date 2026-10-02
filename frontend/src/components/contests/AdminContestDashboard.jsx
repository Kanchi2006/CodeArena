import React, { useState, useEffect } from 'react';
import {
  Trophy, Plus, Edit, Trash2, Eye, Users, Clock, Code,
  CheckCircle, XCircle, Play, AlertTriangle, RefreshCw,
  Calendar, Loader2, ToggleLeft, ToggleRight, Globe, Lock,
  TrendingUp, BarChart2, Filter, Search
} from 'lucide-react';

const API_BASE = '/api';

const STATUS_COLOR = {
  DRAFT: '#6b7280', SCHEDULED: '#6366f1', REGISTRATION_OPEN: '#f59e0b',
  LIVE: '#22c55e', COMPLETED: '#8b5cf6', CANCELLED: '#ef4444', ARCHIVED: '#9ca3af'
};

function formatDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminContestDashboard({ token, onCreateContest, onEditContest, onViewContest, isOrgView = false }) {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [stats, setStats] = useState({ total: 0, live: 0, upcoming: 0, completed: 0, totalParticipants: 0 });

  useEffect(() => {
    loadContests();
  }, [isOrgView]);

  const loadContests = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = isOrgView ? `${API_BASE}/organization/contests` : `${API_BASE}/admin/contests`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load contests');
      // GET /api/organization/contests returns { org_verification_status, contests }
      // GET /api/admin/contests returns a plain array
      const list = isOrgView
        ? (Array.isArray(data.contests) ? data.contests : [])
        : (Array.isArray(data) ? data : []);
      setContests(list);
      setStats({
        total: list.length,
        live: list.filter(c => c.status === 'LIVE').length,
        upcoming: list.filter(c => ['SCHEDULED', 'REGISTRATION_OPEN'].includes(c.status)).length,
        completed: list.filter(c => c.status === 'COMPLETED').length,
        totalParticipants: list.reduce((acc, c) => acc + (c.participant_count || 0), 0),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contestId) => {
    if (!window.confirm('Delete this contest? This action cannot be undone.')) return;
    setDeleting(contestId);
    try {
      const res = await fetch(`${API_BASE}/admin/contests/${contestId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setContests(prev => prev.filter(c => c.id !== contestId));
      } else {
        const data = await res.json();
        alert(data.error || 'Delete failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusChange = async (contestId, newStatus) => {
    setActionLoading(contestId);
    try {
      let res;
      if (isOrgView && newStatus === 'REGISTRATION_OPEN') {
        res = await fetch(`${API_BASE}/organization/contests/${contestId}/publish`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        res = await fetch(`${API_BASE}/admin/contests/${contestId}/status`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      }
      if (res.ok) {
        loadContests();
      } else {
        const data = await res.json();
        alert(data.error || 'Status change failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = contests.filter(c => {
    const matchesSearch = !search.trim() || c.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '24px 0', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              {isOrgView ? 'Organization Contests' : 'Contest Management'}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              {isOrgView ? 'Host, schedule, and manage your organization competitive coding events' : 'Create and manage platform contests'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={loadContests}
            style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            id="admin-create-contest-btn"
            onClick={onCreateContest}
            style={{
              padding: '9px 20px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            <Plus size={16} /> Create Contest
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Contests', value: stats.total, icon: <Trophy size={18} />, color: '#6366f1' },
          { label: 'Live Now', value: stats.live, icon: <Play size={18} />, color: '#22c55e' },
          { label: 'Upcoming', value: stats.upcoming, icon: <Calendar size={18} />, color: '#f59e0b' },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle size={18} />, color: '#8b5cf6' },
          { label: 'Total Participants', value: stats.totalParticipants, icon: <Users size={18} />, color: '#06b6d4' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--card-bg)', border: '1px solid var(--border-light)',
            borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search contests..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10,
              border: '1px solid var(--border-light)', background: 'var(--card-bg)',
              color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}
        >
          <option value="all">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="REGISTRATION_OPEN">Registration Open</option>
          <option value="LIVE">Live</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, marginBottom: 16, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <Trophy size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>No contests found. {search ? 'Try a different search.' : 'Create your first contest!'}</p>
        </div>
      ) : (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.1)' }}>
                {['Contest', 'Status', 'Schedule', 'Participants', 'Type', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(contest => (
                <tr key={contest.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px', maxWidth: 280 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>{contest.title}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {contest.organizer_type === 'ADMIN' ? '⚡ Official' : `🏢 ${contest.organization_name || 'Org'}`}
                      </span>
                      <span style={{ fontSize: 11, color: contest.visibility === 'PUBLIC' ? '#22c55e' : '#f59e0b' }}>
                        {contest.visibility === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '4px 10px', borderRadius: 20,
                      background: `${STATUS_COLOR[contest.status] || '#6b7280'}20`,
                      color: STATUS_COLOR[contest.status] || '#6b7280',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {contest.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>{formatDateTime(contest.start_time)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>to {formatDateTime(contest.end_time)}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{contest.participant_count || 0}</div>
                    {contest.max_participants > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ {contest.max_participants} max</div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: 12, color: '#a855f7', fontWeight: 600 }}>{contest.contest_type || 'CODING'}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        title="Edit"
                        onClick={() => onEditContest(contest.id)}
                        style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        title="View"
                        onClick={() => onViewContest(contest.id)}
                        style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
                      >
                        <Eye size={12} />
                      </button>
                      {/* Status transitions */}
                      {contest.status === 'DRAFT' && (
                        <button
                          onClick={() => handleStatusChange(contest.id, 'REGISTRATION_OPEN')}
                          disabled={actionLoading === contest.id}
                          title="Publish"
                          style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                        >
                          Publish
                        </button>
                      )}
                      {contest.status === 'LIVE' && (
                        <button
                          onClick={() => handleStatusChange(contest.id, 'COMPLETED')}
                          disabled={actionLoading === contest.id}
                          title="End Contest"
                          style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                        >
                          End
                        </button>
                      )}
                      <button
                        title="Delete"
                        onClick={() => handleDelete(contest.id)}
                        disabled={deleting === contest.id || contest.status === 'LIVE'}
                        style={{
                          padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)',
                          background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: contest.status === 'LIVE' ? 'not-allowed' : 'pointer', fontSize: 12,
                          opacity: contest.status === 'LIVE' ? 0.4 : 1,
                        }}
                      >
                        {deleting === contest.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
