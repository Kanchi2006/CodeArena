import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Clock, Users, Code, Timer, Trophy, Calendar,
  CheckCircle, AlertCircle, Play, Star, Globe, Lock,
  ChevronRight, Award, Zap, Shield, Info, RefreshCw
} from 'lucide-react';
import RulesAndGuidelines from '../support/RulesAndGuidelines';

const API_BASE = '/api';

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDuration(minutes) {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function Countdown({ targetTime, label, color = '#22c55e' }) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, new Date(targetTime).getTime() - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setParts({ d, h, m, s });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [targetTime]);

  return (
    <div style={{ textAlign: 'center' }}>
      {label && <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
        {parts.d > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{String(parts.d).padStart(2, '0')}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>DAYS</div>
          </div>
        )}
        {parts.d > 0 && <span style={{ fontSize: 24, color, fontWeight: 700, paddingBottom: 12 }}>:</span>}
        {['h', 'm', 's'].map((unit, i) => (
          <React.Fragment key={unit}>
            {i > 0 && <span style={{ fontSize: 24, color, fontWeight: 700, paddingBottom: 12 }}>:</span>}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {String(parts[unit]).padStart(2, '0')}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase' }}>{unit === 'h' ? 'HRS' : unit === 'm' ? 'MIN' : 'SEC'}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function ContestDetailPage({ contestId, token, currentUser, onBack, onEnterContest, onViewResults }) {
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [regError, setRegError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadContest();
  }, [contestId]);

  const loadContest = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/contests/${contestId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Contest not found');
      const data = await res.json();
      setContest(data);
      setIsRegistered(data.is_registered || false);
    } catch (e) {
      setError(e.message || 'Failed to load contest');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    if (!contestId) return;
    setLeaderboardLoading(true);
    try {
      const res = await fetch(`${API_BASE}/contests/${contestId}/leaderboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.standings || []);
      }
    } catch {}
    setLeaderboardLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'leaderboard') loadLeaderboard();
  }, [activeTab]);

  const handleRegister = async () => {
    if (!token) { setRegError('Please log in to register for contests.'); return; }
    setRegistering(true);
    setRegError('');
    try {
      const res = await fetch(`${API_BASE}/contests/${contestId}/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setIsRegistered(true);
        setContest(prev => ({ ...prev, participant_count: (prev.participant_count || 0) + 1 }));
      } else {
        setRegError(data.error || 'Registration failed');
      }
    } catch {
      setRegError('Network error. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelReg = async () => {
    if (!token) return;
    setRegistering(true);
    try {
      const res = await fetch(`${API_BASE}/contests/${contestId}/register`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setIsRegistered(false);
        setContest(prev => ({ ...prev, participant_count: Math.max(0, (prev.participant_count || 1) - 1) }));
      }
    } catch {}
    setRegistering(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, color: 'var(--text-muted)' }}>
        <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: 12 }} />
        <p style={{ color: '#ef4444' }}>{error}</p>
        <button onClick={onBack} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>← Back</button>
      </div>
    );
  }

  if (!contest) return null;

  const STATUS_COLOR = {
    LIVE: '#22c55e', REGISTRATION_OPEN: '#f59e0b', SCHEDULED: '#6366f1', COMPLETED: '#6b7280', CANCELLED: '#ef4444'
  };
  const statusColor = STATUS_COLOR[contest.status] || '#6366f1';
  const isLive = contest.status === 'LIVE';
  const isRegistrationOpen = contest.status === 'REGISTRATION_OPEN';
  const isCompleted = contest.status === 'COMPLETED';
  const userAttempt = contest.user_attempt;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 0' }}>
      {/* Back Button */}
      <button
        id="contest-detail-back"
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0',
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: 14, marginBottom: 20, fontWeight: 500,
        }}
      >
        <ArrowLeft size={16} /> Back to Contests
      </button>

      {/* Hero Banner */}
      <div style={{
        height: 220,
        borderRadius: 20,
        background: contest.banner_url
          ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${contest.banner_url}) center/cover`
          : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '24px 28px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            padding: '4px 12px', borderRadius: 20,
            background: `${statusColor}22`, border: `1px solid ${statusColor}44`,
            color: statusColor, fontSize: 12, fontWeight: 700,
          }}>
            {isLive && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: statusColor, marginRight: 5, animation: 'pulse-dot 1.5s infinite' }} />}
            {contest.status.replace('_', ' ')}
          </span>
          <span style={{
            padding: '4px 12px', borderRadius: 20,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#e2e8f0', fontSize: 12, fontWeight: 600,
          }}>
            {contest.difficulty}
          </span>
          {contest.organizer_type === 'ADMIN' && (
            <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(99,102,241,0.4)', border: '1px solid rgba(99,102,241,0.5)', color: '#c7d2fe', fontSize: 12, fontWeight: 600 }}>
              ⚡ CodeArena Official
            </span>
          )}
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{contest.title}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{contest.short_description}</p>
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* Left: Tabs & Content */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border-light)', paddingBottom: 0 }}>
            {['overview', 'rules', 'problems', 'leaderboard'].map(tab => (
              <button
                key={tab}
                id={`contest-tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
                  color: activeTab === tab ? '#a855f7' : 'var(--text-muted)',
                  borderBottom: `2px solid ${activeTab === tab ? '#a855f7' : 'transparent'}`,
                  marginBottom: -1, textTransform: 'capitalize', transition: 'all 0.2s',
                }}
              >{tab}</button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Description */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 20 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>About this Contest</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{contest.description}</p>
              </div>

              {/* Instructions */}
              {contest.instructions && (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 20 }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Info size={16} color="#6366f1" /> Contest Rules & Instructions
                  </h3>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    {contest.instructions.split('\n').map((line, i) => (
                      <p key={i} style={{ margin: '4px 0' }}>{line}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Contest Details Grid */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Contest Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[
                    { icon: <Calendar size={15} />, label: 'Start Time', value: formatDateTime(contest.start_time) },
                    { icon: <Calendar size={15} />, label: 'End Time', value: formatDateTime(contest.end_time) },
                    { icon: <Timer size={15} />, label: 'Duration', value: formatDuration(contest.duration_minutes) },
                    { icon: <Users size={15} />, label: 'Participants', value: `${contest.participant_count || 0}${contest.max_participants > 0 ? ` / ${contest.max_participants}` : ''}` },
                    { icon: <Code size={15} />, label: 'Problems', value: contest.problem_count || contest.problems?.length || '-' },
                    { icon: <Globe size={15} />, label: 'Organizer', value: contest.organizer || 'CodeArena Official' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ color: '#a855f7', marginTop: 1 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scoring Rules */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 20 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Trophy size={15} color="#f59e0b" /> Scoring
                </h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Negative Marking', value: contest.negative_marking ? `${contest.negative_marks_per_wrong || 'Yes'}` : 'Off' },
                    { label: 'Time Penalty', value: contest.time_penalty_per_wrong_min > 0 ? `${contest.time_penalty_per_wrong_min}m/wrong` : 'None' },
                    { label: 'Leaderboard', value: contest.leaderboard_enabled ? 'Enabled' : 'Disabled' },
                    { label: 'Certificate', value: contest.certificate_enabled ? 'Awarded' : 'No' },
                  ].map((item, i) => (
                    <div key={i} style={{
                      padding: '8px 14px', borderRadius: 8,
                      background: 'var(--bg-tertiary, rgba(0,0,0,0.15))',
                      border: '1px solid var(--border-light)',
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allowed Languages */}
              {contest.allowed_languages && contest.allowed_languages.length > 0 && (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 20 }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Allowed Languages</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {contest.allowed_languages.map(lang => (
                      <span key={lang} style={{
                        padding: '4px 12px', borderRadius: 20,
                        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                        color: '#a5b4fc', fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                      }}>{lang}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <RulesAndGuidelines
              type="contest"
              targetId={contestId}
              isOrganizerOrAdmin={false}
              securitySettings={{
                requireFullscreen: contest.proctoring_enabled,
                tabSwitchLimit: contest.max_tab_switches || 0,
                disableCopyPaste: contest.disable_copy_paste,
                enableWebcam: contest.webcam_required
              }}
            />
          )}

          {/* Problems Tab */}
          {activeTab === 'problems' && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 14, overflow: 'hidden' }}>
              {!isRegistered && !isLive ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Lock size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <p>Register for this contest to see the problems.</p>
                </div>
              ) : contest.problems && contest.problems.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                      {['#', 'Title', 'Difficulty', 'Points'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contest.problems.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{p.title}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                            color: p.difficulty === 'Easy' ? '#22c55e' : p.difficulty === 'Hard' ? '#ef4444' : '#f59e0b',
                            background: p.difficulty === 'Easy' ? 'rgba(34,197,94,0.1)' : p.difficulty === 'Hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                          }}>{p.difficulty}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#a855f7', fontWeight: 700 }}>{p.points || 100} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Code size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <p>Problems will be revealed when the contest starts.</p>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 14, overflow: 'hidden' }}>
              {leaderboardLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : leaderboard.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Trophy size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <p>No standings yet. Be the first to solve a problem!</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                      {['Rank', 'Participant', 'Solved', 'Score', 'Penalty'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, i) => (
                      <tr key={entry.user_id} style={{
                        borderBottom: '1px solid var(--border-light)',
                        background: i < 3 ? `rgba(168,85,247,${0.05 - i * 0.015})` : 'transparent',
                      }}>
                        <td style={{ padding: '12px 16px' }}>
                          {!entry.rank ? <span style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>Unranked</span> : entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>#{entry.rank}</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {entry.display_name || entry.username}
                          {entry.user_id === currentUser?.id && (
                            <span style={{ marginLeft: 6, fontSize: 10, color: '#a855f7', fontWeight: 700 }}>YOU</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#22c55e', fontWeight: 700 }}>{entry.solved_count}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#f59e0b', fontWeight: 700 }}>{entry.score}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{entry.penalty_minutes}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Registration Card */}
        <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Countdown / Status card */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border-light)',
            borderRadius: 16, padding: 22, textAlign: 'center',
          }}>
            {isLive && (
              <>
                <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  🔴 Contest is LIVE
                </div>
                <Countdown targetTime={contest.end_time} label="Time Remaining" color="#22c55e" />
              </>
            )}
            {isRegistrationOpen && (
              <>
                <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  📋 Registration Open
                </div>
                <Countdown targetTime={contest.start_time} label="Starts In" color="#f59e0b" />
              </>
            )}
            {contest.status === 'SCHEDULED' && (
              <>
                <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  📅 Upcoming
                </div>
                <Countdown targetTime={contest.start_time} label="Opens In" color="#6366f1" />
              </>
            )}
            {isCompleted && (
              <div style={{ padding: '20px 0' }}>
                <CheckCircle size={36} style={{ color: '#6b7280', marginBottom: 10 }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Contest Ended</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Ended: {formatDateTime(contest.end_time)}</div>
              </div>
            )}
          </div>

          {/* Action Card */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 16, padding: 22 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
              {contest.participant_count || 0} participants registered
            </div>

            {regError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, color: '#ef4444', marginBottom: 12 }}>
                {regError}
              </div>
            )}

            {/* Enter Contest - LIVE + registered */}
            {isLive && (isRegistered || userAttempt) && (
              <button
                id="enter-contest-btn"
                onClick={() => onEnterContest(contestId)}
                style={{
                  width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
                }}
              >
                <Play size={18} /> Enter Contest
              </button>
            )}

            {/* Join Live Contest - LIVE + not registered */}
            {isLive && !isRegistered && !userAttempt && (
              <button
                id="join-live-contest-btn"
                onClick={() => onEnterContest(contestId)}
                style={{
                  width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 15,
                }}
              >
                ⚡ Join Live Contest
              </button>
            )}

            {/* Register - Registration Open / Scheduled, not yet registered */}
            {(isRegistrationOpen || contest.status === 'SCHEDULED') && !isRegistered && (
              <button
                type="button"
                id="register-contest-btn"
                onClick={handleRegister}
                disabled={registering}
                style={{
                  width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#fff', fontWeight: 800, cursor: registering ? 'not-allowed' : 'pointer', fontSize: 15,
                  opacity: registering ? 0.7 : 1,
                  boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
                }}
              >
                {registering ? '⏳ Registering...' : '📋 Register for Contest'}
              </button>
            )}

            {/* Already Registered */}
            {(isRegistrationOpen || contest.status === 'SCHEDULED') && isRegistered && (
              <div>
                <div style={{
                  width: '100%', padding: '13px', borderRadius: 10,
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                  color: '#22c55e', fontWeight: 700, fontSize: 15, textAlign: 'center',
                  marginBottom: 10,
                }}>
                  <CheckCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
                  Registered
                </div>
                <button
                  type="button"
                  onClick={handleCancelReg}
                  disabled={registering}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border-light)',
                    background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12,
                  }}
                >
                  Cancel Registration
                </button>
              </div>
            )}

            {/* View Results - Completed */}
            {isCompleted && userAttempt && (
              <button
                id="view-contest-results-btn"
                onClick={() => onViewResults(contestId)}
                style={{
                  width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 15,
                }}
              >
                🏆 View My Results
              </button>
            )}

            {/* Not logged in */}
            {!token && !isCompleted && (
              <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 13, color: 'var(--text-muted)' }}>
                <Lock size={14} style={{ marginRight: 4, display: 'inline' }} />
                Log in to register or join
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 16 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>Quick Info</h4>
            {[
              { label: 'Duration', value: formatDuration(contest.duration_minutes) },
              { label: 'Type', value: contest.contest_type || 'Coding' },
              { label: 'Difficulty', value: contest.difficulty },
              { label: 'Visibility', value: contest.visibility },
              contest.security_enabled && { label: 'Security', value: '🔒 Enabled' },
            ].filter(Boolean).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
