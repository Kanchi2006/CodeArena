import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Plus, 
  FileText, 
  Users, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Calendar, 
  Eye, 
  BarChart, 
  Search, 
  ChevronRight,
  Sparkles,
  Trophy
} from 'lucide-react';

export default function OrganizationDashboard({ user, token, onCreateAssessment, onCreateContest }) {
  const [assessments, setAssessments] = useState([]);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const orgName = user?.org_profile?.organization_name || user?.display_name || 'Organization Partner';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [assRes, contestRes] = await Promise.all([
        fetch('/api/assessments', { headers }),
        fetch('/api/organization/contests', { headers })
      ]);

      if (assRes.ok) {
        const assData = await assRes.json();
        setAssessments(Array.isArray(assData) ? assData : []);
      }

      if (contestRes.ok) {
        const cData = await contestRes.json();
        setContests(Array.isArray(cData.contests) ? cData.contests : []);
      }
    } catch (err) {
      console.error('Error fetching org dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalAssessments = assessments.length;
  const activeAssessments = assessments.filter(a => a.status === 'PUBLISHED' || a.status === 'AVAILABLE').length;
  const totalContests = contests.length;
  const activeContests = contests.filter(c => c.status === 'LIVE' || c.status === 'REGISTRATION_OPEN' || c.status === 'SCHEDULED').length;
  const totalCandidates = assessments.reduce((acc, a) => acc + (a.candidate_count || 0), 0) + 
                          contests.reduce((acc, c) => acc + (c.participant_count || 0), 0);
  const completedAssessments = assessments.filter(a => a.status === 'EXPIRED' || a.status === 'COMPLETED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. WELCOME BANNER WITH VERIFIED BADGE */}
      <div 
        className="glass-panel" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.10) 100%)', 
          border: '1px solid rgba(99, 102, 241, 0.25)', 
          borderRadius: '16px', 
          padding: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              Welcome, {orgName}
            </h1>
            <span 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px', 
                padding: '4px 10px', 
                borderRadius: '20px', 
                background: 'rgba(16, 185, 129, 0.18)', 
                color: '#10b981', 
                border: '1px solid rgba(16, 185, 129, 0.3)', 
                fontSize: '0.78rem', 
                fontWeight: '700' 
              }}
            >
              <ShieldCheck size={14} /> Verified Organization
            </span>
          </div>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', margin: 0, maxWidth: '600px' }}>
            Your organization is verified. Create contests and assessments to manage your tech recruitment and hiring process.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className="btn" 
            onClick={onCreateContest}
            style={{ 
              padding: '12px 20px', 
              borderRadius: '12px', 
              fontSize: '0.95rem', 
              fontWeight: '700', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)'
            }}
          >
            <Trophy size={18} /> Create New Contest
          </button>
          <button 
            className="btn btn-primary" 
            onClick={onCreateAssessment}
            style={{ 
              padding: '12px 20px', 
              borderRadius: '12px', 
              fontSize: '0.95rem', 
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
      </div>

      {/* 2. STATS SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px' }}>
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px' }}>
            <span>Total Contests</span>
            <Trophy size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f59e0b' }}>{totalContests}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px' }}>
            <span>Total Assessments</span>
            <FileText size={18} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{totalAssessments}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px' }}>
            <span>Active Events</span>
            <Clock size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10b981' }}>{activeAssessments + activeContests}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px' }}>
            <span>Total Participants</span>
            <Users size={18} color="#ec4899" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ec4899' }}>{totalCandidates}</div>
        </div>
      </div>

      {/* 3. RECENT ASSESSMENTS TABLE */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
            Hosted Assessments
          </h3>
          <button className="btn btn-secondary" onClick={onCreateAssessment} style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
            + Add Assessment
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading organization assessments...
          </div>
        ) : assessments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px dashed var(--border-light)' }}>
            <FileText size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '4px' }}>No Assessments Created Yet</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Create your first coding screening test or recruitment assessment now.
            </p>
            <button className="btn btn-primary" onClick={onCreateAssessment} style={{ padding: '8px 20px' }}>
              Create Assessment
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="problems-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Assessment Name</th>
                  <th>Category & Type</th>
                  <th>Duration</th>
                  <th>Candidates</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '600' }}>{item.title}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {item.category || 'General'} • {item.assessment_type}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{item.duration_minutes} Mins</td>
                    <td style={{ fontSize: '0.85rem' }}>{item.candidate_count || 0} Candidates</td>
                    <td>
                      <span 
                        style={{ 
                          padding: '4px 10px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: '700',
                          background: item.status === 'PUBLISHED' || item.status === 'AVAILABLE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: item.status === 'PUBLISHED' || item.status === 'AVAILABLE' ? '#10b981' : '#f59e0b',
                          border: item.status === 'PUBLISHED' || item.status === 'AVAILABLE' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                        Manage
                      </button>
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
