import React from 'react';

function formatRecipientName(certificate, user) {
  if (user?.display_name && user.display_name.trim() !== '' && user.display_name.toLowerCase() !== 'admin') return user.display_name;
  if (certificate?.user_name && certificate.user_name.trim() !== '' && certificate.user_name.toLowerCase() !== 'admin') return certificate.user_name;
  if (certificate?.display_name && certificate.display_name.trim() !== '' && certificate.display_name.toLowerCase() !== 'admin') return certificate.display_name;
  if (certificate?.userName && certificate.userName.trim() !== '' && certificate.userName.toLowerCase() !== 'admin') return certificate.userName;
  if (user?.username && user.username.trim() !== '' && user.username.toLowerCase() !== 'admin') return user.username;
  if (certificate?.username && certificate.username.trim() !== '' && certificate.username.toLowerCase() !== 'admin') return certificate.username;
  return 'Learner';
}

export default function CourseCertificateDocument({ certificate, user, className = '', scale = 1 }) {
  if (!certificate) return null;

  const recipientName = formatRecipientName(certificate, user);
  const courseName = certificate.course_name || certificate.courseName || certificate.course_title || certificate.title || 'CodeArena Course';
  const verificationCode = certificate.verification_code || certificate.verificationCode || 'CA-COURSE-000000';
  
  const rawDate = certificate.completion_date || certificate.completionDate || certificate.created_at || certificate.createdAt || new Date();
  const formattedDate = typeof rawDate === 'string' && rawDate.includes(' ') && !rawDate.includes('T') 
    ? rawDate 
    : new Date(rawDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

  const rawTime = certificate.completion_time || certificate.completionTime;
  const formattedTime = rawTime || new Date(rawDate).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const verificationUrl = `${window.location.origin}/verify/certificate/${verificationCode}`;
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}`;

  return (
    <div 
      className={`course-cert-doc-wrapper ${className}`}
      style={{
        transform: scale !== 1 ? `scale(${scale})` : 'none',
        transformOrigin: 'top center'
      }}
    >
      <style>{`
        .course-cert-doc-wrapper {
          width: 100%;
          max-width: 920px;
          margin: 0 auto;
          box-sizing: border-box;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Strictly LANDSCAPE aspect ratio certificate card */
        .course-cert-card {
          position: relative;
          width: 100%;
          height: 560px;
          aspect-ratio: 920 / 560;
          background: #ffffff;
          border-radius: 16px;
          border: 1.5px solid #cbd5e1;
          box-shadow: 0 20px 40px -15px rgba(99, 102, 241, 0.15);
          padding: 24px 40px 20px 40px;
          box-sizing: border-box;
          overflow: hidden;
          color: #1e1b4b;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* Diagonal geometric corner accents matching Image 1 */
        .course-cert-corner {
          position: absolute;
          width: 110px;
          height: 110px;
          pointer-events: none;
        }

        .course-cert-corner.top-left {
          top: 0;
          left: 0;
        }

        .course-cert-corner.bottom-right {
          bottom: 0;
          right: 0;
        }

        /* Inner frame border accent line */
        .course-cert-inner-frame {
          position: absolute;
          inset: 10px;
          border: 1px solid rgba(147, 51, 234, 0.18);
          border-radius: 10px;
          pointer-events: none;
        }

        /* Top Brand Logo */
        .course-cert-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .course-cert-logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .course-cert-logo-icon {
          font-family: monospace;
          font-weight: 900;
          font-size: 1.2rem;
          color: #7c3aed;
          letter-spacing: -1px;
        }

        .course-cert-logo-text {
          font-size: 1.5rem;
          font-weight: 800;
          color: #2e1065;
          letter-spacing: -0.5px;
        }

        .course-cert-tagline {
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-top: 2px;
        }

        /* Center Badge with Laurel Wreath */
        .course-cert-badge-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 4px 0;
        }

        .course-cert-wreath-svg {
          width: 180px;
          height: 65px;
        }

        /* Titles */
        .course-cert-title-section {
          text-align: center;
          margin-bottom: 4px;
        }

        .course-cert-main-title {
          font-size: 1.95rem;
          font-weight: 800;
          color: #1e1b4b;
          margin: 0 0 2px 0;
          letter-spacing: -0.5px;
        }

        .course-cert-presented-text {
          font-size: 0.85rem;
          font-weight: 500;
          color: #64748b;
          margin: 0;
        }

        /* Name Block */
        .course-cert-name-block {
          text-align: center;
          margin: 0 auto;
          max-width: 620px;
        }

        .course-cert-user-name {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1e1b4b;
          margin: 0;
          padding-bottom: 4px;
          display: inline-block;
          min-width: 320px;
          border-bottom: 2px solid #a855f7;
        }

        .course-cert-completing-text {
          font-size: 0.82rem;
          font-weight: 500;
          color: #64748b;
          margin: 6px 0 2px 0;
        }

        /* Course Name Block */
        .course-cert-course-block {
          text-align: center;
          margin: 0 auto;
          max-width: 620px;
        }

        .course-cert-course-name {
          font-size: 1.3rem;
          font-weight: 700;
          color: #2e1065;
          margin: 0;
          padding-bottom: 4px;
          display: inline-block;
          min-width: 360px;
          border-bottom: 2px solid #a855f7;
        }

        /* Completion Details Grid (Date & Time) */
        .course-cert-details-grid {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 32px;
          margin: 8px 0;
        }

        .course-cert-detail-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .course-cert-detail-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f3e8ff;
          color: #7c3aed;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .course-cert-detail-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 1px;
        }

        .course-cert-detail-value {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1e1b4b;
        }

        .course-cert-detail-divider {
          width: 1px;
          height: 28px;
          background: #cbd5e1;
        }

        /* Footer Row */
        .course-cert-footer {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding-top: 4px;
        }

        .course-cert-issuer-block {
          width: 180px;
        }

        .course-cert-signature-svg {
          width: 110px;
          height: 32px;
          margin-bottom: 2px;
        }

        .course-cert-sig-line {
          width: 140px;
          height: 1.5px;
          background: #94a3b8;
          margin-bottom: 4px;
        }

        .course-cert-sig-title {
          font-size: 0.82rem;
          font-weight: 800;
          color: #1e1b4b;
        }

        .course-cert-sig-sub {
          font-size: 0.7rem;
          font-weight: 500;
          color: #64748b;
        }

        /* Center Pill ID */
        .course-cert-id-pill {
          background: #f3e8ff;
          border-radius: 10px;
          padding: 8px 24px;
          text-align: center;
          border: 1px solid #e9d5ff;
        }

        .course-cert-id-label {
          font-size: 0.62rem;
          font-weight: 800;
          color: #6b21a8;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 1px;
        }

        .course-cert-id-value {
          font-family: monospace;
          font-size: 0.95rem;
          font-weight: 800;
          color: #3b0764;
          letter-spacing: 1px;
        }

        /* QR Code Block */
        .course-cert-qr-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 140px;
        }

        .course-cert-qr-box {
          width: 68px;
          height: 68px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          padding: 3px;
          background: #ffffff;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          margin-bottom: 4px;
        }

        .course-cert-qr-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .course-cert-qr-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 1px;
        }

        .course-cert-qr-url {
          font-size: 0.58rem;
          font-weight: 500;
          color: #7c3aed;
          text-align: center;
          word-break: break-all;
        }

        /* Print Media Overrides for Landscape PDF */
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          .course-cert-doc-wrapper {
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .course-cert-card {
            width: 100vw !important;
            height: 100vh !important;
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
            padding: 40px 60px !important;
          }
        }
      `}</style>

      <div className="course-cert-card">
        {/* Inner frame accent line */}
        <div className="course-cert-inner-frame" />

        {/* Top-Left Diagonal Corner Graphic */}
        <svg className="course-cert-corner top-left" viewBox="0 0 110 110" fill="none">
          <path d="M0 0 H110 L0 110 Z" fill="url(#corner-grad-tl)" />
          <line x1="14" y1="0" x2="0" y2="14" stroke="#ffffff" strokeWidth="3" opacity="0.8" />
          <line x1="32" y1="0" x2="0" y2="32" stroke="#ffffff" strokeWidth="4" opacity="0.9" />
          <line x1="50" y1="0" x2="0" y2="50" stroke="#ffffff" strokeWidth="3" opacity="0.8" />
          <defs>
            <linearGradient id="corner-grad-tl" x1="0" y1="0" x2="110" y2="110" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>

        {/* Bottom-Right Diagonal Corner Graphic */}
        <svg className="course-cert-corner bottom-right" viewBox="0 0 110 110" fill="none">
          <path d="M110 110 H0 L110 0 Z" fill="url(#corner-grad-br)" />
          <line x1="96" y1="110" x2="110" y2="96" stroke="#ffffff" strokeWidth="3" opacity="0.8" />
          <line x1="78" y1="110" x2="110" y2="78" stroke="#ffffff" strokeWidth="4" opacity="0.9" />
          <line x1="60" y1="110" x2="110" y2="60" stroke="#ffffff" strokeWidth="3" opacity="0.8" />
          <defs>
            <linearGradient id="corner-grad-br" x1="110" y1="110" x2="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>

        {/* 1. Header with Logo & Subtitle */}
        <div className="course-cert-header">
          <div className="course-cert-logo">
            <span className="course-cert-logo-icon">&lt;&gt;</span>
            <span className="course-cert-logo-text">CodeArena</span>
          </div>
          <div className="course-cert-tagline">
            Practice &bull; Learn &bull; Grow
          </div>
        </div>

        {/* 2. Central Badge: Laurel Wreath + Graduation Cap Icon */}
        <div className="course-cert-badge-wrap">
          <svg className="course-cert-wreath-svg" viewBox="0 0 200 70" fill="none">
            {/* Left Wreath Branch */}
            <path d="M 60 60 C 38 52, 28 32, 38 14" stroke="#c084fc" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M 38 14 Q 24 18, 33 24" stroke="#a855f7" strokeWidth="1.8" fill="#d8b4fe" />
            <path d="M 36 26 Q 20 30, 31 35" stroke="#a855f7" strokeWidth="1.8" fill="#d8b4fe" />
            <path d="M 38 38 Q 23 43, 32 48" stroke="#a855f7" strokeWidth="1.8" fill="#d8b4fe" />
            <path d="M 44 50 Q 32 55, 40 58" stroke="#a855f7" strokeWidth="1.8" fill="#d8b4fe" />

            {/* Right Wreath Branch */}
            <path d="M 140 60 C 162 52, 172 32, 162 14" stroke="#c084fc" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M 162 14 Q 176 18, 167 24" stroke="#a855f7" strokeWidth="1.8" fill="#d8b4fe" />
            <path d="M 164 26 Q 180 30, 169 35" stroke="#a855f7" strokeWidth="1.8" fill="#d8b4fe" />
            <path d="M 162 38 Q 177 43, 168 48" stroke="#a855f7" strokeWidth="1.8" fill="#d8b4fe" />
            <path d="M 156 50 Q 168 55, 160 58" stroke="#a855f7" strokeWidth="1.8" fill="#d8b4fe" />

            {/* Central Badge Gradient Circle */}
            <circle cx="100" cy="35" r="26" fill="url(#badge-gradient-l)" filter="drop-shadow(0px 6px 12px rgba(124, 58, 237, 0.3))" />
            <circle cx="100" cy="35" r="23" stroke="#ffffff" strokeWidth="1.8" fill="none" opacity="0.6" />

            {/* Graduation Cap Icon inside Badge */}
            <path d="M 100 24 L 114 31 L 100 38 L 86 31 Z" fill="#ffffff" />
            <path d="M 91 35.5 V 41 C 91 43.5, 109 43.5, 109 41 V 35.5" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 111 33 V 42 C 111 43, 112.5 43, 112.5 42 V 34" fill="#ffffff" />

            <defs>
              <linearGradient id="badge-gradient-l" x1="100" y1="9" x2="100" y2="61" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* 3. Certificate Title & Presentation Subtext */}
        <div className="course-cert-title-section">
          <h1 className="course-cert-main-title">Certificate of Completion</h1>
          <p className="course-cert-presented-text">This certificate is proudly presented to</p>
        </div>

        {/* 4. Recipient Name */}
        <div className="course-cert-name-block">
          <div className="course-cert-user-name">{recipientName}</div>
          <p className="course-cert-completing-text">for successfully completing the course</p>
        </div>

        {/* 5. Course Name */}
        <div className="course-cert-course-block">
          <div className="course-cert-course-name">{courseName}</div>
        </div>

        {/* 6. Date & Time Completion Details */}
        <div className="course-cert-details-grid">
          {/* Date of Completion */}
          <div className="course-cert-detail-item">
            <div className="course-cert-detail-icon">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
                <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
                <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
                <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
                <circle cx="8" cy="14" r="1" fill="currentColor" />
                <circle cx="12" cy="14" r="1" fill="currentColor" />
                <circle cx="16" cy="14" r="1" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="course-cert-detail-label">Date of Completion</div>
              <div className="course-cert-detail-value">{formattedDate}</div>
            </div>
          </div>

          <div className="course-cert-detail-divider" />

          {/* Time of Completion */}
          <div className="course-cert-detail-item">
            <div className="course-cert-detail-icon">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <polyline points="12 7 12 12 15 15" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="course-cert-detail-label">Time of Completion</div>
              <div className="course-cert-detail-value">{formattedTime}</div>
            </div>
          </div>
        </div>

        {/* 7. Footer: Authorized Issuer + ID Pill + QR Code */}
        <div className="course-cert-footer">
          {/* Signature / Issuer */}
          <div className="course-cert-issuer-block">
            <svg className="course-cert-signature-svg" viewBox="0 0 140 40">
              <path 
                d="M 10 30 Q 35 5, 55 25 T 95 15 T 130 25" 
                fill="none" 
                stroke="#1e1b4b" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
              <path 
                d="M 25 28 C 45 10, 65 35, 85 20" 
                fill="none" 
                stroke="#1e1b4b" 
                strokeWidth="1.8" 
              />
            </svg>
            <div className="course-cert-sig-line" />
            <div className="course-cert-sig-title">CodeArena Team</div>
            <div className="course-cert-sig-sub">Authorized Issuer</div>
          </div>

          {/* Unique Certificate ID Pill */}
          <div className="course-cert-id-pill">
            <div className="course-cert-id-label">Certificate ID</div>
            <div className="course-cert-id-value">{verificationCode}</div>
          </div>

          {/* Verification QR Code */}
          <div className="course-cert-qr-block">
            <div className="course-cert-qr-box">
              <img 
                src={qrCodeApiUrl} 
                alt={`QR code for ${verificationCode}`}
                className="course-cert-qr-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                }}
              />
              <svg 
                style={{ display: 'none', width: '100%', height: '100%' }} 
                viewBox="0 0 100 100"
              >
                <rect width="100" height="100" fill="#ffffff" />
                <rect x="10" y="10" width="30" height="30" fill="#000" />
                <rect x="15" y="15" width="20" height="20" fill="#fff" />
                <rect x="20" y="20" width="10" height="10" fill="#000" />
                <rect x="60" y="10" width="30" height="30" fill="#000" />
                <rect x="65" y="15" width="20" height="20" fill="#fff" />
                <rect x="70" y="20" width="10" height="10" fill="#000" />
                <rect x="10" y="60" width="30" height="30" fill="#000" />
                <rect x="15" y="65" width="20" height="20" fill="#fff" />
                <rect x="20" y="70" width="10" height="10" fill="#000" />
                <rect x="50" y="50" width="10" height="10" fill="#000" />
                <rect x="70" y="70" width="20" height="20" fill="#000" />
              </svg>
            </div>
            <div className="course-cert-qr-label">Scan to verify</div>
            <div className="course-cert-qr-url">
              {window.location.host}/verify/certificate/{verificationCode}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
