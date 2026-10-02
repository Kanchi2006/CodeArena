import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  FileText, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  X,
  FileCheck,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export default function OrganizationOnboardingModal({ user, token, onClose, onVerificationComplete, onStatusUpdate, isModal = false }) {
  const [step, setStep] = useState(1); // 1: Details Form, 2: Document Upload, 3: Status Tracker
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form Step 1: Details
  const [orgName, setOrgName] = useState(user?.org_profile?.organization_name || user?.display_name || '');
  const [orgType, setOrgType] = useState(user?.org_profile?.organization_type || 'Private Limited');
  const [website, setWebsite] = useState(user?.org_profile?.website || '');
  const [officialEmail, setOfficialEmail] = useState(user?.org_profile?.official_email || user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.org_profile?.phone_number || '');
  const [address, setAddress] = useState(user?.org_profile?.address || '');
  const [country, setCountry] = useState(user?.org_profile?.country || 'India');
  const [state, setState] = useState(user?.org_profile?.state || 'Karnataka');
  const [city, setCity] = useState(user?.org_profile?.city || 'Bengaluru');
  const [repName, setRepName] = useState(user?.org_profile?.rep_name || '');
  const [regNumber, setRegNumber] = useState(user?.org_profile?.reg_number || '');

  // Form Step 2: Upload Files
  const [regCertFile, setRegCertFile] = useState(user?.org_profile?.reg_certificate || '');
  const [panCardFile, setPanCardFile] = useState(user?.org_profile?.pan_card || '');
  const [gstin, setGstin] = useState(user?.org_profile?.gstin || '');
  const [govtIdFile, setGovtIdFile] = useState(user?.org_profile?.govt_id || '');
  const [selfieIdFile, setSelfieIdFile] = useState(user?.org_profile?.selfie_id || '');

  // Temporary selected files for file input controls
  const [tempRegFile, setTempRegFile] = useState(null);
  const [tempGovtFile, setTempGovtFile] = useState(null);
  const [tempPanFile, setTempPanFile] = useState(null);

  // Verification Status & Admin Notes
  const [verificationStatus, setVerificationStatus] = useState(user?.org_status || 'PENDING');
  const [submittedAt, setSubmittedAt] = useState(user?.org_profile?.submitted_at || null);
  const [rejectionReason, setRejectionReason] = useState(user?.org_profile?.rejection_reason || null);

  const getAuthToken = () => {
    return token || localStorage.getItem('token') || '';
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    const authToken = getAuthToken();
    try {
      const res = await fetch('/api/organization/profile', {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok && data.status) {
        setVerificationStatus(data.status);
        if (data.profile) {
          if (data.profile.submitted_at) setSubmittedAt(data.profile.submitted_at);
          if (data.profile.organization_name) setOrgName(data.profile.organization_name);
          if (data.profile.organization_type) setOrgType(data.profile.organization_type);
          if (data.profile.official_email) setOfficialEmail(data.profile.official_email);
          if (data.profile.phone_number) setPhoneNumber(data.profile.phone_number);
          if (data.profile.website) setWebsite(data.profile.website);
          if (data.profile.address) setAddress(data.profile.address);
          if (data.profile.country) setCountry(data.profile.country);
          if (data.profile.state) setState(data.profile.state);
          if (data.profile.city) setCity(data.profile.city);
          if (data.profile.rep_name) setRepName(data.profile.rep_name);
          if (data.profile.reg_number) setRegNumber(data.profile.reg_number);
          if (data.profile.reg_certificate) setRegCertFile(data.profile.reg_certificate);
          if (data.profile.govt_id) setGovtIdFile(data.profile.govt_id);
          if (data.profile.pan_card) setPanCardFile(data.profile.pan_card);
          if (data.profile.rejection_reason) setRejectionReason(data.profile.rejection_reason);

          if (data.status === 'UNDER_REVIEW' || data.status === 'VERIFIED') {
            setStep(3);
          } else if (data.status === 'REJECTED' || data.status === 'RESUBMISSION_REQUIRED') {
            setStep(1);
          }
        }
        if (onStatusUpdate) onStatusUpdate(data.status, data.profile);
      }
    } catch (err) {
      console.error('Error fetching org verification status:', err);
    }
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!orgName.trim() || !officialEmail.trim() || !phoneNumber.trim()) {
      setError('Please fill in all required organization contact details.');
      return;
    }

    setLoading(true);
    setError(null);
    const authToken = getAuthToken();

    try {
      const res = await fetch('/api/organization/register-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          organization_name: orgName,
          organization_type: orgType,
          website,
          official_email: officialEmail,
          phone_number: phoneNumber,
          address,
          country,
          state,
          city,
          rep_name: repName,
          reg_number: regNumber
        })
      });

      const data = await res.json();
      if (res.ok) {
        setVerificationStatus('PENDING');
        setStep(2);
      } else {
        setError(data.error || 'Failed to save organization details.');
      }
    } catch (err) {
      setError('Network error saving details.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const authToken = getAuthToken();

    const finalRegCert = regCertFile || (tempRegFile ? tempRegFile.name : 'Organization Proof.pdf');
    const finalGovtId = govtIdFile || (tempGovtFile ? tempGovtFile.name : 'Government ID.pdf');
    const finalPanCard = panCardFile || (tempPanFile ? tempPanFile.name : 'Additional Document.pdf');

    try {
      const res = await fetch('/api/organization/upload-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          reg_certificate: finalRegCert,
          pan_card: finalPanCard,
          gstin,
          govt_id: finalGovtId,
          selfie_id: selfieIdFile || 'rep_photo.jpg'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setVerificationStatus('UNDER_REVIEW');
        setSubmittedAt(new Date().toISOString());
        setStep(3);
        if (onStatusUpdate) onStatusUpdate('UNDER_REVIEW', data.profile);
      } else {
        setError(data.error || 'Failed to upload verification documents.');
      }
    } catch (err) {
      setError('Network error submitting documents.');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => (
    <div style={{ maxWidth: '820px', width: '100%', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#818cf8', fontWeight: '700', fontSize: '0.95rem' }}>
          <ShieldCheck size={20} />
          <span>Organization Account Verification</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ 
            fontSize: '0.82rem', 
            background: verificationStatus === 'VERIFIED' ? 'rgba(16, 185, 129, 0.2)' : verificationStatus === 'UNDER_REVIEW' ? 'rgba(59, 130, 246, 0.2)' : verificationStatus === 'REJECTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)', 
            color: verificationStatus === 'VERIFIED' ? '#10b981' : verificationStatus === 'UNDER_REVIEW' ? '#3b82f6' : verificationStatus === 'REJECTED' ? '#ef4444' : '#f59e0b', 
            padding: '4px 12px', 
            borderRadius: '16px', 
            fontWeight: '700' 
          }}>
            STATUS: {verificationStatus.replace('_', ' ')}
          </span>
          <button 
            type="button" 
            onClick={fetchStatus} 
            className="btn btn-secondary" 
            style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Refresh Status"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Admin Message Alert (Rejection / Resubmission Required) */}
      {(verificationStatus === 'REJECTED' || verificationStatus === 'RESUBMISSION_REQUIRED') && rejectionReason && (
        <div style={{ padding: '16px 20px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '6px' }}>
            <AlertTriangle size={18} />
            <span>Admin Review Feedback ({verificationStatus.replace('_', ' ')})</span>
          </div>
          <p style={{ margin: 0, lineHeight: '1.5' }}>{rejectionReason}</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: '#fca5a5' }}>
            Please update your organization details or replace your verification documents below and resubmit.
          </p>
        </div>
      )}

      {/* Title section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
            <Building2 size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              Organization Verification
            </h2>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Complete account verification to unlock assessment creation and candidate management on CodeArena.
            </span>
          </div>
        </div>

        {/* Stepper Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'var(--bg-input)', padding: '14px 20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div 
            onClick={() => { if (verificationStatus !== 'UNDER_REVIEW' && verificationStatus !== 'VERIFIED') setStep(1); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: step >= 1 ? '#6366f1' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.88rem', cursor: verificationStatus !== 'UNDER_REVIEW' ? 'pointer' : 'default' }}
          >
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= 1 ? '#6366f1' : 'var(--border-light)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem' }}>1</span>
            <span>1. Organization Details</span>
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
          <div 
            onClick={() => { if (verificationStatus !== 'UNDER_REVIEW' && verificationStatus !== 'VERIFIED') setStep(2); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: step >= 2 ? '#6366f1' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.88rem', cursor: verificationStatus !== 'UNDER_REVIEW' ? 'pointer' : 'default' }}
          >
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= 2 ? '#6366f1' : 'var(--border-light)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem' }}>2</span>
            <span>2. Verification Documents</span>
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
          <div 
            onClick={() => setStep(3)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: step >= 3 ? '#6366f1' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer' }}
          >
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= 3 ? '#6366f1' : 'var(--border-light)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem' }}>3</span>
            <span>3. Review & Status</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '10px', fontSize: '0.88rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: ORGANIZATION REGISTRATION FORM */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="glass-panel" style={{ padding: '28px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '1px solid var(--border-light)', pb: '10px', mb: '4px', color: 'var(--text-main)' }}>
            Step 1: Enter Organization Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Organization Name *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. CodeArena Test Organization" 
                value={orgName} 
                onChange={(e) => setOrgName(e.target.value)} 
                disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'}
                required 
              />
            </div>
            <div>
              <label className="form-label">Official Email *</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="e.g. orgtest@codearena.local" 
                value={officialEmail} 
                onChange={(e) => setOfficialEmail(e.target.value)} 
                disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'}
                required 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Website</label>
              <input 
                type="url" 
                className="form-input" 
                placeholder="https://www.codearena.local" 
                value={website} 
                onChange={(e) => setWebsite(e.target.value)} 
                disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'}
              />
            </div>
            <div>
              <label className="form-label">Phone *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="+1 (555) 019-2834" 
                value={phoneNumber} 
                onChange={(e) => setPhoneNumber(e.target.value)} 
                disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'}
                required 
              />
            </div>
          </div>

          <div>
            <label className="form-label">Address *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="100 Enterprise Way, Suite 400" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'}
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Authorized Representative Name *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Jane Doe (Head of Recruiting)" 
                value={repName} 
                onChange={(e) => setRepName(e.target.value)} 
                disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'}
                required 
              />
            </div>
            <div>
              <label className="form-label">Registration Number (if applicable)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. REG-98765432" 
                value={regNumber} 
                onChange={(e) => setRegNumber(e.target.value)} 
                disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label">Country *</label>
              <input type="text" className="form-input" value={country} onChange={(e) => setCountry(e.target.value)} disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'} required />
            </div>
            <div>
              <label className="form-label">State *</label>
              <input type="text" className="form-input" value={state} onChange={(e) => setState(e.target.value)} disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'} required />
            </div>
            <div>
              <label className="form-label">City *</label>
              <input type="text" className="form-input" value={city} onChange={(e) => setCity(e.target.value)} disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'} required />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '12px 28px', fontWeight: '700' }}>
              {loading ? 'Saving...' : 'Next: Upload Documents →'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: VERIFICATION DOCUMENTS UPLOAD */}
      {step === 2 && (
        <form onSubmit={handleStep2Submit} className="glass-panel" style={{ padding: '28px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
              Step 2: Verification Documents
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Please attach required registration proof and identity documents for compliance verification.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Document 1: Registration Proof */}
            <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '10px' }}>
                • Organization Registration / Incorporation Certificate (PDF Only) *
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="file" 
                  id="regProofInput" 
                  accept=".pdf,application/pdf"
                  style={{ display: 'none' }} 
                  disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (!file.name.toLowerCase().endsWith('.pdf')) {
                        alert('Only PDF files (.pdf) are allowed.');
                        e.target.value = '';
                        return;
                      }
                      setTempRegFile(file);
                      setRegCertFile(file.name);
                    }
                  }} 
                />
                <label htmlFor="regProofInput" className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: '0.85rem', padding: '8px 16px' }}>
                  Choose File
                </label>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', flexGrow: 1 }}>
                  {regCertFile || (tempRegFile ? tempRegFile.name : 'No PDF selected')}
                </span>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                  onClick={() => {
                    if (!regCertFile) setRegCertFile('Organization Certificate.pdf');
                  }}
                  disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'}
                >
                  <Upload size={14} style={{ marginRight: '6px' }} /> Attach
                </button>
              </div>
            </div>

            {/* Document 2: Government ID */}
            <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '10px' }}>
                • Representative Government Identification Proof (PDF Only) *
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="file" 
                  id="govtIdInput" 
                  accept=".pdf,application/pdf"
                  style={{ display: 'none' }} 
                  disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (!file.name.toLowerCase().endsWith('.pdf')) {
                        alert('Only PDF files (.pdf) are allowed.');
                        e.target.value = '';
                        return;
                      }
                      setTempGovtFile(file);
                      setGovtIdFile(file.name);
                    }
                  }} 
                />
                <label htmlFor="govtIdInput" className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: '0.85rem', padding: '8px 16px' }}>
                  Choose File
                </label>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', flexGrow: 1 }}>
                  {govtIdFile || (tempGovtFile ? tempGovtFile.name : 'No PDF selected')}
                </span>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                  onClick={() => {
                    if (!govtIdFile) setGovtIdFile('Government ID.pdf');
                  }}
                  disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'}
                >
                  <Upload size={14} style={{ marginRight: '6px' }} /> Attach
                </button>
              </div>
            </div>

            {/* Document 3: Supporting Doc */}
            <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '10px' }}>
                • Additional Compliance Document (PDF Only, optional)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="file" 
                  id="panInput" 
                  accept=".pdf,application/pdf"
                  style={{ display: 'none' }} 
                  disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (!file.name.toLowerCase().endsWith('.pdf')) {
                        alert('Only PDF files (.pdf) are allowed.');
                        e.target.value = '';
                        return;
                      }
                      setTempPanFile(file);
                      setPanCardFile(file.name);
                    }
                  }} 
                />
                <label htmlFor="panInput" className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: '0.85rem', padding: '8px 16px' }}>
                  Choose File
                </label>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', flexGrow: 1 }}>
                  {panCardFile || (tempPanFile ? tempPanFile.name : 'No PDF selected')}
                </span>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                  onClick={() => {
                    if (!panCardFile) setPanCardFile('Supporting Document.pdf');
                  }}
                  disabled={verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'}
                >
                  <Upload size={14} style={{ marginRight: '6px' }} /> Attach
                </button>
              </div>
            </div>
          </div>

          {/* Uploaded Documents List */}
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#10b981', marginBottom: '10px' }}>
              Attached Verification References
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ color: regCertFile ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✓</span>
                <span>{regCertFile || 'Organization Certificate.pdf'}</span>
              </div>
              <div style={{ color: govtIdFile ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✓</span>
                <span>{govtIdFile || 'Government ID.pdf'}</span>
              </div>
              {panCardFile && (
                <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✓</span>
                  <span>{panCardFile}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
              ← Back to Details
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'VERIFIED'} 
              style={{ padding: '12px 32px', fontWeight: '700' }}
            >
              {loading ? 'Submitting Verification...' : 'Submit Verification Request'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: VERIFICATION STATUS TRACKER */}
      {step === 3 && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '36px 24px', borderRadius: '16px' }}>
          {verificationStatus === 'VERIFIED' ? (
            <div>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <ShieldCheck size={40} />
              </div>
              <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                Organization Account Verified!
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 28px auto', lineHeight: '1.6' }}>
                Congratulations! Your organization verification request has been approved by CodeArena compliance administrators. Your host privileges are active.
              </p>
              <button 
                className="btn btn-primary" 
                style={{ padding: '14px 36px', fontSize: '1.05rem', fontWeight: '700' }} 
                onClick={() => onVerificationComplete && onVerificationComplete()}
              >
                Go to Organization Dashboard →
              </button>
            </div>
          ) : (
            <div>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <Clock size={40} />
              </div>
              <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                Verification Application Under Review
              </h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 28px auto', lineHeight: '1.6' }}>
                Your organization details and uploaded documents have been received. Our compliance admin team will evaluate your credentials shortly.
              </p>

              {/* Timeline Tracker */}
              <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-light)', maxWidth: '480px', margin: '0 auto 28px auto', textAlign: 'left' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '15px', top: '16px', bottom: '16px', width: '2px', background: 'var(--border-light)', zIndex: 0 }}></div>

                  {/* Step 1 */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)' }}>Submitted</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {submittedAt ? new Date(submittedAt).toLocaleDateString() : 'Recorded in database'}
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#3b82f6' }}>Under Compliance Review</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Document evaluation in progress by CodeArena Admin team.
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border-light)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileCheck size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-muted)' }}>Approved / Host Access Unlocked</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        You will be notified via email once approved.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={fetchStatus}>
                  <RefreshCw size={14} style={{ marginRight: '6px' }} /> Re-check Status
                </button>
                {onClose && (
                  <button className="btn btn-primary" onClick={onClose}>
                    Close View
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)' }}>
        <div className="modal-content glass-panel" style={{ maxWidth: '840px', width: '100%', borderRadius: '20px', padding: '32px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
          {onClose && (
            <button className="modal-close-btn" onClick={onClose} style={{ top: '20px', right: '20px' }}>
              <X size={20} />
            </button>
          )}
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {renderContent()}
    </div>
  );
}
