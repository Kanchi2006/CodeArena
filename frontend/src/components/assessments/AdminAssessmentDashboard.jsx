import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Users, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Copy, 
  Trash2, 
  Edit3, 
  Eye, 
  Download, 
  RotateCcw,
  ShieldAlert,
  BarChart2,
  Layers
} from 'lucide-react';

export default function AdminAssessmentDashboard({ token, onCreateNew, onEditAssessment, onViewResults }) {
  const [stats, setStats] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const [statsRes, listRes] = await Promise.all([
        fetch('/api/admin/assessments/stats', { headers }),
        fetch('/api/admin/assessments', { headers })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (listRes.ok) setAssessments(await listRes.json());
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const res = await fetch(`/api/admin/assessments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) fetchDashboardData();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await fetch(`/api/admin/assessments/${id}/duplicate`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (res.ok) fetchDashboardData();
    } catch (err) {
      console.error('Error duplicating assessment:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assessment?')) return;
    try {
      const res = await fetch(`/api/admin/assessments/${id}`, {
        method: 'DELETE',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (res.ok) fetchDashboardData();
    } catch (err) {
      console.error('Error deleting assessment:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      {/* 1. HEADER BANNER */}
      <div 
        className="glass-panel"
        style={{ 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.10) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={26} color="#6366f1" /> Assessment System Management
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
            Create, configure, and evaluate technical screening exams, recruitment tests, and coding assessments.
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="btn btn-primary"
          style={{
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
          }}
        >
          <Plus size={18} /> Create New Assessment
        </button>
      </div>

      {/* 2. SUMMARY METRICS GRID */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px' }}>
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)' }}>{stats.totalAssessments || assessments.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Total Exams</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>{stats.publishedAssessments || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Published</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f59e0b' }}>{stats.draftAssessments || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Drafts</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#6366f1' }}>{stats.activeAttempts || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Active Attempts</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8b5cf6' }}>{stats.completedAttempts || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Completed</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>{stats.passedAttempts || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Passed</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ec4899' }}>{stats.averageScore || 0}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Avg Score</div>
          </div>
        </div>
      )}

      {/* 3. ASSESSMENTS TABLE */}
      <div className="glass-panel" style={{ borderRadius: '16px', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>All Assessments</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{assessments.length} Records</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Loading assessments table...
          </div>
        ) : assessments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No assessments created yet. Click "+ Create New Assessment" above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="problems-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Title & Type</th>
                  <th>Duration</th>
                  <th>Questions</th>
                  <th>Candidates</th>
                  <th>Passing %</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{item.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {item.assessment_type} • {item.difficulty} • {item.category}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{item.duration_minutes} Mins</td>
                    <td style={{ fontSize: '0.85rem' }}>{item.question_count || 0} Questions</td>
                    <td style={{ fontSize: '0.85rem' }}>{item.candidate_count || item.attempt_count || 0} Attempts</td>
                    <td style={{ fontSize: '0.88rem', fontWeight: '700', color: '#10b981' }}>{item.passing_score_percentage}%</td>
                    <td>
                      <button
                        onClick={() => handleStatusToggle(item.id, item.status)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          border: 'none',
                          cursor: 'pointer',
                          background: item.status === 'PUBLISHED' || item.status === 'AVAILABLE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: item.status === 'PUBLISHED' || item.status === 'AVAILABLE' ? '#10b981' : '#f59e0b'
                        }}
                      >
                        {item.status}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={() => onViewResults(item.id)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Results & Analytics"
                        >
                          <BarChart2 size={13} color="#6366f1" /> Results
                        </button>
                        <button
                          onClick={() => onEditAssessment(item.id)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                          title="Edit Assessment"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(item.id)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                          title="Duplicate Template"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{ padding: '5px 8px', fontSize: '0.78rem', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', cursor: 'pointer' }}
                          title="Delete Assessment"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
