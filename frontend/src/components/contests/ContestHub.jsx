import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Trophy, Clock, Users, Zap, Search, Filter, Calendar,
  ChevronRight, Star, Globe, Lock, AlertCircle, Play,
  CheckCircle, Timer, Award, RefreshCw, Flame, Target,
  Code, BookOpen, TrendingUp, X, XCircle, Mail, User
} from 'lucide-react';

const API_BASE = '/api';

const STATUS_CONFIG = {
  LIVE: { label: 'Live Now', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', pulse: true },
  REGISTRATION_OPEN: { label: 'Register Now', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', pulse: false },
  SCHEDULED: { label: 'Upcoming', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', pulse: false },
  COMPLETED: { label: 'Completed', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', pulse: false },
  CANCELLED: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', pulse: false },
};

const DIFFICULTY_CONFIG = {
  Beginner: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  Easy: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  Hard: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  Advanced: { color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
};

function formatDuration(minutes) {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Countdown({ targetTime, label }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetTime).getTime() - Date.now();
      if (diff <= 0) { setRemaining('00:00:00'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 24) {
        const days = Math.floor(h / 24);
        setRemaining(`${days}d ${h % 24}h`);
      } else {
        setRemaining(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [targetTime]);

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {label && <span style={{ opacity: 0.7, marginRight: 4, fontSize: 11 }}>{label}</span>}
      {remaining}
    </span>
  );
}

function formatDurationLabel(minutes) {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Toast notification component
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, []);

  const colors = {
    success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)', text: '#22c55e', icon: <CheckCircle size={16} /> },
    error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', text: '#ef4444', icon: <XCircle size={16} /> },
  };
  const c = colors[type] || colors.success;

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--card-bg, #1a1a2e)',
      border: `1px solid ${c.border}`,
      borderRadius: 12, padding: '12px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      animation: 'slideInToast 0.3s ease',
      maxWidth: 380,
    }}>
      <span style={{ color: c.text, flexShrink: 0 }}>{c.icon}</span>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{message}</span>
      <button type="button" onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-muted)', padding: 0, flexShrink: 0,
      }}><X size={14} /></button>
    </div>
  );
}

// Registration Confirmation Modal
function RegistrationModal({ contest, currentUser, token, onClose, onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const isAuthenticated = Boolean(token || currentUser?.id);

  const handleConfirmAction = async () => {
    if (!token) {
      setError('Please log in to complete your registration.');
      return;
    }
    setConfirming(true);
    setError('');
    try {
      if (onConfirm) {
        await onConfirm(contest.id);
        setRegisteredSuccess(true);
      }
    } catch (e) {
      setError(e.message || 'Registration failed. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const statusColors = {
    LIVE: '#22c55e', REGISTRATION_OPEN: '#6c4dff', SCHEDULED: '#a855f7',
  };
  const statusColor = statusColors[contest.status] || '#6c4dff';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(15, 12, 35, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'fadeInOverlay 0.2s ease',
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border-light, rgba(108, 77, 255, 0.2))',
        borderRadius: 20,
        width: '100%', maxWidth: 460,
        boxShadow: '0 20px 60px rgba(108, 77, 255, 0.25)',
        overflow: 'hidden',
        animation: 'slideUpModal 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-light, rgba(108, 77, 255, 0.12))',
          background: 'linear-gradient(135deg, rgba(108, 77, 255, 0.05) 0%, rgba(217, 70, 239, 0.05) 100%)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #6c4dff 0%, #d946ef 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 4px 14px rgba(108, 77, 255, 0.3)',
            }}>
              <Trophy size={22} color="#fff" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: '#6c4dff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                Register For Contest
              </p>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {contest.title}
              </h2>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{
            background: 'var(--bg-tertiary, rgba(108, 77, 255, 0.08))', border: 'none',
            borderRadius: 8, padding: '6px', cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {registeredSuccess ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.12)', border: '2px solid rgba(34, 197, 94, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: '#22c55e',
              }}>
                <CheckCircle size={32} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                Registration Confirmed! 🎉
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
                You are successfully registered for <strong>{contest.title}</strong>.
              </p>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #6c4dff, #5638d8)',
                  color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
                }}
              >
                Close & View Contests
              </button>
            </div>
          ) : (
            <>
              {/* Contest Metadata Tags */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                {[
                  { label: 'Status', value: contest.status === 'REGISTRATION_OPEN' ? '● Registration Open' : contest.status.replace('_', ' '), color: statusColor },
                  { label: 'Difficulty', value: contest.difficulty || 'Medium' },
                  { label: 'Duration', value: formatDurationLabel(contest.duration_minutes) },
                  { label: 'Type', value: (contest.contest_type || 'Coding').replace('_', ' ') },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'var(--bg-panel-elevated, rgba(108, 77, 255, 0.05))',
                    border: '1px solid var(--border-light, rgba(108, 77, 255, 0.12))',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: item.color || 'var(--text-primary)' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* User Profile Card */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Participant Details
                </p>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 10,
                  padding: '14px 16px', borderRadius: 12,
                  background: 'var(--bg-input, rgba(108, 77, 255, 0.05))',
                  border: '1px solid var(--border-light, rgba(108, 77, 255, 0.15))',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: 'linear-gradient(135deg, rgba(108, 77, 255, 0.15), rgba(217, 70, 239, 0.15))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <User size={16} color="#6c4dff" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>Name</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {currentUser?.display_name || currentUser?.username || 'Authenticated Participant'}
                      </div>
                    </div>
                  </div>

                  {currentUser?.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(108, 77, 255, 0.15), rgba(217, 70, 239, 0.15))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Mail size={16} color="#6c4dff" />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>Email</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{currentUser.email}</div>
                      </div>
                    </div>
                  )}

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    marginTop: 4, fontSize: 12, color: '#22c55e', fontWeight: 600,
                  }}>
                    <CheckCircle size={14} />
                    Using your CodeArena profile credentials
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: 13, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <XCircle size={15} /> {error}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={confirming}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10,
                    border: '1px solid var(--border-light, rgba(108, 77, 255, 0.2))',
                    background: 'transparent',
                    color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: 14,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={confirming || !isAuthenticated}
                  style={{
                    flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                    background: confirming || !isAuthenticated
                      ? 'rgba(108, 77, 255, 0.4)'
                      : 'linear-gradient(135deg, #6c4dff 0%, #5638d8 100%)',
                    color: '#fff', fontWeight: 700,
                    cursor: confirming || !isAuthenticated ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    boxShadow: confirming || !isAuthenticated ? 'none' : '0 4px 16px rgba(108, 77, 255, 0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {confirming ? '⏳ Registering...' : '✓ Confirm Registration'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ContestCard({ contest, token, currentUser, onViewDetails, onEnter, onRefresh, onOpenRegisterModal }) {
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(contest.is_registered);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsRegistered(contest.is_registered);
  }, [contest.is_registered]);

  const statusCfg = STATUS_CONFIG[contest.status] || STATUS_CONFIG.SCHEDULED;
  const diffCfg = DIFFICULTY_CONFIG[contest.difficulty] || DIFFICULTY_CONFIG.Medium;

  const isRegistrationAllowed = contest.status === 'REGISTRATION_OPEN' || contest.status === 'SCHEDULED';

  const handleRegisterClick = (e) => {
    e.stopPropagation();
    if (!token) { setError('Please log in to register.'); return; }
    if (onOpenRegisterModal) {
      onOpenRegisterModal(contest);
    } else {
      handleRegisterDirect();
    }
  };

  const handleRegisterDirect = async () => {
    if (!token) { setError('Please log in to register.'); return; }
    setRegistering(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/contests/${contest.id}/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setIsRegistered(true);
        if (onRefresh) onRefresh();
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelReg = async (e) => {
    e.stopPropagation();
    if (!token) return;
    setRegistering(true);
    try {
      const res = await fetch(`${API_BASE}/contests/${contest.id}/register`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setIsRegistered(false);
        if (onRefresh) onRefresh();
      }
    } catch {}
    setRegistering(false);
  };

  return (
    <div
      className="contest-card"
      onClick={() => onViewDetails(contest.id)}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-light)',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Banner */}
      <div style={{
        height: 140,
        background: contest.banner_url
          ? `url(${contest.banner_url}) center/cover no-repeat`
          : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        position: 'relative',
      }}>
        {/* Status Badge */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: statusCfg.bg,
          border: `1px solid ${statusCfg.color}44`,
          borderRadius: 20,
          padding: '4px 10px',
          backdropFilter: 'blur(8px)',
        }}>
          {statusCfg.pulse && (
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: statusCfg.color,
              animation: 'pulse-dot 1.5s ease-in-out infinite',
              display: 'inline-block',
            }} />
          )}
          <span style={{ color: statusCfg.color, fontSize: 11, fontWeight: 700 }}>{statusCfg.label}</span>
        </div>
        {/* Difficulty */}
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: diffCfg.bg,
          border: `1px solid ${diffCfg.color}44`,
          borderRadius: 20,
          padding: '4px 10px',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ color: diffCfg.color, fontSize: 11, fontWeight: 700 }}>{contest.difficulty}</span>
        </div>
        {/* Organizer */}
        {contest.organizer_type === 'ORGANIZATION' && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            padding: '3px 9px',
            fontSize: 11,
            fontWeight: 700,
            color: '#f8fafc',
            backdropFilter: 'blur(6px)',
          }}>
            🏢 {contest.organization_name || contest.organizer || 'Organization'}
          </div>
        )}
        {contest.organizer_type === 'ADMIN' && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            background: 'rgba(99,102,241,0.85)',
            borderRadius: 8,
            padding: '3px 9px',
            fontSize: 11,
            fontWeight: 700,
            color: '#ffffff',
            backdropFilter: 'blur(6px)',
          }}>
            ⚡ CodeArena Official
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{contest.title}</h3>

        {contest.short_description && (
          <p style={{
            margin: 0,
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{contest.short_description}</p>
        )}

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            <Users size={12} /> {contest.participant_count || 0} registered
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            <Code size={12} /> {contest.problem_count || 0} problems
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            <Timer size={12} /> {formatDuration(contest.duration_minutes)}
          </span>
        </div>

        {/* Time Info */}
        <div style={{
          padding: '8px 10px',
          background: 'var(--bg-tertiary, rgba(0,0,0,0.15))',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}>
          {contest.status === 'LIVE' && (
            <span style={{ color: '#22c55e', fontWeight: 600 }}>
              ⏱ Ends in: <Countdown targetTime={contest.end_time} />
            </span>
          )}
          {contest.status === 'REGISTRATION_OPEN' && (
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>
              🎯 Starts in: <Countdown targetTime={contest.start_time} />
            </span>
          )}
          {(contest.status === 'SCHEDULED' || contest.status === 'DRAFT') && (
            <span style={{ color: '#6366f1', fontWeight: 600 }}>
              🎯 Starts in: <Countdown targetTime={contest.start_time} />
            </span>
          )}
          {contest.status === 'COMPLETED' && (
            <span>✅ Ended: {formatDateTime(contest.end_time)}</span>
          )}
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 11, color: '#ef4444' }}>{error}</p>
        )}

        {/* CTA Buttons */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
          {contest.status === 'LIVE' && isRegistered && (
            <button
              type="button"
              id={`contest-enter-${contest.id}`}
              onClick={(e) => { e.stopPropagation(); onEnter(contest.id); }}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Play size={13} /> Enter Contest
            </button>
          )}
          {contest.status === 'LIVE' && !isRegistered && (
            <button
              type="button"
              id={`contest-join-${contest.id}`}
              onClick={(e) => { e.stopPropagation(); onEnter(contest.id); }}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12,
              }}
            >
              Join Live
            </button>
          )}
          {isRegistrationAllowed && !isRegistered && (
            <button
              type="button"
              id={`contest-reg-${contest.id}`}
              onClick={handleRegisterClick}
              disabled={registering}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff', fontWeight: 700, cursor: registering ? 'not-allowed' : 'pointer', fontSize: 12,
                opacity: registering ? 0.7 : 1,
              }}
            >
              {registering ? '...' : '📋 Register'}
            </button>
          )}
          {isRegistrationAllowed && isRegistered && (
            <div style={{ flex: 1, display: 'flex', gap: 6 }}>
              <span style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                color: '#22c55e', fontWeight: 700, fontSize: 11, textAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <CheckCircle size={12} /> Registered
              </span>
              <button
                type="button"
                onClick={handleCancelReg}
                title="Cancel Registration"
                style={{
                  padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-light)',
                  background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 10,
                }}
              >✕</button>
            </div>
          )}
          {contest.status === 'COMPLETED' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewDetails(contest.id); }}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border-light)', background: 'transparent',
                color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >
              View Results
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onViewDetails(contest.id); }}
            style={{
              padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-light)',
              background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12,
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContestHub({ token, currentUser, onViewDetails, onEnterContest }) {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [search, setSearch] = useState('');
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [modalContest, setModalContest] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const fetchContests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('filter', filter);
      if (difficulty !== 'all') params.set('difficulty', difficulty);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`${API_BASE}/contests?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch contests');
      const data = await res.json();
      setContests(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load contests');
    } finally {
      setLoading(false);
    }
  }, [filter, difficulty, search, token]);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  // Fetch my registrations
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/user/contests`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setMyRegistrations(Array.isArray(data) ? data.map(c => c.id) : []))
      .catch(() => {});
  }, [token]);

  const handleRegisterConfirm = async (contestId) => {
    try {
      const res = await fetch(`${API_BASE}/contests/${contestId}/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setMyRegistrations(prev => [...prev, contestId]);
        fetchContests();
        setToastMsg({ type: 'success', text: 'Successfully registered for the contest! Good luck! 🎉' });
      } else {
        setToastMsg({ type: 'error', text: data.error || 'Registration failed' });
      }
    } catch {
      setToastMsg({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  const liveContests = contests.filter(c => c.status === 'LIVE');
  const upcomingContests = contests.filter(c => c.status === 'REGISTRATION_OPEN' || c.status === 'SCHEDULED');
  const completedContests = contests.filter(c => c.status === 'COMPLETED');
  const showAll = filter === 'all';

  return (
    <div style={{ padding: '24px 0', maxWidth: 1200, margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <Toast
          message={toastMsg.text}
          type={toastMsg.type}
          onClose={() => setToastMsg(null)}
        />
      )}

      {/* Registration Confirmation Modal */}
      {modalContest && (
        <RegistrationModal
          contest={modalContest}
          currentUser={currentUser}
          token={token}
          onClose={() => setModalContest(null)}
          onConfirm={handleRegisterConfirm}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trophy size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Contest Hub</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              Compete globally · Win prizes · Climb the leaderboard
            </p>
          </div>
        </div>

        {/* Stats Banner */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          {[
            { icon: <Flame size={16} />, label: 'Live Now', value: liveContests.length, color: '#22c55e' },
            { icon: <Calendar size={16} />, label: 'Upcoming', value: upcomingContests.length, color: '#f59e0b' },
            { icon: <CheckCircle size={16} />, label: 'Completed', value: completedContests.length, color: '#6b7280' },
            { icon: <Users size={16} />, label: 'Total', value: contests.length, color: '#6366f1' },
          ].map((stat, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--card-bg)', border: '1px solid var(--border-light)',
              borderRadius: 10, padding: '8px 14px',
            }}>
              <span style={{ color: stat.color }}>{stat.icon}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            id="contest-search"
            type="text"
            placeholder="Search contests..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10,
              border: '1px solid var(--border-light)', background: 'var(--input-bg, var(--card-bg))',
              color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'live', label: '🔴 Live' },
            { key: 'upcoming', label: '📅 Upcoming' },
            { key: 'completed', label: '✅ Past' },
          ].map(f => (
            <button
              key={f.key}
              id={`contest-filter-${f.key}`}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-light)',
                background: filter === f.key ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'var(--card-bg)',
                color: filter === f.key ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 12, fontWeight: filter === f.key ? 700 : 500, transition: 'all 0.2s',
              }}
            >{f.label}</button>
          ))}
        </div>

        <select
          id="contest-difficulty-filter"
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
          style={{
            padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border-light)',
            background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer',
          }}
        >
          <option value="all">All Difficulty</option>
          <option value="Beginner">Beginner</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
          <option value="Advanced">Advanced</option>
        </select>

        <button
          onClick={fetchContests}
          style={{
            padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border-light)',
            background: 'var(--card-bg)', color: 'var(--text-muted)', cursor: 'pointer',
          }}
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, marginBottom: 16, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <p>Loading contests...</p>
        </div>
      ) : contests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <Trophy size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p style={{ fontSize: 16 }}>No contests found matching your filters.</p>
        </div>
      ) : (
        <>
          {/* Live Contests */}
          {(showAll || filter === 'live') && liveContests.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#22c55e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse-dot 1.5s infinite' }} />
                Live Contests
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
                {liveContests.map(c => (
                  <ContestCard
                    key={c.id}
                    contest={{ ...c, is_registered: myRegistrations.includes(c.id) || c.is_registered }}
                    token={token}
                    currentUser={currentUser}
                    onViewDetails={onViewDetails}
                    onEnter={onEnterContest}
                    onRefresh={fetchContests}
                    onOpenRegisterModal={setModalContest}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Contests */}
          {(showAll || filter === 'upcoming') && upcomingContests.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={17} /> Upcoming Contests
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
                {upcomingContests.map(c => (
                  <ContestCard
                    key={c.id}
                    contest={{ ...c, is_registered: myRegistrations.includes(c.id) || c.is_registered }}
                    token={token}
                    currentUser={currentUser}
                    onViewDetails={onViewDetails}
                    onEnter={onEnterContest}
                    onRefresh={fetchContests}
                    onOpenRegisterModal={setModalContest}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Contests */}
          {(showAll || filter === 'completed') && completedContests.length > 0 && (
            <section>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={17} /> Past Contests
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
                {completedContests.map(c => (
                  <ContestCard
                    key={c.id}
                    contest={{ ...c, is_registered: myRegistrations.includes(c.id) || c.is_registered }}
                    token={token}
                    currentUser={currentUser}
                    onViewDetails={onViewDetails}
                    onEnter={onEnterContest}
                    onRefresh={fetchContests}
                    onOpenRegisterModal={setModalContest}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .contest-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(99,102,241,0.18);
          border-color: rgba(99,102,241,0.4) !important;
        }
      `}</style>
    </div>
  );
}
