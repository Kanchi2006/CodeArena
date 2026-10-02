import React, { useState, useEffect } from 'react';
import { 
  Shield, CheckSquare, Plus, Trash2, Edit2, AlertCircle, 
  FileText, Lock, ChevronRight, Check
} from 'lucide-react';

export default function RulesAndGuidelines({
  type = 'contest', // 'contest' or 'assessment'
  targetId,
  isOrganizerOrAdmin = false,
  securitySettings = null,
  onAccept,
  hasAccepted = false,
  theme = 'dark'
}) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [accepted, setAccepted] = useState(hasAccepted);

  // New Rule Form
  const [ruleForm, setRuleForm] = useState({
    title: '',
    description: '',
    rule_category: 'General',
    display_order: 0
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (targetId) {
      fetchRules();
    } else {
      setLoading(false);
    }
  }, [type, targetId]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const endpoint = type === 'contest' ? `/api/contests/${targetId}/rules` : `/api/assessments/${targetId}/rules`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Error fetching rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!ruleForm.title.trim() || !ruleForm.description.trim()) return;
    try {
      const endpoint = type === 'contest' ? `/api/contests/${targetId}/rules` : `/api/assessments/${targetId}/rules`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(ruleForm)
      });
      if (res.ok) {
        setShowAddForm(false);
        setRuleForm({ title: '', description: '', rule_category: 'General', display_order: rules.length + 1 });
        fetchRules();
      }
    } catch (err) {
      console.error('Error saving rule:', err);
    }
  };

  const defaultContestRules = [
    { title: '1. Individual Participation', description: 'Participants must use their own registered CodeArena account. Sharing solutions or account access is strictly prohibited.' },
    { title: '2. Original Code Submission', description: 'All submitted solutions must be written independently during the contest window. External assistance is prohibited unless allowed by rules.' },
    { title: '3. Plagiarism & Integrity', description: 'Code submissions are analyzed using automated plagiarism detectors. Matches will result in immediate disqualification.' },
    { title: '4. Scoring & Leaderboard', description: 'Submissions are scored automatically based on correctness and execution efficiency. Ties are resolved by fastest submission timestamp.' }
  ];

  const defaultAssessmentRules = [
    { title: '1. Fixed Time Limit', description: 'The assessment timer starts as soon as you click "Start Assessment". Late submissions are automatically submitted.' },
    { title: '2. Question Format & Navigation', description: 'Answer all multiple choice and coding questions within the allotted duration.' },
    { title: '3. Retake Policy', description: 'Only your first attempt is scored unless an administrator explicitly grants a retake opportunity.' }
  ];

  const displayRules = rules.length > 0 ? rules : (type === 'contest' ? defaultContestRules : defaultAssessmentRules);

  const styles = {
    card: {
      background: theme === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
      border: '1px solid rgba(108, 77, 255, 0.2)',
      borderRadius: '16px',
      padding: '28px',
      color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
      fontFamily: "'Inter', sans-serif"
    },
    title: {
      fontSize: '1.4rem',
      fontWeight: 800,
      margin: '0 0 16px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    secBox: {
      background: 'rgba(108, 77, 255, 0.1)',
      border: '1px solid rgba(108, 77, 255, 0.25)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '24px'
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #6c4dff 0%, #5638d8 100%)',
      color: '#ffffff',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: 700,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 14px rgba(108, 77, 255, 0.35)'
    }
  };

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={styles.title}>
          <Shield size={24} color="#6c4dff" />
          {type === 'contest' ? 'Contest Rules & Guidelines' : 'Assessment Instructions & Rules'}
        </h3>
        {isOrganizerOrAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{ background: '#6c4dff20', color: '#a78bfa', border: '1px solid #6c4dff40', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >
            + Add Custom Rule
          </button>
        )}
      </div>

      {/* Security Requirements Display if Security settings passed */}
      {securitySettings && (
        <div style={styles.secBox}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 700, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} /> Proctored Security Requirements
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.85rem' }}>
            {securitySettings.requireFullscreen && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
                <Check size={16} /> Fullscreen Enforcement Enabled
              </div>
            )}
            {securitySettings.tabSwitchLimit > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24' }}>
                <AlertCircle size={16} /> Tab Switch Limit: {securitySettings.tabSwitchLimit} Max
              </div>
            )}
            {securitySettings.disableCopyPaste && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171' }}>
                <Lock size={16} /> Copy / Paste Restrictions Applied
              </div>
            )}
            {securitySettings.enableWebcam && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa' }}>
                <Check size={16} /> Webcam Monitoring Active
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rules List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        {displayRules.map((rule, idx) => (
          <div key={rule.id || idx} style={{ background: theme === 'dark' ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>{rule.title}</h4>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8', lineHeight: '1.5' }}>{rule.description}</p>
          </div>
        ))}
      </div>

      {/* Acceptance Checkbox / Confirmation */}
      {onAccept && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#6c4dff' }}
            />
            I have read, understood, and agree to follow all instructions and rules above.
          </label>

          <button
            disabled={!accepted}
            onClick={onAccept}
            style={{ ...styles.btnPrimary, opacity: accepted ? 1 : 0.5, cursor: accepted ? 'pointer' : 'not-allowed' }}
          >
            Proceed to {type === 'contest' ? 'Contest' : 'Assessment'} <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ADD RULE FORM MODAL */}
      {showAddForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(108,77,255,0.3)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 700 }}>Add Rule Item</h3>
            <form onSubmit={handleAddRule}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Rule Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eligibility Policy"
                  value={ruleForm.title}
                  onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(108,77,255,0.3)', background: '#1e293b', color: '#fff' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Rule Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detailed rule text..."
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(108,77,255,0.3)', background: '#1e293b', color: '#fff' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddForm(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ background: '#6c4dff', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
