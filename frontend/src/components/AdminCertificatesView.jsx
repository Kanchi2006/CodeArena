import React, { useState, useEffect } from 'react';
import { 
  Award, 
  FileText, 
  Users, 
  Clock, 
  Search, 
  Download, 
  Eye, 
  Plus, 
  MoreVertical, 
  RotateCcw, 
  Slash, 
  CheckCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

import CertificateBadge from './CertificateBadge';
import AdminCertificateModal from './AdminCertificateModal';
import AdminUserDetailsModal from './AdminUserDetailsModal';
import CertificateViewerModal from './CertificateViewerModal';

const AVATAR_COLORS = [
  '#4f46e5', // Indigo
  '#2563eb', // Blue
  '#059669', // Emerald
  '#db2777', // Pink
  '#d97706', // Amber
  '#0d9488', // Teal
  '#7c3aed', // Purple
  '#e11d48'  // Rose
];

export default function AdminCertificatesView({ currentUser }) {
  const [activeTab, setActiveTab] = useState('progress'); // Default active tab is User Progress matching reference image!
  
  // Data states
  const [summary, setSummary] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [earnedProgress, setEarnedProgress] = useState([]);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [certificates, setCertificates] = useState([]);
  
  // UI & Filter states
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [milestoneFilter, setMilestoneFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [notice, setNotice] = useState(null);

  // Pagination for User Progress Table
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [selectedMilestoneConfig, setSelectedMilestoneConfig] = useState(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [previewCert, setPreviewCert] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [summaryRes, milesRes, progressRes, earnedRes, eligibleRes, certsRes] = await Promise.all([
        fetch('/api/admin/certificates/dashboard-summary', { headers }),
        fetch('/api/admin/certificates/milestones', { headers }),
        fetch('/api/admin/certificates/user-progress', { headers }),
        fetch('/api/admin/certificates/earned-progress', { headers }),
        fetch('/api/admin/certificates/eligible-users', { headers }),
        fetch('/api/admin/certificates', { headers })
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (milesRes.ok) setMilestones(await milesRes.json());
      if (progressRes.ok) setUserProgress(await progressRes.json());
      if (earnedRes.ok) setEarnedProgress(await earnedRes.json());
      if (eligibleRes.ok) setEligibleUsers(await eligibleRes.json());
      if (certsRes.ok) {
        const certsData = await certsRes.json();
        setCertificates(Array.isArray(certsData) ? certsData : (certsData.certificates || []));
      }
    } catch (err) {
      console.error('Failed to fetch admin certificate management data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  // Actions
  const handleToggleMilestone = async (milestoneNum) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/certificates/milestones/${milestoneNum}/toggle`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const result = await res.json();
      if (res.ok) {
        showNotification('success', result.message);
        fetchAllData();
      } else {
        showNotification('error', result.error || 'Failed to toggle milestone status.');
      }
    } catch (err) {
      showNotification('error', 'Network error updating milestone.');
    }
  };

  const handleGenerateCert = async (userId, milestone) => {
    setActionLoading(`gen_${userId}_${milestone}`);
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
        showNotification('success', result.message);
        fetchAllData();
      } else {
        showNotification('error', result.error || 'Failed to generate certificate.');
      }
    } catch (err) {
      showNotification('error', 'Network error generating certificate.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateAllEligible = async () => {
    if (!window.confirm(`Generate certificates for all ${eligibleUsers.length} eligible users now?`)) {
      return;
    }
    setActionLoading('batch_gen');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/certificates/generate-all-eligible', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const result = await res.json();
      if (res.ok) {
        showNotification('success', result.message);
        fetchAllData();
      } else {
        showNotification('error', result.error || 'Failed to generate eligible certificates.');
      }
    } catch (err) {
      showNotification('error', 'Network error generating batch certificates.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (id, currentRevoked) => {
    if (!window.confirm(currentRevoked ? 'Reactivate this certificate?' : 'Are you sure you want to REVOKE this certificate?')) {
      return;
    }
    setActionLoading(`revoke_${id}`);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/certificates/revoke/${id}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const result = await res.json();
      if (res.ok) {
        showNotification('success', result.message);
        fetchAllData();
      } else {
        showNotification('error', result.error || 'Failed to update certificate status.');
      }
    } catch (err) {
      showNotification('error', 'Network error performing action.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerate = async (id) => {
    if (!window.confirm('Regenerate verification code for this certificate? The old link will become invalid.')) {
      return;
    }
    setActionLoading(`regen_${id}`);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/certificates/regenerate/${id}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const result = await res.json();
      if (res.ok) {
        showNotification('success', `New code generated: ${result.verification_code}`);
        fetchAllData();
      } else {
        showNotification('error', result.error || 'Failed to regenerate code.');
      }
    } catch (err) {
      showNotification('error', 'Network error performing action.');
    } finally {
      setActionLoading(null);
    }
  };

  // Export CSV Report
  const handleExportReport = () => {
    if (earnedProgress.length === 0) {
      alert('No earned certificates data available to export.');
      return;
    }
    const headers = ['User', 'Email', 'Milestone', 'Required Problems', 'Accepted Problems', 'Achievement Date', 'Certificate ID', 'Status'];
    const rows = earnedProgress.map(r => [
      `"${r.displayName}"`,
      `"${r.email}"`,
      `"${r.milestone} Accepted Problems"`,
      r.requiredProblems,
      r.acceptedProblems,
      `"${new Date(r.achievementDate).toLocaleDateString()}"`,
      `"${r.certificateId}"`,
      `"${r.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CodeArena_Milestone_Certificates_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Earned Progress Data
  const filteredEarnedProgress = earnedProgress.filter(item => {
    const matchesSearch =
      item.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.certificateId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMilestone = milestoneFilter === 'all' || item.milestone.toString() === milestoneFilter;
    return matchesSearch && matchesMilestone;
  });

  // Pagination calculations
  const totalItems = filteredEarnedProgress.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPageNum - 1) * itemsPerPage;
  const paginatedEarnedProgress = filteredEarnedProgress.slice(startIndex, startIndex + itemsPerPage);

  // Other Tab Filters
  const filteredEligibleUsers = eligibleUsers.filter(item => {
    const matchesSearch =
      item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMilestone = milestoneFilter === 'all' || item.milestone.toString() === milestoneFilter;
    return matchesSearch && matchesMilestone;
  });

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch =
      cert.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.verification_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMilestone = milestoneFilter === 'all' || cert.milestone.toString() === milestoneFilter;
    return matchesSearch && matchesMilestone;
  });

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--font-sans, system-ui, sans-serif)', color: 'var(--text-main, #1e293b)' }}>
      
      {/* ══════════════════════════════════════════════════════════ */}
      {/* PAGE HEADER                                               */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main, #1e1b4b)', letterSpacing: '-0.02em', margin: 0 }}>
          Certificates & Milestone Management
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
          Manage milestone configurations, monitor user progress, and handle certificate issuance.
        </p>
      </div>

      {notice && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '0.82rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          background: notice.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: notice.type === 'success' ? '#047857' : '#b91c1c',
          border: notice.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.2rem', lineHeight: 1 }}>&times;</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 1. SUMMARY CARDS ROW (Exact match to reference image 2)   */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        
        {/* Card 1: Total Milestones */}
        <div style={{ background: '#ffffff', border: '1px solid #eef2ff', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Total Milestones</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e1b4b', marginTop: '2px' }}>
              {summary?.totalMilestones || milestones.length || 6}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
              30, 50, 100, 120, 150, 200 accepted problems
            </div>
          </div>
        </div>

        {/* Card 2: Certificates Issued */}
        <div style={{ background: '#ffffff', border: '1px solid #eef2ff', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Certificates Issued</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e1b4b', marginTop: '2px' }}>
              {summary?.certificatesIssued || certificates.length || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>+12 this month</span>
              <TrendingUp size={14} />
            </div>
          </div>
        </div>

        {/* Card 3: Eligible Users */}
        <div style={{ background: '#ffffff', border: '1px solid #eef2ff', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Eligible Users</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e1b4b', marginTop: '2px' }}>
              {summary?.eligibleUsersCount || eligibleUsers.length || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
              Need certificate generation
            </div>
          </div>
        </div>

        {/* Card 4: Users In Progress */}
        <div style={{ background: '#ffffff', border: '1px solid #eef2ff', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Users In Progress</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e1b4b', marginTop: '2px' }}>
              {summary?.usersInProgressCount || userProgress.filter(u => u.solvedCount > 0).length || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
              Approaching next milestone
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 2. NAVIGATION TABS & SEARCH BAR ROW                       */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '24px' }}>
        
        {/* Left Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', overflowX: 'auto' }}>
          {[
            { id: 'milestones', label: 'Milestone Certificates', icon: Award },
            { id: 'issued', label: 'Issued Certificates', icon: FileText },
            { id: 'progress', label: 'User Progress', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const IconComp = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPageNum(1);
                }}
                style={{
                  padding: '10px 0',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? '#4f46e5' : '#64748b',
                  borderBottom: isActive ? '2px solid #4f46e5' : '2px solid transparent',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                <IconComp size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Search & Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPageNum(1);
              }}
              style={{
                paddingLeft: '34px',
                paddingRight: '12px',
                paddingTop: '8px',
                paddingBottom: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '0.8rem',
                color: '#1e293b',
                width: '220px',
                outline: 'none'
              }}
            />
          </div>

          <button
            onClick={handleExportReport}
            style={{
              padding: '8px 16px',
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            <Download size={15} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #4f46e5', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }}></div>
          <span>Loading certificate records...</span>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB 3: USER PROGRESS (EXACT MATCH TO REFERENCE IMAGE 2)   */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'progress' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Section Header */}
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>
                  Users Who Earned Milestone Certificates
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                  View all users who have achieved milestones and received certificates.
                </p>
              </div>

              {/* Table Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>
                      <tr>
                        <th style={{ padding: '14px 16px', width: '40px', textAlign: 'center' }}>#</th>
                        <th style={{ padding: '14px 16px' }}>User</th>
                        <th style={{ padding: '14px 16px' }}>Email</th>
                        <th style={{ padding: '14px 16px' }}>Milestone</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center' }}>Required Problems</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center' }}>Accepted Problems</th>
                        <th style={{ padding: '14px 16px' }}>Achievement Date</th>
                        <th style={{ padding: '14px 16px' }}>Certificate ID</th>
                        <th style={{ padding: '14px 16px' }}>Status</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.8rem', color: '#334155' }}>
                      {paginatedEarnedProgress.length === 0 ? (
                        <tr>
                          <td colSpan="10" style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                            No earned milestone certificates match your search query.
                          </td>
                        </tr>
                      ) : (
                        paginatedEarnedProgress.map((item, index) => {
                          const rowNum = startIndex + index + 1;
                          const bgAvatar = AVATAR_COLORS[item.userId % AVATAR_COLORS.length];
                          const initials = (item.displayName || item.username)
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase();

                          const formattedDate = new Date(item.achievementDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });

                          return (
                            <tr key={`${item.id}_${index}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              {/* # */}
                              <td style={{ padding: '14px 16px', fontWeight: 700, color: '#94a3b8', textAlign: 'center' }}>
                                {rowNum}
                              </td>

                              {/* User */}
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: bgAvatar, color: '#ffffff', fontWeight: 800, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {initials}
                                  </div>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                    {item.displayName}
                                  </span>
                                </div>
                              </td>

                              {/* Email */}
                              <td style={{ padding: '14px 16px', color: '#64748b' }}>
                                {item.email}
                              </td>

                              {/* Milestone */}
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca', fontWeight: 700, fontSize: '0.75rem' }}>
                                  <span style={{ fontWeight: 900 }}>{item.milestone}</span> Accepted Problems
                                </span>
                              </td>

                              {/* Required Problems */}
                              <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                                {item.requiredProblems}
                              </td>

                              {/* Accepted Problems */}
                              <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: '#4f46e5' }}>
                                {item.acceptedProblems}
                              </td>

                              {/* Achievement Date */}
                              <td style={{ padding: '14px 16px', color: '#64748b', fontWeight: 500 }}>
                                {formattedDate}
                              </td>

                              {/* Certificate ID */}
                              <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#334155', fontSize: '0.78rem' }}>
                                {item.certificateId}
                              </td>

                              {/* Status */}
                              <td style={{ padding: '14px 16px' }}>
                                {item.isRevoked ? (
                                  <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '9999px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', fontSize: '0.72rem', fontWeight: 700 }}>
                                    Revoked
                                  </span>
                                ) : (
                                  <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '9999px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '0.72rem', fontWeight: 700 }}>
                                    Issued
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                  <button
                                    onClick={() => setPreviewCert({
                                      id: item.id,
                                      verification_code: item.certificateId,
                                      milestone: item.milestone,
                                      title: item.milestoneTitle,
                                      theme: item.theme,
                                      created_at: item.achievementDate,
                                      user_name: item.displayName,
                                      username: item.username
                                    })}
                                    style={{ padding: '4px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#4f46e5', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="View Certificate Document"
                                  >
                                    <Eye size={13} />
                                    <span>View</span>
                                  </button>

                                  <button
                                    onClick={() => setPreviewCert({
                                      id: item.id,
                                      verification_code: item.certificateId,
                                      milestone: item.milestone,
                                      title: item.milestoneTitle,
                                      theme: item.theme,
                                      created_at: item.achievementDate,
                                      user_name: item.displayName,
                                      username: item.username
                                    })}
                                    style={{ padding: '4px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="Download Certificate PDF"
                                  >
                                    <Download size={13} />
                                    <span>Download</span>
                                  </button>

                                  <button
                                    onClick={() => setSelectedUserId(item.userId)}
                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                                    title="Inspect User Details"
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>
                  <div>
                    Showing <strong style={{ color: '#0f172a' }}>{totalItems > 0 ? startIndex + 1 : 0}</strong> to <strong style={{ color: '#0f172a' }}>{Math.min(startIndex + itemsPerPage, totalItems)}</strong> of <strong style={{ color: '#0f172a' }}>{totalItems}</strong> users
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))}
                      disabled={currentPageNum === 1}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: currentPageNum === 1 ? 'not-allowed' : 'pointer', opacity: currentPageNum === 1 ? 0.4 : 1 }}
                    >
                      <ChevronLeft size={14} />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                      <button
                        key={num}
                        onClick={() => setCurrentPageNum(num)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: currentPageNum === num ? '#4f46e5' : '#ffffff',
                          color: currentPageNum === num ? '#ffffff' : '#334155',
                          border: currentPageNum === num ? '1px solid #4f46e5' : '1px solid #cbd5e1'
                        }}
                      >
                        {num}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPageNum(p => Math.min(totalPages, p + 1))}
                      disabled={currentPageNum === totalPages}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: currentPageNum === totalPages ? 'not-allowed' : 'pointer', opacity: currentPageNum === totalPages ? 0.4 : 1 }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB 1: MILESTONE CERTIFICATES & PREVIEWS                  */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'milestones' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 20px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>Platform Achievement Milestones</h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                    Configure required accepted problem counts, titles, themes, and motivational copy.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedMilestoneConfig(null);
                    setShowMilestoneModal(true);
                  }}
                  style={{ padding: '8px 16px', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} />
                  <span>Add Milestone</span>
                </button>
              </div>

              {/* Milestone Previews Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {milestones.map(m => (
                  <div key={`preview_${m.milestone}`} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                      <CertificateBadge milestone={m.milestone} theme={m.theme} size={64} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '2px 8px', borderRadius: '6px' }}>
                            {m.milestone} Accepted
                          </span>
                          {Boolean(m.is_enabled) ? (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>Enabled</span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>Disabled</span>
                          )}
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px' }}>{m.title}</h4>
                        <p style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', margin: 0 }}>"{m.motivation_message}"</p>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <div style={{ color: '#64748b' }}>
                        <strong>{m.usersReached || 0}</strong> users reached • <strong>{m.certificatesCount || 0}</strong> issued
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setSelectedMilestoneConfig(m);
                            setShowMilestoneModal(true);
                          }}
                          style={{ padding: '4px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleMilestone(m.milestone)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            background: Boolean(m.is_enabled) ? '#fff1f2' : '#ecfdf5',
                            color: Boolean(m.is_enabled) ? '#e11d48' : '#047857',
                            border: Boolean(m.is_enabled) ? '1px solid #fecdd3' : '1px solid #a7f3d0'
                          }}
                        >
                          {Boolean(m.is_enabled) ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Milestones Config Table */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                    <tr>
                      <th style={{ padding: '14px 16px' }}>Name & Title</th>
                      <th style={{ padding: '14px 16px' }}>Required Problems</th>
                      <th style={{ padding: '14px 16px' }}>Users Reached</th>
                      <th style={{ padding: '14px 16px' }}>Certificates</th>
                      <th style={{ padding: '14px 16px' }}>Status</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map(m => (
                      <tr key={m.milestone} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CertificateBadge milestone={m.milestone} theme={m.theme} size={32} />
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.title}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                                "{m.motivation_message}"
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5', background: '#eef2ff', padding: '4px 10px', borderRadius: '6px' }}>
                            {m.milestone} Accepted
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                          {m.usersReached || 0} users
                        </td>

                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#059669' }}>
                          {m.certificatesCount || 0} issued
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {Boolean(m.is_enabled) ? (
                            <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '0.72rem', fontWeight: 700 }}>
                              Enabled
                            </span>
                          ) : (
                            <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 700 }}>
                              Disabled
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setSelectedMilestoneConfig(m);
                                setShowMilestoneModal(true);
                              }}
                              style={{ padding: '4px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              Edit Copy
                            </button>

                            <button
                              onClick={() => handleToggleMilestone(m.milestone)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                background: Boolean(m.is_enabled) ? '#fff1f2' : '#ecfdf5',
                                color: Boolean(m.is_enabled) ? '#e11d48' : '#047857',
                                border: Boolean(m.is_enabled) ? '1px solid #fecdd3' : '1px solid #a7f3d0'
                              }}
                            >
                              {Boolean(m.is_enabled) ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB 2: ISSUED CERTIFICATES                                */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'issued' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                    <tr>
                      <th style={{ padding: '14px 16px' }}>Certificate ID</th>
                      <th style={{ padding: '14px 16px' }}>User</th>
                      <th style={{ padding: '14px 16px' }}>Milestone</th>
                      <th style={{ padding: '14px 16px' }}>Issue Date</th>
                      <th style={{ padding: '14px 16px' }}>Status</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCertificates.map(cert => {
                      const isRevoked = Boolean(cert.revoked_at);

                      return (
                        <tr key={cert.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                            <a href={`/certificate/${cert.verification_code}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', textDecoration: 'none' }}>
                              {cert.verification_code}
                            </a>
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{cert.display_name || cert.username}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{cert.email}</div>
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <CertificateBadge milestone={cert.milestone} theme={cert.theme} size={26} />
                              <span style={{ fontWeight: 700, color: '#334155' }}>#{cert.milestone}</span>
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px', color: '#64748b', fontFamily: 'monospace' }}>
                            {new Date(cert.created_at).toLocaleDateString()}
                          </td>

                          <td style={{ padding: '14px 16px' }}>
                            {isRevoked ? (
                              <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', fontSize: '0.72rem', fontWeight: 700 }}>
                                Revoked
                              </span>
                            ) : (
                              <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '0.72rem', fontWeight: 700 }}>
                                Active
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => setPreviewCert(cert)}
                                style={{ padding: '4px 10px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '6px', color: '#4338ca', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                              >
                                View
                              </button>

                              <button
                                onClick={() => handleRegenerate(cert.id)}
                                style={{ padding: '4px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                              >
                                Regenerate
                              </button>

                              <button
                                onClick={() => handleRevoke(cert.id, isRevoked)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  background: isRevoked ? '#ecfdf5' : '#fff1f2',
                                  color: isRevoked ? '#047857' : '#e11d48',
                                  border: isRevoked ? '1px solid #a7f3d0' : '1px solid #fecdd3'
                                }}
                              >
                                {isRevoked ? 'Reactivate' : 'Revoke'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TAB 5: ANALYTICS (PIE CHART & BAR CHART)                  */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'analytics' && (() => {
            const analyticsData = summary?.milestoneAnalytics || milestones;
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];
            
            // Pie chart slice calculation
            const totalIssued = analyticsData.reduce((acc, item) => acc + (item.certificatesIssued || item.certificatesCount || 0), 0);
            let cumulativeAngle = 0;

            const pieSlices = analyticsData.map((item, idx) => {
              const val = item.certificatesIssued || item.certificatesCount || 0;
              const fraction = totalIssued > 0 ? val / totalIssued : 1 / Math.max(1, analyticsData.length);
              const angle = fraction * 360;
              const startAngle = cumulativeAngle;
              cumulativeAngle += angle;
              const endAngle = cumulativeAngle;

              // Convert polar to cartesian (r = 80)
              const x1 = 100 + 80 * Math.cos((Math.PI * (startAngle - 90)) / 180);
              const y1 = 100 + 80 * Math.sin((Math.PI * (startAngle - 90)) / 180);
              const x2 = 100 + 80 * Math.cos((Math.PI * (endAngle - 90)) / 180);
              const y2 = 100 + 80 * Math.sin((Math.PI * (endAngle - 90)) / 180);
              const largeArcFlag = angle > 180 ? 1 : 0;

              const pathData = totalIssued === 0 || angle === 360
                ? `M 100 20 A 80 80 0 1 1 99.99 20 Z`
                : `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

              return {
                ...item,
                color: colors[idx % colors.length],
                val,
                percentage: totalIssued > 0 ? ((val / totalIssued) * 100).toFixed(1) : 0,
                pathData
              };
            });

            const maxUsers = Math.max(1, ...analyticsData.map(i => Math.max(i.usersReached || 0, i.certificatesIssued || i.certificatesCount || 0)));

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px' }}>
                  <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>Certificates Distribution (Pie Chart) & User Milestones (Bar Chart)</h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                      Visual distribution of milestone certificates issued and developers reaching achievement tiers.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
                    
                    {/* PIE CHART CARD */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px', width: '100%', textAlign: 'left' }}>Issued Certificates Share</h4>
                      
                      <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 20px' }}>
                        <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', transform: 'rotate(0deg)' }}>
                          {pieSlices.map((slice, i) => (
                            <path
                              key={i}
                              d={slice.pathData}
                              fill={slice.color}
                              stroke="#ffffff"
                              strokeWidth="2"
                            />
                          ))}
                        </svg>
                      </div>

                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                        {pieSlices.map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: s.color }}></span>
                              <span style={{ color: '#334155', fontWeight: 600 }}>#{s.milestone} Milestone ({s.title})</span>
                            </div>
                            <span style={{ fontWeight: 800, color: '#0f172a' }}>{s.val} ({s.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BAR CHART CARD */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>Users Reached vs Certificates Issued</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
                        {analyticsData.map((item, idx) => {
                          const reached = item.usersReached || 0;
                          const issued = item.certificatesIssued || item.certificatesCount || 0;
                          const reachedPct = Math.round((reached / maxUsers) * 100);
                          const issuedPct = Math.round((issued / maxUsers) * 100);

                          return (
                            <div key={item.milestone} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                                <span>#{item.milestone} Milestone ({item.title})</span>
                                <span>{reached} Reached / {issued} Issued</span>
                              </div>

                              <div style={{ display: 'flex', gap: '6px', height: '14px' }}>
                                {/* Users Reached Bar */}
                                <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ width: `${reachedPct}%`, height: '100%', background: '#3b82f6', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                                </div>
                                {/* Certificates Issued Bar */}
                                <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ width: `${issuedPct}%`, height: '100%', background: '#10b981', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ borderTop: '1px solid #cbd5e1', marginTop: '16px', paddingTop: '10px', display: 'flex', gap: '16px', fontSize: '0.75rem', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3b82f6' }}></span>
                          <span>Users Reached</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }}></span>
                          <span>Certificates Issued</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Modals */}
      {showMilestoneModal && (
        <AdminCertificateModal
          milestoneConfig={selectedMilestoneConfig}
          onClose={() => {
            setShowMilestoneModal(false);
            setSelectedMilestoneConfig(null);
          }}
          onSave={(msg) => {
            setShowMilestoneModal(false);
            setSelectedMilestoneConfig(null);
            showNotification('success', msg);
            fetchAllData();
          }}
        />
      )}

      {selectedUserId && (
        <AdminUserDetailsModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onActionSuccess={() => fetchAllData()}
        />
      )}

      {previewCert && (
        <CertificateViewerModal
          certificate={previewCert}
          user={{ display_name: previewCert.user_name || previewCert.username, username: previewCert.username }}
          onClose={() => setPreviewCert(null)}
        />
      )}
    </div>
  );
}
