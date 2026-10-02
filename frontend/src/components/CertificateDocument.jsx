import React from 'react';
import CertificateBadge from './CertificateBadge';

const themeStyles = {
  bronze: {
    primary: '#2563eb',
    secondary: '#1d4ed8',
    light: '#3b82f6',
    bgTint: 'rgba(37, 99, 235, 0.03)',
    border: '#2563eb',
    accent: '#1d4ed8'
  },
  blue: {
    primary: '#2563eb',
    secondary: '#1d4ed8',
    light: '#3b82f6',
    bgTint: 'rgba(37, 99, 235, 0.03)',
    border: '#2563eb',
    accent: '#1d4ed8'
  },
  emerald: {
    primary: '#059669',
    secondary: '#047857',
    light: '#10b981',
    bgTint: 'rgba(5, 150, 105, 0.03)',
    border: '#059669',
    accent: '#047857'
  },
  purple: {
    primary: '#7c3aed',
    secondary: '#6d28d9',
    light: '#8b5cf6',
    bgTint: 'rgba(124, 58, 237, 0.03)',
    border: '#7c3aed',
    accent: '#6d28d9'
  },
  orange: {
    primary: '#ea580c',
    secondary: '#c2410c',
    light: '#f97316',
    bgTint: 'rgba(234, 88, 12, 0.03)',
    border: '#ea580c',
    accent: '#c2410c'
  },
  teal: {
    primary: '#0d9488',
    secondary: '#0f766e',
    light: '#14b8a6',
    bgTint: 'rgba(13, 148, 136, 0.03)',
    border: '#0d9488',
    accent: '#0f766e'
  },
  indigo: {
    primary: '#4338ca',
    secondary: '#3730a3',
    light: '#6366f1',
    bgTint: 'rgba(67, 56, 202, 0.03)',
    border: '#4338ca',
    accent: '#3730a3'
  }
};

function formatRecipientName(certificate, user) {
  if (user?.display_name && user.display_name.trim() !== '' && user.display_name.toLowerCase() !== 'admin') return user.display_name;
  if (certificate?.display_name && certificate.display_name.trim() !== '' && certificate.display_name.toLowerCase() !== 'admin') return certificate.display_name;
  if (certificate?.user_name && certificate.user_name.trim() !== '' && certificate.user_name.toLowerCase() !== 'admin') return certificate.user_name;
  if (certificate?.userName && certificate.userName.trim() !== '' && certificate.userName.toLowerCase() !== 'admin') return certificate.userName;
  if (user?.username && user.username.trim() !== '' && user.username.toLowerCase() !== 'admin') return user.username;
  if (certificate?.username && certificate.username.trim() !== '' && certificate.username.toLowerCase() !== 'admin') return certificate.username;
  return 'Your Name';
}

export default function CertificateDocument({ certificate, user, className = '', scale = 1 }) {
  if (!certificate) return null;

  const milestone = Number(certificate.milestone || 5);
  const recipientName = formatRecipientName(certificate, user);
  const motivation = certificate.motivation_message || certificate.motivationMessage || 'Small steps build great developers.';
  const themeName = certificate.theme || 'blue';
  const theme = themeStyles[themeName] || themeStyles.blue;

  const rawDate = certificate.created_at || certificate.createdAt || certificate.issue_date || certificate.issueDate || new Date();
  const formattedDate = new Date(rawDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div 
      className={`cert-doc-wrapper ${className}`}
      style={{
        transform: scale !== 1 ? `scale(${scale})` : 'none',
        transformOrigin: 'top center'
      }}
    >
      <div className="cert-doc-paper">
        {/* Outer Frame Border */}
        <div className="cert-doc-border-outer" style={{ borderColor: theme.primary }} />

        {/* 4 Corner Geometric Triangles */}
        <svg className="cert-doc-corner-svg top-left" viewBox="0 0 50 50">
          <polygon points="0,0 50,0 0,50" fill={theme.primary} />
          <line x1="6" y1="38" x2="38" y2="6" stroke="#ffffff" strokeWidth="2.5" />
        </svg>
        <svg className="cert-doc-corner-svg top-right" viewBox="0 0 50 50">
          <polygon points="50,0 50,50 0,0" fill={theme.primary} />
          <line x1="12" y1="6" x2="44" y2="38" stroke="#ffffff" strokeWidth="2.5" />
        </svg>
        <svg className="cert-doc-corner-svg bottom-left" viewBox="0 0 50 50">
          <polygon points="0,50 50,50 0,0" fill={theme.primary} />
          <line x1="6" y1="12" x2="38" y2="44" stroke="#ffffff" strokeWidth="2.5" />
        </svg>
        <svg className="cert-doc-corner-svg bottom-right" viewBox="0 0 50 50">
          <polygon points="50,50 0,50 50,0" fill={theme.primary} />
          <line x1="12" y1="44" x2="44" y2="12" stroke="#ffffff" strokeWidth="2.5" />
        </svg>

        {/* Background Subtle Watermark Grid */}
        <svg className="cert-doc-watermark" viewBox="0 0 900 600">
          <defs>
            <pattern id={`cert-grid-${milestone}`} width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke={theme.primary} strokeWidth="0.5" opacity="0.12" />
              <polygon points="0,0 60,60 60,0" fill={theme.primary} opacity="0.015" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#cert-grid-${milestone})`} />
        </svg>

        {/* TOP ROW: LOGO & RIBBON BADGE */}
        <div className="cert-doc-top-row">
          <div className="cert-doc-brand">
            <div className="cert-doc-logo">
              <div className="cert-doc-logo-icon" style={{ backgroundColor: theme.primary }}>
                &lt;/&gt;
              </div>
              <span className="cert-doc-logo-text">CodeArena</span>
            </div>
            <div className="cert-doc-subtitle" style={{ color: theme.primary }}>
              ACHIEVEMENT CERTIFICATE
            </div>
          </div>

          <div className="cert-doc-badge-container">
            <CertificateBadge milestone={milestone} size={110} />
          </div>
        </div>

        {/* MILESTONE HEADER: "5 | Problems Solved" */}
        <div className="cert-doc-milestone-header">
          <div className="cert-doc-milestone-num-wrap">
            <span className="cert-doc-milestone-num" style={{ color: theme.primary }}>{milestone}</span>
            <div className="cert-doc-milestone-bar" style={{ backgroundColor: theme.primary }} />
          </div>
          <div className="cert-doc-milestone-title">
            Problems Solved
          </div>
        </div>

        {/* RECIPIENT STATEMENT & NAME */}
        <div className="cert-doc-content-body">
          <p className="cert-doc-awarded-text">
            This certificate is awarded to
          </p>

          <h1 className="cert-doc-recipient-name">
            {recipientName}
          </h1>

          <p className="cert-doc-statement">
            for successfully solving <strong>{milestone} accepted problems</strong> on CodeArena.
          </p>

          <div className="cert-doc-date-badge">
            <span>Date Achieved: </span>
            <strong>{formattedDate}</strong>
          </div>
        </div>

        {/* FOOTER ROW: MOTIVATIONAL QUOTE & SIGNATURE */}
        <div className="cert-doc-footer-row">
          <div className="cert-doc-quote-box" style={{ color: theme.primary }}>
            {motivation}
          </div>

          <div className="cert-doc-signature-block">
            <svg className="cert-doc-sig-svg" viewBox="0 0 140 40">
              <path 
                d="M 10 30 Q 35 5, 55 25 T 95 15 T 130 25" 
                fill="none" 
                stroke="#0f172a" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
              <path 
                d="M 25 28 C 45 10, 65 35, 85 20" 
                fill="none" 
                stroke="#0f172a" 
                strokeWidth="1.8" 
              />
            </svg>
            <div className="cert-doc-sig-line" style={{ backgroundColor: theme.primary }} />
            <div className="cert-doc-sig-name">CodeArena Team</div>
          </div>
        </div>

      </div>
    </div>
  );
}
