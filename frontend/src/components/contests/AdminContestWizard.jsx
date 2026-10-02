import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Save, Trophy, Calendar, Clock, Users, Code,
  Plus, Trash2, CheckCircle, AlertTriangle, Loader2, Globe,
  Lock, Shield, Award, ChevronDown, ChevronUp, Search, X
} from 'lucide-react';

const API_BASE = '/api';

const DEFAULT_CONTEST = {
  title: '',
  short_description: '',
  description: '',
  instructions: '',
  banner_url: '',
  contest_type: 'CODING',
  difficulty: 'Medium',
  visibility: 'PUBLIC',
  registration_required: true,
  registration_start: '',
  registration_deadline: '',
  start_time: '',
  end_time: '',
  duration_minutes: 120,
  max_participants: 0,
  negative_marking: false,
  negative_marks_per_wrong: 10,
  time_penalty_per_wrong_min: 10,
  max_submissions_per_problem: 0,
  allowed_languages: ['javascript', 'python', 'cpp', 'java'],
  leaderboard_enabled: true,
  leaderboard_frozen: false,
  certificate_enabled: false,
  security_enabled: true,
  problem_ids: [],
};

const ALL_LANGS = ['javascript', 'python', 'cpp', 'java', 'c', 'go', 'rust'];

function toLocalDatetimeValue(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminContestWizard({ contestId, token, onBack, onSaveSuccess, isOrgContest = false }) {
  const [form, setForm] = useState({ ...DEFAULT_CONTEST });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [problems, setProblems] = useState([]);
  const [problemSearch, setProblemSearch] = useState('');
  const [showProblems, setShowProblems] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const isEdit = Boolean(contestId);

  useEffect(() => {
    loadProblems();
    if (contestId) loadContest();
  }, [contestId]);

  const loadProblems = async () => {
    try {
      const res = await fetch(`${API_BASE}/problems`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setProblems(Array.isArray(data) ? data : (data.problems || []));
    } catch {}
  };

  const loadContest = async () => {
    setLoading(true);
    try {
      const endpoint = isOrgContest ? `${API_BASE}/organization/contests/${contestId}` : `${API_BASE}/admin/contests/${contestId}`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({
        ...DEFAULT_CONTEST,
        ...data,
        allowed_languages: Array.isArray(data.allowed_languages) ? data.allowed_languages : ['javascript', 'python', 'cpp', 'java'],
        problem_ids: Array.isArray(data.problems) ? data.problems.map(p => p.id || p) : [],
        registration_start: toLocalDatetimeValue(data.registration_start),
        registration_deadline: toLocalDatetimeValue(data.registration_deadline),
        start_time: toLocalDatetimeValue(data.start_time),
        end_time: toLocalDatetimeValue(data.end_time),
      });
    } catch (e) {
      setError(e.message || 'Failed to load contest');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const toggleLang = (lang) => {
    setForm(prev => ({
      ...prev,
      allowed_languages: prev.allowed_languages.includes(lang)
        ? prev.allowed_languages.filter(l => l !== lang)
        : [...prev.allowed_languages, lang]
    }));
  };

  const handleProblemToggle = (problemId) => {
    setForm(prev => ({
      ...prev,
      problem_ids: prev.problem_ids.includes(problemId)
        ? prev.problem_ids.filter(id => id !== problemId)
        : [...prev.problem_ids, problemId]
    }));
  };

  const handleSave = async (status = null) => {
    if (!form.title.trim()) { setError('Contest title is required.'); return; }
    if (!form.start_time) { setError('Start time is required.'); return; }
    if (!form.end_time) { setError('End time is required.'); return; }
    if (new Date(form.start_time) >= new Date(form.end_time)) { setError('End time must be after start time.'); return; }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        ...form,
        status: status || (isEdit ? form.status : 'SCHEDULED'),
        start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
        registration_start: form.registration_start ? new Date(form.registration_start).toISOString() : null,
        registration_deadline: form.registration_deadline ? new Date(form.registration_deadline).toISOString() : null,
      };

      const baseEndpoint = isOrgContest ? `${API_BASE}/organization/contests` : `${API_BASE}/admin/contests`;
      const url = isEdit ? `${baseEndpoint}/${contestId}` : baseEndpoint;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const contentType = res.headers.get('content-type');
      let data = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(res.ok ? 'Unexpected response' : `Server error (${res.status}): Please check backend route.`);
      }

      if (!res.ok) throw new Error(data.error || 'Save failed');

      setSuccessMsg(isEdit ? 'Contest updated successfully!' : 'Contest created successfully!');
      setTimeout(() => onSaveSuccess?.(), 1500);
    } catch (e) {
      setError(e.message || 'Failed to save contest');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#a855f7' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const sections = [
    { key: 'basic', label: 'Basic Info', icon: <Trophy size={15} /> },
    { key: 'schedule', label: 'Schedule', icon: <Calendar size={15} /> },
    { key: 'problems', label: 'Problems', icon: <Code size={15} /> },
    { key: 'rules', label: 'Rules & Scoring', icon: <Award size={15} /> },
    { key: 'security', label: 'Security', icon: <Shield size={15} /> },
  ];

  const selectedProblems = problems.filter(p => form.problem_ids.includes(p.id));
  const filteredProblems = problems.filter(p =>
    !form.problem_ids.includes(p.id) &&
    (!problemSearch.trim() || p.title.toLowerCase().includes(problemSearch.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--border-light)' }} />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Contest' : 'Create New Contest'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleSave('DRAFT')}
            disabled={saving}
            style={{
              padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border-light)',
              background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: 13,
              opacity: saving ? 0.6 : 1,
            }}
          >
            Save as Draft
          </button>
          <button
            id="save-contest-btn"
            onClick={() => handleSave()}
            disabled={saving}
            style={{
              padding: '9px 20px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: saving ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
            {saving ? 'Saving...' : (isEdit ? 'Update Contest' : 'Create Contest')}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, marginBottom: 16, color: '#ef4444', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, marginBottom: 16, color: '#22c55e', display: 'flex', gap: 8, alignItems: 'center' }}>
          <CheckCircle size={15} /> {successMsg}
        </div>
      )}

      {/* Layout */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Section Nav */}
        <div style={{ width: 180, flexShrink: 0, position: 'sticky', top: 20 }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 14, overflow: 'hidden' }}>
            {sections.map(s => (
              <button
                key={s.key}
                id={`wizard-section-${s.key}`}
                onClick={() => setActiveSection(s.key)}
                style={{
                  width: '100%', padding: '12px 16px', border: 'none', cursor: 'pointer',
                  background: activeSection === s.key ? 'rgba(168,85,247,0.12)' : 'transparent',
                  color: activeSection === s.key ? '#c084fc' : 'var(--text-secondary)',
                  fontWeight: activeSection === s.key ? 700 : 500,
                  fontSize: 13, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                  borderLeft: `3px solid ${activeSection === s.key ? '#a855f7' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div style={{ flex: 1 }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: 16, padding: 28 }}>
            
            {/* Basic Info */}
            {activeSection === 'basic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Basic Information</h2>

                <div>
                  <label style={labelStyle}>Contest Title *</label>
                  <input id="contest-title" value={form.title} onChange={e => handleChange('title', e.target.value)} style={inputStyle} placeholder="e.g. CodeArena Weekly Challenge #43" />
                </div>

                <div>
                  <label style={labelStyle}>Short Description</label>
                  <input value={form.short_description} onChange={e => handleChange('short_description', e.target.value)} style={inputStyle} placeholder="One-line summary shown in contest cards" maxLength={200} />
                </div>

                <div>
                  <label style={labelStyle}>Full Description</label>
                  <textarea value={form.description} onChange={e => handleChange('description', e.target.value)} style={{ ...inputStyle, height: 120, resize: 'vertical' }} placeholder="Describe the contest in detail..." />
                </div>

                <div>
                  <label style={labelStyle}>Instructions / Rules</label>
                  <textarea value={form.instructions} onChange={e => handleChange('instructions', e.target.value)} style={{ ...inputStyle, height: 100, resize: 'vertical' }} placeholder="Rules participants must follow..." />
                </div>

                <div>
                  <label style={labelStyle}>Banner Image URL</label>
                  <input value={form.banner_url} onChange={e => handleChange('banner_url', e.target.value)} style={inputStyle} placeholder="https://images.unsplash.com/..." />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Contest Type</label>
                    <select value={form.contest_type} onChange={e => handleChange('contest_type', e.target.value)} style={selectStyle}>
                      <option value="CODING">Coding</option>
                      <option value="MCQ">MCQ</option>
                      <option value="MIXED">Mixed</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Difficulty</label>
                    <select value={form.difficulty} onChange={e => handleChange('difficulty', e.target.value)} style={selectStyle}>
                      {['Beginner', 'Easy', 'Medium', 'Hard', 'Advanced'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Visibility</label>
                    <select value={form.visibility} onChange={e => handleChange('visibility', e.target.value)} style={selectStyle}>
                      <option value="PUBLIC">Public</option>
                      <option value="PRIVATE">Private</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Allowed Languages</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {ALL_LANGS.map(lang => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLang(lang)}
                        style={{
                          padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border-light)',
                          background: form.allowed_languages.includes(lang) ? 'rgba(168,85,247,0.15)' : 'transparent',
                          color: form.allowed_languages.includes(lang) ? '#c084fc' : 'var(--text-muted)',
                          cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                          borderColor: form.allowed_languages.includes(lang) ? 'rgba(168,85,247,0.5)' : 'var(--border-light)',
                        }}
                      >{lang}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Schedule */}
            {activeSection === 'schedule' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Schedule</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Start Time *</label>
                    <input type="datetime-local" value={form.start_time} onChange={e => handleChange('start_time', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>End Time *</label>
                    <input type="datetime-local" value={form.end_time} onChange={e => handleChange('end_time', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Registration Opens</label>
                    <input type="datetime-local" value={form.registration_start} onChange={e => handleChange('registration_start', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Registration Deadline</label>
                    <input type="datetime-local" value={form.registration_deadline} onChange={e => handleChange('registration_deadline', e.target.value)} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Duration (minutes)</label>
                    <input type="number" value={form.duration_minutes} onChange={e => handleChange('duration_minutes', parseInt(e.target.value) || 120)} style={inputStyle} min="1" max="1440" />
                  </div>
                  <div>
                    <label style={labelStyle}>Max Participants (0 = unlimited)</label>
                    <input type="number" value={form.max_participants} onChange={e => handleChange('max_participants', parseInt(e.target.value) || 0)} style={inputStyle} min="0" />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="reg-required" checked={form.registration_required} onChange={e => handleChange('registration_required', e.target.checked)} />
                  <label htmlFor="reg-required" style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>Require prior registration to participate</label>
                </div>
              </div>
            )}

            {/* Problems */}
            {activeSection === 'problems' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Contest Problems <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>({form.problem_ids.length} selected)</span>
                </h2>

                {/* Selected Problems */}
                {selectedProblems.length > 0 && (
                  <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 12, color: '#c084fc', fontWeight: 700, marginBottom: 10 }}>Selected Problems</div>
                    {selectedProblems.map((p, i) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < selectedProblems.length - 1 ? '1px solid rgba(168,85,247,0.1)' : 'none' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 24 }}>#{i + 1}</span>
                        <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{p.title}</span>
                        <span style={{ fontSize: 12, color: p.difficulty === 'Easy' ? '#22c55e' : p.difficulty === 'Hard' ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{p.difficulty}</span>
                        <button onClick={() => handleProblemToggle(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Problems */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Add from Problem Bank</div>
                  </div>
                  <div style={{ position: 'relative', marginBottom: 10 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search problems..."
                      value={problemSearch}
                      onChange={e => setProblemSearch(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 36 }}
                    />
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 10 }}>
                    {filteredProblems.slice(0, 30).map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleProblemToggle(p.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                          cursor: 'pointer', borderBottom: '1px solid var(--border-light)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Plus size={14} style={{ color: '#a855f7', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>{p.title}</span>
                        <span style={{ fontSize: 12, color: p.difficulty === 'Easy' ? '#22c55e' : p.difficulty === 'Hard' ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{p.difficulty}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.category}</span>
                      </div>
                    ))}
                    {filteredProblems.length === 0 && (
                      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {problemSearch ? 'No matching problems.' : 'All problems already selected.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rules & Scoring */}
            {activeSection === 'rules' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Rules & Scoring</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Enable Leaderboard', key: 'leaderboard_enabled' },
                    { label: 'Freeze Leaderboard', key: 'leaderboard_frozen' },
                    { label: 'Award Certificates', key: 'certificate_enabled' },
                    { label: 'Negative Marking', key: 'negative_marking' },
                  ].map(opt => (
                    <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="checkbox"
                        id={opt.key}
                        checked={form[opt.key]}
                        onChange={e => handleChange(opt.key, e.target.checked)}
                      />
                      <label htmlFor={opt.key} style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>{opt.label}</label>
                    </div>
                  ))}
                </div>

                {form.negative_marking && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Negative Marks per Wrong Answer</label>
                      <input type="number" value={form.negative_marks_per_wrong} onChange={e => handleChange('negative_marks_per_wrong', parseFloat(e.target.value) || 0)} style={inputStyle} min="0" step="0.5" />
                    </div>
                    <div>
                      <label style={labelStyle}>Time Penalty per Wrong (minutes)</label>
                      <input type="number" value={form.time_penalty_per_wrong_min} onChange={e => handleChange('time_penalty_per_wrong_min', parseInt(e.target.value) || 0)} style={inputStyle} min="0" />
                    </div>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Max Submissions per Problem (0 = unlimited)</label>
                  <input type="number" value={form.max_submissions_per_problem} onChange={e => handleChange('max_submissions_per_problem', parseInt(e.target.value) || 0)} style={inputStyle} min="0" />
                </div>
              </div>
            )}

            {/* Security */}
            {activeSection === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Security & Proctoring</h2>

                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: form.security_enabled ? 20 : 0 }}>
                    <input
                      type="checkbox"
                      id="security_enabled"
                      checked={form.security_enabled}
                      onChange={e => {
                        handleChange('security_enabled', e.target.checked);
                        if (e.target.checked && !form.security_config) {
                          handleChange('security_config', {
                            requireWebcam: true, requireMicrophone: false,
                            requireScreenShare: true, requireFullscreen: true,
                            detectTabSwitch: true, detectVisibilityChange: true,
                            preventCopy: true, preventCut: true, preventPaste: true,
                            preventRightClick: true, maxAllowedWarnings: 3, maxViolationAction: 'terminate'
                          });
                        }
                      }}
                    />
                    <label htmlFor="security_enabled" style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700 }}>
                      Enable Security Monitoring & Proctoring
                    </label>
                  </div>

                  {form.security_enabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Hardware & Permissions</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {[
                            { key: 'requireWebcam', label: '📷 Require Webcam' },
                            { key: 'requireMicrophone', label: '🎤 Require Microphone' },
                            { key: 'requireScreenShare', label: '🖥️ Require Screen Share' },
                            { key: 'requireFullscreen', label: '⛶ Require Fullscreen' },
                          ].map(opt => (
                            <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-light)' }}>
                              <input
                                type="checkbox"
                                checked={form.security_config?.[opt.key] || false}
                                onChange={e => handleChange('security_config', { ...(form.security_config || {}), [opt.key]: e.target.checked })}
                              />
                              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Behavior Detection</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {[
                            { key: 'detectTabSwitch', label: '🔁 Detect Tab Switch' },
                            { key: 'detectVisibilityChange', label: '👁️ Detect Window Focus Loss' },
                          ].map(opt => (
                            <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-light)' }}>
                              <input
                                type="checkbox"
                                checked={form.security_config?.[opt.key] || false}
                                onChange={e => handleChange('security_config', { ...(form.security_config || {}), [opt.key]: e.target.checked })}
                              />
                              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Restrictions</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {[
                            { key: 'preventCopy', label: '🚫 Block Copy' },
                            { key: 'preventCut', label: '🚫 Block Cut' },
                            { key: 'preventPaste', label: '🚫 Block Paste' },
                            { key: 'preventRightClick', label: '🚫 Block Right-Click' },
                          ].map(opt => (
                            <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-light)' }}>
                              <input
                                type="checkbox"
                                checked={form.security_config?.[opt.key] || false}
                                onChange={e => handleChange('security_config', { ...(form.security_config || {}), [opt.key]: e.target.checked })}
                              />
                              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={labelStyle}>Max Warnings Before Termination</label>
                          <input
                            type="number" min="1" max="10"
                            value={form.security_config?.maxAllowedWarnings || 3}
                            onChange={e => handleChange('security_config', { ...(form.security_config || {}), maxAllowedWarnings: parseInt(e.target.value) || 3 })}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>On Max Violations</label>
                          <select
                            value={form.security_config?.maxViolationAction || 'terminate'}
                            onChange={e => handleChange('security_config', { ...(form.security_config || {}), maxViolationAction: e.target.value })}
                            style={selectStyle}
                          >
                            <option value="terminate">Terminate Attempt</option>
                            <option value="warn">Warn Only (no termination)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {form.visibility === 'PRIVATE' && (
                  <div>
                    <label style={labelStyle}>Access Code (for private contest)</label>
                    <input value={form.access_code || ''} onChange={e => handleChange('access_code', e.target.value)} style={inputStyle} placeholder="Enter a secret code participants must use" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
};

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid var(--border-light)', background: 'var(--input-bg, rgba(0,0,0,0.2))',
  color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const selectStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid var(--border-light)', background: 'var(--card-bg)',
  color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer', boxSizing: 'border-box',
};
