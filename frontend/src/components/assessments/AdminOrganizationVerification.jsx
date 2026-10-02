import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Mail, 
  FileText, 
  Globe, 
  Phone, 
  MapPin, 
  AlertCircle, 
  Eye, 
  UserCheck, 
  Ban, 
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export default function AdminOrganizationVerification({ token }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Org for Details Modal
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Action Form state inside Modal
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Document Preview Modal State
  const [previewImageModal, setPreviewImageModal] = useState(null); // { url, fileName, title }

  useEffect(() => {
    fetchOrganizations();
  }, [token]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/organizations', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (err) {
      console.error('Error fetching admin organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrg = async (orgId) => {
    setLoadingDetails(true);
    setActionMessage(null);
    setActionReason('');
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrg(data.org);
        setAuditLogs(data.auditLogs || []);
        setEmailLogs(data.emailLogs || []);
      }
    } catch (err) {
      console.error('Error fetching org details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateStatus = async (actionType) => {
    if (!selectedOrg) return;
    if ((actionType === 'REJECT' || actionType === 'SUSPEND') && !actionReason.trim()) {
      setActionMessage({ type: 'error', text: 'Please provide a reason for this action.' });
      return;
    }

    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/organizations/${selectedOrg.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: actionType,
          rejection_reason: actionReason
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: data.message || 'Status updated successfully!' });
        setActionReason('');
        // Refresh detail & list
        handleSelectOrg(selectedOrg.id);
        fetchOrganizations();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to update status.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Network error updating verification status.' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrgs = organizations.filter(org => {
    const matchesStatus = filterStatus === 'ALL' || org.verification_status === filterStatus;
    const matchesQuery = 
      !searchQuery.trim() ||
      org.organization_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.official_email && org.official_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (org.user_email && org.user_email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesQuery;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12} /> VERIFIED</span>;
      case 'UNDER_REVIEW':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> UNDER REVIEW</span>;
      case 'REJECTED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> REJECTED</span>;
      case 'SUSPENDED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Ban size={12} /> SUSPENDED</span>;
      default:
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> PENDING</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      {/* 1. HEADER BANNER */}
      <div 
        className="glass-panel"
        style={{ 
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
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
            <Building2 size={26} color="#10b981" /> Organization Verification Management
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
            Review, verify, and monitor enterprise organizations, credentials, document compliance, and notification history.
          </p>
        </div>

        <button
          onClick={fetchOrganizations}
          className="btn btn-secondary"
          style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={15} /> Refresh List
        </button>
      </div>

      {/* 2. FILTERS & SEARCH BAR */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['ALL', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '700',
                border: filterStatus === st ? '1px solid #10b981' : '1px solid var(--border-light)',
                background: filterStatus === st ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-input)',
                color: filterStatus === st ? '#10b981' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search org name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-input)',
              color: 'var(--text-main)',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* 3. ORGANIZATIONS TABLE */}
      <div className="glass-panel" style={{ borderRadius: '16px', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading organization records...
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No organization verification requests found for this filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="problems-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Organization & Rep</th>
                  <th>Official Email</th>
                  <th>Type & Location</th>
                  <th>Submitted Date</th>
                  <th>Verification Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map(org => (
                  <tr key={org.id}>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{org.organization_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Rep: {org.rep_name || org.username || 'Not set'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#6366f1' }}>
                      {org.official_email || org.user_email}
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      <div>{org.organization_type || 'Private Ltd'}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{org.city ? `${org.city}, ${org.country || 'India'}` : 'India'}</div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {org.submitted_at ? new Date(org.submitted_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>{getStatusBadge(org.verification_status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleSelectOrg(org.id)}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={13} /> View & Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. ORGANIZATION DETAILS & EMAIL HISTORY MODAL */}
      {selectedOrg && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: '20px',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-panel, #1e293b)',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>{selectedOrg.organization_name}</h2>
                  {getStatusBadge(selectedOrg.verification_status)}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
                  Registered User Email: <strong>{selectedOrg.user_email}</strong> &bull; Submitted: {selectedOrg.submitted_at ? new Date(selectedOrg.submitted_at).toLocaleString() : 'N/A'}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrg(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem' }}
              >
                &times;
              </button>
            </div>

            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading complete organization profile...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Status Message Notification */}
                {actionMessage && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: actionMessage.type === 'success' ? '#10b981' : '#ef4444',
                    border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    {actionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    {actionMessage.text}
                  </div>
                )}

                {/* ADMIN ACTIONS PANEL */}
                <div style={{
                  background: 'var(--bg-input, #0f172a)',
                  padding: '18px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-light)'
                }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '700', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10b981' }}>
                    Admin Review Actions & Status Control
                  </h4>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <button
                      onClick={() => handleUpdateStatus('START_REVIEW')}
                      disabled={actionLoading || selectedOrg.verification_status === 'UNDER_REVIEW'}
                      style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.4)', cursor: 'pointer' }}
                    >
                      Set Under Review
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('APPROVE')}
                      disabled={actionLoading || selectedOrg.verification_status === 'VERIFIED'}
                      style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', background: '#10b981', color: '#ffffff', border: 'none', cursor: 'pointer', boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)' }}
                    >
                      Approve Organization
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('REJECT')}
                      disabled={actionLoading || selectedOrg.verification_status === 'REJECTED'}
                      style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', cursor: 'pointer' }}
                    >
                      Reject Request
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('SUSPEND')}
                      disabled={actionLoading || selectedOrg.verification_status === 'SUSPENDED'}
                      style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)', cursor: 'pointer' }}
                    >
                      Suspend Organization
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Reason / Notes for Rejection or Suspension (Included in email notification)..."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-panel)',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                {/* DETAILS GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Company Info</h5>
                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div><strong>Type:</strong> {selectedOrg.organization_type || 'N/A'}</div>
                      <div><strong>Official Email:</strong> <span style={{ color: '#6366f1' }}>{selectedOrg.official_email}</span></div>
                      <div><strong>Website:</strong> {selectedOrg.website ? <a href={selectedOrg.website} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>{selectedOrg.website}</a> : 'N/A'}</div>
                      <div><strong>Phone:</strong> {selectedOrg.phone_number || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Representative Info</h5>
                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div><strong>Name:</strong> {selectedOrg.rep_name || 'N/A'}</div>
                      <div><strong>Designation:</strong> {selectedOrg.rep_designation || 'Authorized Signatory'}</div>
                      <div><strong>Reg Number:</strong> {selectedOrg.reg_number || 'N/A'}</div>
                      <div><strong>GSTIN:</strong> {selectedOrg.gstin || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* SUBMITTED DOCUMENTS */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '700', margin: '0 0 10px 0', textTransform: 'uppercase', color: 'var(--text-main)' }}>
                    Verification Documents Uploaded
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    {[
                      { label: 'Registration Certificate', docType: 'reg_certificate', file: selectedOrg.reg_certificate },
                      { label: 'PAN Card', docType: 'pan_card', file: selectedOrg.pan_card },
                      { label: 'Govt Representative ID', docType: 'govt_id', file: selectedOrg.govt_id },
                      { label: 'Selfie / Verification Photo', docType: 'selfie_id', file: selectedOrg.selfie_id }
                    ].map((doc, idx) => {
                      const hasDoc = Boolean(doc.file);
                      const viewUrl = `/api/admin/organizations/${selectedOrg.id}/documents/${doc.docType}/view`;
                      const downloadUrl = `/api/admin/organizations/${selectedOrg.id}/documents/${doc.docType}/download`;

                      const handleDownload = async () => {
                        try {
                          const res = await fetch(downloadUrl, {
                            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
                          });
                          if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));
                            alert(errData.error || 'Document file not found on server.');
                            return;
                          }
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = doc.file || `${doc.docType}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                        } catch (err) {
                          alert('Error downloading document file.');
                        }
                      };

                      const handleView = async () => {
                        try {
                          const res = await fetch(viewUrl, {
                            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
                          });
                          if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));
                            alert(errData.error || 'Document file not found on server.');
                            return;
                          }
                          const blob = await res.blob();
                          const filename = doc.file || `${doc.docType}.pdf`;
                          const isImage = blob.type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(filename);
                          const pdfBlob = isImage ? blob : new Blob([blob], { type: 'application/pdf' });
                          const url = window.URL.createObjectURL(pdfBlob);

                          setPreviewImageModal({ url, fileName: filename, title: doc.label, isImage });
                        } catch (err) {
                          alert('Error opening document file.');
                        }
                      };

                      return (
                        <div key={idx} style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '2px' }}>{doc.label}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type: {doc.docType}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Uploaded: {selectedOrg.submitted_at ? new Date(selectedOrg.submitted_at).toLocaleDateString() : 'N/A'}
                            </div>
                            <div style={{ marginTop: '6px', fontSize: '0.78rem' }}>
                              {hasDoc ? (
                                <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                  <CheckCircle size={13} /> {doc.file}
                                </span>
                              ) : (
                                <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                  <AlertCircle size={13} /> Missing Document
                                </span>
                              )}
                            </div>
                          </div>

                          {hasDoc && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                              <button
                                onClick={handleView}
                                className="btn btn-secondary"
                                style={{ flex: 1, padding: '5px 8px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                              >
                                <Eye size={12} /> View
                              </button>
                              <button
                                onClick={handleDownload}
                                className="btn btn-secondary"
                                style={{ flex: 1, padding: '5px 8px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                              >
                                <ExternalLink size={12} /> Download
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. EMAIL HISTORY SECTION (REQUIREMENT 9) */}
                <div style={{
                  background: 'var(--bg-input, #0f172a)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-light)',
                  padding: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1' }}>
                      <Mail size={18} /> Notification Email History
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{emailLogs.length} Delivery Logs</span>
                  </div>

                  {emailLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No automated notification emails recorded for this organization yet.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="problems-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                        <thead>
                          <tr>
                            <th>Email Type</th>
                            <th>Recipient</th>
                            <th>Subject</th>
                            <th>Sent Date & Time</th>
                            <th>Delivery Status</th>
                            <th>Error Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emailLogs.map((log) => (
                            <tr key={log.id}>
                              <td>
                                <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                                  {log.email_type ? log.email_type.replace(/_/g, ' ') : 'NOTIFICATION'}
                                </span>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status: {log.verification_status}</div>
                              </td>
                              <td style={{ color: '#6366f1' }}>{log.recipient_email}</td>
                              <td style={{ color: 'var(--text-muted)' }}>{log.subject}</td>
                              <td>{new Date(log.sent_at).toLocaleString()}</td>
                              <td>
                                {log.status === 'SENT' ? (
                                  <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <CheckCircle size={10} /> SENT
                                  </span>
                                ) : (
                                  <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <XCircle size={10} /> FAILED
                                  </span>
                                )}
                              </td>
                              <td style={{ color: '#ef4444', fontSize: '0.75rem' }}>
                                {log.error_message || <span style={{ color: 'var(--text-muted)' }}>None</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* AUDIT TRAIL LOGS */}
                {auditLogs.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: '700', margin: '0 0 10px 0', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Admin Audit Trail History
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {auditLogs.map((log) => (
                        <div key={log.id} style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>{log.admin_name || log.admin_username || 'Admin'}</strong> changed status from <span style={{ color: 'var(--text-muted)' }}>{log.previous_status}</span> &rarr; <strong>{log.new_status}</strong>
                            {log.reason && <div style={{ color: '#f59e0b', marginTop: '2px' }}>Reason: {log.reason}</div>}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. DOCUMENT PREVIEW MODAL (PDF & IMAGE) */}
      {previewImageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backdropFilter: 'blur(6px)'
        }} onClick={() => {
          if (previewImageModal.url) URL.revokeObjectURL(previewImageModal.url);
          setPreviewImageModal(null);
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '960px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--bg-panel, #1e293b)',
            borderRadius: '16px',
            border: '1px solid var(--border-light)',
            padding: '24px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>{previewImageModal.title}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{previewImageModal.fileName}</span>
              </div>
              <button
                onClick={() => {
                  if (previewImageModal.url) URL.revokeObjectURL(previewImageModal.url);
                  setPreviewImageModal(null);
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', fontWeight: 'bold' }}
              >
                &times;
              </button>
            </div>
            <div style={{ width: '100%', height: '65vh', overflow: 'hidden', borderRadius: '10px', background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {previewImageModal.isImage ? (
                <img
                  src={previewImageModal.url}
                  alt={previewImageModal.title}
                  style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px' }}
                />
              ) : (
                <iframe
                  src={previewImageModal.url}
                  title={previewImageModal.title}
                  width="100%"
                  height="100%"
                  style={{ border: 'none', borderRadius: '8px', background: '#ffffff' }}
                />
              )}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', width: '100%', justifyContent: 'flex-end' }}>
              <a
                href={previewImageModal.url}
                download={previewImageModal.fileName}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ExternalLink size={14} /> Download Document
              </a>
              <button
                onClick={() => {
                  if (previewImageModal.url) URL.revokeObjectURL(previewImageModal.url);
                  setPreviewImageModal(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: '600' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
