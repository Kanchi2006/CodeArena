import React, { useState, useEffect } from 'react';
import { 
  Award, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Clock, 
  Layers, 
  Check, 
  X, 
  Download, 
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  HelpCircle,
  Code
} from 'lucide-react';

export default function UserAssessmentResultPage({ attemptId, token, onBack, onRetake }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResultDetails();
  }, [attemptId, token]);

  const fetchResultDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/assessment-attempts/${attemptId}/result`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to load assessment result.');
      }
    } catch (err) {
      setError('Network communication error.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '12px', fontSize: '0.9rem' }}>Calculating assessment performance report...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
        <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 12px auto' }} />
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '8px' }}>Result Unavailable</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '20px' }}>{error || 'Result record could not be loaded.'}</p>
        <button onClick={onBack} className="btn btn-secondary">
          ← Back to Assessments
        </button>
      </div>
    );
  }

  const isPassed = result.isPassed;
  const breakdown = result.questionBreakdown || [];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '48px' }}>
      
      {/* Navigation Header */}
      <button
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.88rem', cursor: 'pointer', fontWeight: '600' }}
      >
        <ArrowLeft size={16} /> Back to Assessments Hub
      </button>

      {/* Main Score Hero Card */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '32px', 
          borderRadius: '20px', 
          background: isPassed 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-panel) 100%)' 
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-panel) 100%)',
          border: isPassed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span 
              style={{ 
                padding: '5px 14px', 
                borderRadius: '20px', 
                fontSize: '0.8rem', 
                fontWeight: '800', 
                letterSpacing: '0.04em',
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px',
                width: 'fit-content',
                background: isPassed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isPassed ? '#10b981' : '#ef4444',
                border: isPassed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              {isPassed ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              <span>{isPassed ? 'PASSED ASSESSMENT' : 'FAILED ASSESSMENT'}</span>
            </span>

            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              {result.assessmentTitle}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Submitted on: <strong>{result.submissionTime ? new Date(result.submissionTime).toLocaleString() : 'N/A'}</strong> • Attempt #{result.attemptNumber}
              </p>

              {/* Security Status Badge */}
              {result.status === 'TERMINATED' ? (
                <span style={{ padding: '3px 10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} /> Assessment Terminated — {result.terminationReason || 'Security Violation'}
                </span>
              ) : result.warningCount > 0 ? (
                <span style={{ padding: '3px 10px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} /> ⚠ {result.warningCount} Security Warning(s) Recorded
                </span>
              ) : (
                <span style={{ padding: '3px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} /> ✓ No Security Violations Detected
                </span>
              )}
            </div>
          </div>

          {/* Large Score Circle / Badge */}
          <div 
            style={{ 
              padding: '20px 28px', 
              borderRadius: '16px', 
              background: 'var(--bg-input)', 
              border: '1px solid var(--border-light)',
              textAlign: 'center',
              minWidth: '170px'
            }}
          >
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: isPassed ? '#10b981' : '#ef4444', lineHeight: '1' }}>
              {result.percentage}%
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '600' }}>
              Score: {result.totalEarnedMarks} / {result.totalPossibleMarks} Marks
            </div>
          </div>
        </div>

        {/* Certificate Claim Banner */}
        {isPassed && result.certificate && (
          <div 
            style={{ 
              padding: '18px 24px', 
              borderRadius: '14px', 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={24} color="#f59e0b" />
              </div>
              <div>
                <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  Verified Certificate Earned!
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Credential ID: <strong style={{ color: '#6366f1', fontFamily: 'monospace' }}>{result.certificate.verification_code}</strong>
                </p>
              </div>
            </div>

            <a
              href={`/certificate/${result.certificate.verification_code}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{ textDecoration: 'none', padding: '10px 20px', fontSize: '0.88rem', gap: '8px' }}
            >
              <ExternalLink size={15} /> View Official Certificate
            </a>
          </div>
        )}
      </div>

      {/* Overview Performance Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', textAlign: 'center' }}>
          <Layers size={22} color="#6366f1" style={{ margin: '0 auto 8px auto' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)' }}>{breakdown.length}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Total Questions</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', textAlign: 'center' }}>
          <CheckCircle size={22} color="#10b981" style={{ margin: '0 auto 8px auto' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>
            {breakdown.filter(q => q.isCorrect).length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Correct Answers</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', textAlign: 'center' }}>
          <X size={22} color="#ef4444" style={{ margin: '0 auto 8px auto' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ef4444' }}>
            {breakdown.filter(q => q.isAnswered && !q.isCorrect).length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Incorrect Answers</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', textAlign: 'center' }}>
          <Clock size={22} color="#f59e0b" style={{ margin: '0 auto 8px auto' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f59e0b' }}>
            {breakdown.filter(q => !q.isAnswered).length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Unanswered</div>
        </div>
      </div>

      {/* Question-Wise Performance Breakdown List */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Question-Wise Performance Breakdown
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Detailed view of your responses, awarded marks, and official explanations.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {breakdown.map((q, idx) => (
            <div 
              key={q.questionId || idx}
              style={{
                padding: '20px',
                borderRadius: '12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              {/* Question Item Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--primary-glow)', color: '#6366f1', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: '#6366f1', padding: '3px 10px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    {q.questionType}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Marks: <strong style={{ color: 'var(--text-main)' }}>{q.earnedScore} / {q.marks}</strong>
                  </span>

                  {q.isCorrect ? (
                    <span style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.78rem', fontWeight: '700', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Correct
                    </span>
                  ) : q.isAnswered ? (
                    <span style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.78rem', fontWeight: '700', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <X size={14} /> Incorrect
                    </span>
                  ) : (
                    <span style={{ padding: '4px 10px', borderRadius: '6px', background: 'var(--bg-panel)', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: '600', border: '1px solid var(--border-light)' }}>
                      Unanswered
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: '500', lineHeight: '1.6', margin: 0 }}>
                {q.questionText}
              </p>

              {/* Submitted Code Snippet if present */}
              {q.candidateResponse && q.candidateResponse.coding_source && (
                <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '6px 12px', background: '#0f172a', borderBottom: '1px solid #1e293b', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Code size={13} color="#6366f1" /> Submitted Code Solution
                  </div>
                  <pre style={{ padding: '12px 16px', margin: 0, fontFamily: 'monospace', fontSize: '0.82rem', color: '#6EE7B7', overflowX: 'auto' }}>
                    <code>{q.candidateResponse.coding_source}</code>
                  </pre>
                </div>
              )}

              {/* Official Explanation Panel if available */}
              {q.explanation && (
                <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6366f1', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HelpCircle size={14} /> Explanation:
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

