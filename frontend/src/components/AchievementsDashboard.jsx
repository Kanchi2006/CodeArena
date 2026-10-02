import React, { useState, useEffect } from 'react';
import CertificateBadge from './CertificateBadge';
import CertificateViewerModal from './CertificateViewerModal';
import CertificateMiniPreview from './CertificateMiniPreview';

const MILESTONES = [5, 30, 50, 100, 120, 150, 200];

const MILESTONE_NAMES = {
  5:   'Bronze Achievement Certificate',
  30:  'Certificate of Appreciation',
  50:  'Emerald Achievement Certificate',
  100: 'Purple Century Master Certificate',
  120: 'Orange Expert Certificate',
  150: 'Teal Elite Certificate',
  200: 'Indigo Pinnacle Certificate'
};

export default function AchievementsDashboard({ user, onUpdateUser, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [achievementsData, setAchievementsData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);

  const fetchAchievements = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/user/achievements', { headers });
      if (res.ok) {
        const data = await res.json();
        setAchievementsData(data);
      } else {
        setError('Failed to load certificates and achievements.');
      }
    } catch (err) {
      setError('Network error fetching achievements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const handleSetFeatured = async (milestone) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/featured-milestone', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ milestone })
      });
      if (res.ok) {
        fetchAchievements();
        if (onUpdateUser) onUpdateUser({ ...user, featured_milestone: milestone });
      }
    } catch (err) {
      console.error('Error setting featured milestone:', err);
    }
  };

  const handleSolveProblemsClick = () => {
    if (onNavigate) onNavigate('problems');
    else window.location.hash = '#problems';
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="achv-loading">
        <div className="achv-spinner"></div>
        <p className="achv-loading-text">Loading your developer achievement dashboard...</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !achievementsData) {
    return (
      <div className="achv-error">
        <p className="achv-error-text">{error || 'Unable to load achievements.'}</p>
        <button onClick={fetchAchievements} className="achv-error-btn">Retry Loading</button>
      </div>
    );
  }

  // ── Data derivation ──────────────────────────────────────────────────────
  const { solvedCount } = achievementsData;
  const certList = achievementsData.certificates || [];
  const featuredMilestone = achievementsData.user?.featured_milestone;
  const userName =
    user?.display_name || user?.username ||
    achievementsData.user?.display_name || achievementsData.user?.username || 'Developer';

  // Build map of earned certificates (excluding revoked)
  const unlockedMap = {};
  certList.forEach(c => {
    if (!c.revoked_at) unlockedMap[c.milestone] = c;
  });

  const unlockedCount = Object.keys(unlockedMap).length;

  // ── Milestone progression ─────────────────────────────────────────────────
  // Next milestone is strictly GREATER than solvedCount
  const nextMilestone = MILESTONES.find(m => m > solvedCount) || null;
  const isMaxReached = solvedCount >= MILESTONES[MILESTONES.length - 1] && !nextMilestone;
  const remainingForNext = nextMilestone != null ? Math.max(0, nextMilestone - solvedCount) : 0;
  const nextMilestoneName = nextMilestone ? (MILESTONE_NAMES[nextMilestone] || `${nextMilestone} Problems Certificate`) : '';

  // Progress bar: from the last EARNED (unlocked) milestone to the next target
  // Use the highest milestone the user has already passed as the base, or 0
  const earnedMilestones = MILESTONES.filter(m => m <= solvedCount);
  const prevMilestone = earnedMilestones.length > 0 ? earnedMilestones[earnedMilestones.length - 1] : 0;
  const milestoneRange = nextMilestone != null ? (nextMilestone - prevMilestone) : 1;
  const progressInCurrentTier = solvedCount - prevMilestone;
  const tierProgressPercent = isMaxReached
    ? 100
    : nextMilestone != null
      ? Math.min(100, Math.max(0, Math.round((progressInCurrentTier / milestoneRange) * 100)))
      : 100;

  return (
    <div className="achv-page">

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 1. PAGE HEADER                                            */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="achv-header">
        <div>
          <h1 className="achv-header-title">Achievements</h1>
          <p className="achv-header-sub">Your coding journey, one problem at a time.</p>
        </div>

        <div className="achv-header-stats">
          <div className="achv-stat-pill">
            <span className="achv-stat-val blue">{solvedCount}</span>
            <span className="achv-stat-lbl">accepted problems</span>
          </div>
          <div className="achv-stat-pill">
            <span className="achv-stat-val amber">{unlockedCount} / 7</span>
            <span className="achv-stat-lbl">certificates unlocked</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 2. NEXT ACHIEVEMENT HERO CARD                            */}
      {/* ══════════════════════════════════════════════════════════ */}
      {!isMaxReached && nextMilestone != null ? (
        <div className="achv-hero">
          <div className="achv-hero-glow"></div>
          <div className="achv-hero-inner">
            <div className="achv-hero-toprow">
              <span className="achv-hero-badge">Next Achievement</span>
              <span className="achv-hero-milestone-lbl">
                Milestone Target: <strong>{nextMilestone} Problems</strong>
              </span>
            </div>

            <h2 className="achv-hero-title">
              <span>🏆</span>
              <span>{nextMilestone} Problems Solved</span>
            </h2>
            <p className="achv-hero-desc">
              You've solved <strong className="highlight">{solvedCount}</strong> of{' '}
              <strong className="white">{nextMilestone}</strong> accepted problems.
            </p>

            {/* Progress Bar */}
            <div className="achv-progress-wrap">
              <div className="achv-progress-labels">
                <span className="achv-progress-lbl">Tier Progress</span>
                <span className="achv-progress-count">{solvedCount} / {nextMilestone}</span>
              </div>
              <div className="achv-progress-track">
                <div className="achv-progress-fill" style={{ width: `${tierProgressPercent}%` }}></div>
              </div>
            </div>

            {/* Footer */}
            <div className="achv-hero-footer">
              <div className="achv-hero-remaining">
                {remainingForNext === 1 ? (
                  <span>🔥 Just 1 more accepted problem to unlock your next certificate!</span>
                ) : remainingForNext === 0 ? (
                  <span>🎉 Achievement unlocked!</span>
                ) : (
                  <span>{remainingForNext} more accepted problems to unlock your next certificate.</span>
                )}
              </div>

              <button onClick={handleSolveProblemsClick} className="achv-hero-cta">
                <span>Solve Problems</span>
                <span className="arrow">→</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Grand Master Unlocked Hero Card */
        <div className="achv-hero complete">
          <div className="achv-hero-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
            <div>
              <span className="achv-hero-badge">Grand Champion</span>
              <h2 className="achv-hero-title">🎉 All 7 Milestone Certificates Unlocked!</h2>
              <p className="achv-hero-desc" style={{ marginBottom: '0' }}>
                You have demonstrated outstanding problem-solving mastery on CodeArena by completing {solvedCount} accepted problems.
              </p>
            </div>
            <button onClick={handleSolveProblemsClick} className="achv-hero-cta">
              <span>Keep Coding</span>
              <span className="arrow">→</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 3. ACHIEVEMENT ROADMAP                                    */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="achv-roadmap">
        <div className="achv-section-label">Achievement Roadmap</div>

        {/* Desktop Horizontal Timeline */}
        <div className="achv-timeline-hz">
          <div className="achv-timeline-hz-inner">
            <div className="achv-timeline-hz-bar"></div>
            {MILESTONES.map((m) => {
              const isUnlocked = Boolean(unlockedMap[m]);
              const isNext = !isUnlocked && m === nextMilestone;
              const state = isUnlocked ? 'unlocked' : isNext ? 'current' : 'locked';

              return (
                <div key={m} className="achv-timeline-node">
                  <div className={`achv-timeline-circle ${state}`}>
                    {isUnlocked ? '✓' : m}
                  </div>
                  <div className="achv-timeline-info">
                    <div className={`achv-timeline-num ${state}`}>{m} Solved</div>
                    <div className="achv-timeline-status">
                      {isUnlocked ? '✓ Earned' : isNext ? '🔥 Next' : '🔒 Locked'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Vertical Timeline */}
        <div className="achv-timeline-vt">
          {MILESTONES.map((m) => {
            const isUnlocked = Boolean(unlockedMap[m]);
            const isNext = !isUnlocked && m === nextMilestone;
            const neededCount = Math.max(0, m - solvedCount);
            const state = isUnlocked ? 'unlocked' : isNext ? 'current' : 'locked';

            return (
              <div key={m} className="achv-timeline-vt-item">
                <div className={`achv-timeline-vt-circle ${state}`}>
                  {isUnlocked ? '✓' : m}
                </div>
                <div className="achv-timeline-vt-body">
                  <div>
                    <div className="achv-timeline-vt-title">{m} Problems Solved</div>
                    <div className="achv-timeline-vt-sub">
                      {isUnlocked ? 'Certificate Unlocked ✓' : `${neededCount} more accepted problems`}
                    </div>
                  </div>
                  <div className={`achv-timeline-vt-status ${state}`}>
                    {isUnlocked ? '✓ Earned' : isNext ? '🔥 Next Target' : '🔒 Locked'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 4 & 5. CERTIFICATE COLLECTION                            */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="achv-certs-section">
        <h2 className="achv-certs-title">Your Certificates</h2>
        <p className="achv-certs-sub">Achievements you've earned through consistent practice.</p>

        <div className="achv-certs-grid">
          {MILESTONES.map((milestone) => {
            const cert = unlockedMap[milestone];
            const isUnlocked = Boolean(cert);
            const isFeatured = featuredMilestone === milestone;
            const neededCount = Math.max(0, milestone - solvedCount);
            const certName = MILESTONE_NAMES[milestone] || `${milestone} Problems Certificate`;

            return (
              <div key={milestone} className={`achv-cert-card ${isUnlocked ? 'unlocked' : 'locked'}`}>

                {/* ── Preview area ── */}
                <div className="achv-cert-preview-wrap">
                  {isFeatured && (
                    <div className="achv-cert-featured">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span>Featured</span>
                    </div>
                  )}
                  <CertificateMiniPreview
                    milestone={milestone}
                    userName={userName}
                    isUnlocked={isUnlocked}
                    neededCount={neededCount}
                  />
                </div>

                {/* ── Card body ── */}
                <div className="achv-cert-body">
                  <div>
                    {/* Status badge — one line, no repetition */}
                    <div className={`achv-cert-status ${isUnlocked ? 'unlocked' : 'locked'}`}>
                      {isUnlocked
                        ? `✓ ${milestone} Problems Solved`
                        : `🔒 ${milestone} Problems Solved`}
                    </div>

                    {/* Certificate name */}
                    <h4 className="achv-cert-name">{certName}</h4>

                    {/* Single concise description — no repetition of milestone number */}
                    <p className="achv-cert-desc">
                      {isUnlocked
                        ? 'Official certificate awarded for reaching this milestone.'
                        : neededCount === 1
                          ? 'Solve 1 more problem to unlock this certificate.'
                          : `Solve ${neededCount} more problems to unlock this certificate.`}
                    </p>
                  </div>

                  {/* ── Actions ── */}
                  <div className="achv-cert-actions">
                    {isUnlocked ? (
                      <>
                        <button onClick={() => setSelectedCert(cert)} className="achv-cert-btn-view">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>View Certificate</span>
                        </button>
                        <button onClick={() => setSelectedCert(cert)} className="achv-cert-btn-dl" title="Download Certificate PDF">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <button onClick={handleSolveProblemsClick} className="achv-cert-btn-locked">
                        <span>Keep Solving</span>
                        <span>→</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 5b. COURSE COMPLETION CERTIFICATES SECTION               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {(() => {
        const courseCerts = achievementsData.courseCertificates || [];
        return (
          <div className="achv-certs-section" style={{ marginTop: '36px' }}>
            <h2 className="achv-certs-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎓</span> Course Completion Certificates ({courseCerts.length})
            </h2>
            <p className="achv-certs-sub">Official certificates awarded upon 100% completion of CodeArena courses.</p>

            {courseCerts.length === 0 ? (
              <div style={{ padding: '24px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px dashed var(--border-light)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No course completion certificates earned yet. Complete all lessons in a course to unlock your certificate.
              </div>
            ) : (
              <div className="achv-certs-grid">
                {courseCerts.map((cCert) => (
                  <div key={cCert.id} className="achv-cert-card unlocked" style={{ border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                    <div className="achv-cert-body">
                      <div>
                        <div className="achv-cert-status unlocked">
                          ✓ Course Completed
                        </div>
                        <h4 className="achv-cert-name">{cCert.course_name || cCert.course_title}</h4>
                        <p className="achv-cert-desc">
                          Issued: {cCert.completion_date} &bull; Code: {cCert.verification_code}
                        </p>
                      </div>

                      <div className="achv-cert-actions">
                        <button onClick={() => setSelectedCert(cCert)} className="achv-cert-btn-view">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>View Certificate</span>
                        </button>
                        <button onClick={() => setSelectedCert(cCert)} className="achv-cert-btn-dl" title="Download Certificate PDF">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 6. MOTIVATION SECTION                                    */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="achv-motivation">
        <div className="achv-motivation-label">Keep Building</div>
        <h3 className="achv-motivation-title">
          Every accepted solution makes you a better problem solver.
        </h3>
        <p className="achv-motivation-desc">
          Your next achievement is waiting. Continue solving coding challenges to unlock verified certificates for your portfolio.
        </p>
        <button onClick={handleSolveProblemsClick} className="achv-motivation-btn">
          <span>Practice Problems</span>
          <span>→</span>
        </button>
      </div>

      {/* Full Certificate Viewer Modal */}
      {selectedCert && (
        <CertificateViewerModal
          certificate={selectedCert}
          user={user}
          onClose={() => setSelectedCert(null)}
          onSetFeatured={handleSetFeatured}
          isFeatured={featuredMilestone === selectedCert.milestone}
        />
      )}
    </div>
  );
}
