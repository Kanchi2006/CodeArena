import React, { useState, useEffect } from 'react';
import {
  Trophy, CheckCircle, Clock, Users, Star, Award, ArrowLeft,
  Share2, Download, Loader2, AlertTriangle, Medal
} from 'lucide-react';

const API_BASE = '/api';

function formatDuration(seconds) {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);
  return parts.join(' ') || '0s';
}

export default function ContestResultPage({ contestId, token, currentUser, onBack }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadResult();
  }, [contestId]);

  const loadResult = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/contests/${contestId}/results`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load results');
      setResult(data);
    } catch (e) {
      setError(e.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#a855f7' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading your results...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <AlertTriangle size={40} style={{ color: '#ef4444', marginBottom: 12 }} />
        <p style={{ color: '#ef4444' }}>{error}</p>
        <button onClick={onBack} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          ← Back
        </button>
      </div>
    );
  }

  if (!result) return null;

  const { contest, attempt, certificate } = result;
  const rank = attempt?.rank_position ? Number(attempt.rank_position) : null;
  const totalParticipants = attempt?.total_participants || 1;
  const score = parseFloat(attempt?.score || 0);
  const solved = attempt?.solved_count || 0;
  const penalty = attempt?.penalty_minutes || 0;
  const rankPercent = rank ? Math.round((1 - (rank - 1) / totalParticipants) * 100) : 0;

  // Rank decoration
  const rankDisplay = !rank ? 'Unranked' : rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  const rankGradient = rank && rank <= 3
    ? ['linear-gradient(135deg, #fbbf24, #f59e0b)', 'linear-gradient(135deg, #9ca3af, #6b7280)', 'linear-gradient(135deg, #f97316, #ea580c)'][rank - 1]
    : 'linear-gradient(135deg, #6366f1, #a855f7)';

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 0' }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, marginBottom: 24, fontWeight: 500 }}
      >
        <ArrowLeft size={16} /> Back to Contests
      </button>

      {/* Hero Result Card */}
      <div style={{
        borderRadius: 20, padding: 36, textAlign: 'center', marginBottom: 24,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(168,85,247,0.15)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 88, height: 88, borderRadius: '50%',
            background: rankGradient,
            fontSize: 36, marginBottom: 16,
            boxShadow: '0 8px 32px rgba(168,85,247,0.4)',
          }}>
            {rank <= 3 ? rankDisplay : <Trophy size={36} color="#fff" />}
          </div>

          <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: '#fff' }}>
            {rank <= 3 ? 'Congratulations!' : 'Contest Complete!'}
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.75)' }}>
            {contest?.title}
          </p>

          {/* Big stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 28 }}>
            <div>
              <div style={{ fontSize: rank ? 40 : 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                {rankDisplay}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Rank</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.15)' }} />
            <div>
              <div style={{ fontSize: 40, fontWeight: 900, color: '#c084fc', lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Score</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.15)' }} />
            <div>
              <div style={{ fontSize: 40, fontWeight: 900, color: '#34d399', lineHeight: 1 }}>{solved}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Solved</div>
            </div>
          </div>

          {/* Percentile */}
          {rank && totalParticipants > 1 && (
            <div style={{
              marginTop: 20, display: 'inline-block',
              padding: '8px 20px', borderRadius: 20,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            }}>
              <span style={{ color: '#c084fc', fontWeight: 700, fontSize: 14 }}>
                Top {100 - rankPercent < 1 ? '< 1' : 100 - rankPercent}% of {totalParticipants} participants
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { icon: <Trophy size={18} />, label: 'Final Rank', value: rankDisplay, color: '#f59e0b' },
          { icon: <Star size={18} />, label: 'Score', value: score, color: '#a855f7' },
          { icon: <CheckCircle size={18} />, label: 'Problems Solved', value: solved, color: '#22c55e' },
          { icon: <Clock size={18} />, label: 'Penalty', value: `${penalty}m`, color: '#6b7280' },
          { icon: <Users size={18} />, label: 'Total Participants', value: totalParticipants, color: '#6366f1' },
          { icon: <Award size={18} />, label: 'Certificate', value: certificate ? 'Earned' : 'N/A', color: certificate ? '#f59e0b' : '#6b7280' },
        ].map((item, i) => (
          <div key={i} style={{
            background: 'var(--card-bg)', border: '1px solid var(--border-light)',
            borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: `${item.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: item.color }}>{item.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Certificate */}
      {certificate && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.12) 100%)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 16, padding: 24, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
            }}>
              <Award size={28} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                🏆 Certificate Awarded
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                {contest?.title} — {certificate.cert_type === 'WINNER' ? 'Winner' : certificate.cert_type === 'COMPLETION' ? 'Completion' : 'Participation'} Certificate
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                Code: {certificate.certificate_code}
              </div>
            </div>
            <button
              style={{
                padding: '10px 18px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: '#1e1b4b', fontWeight: 800, cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Download size={14} /> Download
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={onBack}
          style={{
            padding: '12px 28px', borderRadius: 10, border: '1px solid var(--border-light)',
            background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: 14,
          }}
        >
          ← Back to Contests
        </button>
        <button
          style={{
            padding: '12px 28px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Share2 size={15} /> Share Result
        </button>
      </div>
    </div>
  );
}
