import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Award, 
  Layers, 
  AlertTriangle, 
  CheckSquare, 
  Square, 
  Play, 
  ArrowLeft, 
  FileText, 
  ShieldCheck, 
  CheckCircle,
  RotateCcw
} from 'lucide-react';

export default function UserAssessmentDetails({ assessmentId, token, onBack, onStartAttempt, onViewResults }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [assessmentId, token]);

  const fetchDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/assessments/${assessmentId}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setDetails(data);
      } else {
        setError(data.error || 'Failed to load assessment details.');
      }
    } catch (err) {
      setError('Network communication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!acknowledged) return;
    setStarting(true);
    setError('');

    try {
      const res = await fetch(`/api/assessments/${details.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok) {
        onStartAttempt(data.attemptId);
      } else {
        setError(data.error || 'Could not start assessment attempt.');
      }
    } catch (err) {
      setError('Server connection error.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '12px', fontSize: '0.9rem' }}>Loading assessment instructions...</p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
        <AlertTriangle size={40} color="#f59e0b" style={{ margin: '0 auto 12px auto' }} />
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '8px' }}>Assessment Error</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '20px' }}>{error || 'Assessment details not found.'}</p>
        <button onClick={onBack} className="btn btn-secondary">
          ← Back to Assessments List
        </button>
      </div>
    );
  }

  const activeAttempt = details.userAttempts ? details.userAttempts.find(a => a.status === 'IN_PROGRESS') : null;
  const completedAttempts = details.userAttempts ? details.userAttempts.filter(a => a.status === 'COMPLETED') : [];

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* Back Button */}
      <button
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.88rem', cursor: 'pointer', fontWeight: '600' }}
      >
        <ArrowLeft size={16} /> Back to All Assessments
      </button>

      {/* Overview Card */}
      <div className="glass-panel" style={{ padding: '32px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '20px' }}>
          <div>
            <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', fontSize: '0.78rem', fontWeight: '700', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'inline-block', marginBottom: '8px' }}>
              {details.category} • {details.assessment_type}
            </span>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{details.title}</h1>
          </div>
          <span style={{ padding: '6px 14px', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '600', border: '1px solid var(--border-light)' }}>
            Difficulty: <strong style={{ color: '#6366f1' }}>{details.difficulty}</strong>
          </span>
        </div>

        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
          {details.description || 'No detailed overview provided for this assessment.'}
        </p>

        {/* Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', textAlign: 'center' }}>
            <Clock size={22} color="#6366f1" style={{ margin: '0 auto 6px auto' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>{details.duration_minutes} Mins</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration Limit</div>
          </div>
          <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', textAlign: 'center' }}>
            <Layers size={22} color="#a855f7" style={{ margin: '0 auto 6px auto' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>{details.totalQuestions || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Questions</div>
          </div>
          <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', textAlign: 'center' }}>
            <Award size={22} color="#f59e0b" style={{ margin: '0 auto 6px auto' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>{details.passing_score_percentage}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Passing Threshold</div>
          </div>
          <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', textAlign: 'center' }}>
            <RotateCcw size={22} color="#10b981" style={{ margin: '0 auto 6px auto' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>{details.attemptsRemaining}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attempts Remaining</div>
          </div>
        </div>

        {/* Marking & Evaluation Rules */}
        <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '10px' }}>Evaluation Rules</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <div>Default Marks: <strong style={{ color: '#10b981' }}>+{details.default_positive_marks || 2}</strong></div>
            <div>Negative Marks: <strong style={{ color: '#ef4444' }}>-{details.default_negative_marks || 0.5}</strong></div>
            <div>Partial Scoring: <strong style={{ color: '#6366f1' }}>{details.partial_scoring_enabled ? 'Enabled' : 'Disabled'}</strong></div>
            <div>Certificate: <strong style={{ color: '#f59e0b' }}>{details.certificate_enabled ? 'Issued on Pass' : 'N/A'}</strong></div>
          </div>
        </div>
      </div>

      {/* Guidelines & Rules Section */}
      <div className="glass-panel" style={{ padding: '32px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
          <ShieldCheck size={22} color="#6366f1" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Assessment Guidelines & Rules</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <h5 style={{ fontSize: '0.88rem', fontWeight: '700', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <CheckCircle size={16} /> General Guidelines
            </h5>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0, whitespace: 'pre-line' }}>
              {details.instructions || `1. Ensure a stable internet connection before starting.\n2. Total assessment duration is ${details.duration_minutes} minutes.\n3. Negative marking (-0.5) applies to wrong MCQ answers.\n4. You can navigate freely between questions.\n5. Click "Submit Assessment" when finished.`}
            </p>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h5 style={{ fontSize: '0.88rem', fontWeight: '700', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <AlertTriangle size={16} /> Academic Integrity Rules
            </h5>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0, whitespace: 'pre-line' }}>
              {details.rules || `Do not open unauthorized tabs or external resources during the test. Tab switching is monitored and logged.`}
            </p>
          </div>
        </div>

        {/* Checkbox Acknowledgment */}
        <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
          <label 
            onClick={() => setAcknowledged(!acknowledged)}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '14px 16px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}
          >
            {acknowledged ? (
              <CheckSquare size={20} color="#6366f1" />
            ) : (
              <Square size={20} color="var(--text-muted)" />
            )}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '500' }}>
              I have read, understood, and agree to abide by all the assessment guidelines, time constraints, and integrity rules.
            </span>
          </label>
        </div>

        {/* Action Button Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', paddingTop: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {activeAttempt ? (
              <span style={{ color: '#f59e0b', fontWeight: '700' }}>You have an active in-progress attempt for this assessment.</span>
            ) : completedAttempts.length > 0 ? (
              <span>Previous attempt score: <strong style={{ color: 'var(--text-main)' }}>{completedAttempts[0].percentage}%</strong></span>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {completedAttempts.length > 0 && (
              <button
                onClick={() => onViewResults(completedAttempts[0].attempt_id)}
                className="btn btn-secondary"
                style={{ padding: '12px 20px', fontSize: '0.88rem' }}
              >
                <FileText size={16} /> View Last Result
              </button>
            )}

            <button
              disabled={(!acknowledged && !activeAttempt) || starting}
              onClick={handleStart}
              className="btn btn-primary"
              style={{
                padding: '12px 32px',
                fontSize: '0.95rem',
                fontWeight: '700',
                opacity: (!acknowledged && !activeAttempt) || starting ? 0.5 : 1,
                cursor: (!acknowledged && !activeAttempt) || starting ? 'not-allowed' : 'pointer'
              }}
            >
              {starting ? 'Initializing Attempt...' : activeAttempt ? '▶ Resume Active Attempt' : '▶ Start Assessment Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
