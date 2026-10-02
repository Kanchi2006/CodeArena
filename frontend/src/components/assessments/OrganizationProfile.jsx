import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  FileText, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Edit3, 
  Save, 
  X, 
  Eye, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  UserCheck, 
  Briefcase, 
  Hash, 
  Twitter, 
  Linkedin,
  Calendar,
  Users
} from 'lucide-react';

export default function OrganizationProfile({ user, token, onStatusUpdate }) {
  const [profile, setProfile] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(user?.org_status || 'PENDING');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Edit Form Fields
  const [formData, setFormData] = useState({
    organization_name: '',
    organization_type: 'Private Limited',
    official_email: '',
    phone_number: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    reg_number: '',
    rep_name: '',
    rep_designation: '',
    description: '',
    established_year: '',
    industry: '',
    employee_count: '',
    contact_person: '',
    contact_designation: '',
    twitter_url: '',
    linkedin_url: ''
  });

  // Modal State for Preview & Replacement
  const [previewModal, setPreviewModal] = useState(null); // { url, title, isImage, filename }
  const [replaceModal, setReplaceModal] = useState(null); // { docType, docLabel }
  const [selectedFile, setSelectedFile] = useState(null);
  const [replacing, setReplacing] = useState(false);

  const getAuthToken = () => token || localStorage.getItem('token') || '';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const authToken = getAuthToken();
    try {
      const res = await fetch('/api/organization/profile', {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok && data.profile) {
        setProfile(data.profile);
        setVerificationStatus(data.status || data.profile.verification_status);
        setFormData({
          organization_name: data.profile.organization_name || '',
          organization_type: data.profile.organization_type || 'Private Limited',
          official_email: data.profile.official_email || user?.email || '',
          phone_number: data.profile.phone_number || '',
          website: data.profile.website || '',
          address: data.profile.address || '',
          city: data.profile.city || '',
          state: data.profile.state || '',
          country: data.profile.country || 'India',
          reg_number: data.profile.reg_number || '',
          rep_name: data.profile.rep_name || '',
          rep_designation: data.profile.rep_designation || '',
          description: data.profile.description || '',
          established_year: data.profile.established_year || '',
          industry: data.profile.industry || '',
          employee_count: data.profile.employee_count || '',
          contact_person: data.profile.contact_person || '',
          contact_designation: data.profile.contact_designation || '',
          twitter_url: data.profile.twitter_url || '',
          linkedin_url: data.profile.linkedin_url || ''
        });
        if (onStatusUpdate) onStatusUpdate(data.status, data.profile);
      }
    } catch (err) {
      console.error('Error fetching organization profile:', err);
      setMessage({ type: 'error', text: 'Failed to load organization profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const authToken = getAuthToken();

    try {
      const res = await fetch('/api/organization/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: '✓ Organization profile details updated successfully!' });
        setProfile(data.profile);
        setIsEditing(false);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update organization profile.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error updating profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleViewDocument = async (docType, label) => {
    const authToken = getAuthToken();
    try {
      const res = await fetch(`/api/organization/documents/${docType}/view`, {
        headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }
      });
      if (!res.ok) {
        alert('Document file could not be retrieved.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const filename = profile?.[docType] || `${docType}.pdf`;
      const isImage = blob.type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(filename);
      setPreviewModal({ url, title: label, filename, isImage });
    } catch (err) {
      alert('Error opening document.');
    }
  };

  const handleDownloadDocument = async (docType) => {
    const authToken = getAuthToken();
    try {
      const res = await fetch(`/api/organization/documents/${docType}/download`, {
        headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }
      });
      if (!res.ok) {
        alert('Document download failed.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = profile?.[docType] || `${docType}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Error downloading document.');
    }
  };

  const handleReplaceDocument = async (e) => {
    e.preventDefault();
    if (!replaceModal || !selectedFile) return;

    setReplacing(true);
    const authToken = getAuthToken();
    try {
      const res = await fetch('/api/organization/replace-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          docType: replaceModal.docType,
          fileName: selectedFile.name
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `✓ ${replaceModal.docLabel} updated successfully!` });
        setReplaceModal(null);
        setSelectedFile(null);
        fetchProfile();
      } else {
        alert(data.error || 'Failed to replace document.');
      }
    } catch (err) {
      alert('Error updating document.');
    } finally {
      setReplacing(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'VERIFIED':
        return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} /> VERIFIED</span>;
      case 'UNDER_REVIEW':
        return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> UNDER REVIEW</span>;
      case 'REJECTED':
        return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} /> REJECTED</span>;
      case 'RESUBMISSION_REQUIRED':
        return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={14} /> RESUBMISSION REQUIRED</span>;
      default:
        return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> PENDING</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={28} style={{ marginBottom: '12px', color: '#6366f1' }} />
        <div>Loading organization profile & compliance records...</div>
      </div>
    );
  }

  const documentItems = [
    { key: 'reg_certificate', label: 'Registration / Incorporation Certificate', required: true },
    { key: 'pan_card', label: 'PAN Card / Corporate Tax ID', required: true },
    { key: 'govt_id', label: 'Authorized Representative Government ID', required: true },
    { key: 'selfie_id', label: 'Supporting Representative Photo / Additional Document', required: false }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* 1. HEADER BANNER */}
      <div 
        className="glass-panel"
        style={{ 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.14) 0%, rgba(168, 85, 247, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.2)', color: '#6366f1' }}>
            <Building2 size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {profile?.organization_name || user?.display_name || 'Organization Profile'}
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Manage official enterprise profile, contact information, compliance documentation, and verification state.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {getStatusBadge(verificationStatus)}
          <button
            onClick={fetchProfile}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ALERT MESSAGE */}
      {message && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          fontSize: '0.88rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ADMIN REVIEW FEEDBACK ALERT */}
      {(verificationStatus === 'REJECTED' || verificationStatus === 'RESUBMISSION_REQUIRED') && profile?.rejection_reason && (
        <div style={{ padding: '16px 20px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', borderRadius: '14px', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '6px' }}>
            <AlertTriangle size={18} />
            <span>Compliance Review Feedback ({verificationStatus.replace('_', ' ')})</span>
          </div>
          <p style={{ margin: 0, lineHeight: '1.5' }}>{profile.rejection_reason}</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: '#fca5a5' }}>
            Please replace the required compliance document(s) in the Verification Documents section below to request a re-review.
          </p>
        </div>
      )}

      {/* 2. ORGANIZATION PROFILE INFORMATION */}
      <div className="glass-panel" style={{ borderRadius: '16px', border: '1px solid var(--border-light)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="#6366f1" /> Organization Information
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official details registered on CodeArena</span>
          </div>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Edit3 size={15} /> Edit Profile
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: '600' }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Organization Name *</label>
                <input
                  type="text"
                  name="organization_name"
                  className="form-input"
                  value={formData.organization_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="form-label">Organization Type *</label>
                <select
                  name="organization_type"
                  className="form-input"
                  value={formData.organization_type}
                  onChange={handleInputChange}
                >
                  <option value="Private Limited">Private Limited</option>
                  <option value="Public Limited">Public Limited</option>
                  <option value="Educational Institution">Educational Institution / University</option>
                  <option value="Non-Profit">Non-Profit / NGO</option>
                  <option value="Government Entity">Government Entity</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Official Email Address *</label>
                <input
                  type="email"
                  name="official_email"
                  className="form-input"
                  value={formData.official_email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="form-label">Contact Phone Number *</label>
                <input
                  type="text"
                  name="phone_number"
                  className="form-input"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Official Website URL</label>
                <input
                  type="url"
                  name="website"
                  className="form-input"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="form-label">Registration / Tax ID Number</label>
                <input
                  type="text"
                  name="reg_number"
                  className="form-input"
                  value={formData.reg_number}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Physical Address</label>
              <input
                type="text"
                name="address"
                className="form-input"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">City</label>
                <input type="text" name="city" className="form-input" value={formData.city} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">State</label>
                <input type="text" name="state" className="form-input" value={formData.state} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Country</label>
                <input type="text" name="country" className="form-input" value={formData.country} onChange={handleInputChange} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Authorized Representative Name</label>
                <input type="text" name="rep_name" className="form-input" value={formData.rep_name} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Representative Designation</label>
                <input type="text" name="rep_designation" className="form-input" value={formData.rep_designation} onChange={handleInputChange} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Industry</label>
                <input type="text" name="industry" className="form-input" placeholder="e.g. Technology" value={formData.industry} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Employee Count</label>
                <input type="text" name="employee_count" className="form-input" placeholder="e.g. 50-200" value={formData.employee_count} onChange={handleInputChange} />
              </div>
              <div>
                <label className="form-label">Established Year</label>
                <input type="number" name="established_year" className="form-input" placeholder="e.g. 2018" value={formData.established_year} onChange={handleInputChange} />
              </div>
            </div>

            <div>
              <label className="form-label">Organization Description / About</label>
              <textarea
                name="description"
                rows={3}
                className="form-input"
                placeholder="Brief summary of your organization's mission and hiring activities..."
                value={formData.description}
                onChange={handleInputChange}
                style={{ width: '100%', minHeight: '80px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={14} color="#6366f1" /> Organization Name & Type
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>{profile?.organization_name || 'N/A'}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>{profile?.organization_type || 'Private Limited'}</div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} color="#10b981" /> Official Email & Phone
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>{profile?.official_email || user?.email || 'N/A'}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>{profile?.phone_number || 'N/A'}</div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={14} color="#3b82f6" /> Website & Registration ID
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#6366f1' }}>
                {profile?.website ? <a href={profile.website} target="_blank" rel="noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>{profile.website}</a> : 'N/A'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>Reg ID: {profile?.reg_number || 'N/A'}</div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="#f59e0b" /> Physical Location
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-main)' }}>
                {[profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ') || 'N/A'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>{profile?.address || 'N/A'}</div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={14} color="#a855f7" /> Representative
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>{profile?.rep_name || 'N/A'}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>{profile?.rep_designation || 'N/A'}</div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={14} color="#ec4899" /> Industry & Size
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>{profile?.industry || 'Technology'}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>Employees: {profile?.employee_count || 'N/A'}</div>
            </div>
          </div>
        )}
      </div>

      {/* 3. VERIFICATION DOCUMENTS SECTION */}
      <div className="glass-panel" style={{ borderRadius: '16px', border: '1px solid var(--border-light)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="#10b981" /> Verification Documents
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official credentials submitted for compliance validation</span>
          </div>

          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Uploaded on: {profile?.submitted_at ? new Date(profile.submitted_at).toLocaleDateString() : 'Recorded'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {documentItems.map((doc) => {
            const hasDoc = Boolean(profile?.[doc.key]);
            const fileName = profile?.[doc.key] || 'Not Uploaded';

            return (
              <div key={doc.key} style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                    {doc.label} {doc.required && <span style={{ color: '#ef4444' }}>*</span>}
                  </div>

                  <div style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                    {hasDoc ? (
                      <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                        <CheckCircle2 size={13} /> {fileName}
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                        <AlertCircle size={13} /> Document Missing
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {hasDoc && (
                    <>
                      <button
                        onClick={() => handleViewDocument(doc.key, doc.label)}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '6px 10px', fontSize: '0.78rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        onClick={() => handleDownloadDocument(doc.key)}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '6px 10px', fontSize: '0.78rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Download size={13} /> Download
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setReplaceModal({ docType: doc.key, docLabel: doc.label });
                      setSelectedFile(null);
                    }}
                    className="btn btn-primary"
                    style={{ flex: hasDoc ? 'none' : 1, padding: '6px 12px', fontSize: '0.78rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <Upload size={13} /> {hasDoc ? 'Replace' : 'Upload File'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backdropFilter: 'blur(6px)'
        }} onClick={() => setPreviewModal(null)}>
          <div style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--bg-panel, #1e293b)',
            borderRadius: '16px',
            border: '1px solid var(--border-light)',
            padding: '20px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>{previewModal.title}</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{previewModal.filename}</span>
              </div>
              <button
                onClick={() => setPreviewModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', fontWeight: 'bold' }}
              >
                &times;
              </button>
            </div>
            <div style={{ overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '70vh' }}>
              {previewModal.isImage ? (
                <img
                  src={previewModal.url}
                  alt={previewModal.title}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }}
                />
              ) : (
                <iframe
                  src={previewModal.url}
                  title={previewModal.title}
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: '#ffffff' }}
                />
              )}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setPreviewModal(null)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: '600' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPLACE DOCUMENT MODAL */}
      {replaceModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }} onClick={() => setReplaceModal(null)}>
          <div style={{
            background: 'var(--bg-panel, #1e293b)',
            borderRadius: '16px',
            border: '1px solid var(--border-light)',
            padding: '24px',
            maxWidth: '500px',
            width: '100%'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                Upload / Replace: {replaceModal.docLabel}
              </h3>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setReplaceModal(null)} />
            </div>

            <form onSubmit={handleReplaceDocument} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Select a new PDF file (.pdf) to replace your existing document. Updating this document will resubmit your credentials for compliance evaluation if required.
              </p>

              <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px dashed var(--border-light)', textAlign: 'center' }}>
                <input
                  type="file"
                  id="replaceFileInput"
                  accept=".pdf,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (!file.name.toLowerCase().endsWith('.pdf')) {
                        alert('Only PDF files (.pdf) are allowed.');
                        e.target.value = '';
                        return;
                      }
                      setSelectedFile(file);
                    }
                  }}
                />
                <label htmlFor="replaceFileInput" className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 16px' }}>
                  <Upload size={14} /> Choose PDF File
                </label>
                <div style={{ marginTop: '10px', fontSize: '0.82rem', color: selectedFile ? '#10b981' : 'var(--text-muted)', fontWeight: '600' }}>
                  {selectedFile ? selectedFile.name : 'No PDF file chosen'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setReplaceModal(null)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replacing || !selectedFile}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.82rem', fontWeight: '700' }}
                >
                  {replacing ? 'Uploading...' : 'Confirm & Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
