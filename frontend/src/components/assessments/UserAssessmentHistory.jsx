import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Award, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowLeft, 
  ExternalLink,
  RotateCcw
} from 'lucide-react';

export default function UserAssessmentHistory({ token, onBack, onOpenResult }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assessments/my-history', {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching assessment history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '48px' }}>
      {/* Back Button */}
      <button
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.88rem', cursor: 'pointer', fontWeight: '600' }}
      >
        <ArrowLeft size={16} /> Back to Assessments Hub
      </button>

      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px 32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText color="#6366f1" size={24} /> My Assessment History
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Review past assessment attempts, scores, and issued certificates.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '12px', fontSize: '0.9rem' }}>Loading attempt history...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <FileText style={{ margin: '0 auto 12px auto', color: 'var(--text-muted)' }} size={44} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '6px' }}>No Assessment Attempts Recorded</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>You have not completed any assessment attempts yet.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '0', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="problems-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assessment</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attempt</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Result</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Certificate</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.attempt_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.9rem' }}>{item.assessment_title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{item.assessment_type} • {item.difficulty}</div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '700', color: 'var(--text-muted)' }}>
                      #{item.attempt_number}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {item.submission_time ? new Date(item.submission_time).toLocaleDateString() : new Date(item.start_time).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: '800', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      {item.percentage}%
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {item.is_passed ? (
                        <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.78rem', fontWeight: '700', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={13} /> Passed
                        </span>
                      ) : (
                        <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.78rem', fontWeight: '700', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={13} /> Failed
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {item.certificate_code ? (
                        <a
                          href={`/certificate/${item.certificate_code}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#6366f1', fontWeight: '700', textDecoration: 'none', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Award size={14} color="#f59e0b" /> View Cert
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => onOpenResult(item.attempt_id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        Results
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

