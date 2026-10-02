import React from 'react';
import CertificateBadge from './CertificateBadge';

const milestoneThemes = {
  5:   { name: 'bronze',  primary: '#2563eb', secondary: '#1d4ed8', accent: '#3b82f6', bgTint: '#f0f6ff' },
  30:  { name: 'blue',    primary: '#2563eb', secondary: '#1d4ed8', accent: '#3b82f6', bgTint: '#f0f6ff' },
  50:  { name: 'emerald', primary: '#059669', secondary: '#047857', accent: '#10b981', bgTint: '#ecfdf5' },
  100: { name: 'purple',  primary: '#7c3aed', secondary: '#6d28d9', accent: '#8b5cf6', bgTint: '#f5f3ff' },
  120: { name: 'orange',  primary: '#ea580c', secondary: '#c2410c', accent: '#f97316', bgTint: '#fff7ed' },
  150: { name: 'teal',    primary: '#0d9488', secondary: '#0f766e', accent: '#14b8a6', bgTint: '#f0fdfa' },
  200: { name: 'indigo',  primary: '#4338ca', secondary: '#3730a3', accent: '#6366f1', bgTint: '#eef2ff' }
};

function formatRecipientName(rawName) {
  if (!rawName || rawName.trim() === '' || rawName.toLowerCase() === 'admin' || rawName.toLowerCase() === 'developer') {
    return 'Your Name';
  }
  return rawName;
}

export default function CertificateMiniPreview({ milestone = 5, userName = 'Your Name', isUnlocked = false, neededCount = 0 }) {
  const theme = milestoneThemes[milestone] || milestoneThemes[5];
  const displayName = formatRecipientName(userName);

  return (
    <div className="cert-mini">
      <div className={`cert-mini-paper ${isUnlocked ? 'unlocked' : 'locked'}`}>
        {isUnlocked ? (
          <>
            {/* Outer Decorative Border */}
            <div
              className="cert-mini-border-outer"
              style={{ borderColor: theme.primary }}
            />

            {/* Corner Geometry Marks */}
            <div className="cert-mini-corner top-left" style={{ borderColor: theme.primary }} />
            <div className="cert-mini-corner top-right" style={{ borderColor: theme.primary }} />
            <div className="cert-mini-corner bottom-left" style={{ borderColor: theme.primary }} />
            <div className="cert-mini-corner bottom-right" style={{ borderColor: theme.primary }} />

            {/* Top Bar: CodeArena Logo & Badge */}
            <div className="cert-mini-header">
              <div className="cert-mini-logo font-display">
                <div
                  className="cert-mini-logo-icon font-mono"
                  style={{ backgroundColor: theme.primary }}
                >
                  &lt;/&gt;
                </div>
                <div>
                  <span className="cert-mini-logo-text font-display">
                    CodeArena
                  </span>
                  <div className="cert-mini-subtitle font-sans" style={{ color: theme.primary }}>
                    ACHIEVEMENT CERTIFICATE
                  </div>
                </div>
              </div>

              <div className="cert-mini-badge-wrap">
                <CertificateBadge milestone={milestone} size={38} isUnlocked={true} />
              </div>
            </div>

            {/* Middle Content */}
            <div className="cert-mini-center">
              <div className="cert-mini-milestone-row">
                <span className="cert-mini-milestone-num" style={{ color: theme.primary }}>{milestone}</span>
                <span className="cert-mini-milestone-divider">|</span>
                <span className="cert-mini-milestone-title">Problems Solved</span>
              </div>
              <div className="cert-mini-recipient font-sans">
                Awarded to <span className="cert-mini-recipient-name">{displayName}</span>
              </div>
            </div>

            {/* Bottom Row: Signature & Team */}
            <div className="cert-mini-footer">
              <div className="cert-mini-quote">
                Small steps build great developers.
              </div>

              <div className="cert-mini-sig font-sans">
                <div className="cert-mini-sig-line" style={{ backgroundColor: theme.primary }} />
                <div className="cert-mini-sig-name">CodeArena Team</div>
              </div>
            </div>
          </>
        ) : (
          /* ── Locked State: clean silhouette + single centred lock icon ── */
          <div className="cert-mini-locked-overlay">
            {/* Faint blurred certificate silhouette in background */}
            <div className="cert-mini-locked-silhouette" style={{ borderColor: 'rgba(108,77,255,0.18)' }}>
              <div className="cert-mini-locked-sil-header">
                <div className="cert-mini-locked-sil-logo" />
                <div className="cert-mini-locked-sil-badge" />
              </div>
              <div className="cert-mini-locked-sil-body">
                <div className="cert-mini-locked-sil-num">{milestone}</div>
                <div className="cert-mini-locked-sil-label">Problems Solved</div>
              </div>
              <div className="cert-mini-locked-sil-footer" />
            </div>

            {/* Single centred lock icon — NO extra text here */}
            <div className="cert-mini-lock-center">
              <div className="cert-mini-lock-icon">
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
