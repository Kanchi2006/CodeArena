import React, { useState, useEffect } from 'react';
import CertificateBadge from './CertificateBadge';

const THEME_OPTIONS = [
  { value: 'bronze', label: 'Bronze (Bronze Shield)' },
  { value: 'blue', label: 'Blue (Ocean Shield)' },
  { value: 'emerald', label: 'Emerald Green (Emerald Shield)' },
  { value: 'purple', label: 'Purple (Master Century Shield)' },
  { value: 'orange', label: 'Orange (Expert Shield)' },
  { value: 'teal', label: 'Teal (Elite Shield)' },
  { value: 'indigo', label: 'Royal Indigo (Pinnacle Shield)' }
];

export default function AdminCertificateModal({ milestoneConfig, onClose, onSave }) {
  const isEditing = Boolean(milestoneConfig);

  const [milestone, setMilestone] = useState(milestoneConfig?.milestone || '');
  const [title, setTitle] = useState(milestoneConfig?.title || '');
  const [theme, setTheme] = useState(milestoneConfig?.theme || 'blue');
  const [motivationMessage, setMotivationMessage] = useState(
    milestoneConfig?.motivation_message || 'Every expert was once a beginner.'
  );
  const [descriptionTemplate, setDescriptionTemplate] = useState(
    milestoneConfig?.description_template ||
      'This certificate is presented to {userName} in appreciation of successfully solving {milestone} accepted coding problems on CodeArena.'
  );
  const [isEnabled, setIsEnabled] = useState(
    milestoneConfig?.is_enabled !== undefined ? Boolean(milestoneConfig.is_enabled) : true
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEditing && milestone) {
      if (!title || title.endsWith('Problems Solved')) {
        setTitle(`${milestone} Problems Solved`);
      }
    }
  }, [milestone, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const milestoneNum = Number(milestone);
    if (!milestoneNum || milestoneNum <= 0) {
      setError('Please enter a valid positive milestone number.');
      return;
    }
    if (!title.trim()) {
      setError('Certificate title is required.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      milestone: milestoneNum,
      title: title.trim(),
      theme,
      motivation_message: motivationMessage.trim(),
      description_template: descriptionTemplate.trim(),
      is_enabled: isEnabled ? 1 : 0
    };

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/certificates/milestones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok) {
        onSave(result.message || 'Milestone saved successfully.');
      } else {
        setError(result.error || 'Failed to save milestone configuration.');
      }
    } catch (err) {
      setError('Network error saving milestone config.');
    } finally {
      setLoading(false);
    }
  };

  const previewDescription = descriptionTemplate.replace(/\{userName\}/g, 'Alex Turner');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        padding: '24px sm:32px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {isEditing ? `Edit Milestone #${milestoneConfig.milestone}` : 'Configure New Achievement Milestone'}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', margin: 0 }}>
              Set problem threshold, styling theme, motivational copy, and template copy.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', border: 'none', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            &times;
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', fontSize: '0.8rem', fontWeight: 600, marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Required Accepted Problems *
              </label>
              <input
                type="number"
                min="1"
                disabled={isEditing}
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                placeholder="e.g. 30"
                style={{ width: '100%', boxSizing: 'border-box', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: '#0f172a', outline: 'none' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Visual Theme *</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: '#0f172a', outline: 'none' }}
              >
                {THEME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Certificate Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 30 Problems Solved Certificate"
              style={{ width: '100%', boxSizing: 'border-box', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: '#0f172a', outline: 'none' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Motivational Quote / Tagline
            </label>
            <input
              type="text"
              value={motivationMessage}
              onChange={(e) => setMotivationMessage(e.target.value)}
              placeholder="e.g. Every expert was once a beginner."
              style={{ width: '100%', boxSizing: 'border-box', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: '#0f172a', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Description Copy Template (Use <span style={{ fontFamily: 'monospace', color: '#4f46e5' }}>{"{userName}"}</span>)
            </label>
            <textarea
              rows={3}
              value={descriptionTemplate}
              onChange={(e) => setDescriptionTemplate(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: '#0f172a', outline: 'none', resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
            <input
              type="checkbox"
              id="is_enabled_check"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#4f46e5', cursor: 'pointer' }}
            />
            <label htmlFor="is_enabled_check" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer', userSelect: 'none' }}>
              Enable this milestone certificate on the platform
            </label>
          </div>

          {/* Live Preview Box */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', tracking: '0.05em', color: '#64748b' }}>
              Live Copy & Badge Preview
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <CertificateBadge milestone={Number(milestone) || 30} size={64} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{title || 'Certificate Title'}</div>
                <div style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600 }}>{motivationMessage}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>"{previewDescription}"</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '8px 20px', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)' }}
            >
              {loading ? 'Saving...' : 'Save Milestone Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

