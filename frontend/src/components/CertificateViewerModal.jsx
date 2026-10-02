import React, { useState } from 'react';
import CertificateDocument from './CertificateDocument';
import CourseCertificateDocument from './CourseCertificateDocument';

export default function CertificateViewerModal({ certificate, user, onClose, onSetFeatured, isFeatured }) {
  const [copied, setCopied] = useState(false);
  const [updatingFeatured, setUpdatingFeatured] = useState(false);

  if (!certificate) return null;

  const isCourseCert = Boolean(certificate.course_name || certificate.course_id || certificate.course_title);
  const certTitle = isCourseCert 
    ? (certificate.course_name || certificate.course_title || 'Course Completion')
    : (certificate.title || `${certificate.milestone} Problems Solved`);

  const verificationUrl = `${window.location.origin}/verify/certificate/${certificate.verification_code}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleToggleFeatured = async () => {
    if (!onSetFeatured || isCourseCert) return;
    setUpdatingFeatured(true);
    try {
      await onSetFeatured(isFeatured ? null : certificate.milestone);
    } catch (err) {
      console.error('Failed to update featured milestone:', err);
    } finally {
      setUpdatingFeatured(false);
    }
  };

  const shareText = encodeURIComponent(
    isCourseCert
      ? `I just completed the ${certTitle} course on CodeArena! Check out my verified certificate:`
      : `I just earned the ${certificate.milestone} Problems Solved Certificate on CodeArena! Check out my verified achievement certificate:`
  );

  return (
    <div className="cert-modal-backdrop">
      <div className="cert-modal-container">
        
        {/* Modal Header */}
        <div className="cert-modal-header">
          <div className="cert-modal-title-wrap">
            <div className="cert-modal-tag font-mono font-sans">
              {isCourseCert ? '🎓 COURSE' : `#${certificate.milestone}`}
            </div>
            <div>
              <h3 className="cert-modal-title font-display font-sans">
                {certTitle} Certificate
              </h3>
              <p className="cert-modal-sub font-sans">
                Verification Code: <span className="cert-modal-code font-mono">{certificate.verification_code}</span>
              </p>
            </div>
          </div>

          <div className="cert-modal-header-actions">
            {!isCourseCert && (
              <button
                onClick={handleToggleFeatured}
                disabled={updatingFeatured}
                className={`cert-modal-btn-feature ${isFeatured ? 'featured' : ''}`}
                title="Showcase this badge on your profile"
              >
                <svg width="16" height="16" fill={isFeatured ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span className="cert-modal-btn-feature-label font-sans">{isFeatured ? 'Featured Badge' : 'Feature on Profile'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="cert-modal-close"
              aria-label="Close modal"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Certificate Display Area */}
        <div className="cert-modal-body">
          <div id="printable-certificate" className="cert-modal-doc-box">
            {isCourseCert ? (
              <CourseCertificateDocument certificate={certificate} user={user} />
            ) : (
              <CertificateDocument certificate={certificate} user={user} />
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="cert-modal-footer">
          <div className="cert-modal-actions-left">
            <button
              onClick={handlePrint}
              className="cert-modal-btn-print font-sans"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Download PDF</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="cert-modal-btn-copy font-sans"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          <div className="cert-modal-actions-right">
            <span className="cert-modal-share-label font-sans">Share:</span>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verificationUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cert-modal-share-link linkedin font-sans"
            >
              <span>LinkedIn</span>
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(verificationUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cert-modal-share-link twitter font-sans"
            >
              <span>Twitter / X</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

