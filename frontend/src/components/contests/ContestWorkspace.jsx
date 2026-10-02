import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Play, Send, Clock, Trophy, CheckCircle, XCircle,
  AlertTriangle, ChevronLeft, ChevronRight, Loader2, Shield, ShieldAlert,
  Code, Terminal, BookOpen, Eye, EyeOff, Maximize2, RefreshCw,
  Flag, Users, Star, Zap, Camera, Minimize2
} from 'lucide-react';
import PreAssessmentSecurityCheckModal from '../assessments/PreAssessmentSecurityCheckModal';

const API_BASE = '/api';

const LANG_EXTENSIONS = { javascript: 'js', python: 'py', cpp: 'cpp', java: 'java', c: 'c' };
const DEFAULT_CODE = {
  javascript: `function solution() {\n  // Write your solution here\n}\n`,
  python: `def solution():\n    # Write your solution here\n    pass\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`,
  java: `public class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`,
};

function ContestTimer({ expiresAt, onExpired }) {
  const [secs, setSecs] = useState(0);
  const expiredRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecs(remaining);
      if (remaining === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpired?.();
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const isWarning = secs < 300 && secs > 0;
  const isDanger = secs < 60 && secs > 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: isDanger ? 'rgba(239,68,68,0.15)' : isWarning ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.1)',
      border: `1px solid ${isDanger ? 'rgba(239,68,68,0.4)' : isWarning ? 'rgba(245,158,11,0.4)' : 'rgba(99,102,241,0.3)'}`,
      borderRadius: 10, padding: '6px 14px',
      animation: isDanger ? 'timer-pulse 1s ease-in-out infinite' : 'none',
    }}>
      <Clock size={14} style={{ color: isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#a5b4fc' }} />
      <span style={{
        fontVariantNumeric: 'tabular-nums',
        fontSize: 15, fontWeight: 800,
        color: isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#a5b4fc',
        letterSpacing: '0.05em',
      }}>
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    ACCEPTED: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: <CheckCircle size={12} />, label: 'Accepted' },
    WRONG_ANSWER: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: <XCircle size={12} />, label: 'Wrong Answer' },
    TIME_LIMIT: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <Clock size={12} />, label: 'Time Limit' },
    RUNTIME_ERROR: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: <AlertTriangle size={12} />, label: 'Runtime Error' },
    COMPILATION_ERROR: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: <XCircle size={12} />, label: 'Compile Error' },
    PENDING: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />, label: 'Running...' },
    MEMORY_LIMIT: { color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: <AlertTriangle size={12} />, label: 'Memory Limit' },
  }[status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: null, label: status };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, border: `1px solid ${cfg.color}44`,
      color: cfg.color, fontSize: 11, fontWeight: 700,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function ContestWorkspace({ contestId, token, currentUser, onBack, onContestEnd }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProblemIdx, setSelectedProblemIdx] = useState(0);
  const [codes, setCodes] = useState({});
  const [language, setLanguage] = useState('cpp');
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [lastSubmissions, setLastSubmissions] = useState({});
  const [submitResult, setSubmitResult] = useState(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rightTab, setRightTab] = useState('description');
  const [showSidebar, setShowSidebar] = useState(true);
  const [securityWarnings, setSecurityWarnings] = useState(0);
  const [securityMaxWarnings, setSecurityMaxWarnings] = useState(3);

  // Pre-check security gate (mirrors assessment system)
  const [hasPassedPreCheck, setHasPassedPreCheck] = useState(false);
  const [showPreCheckModal, setShowPreCheckModal] = useState(false);
  const [activeWarningModal, setActiveWarningModal] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScreenActive, setIsScreenActive] = useState(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const [isCamMinimized, setIsCamMinimized] = useState(false);

  const videoRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const lastViolationTimeRef = useRef(0);

  // Load session
  useEffect(() => {
    loadSession();
  }, [contestId]);

  const loadSession = async (isStart = true) => {
    setLoading(true);
    setError('');
    try {
      let res, data;
      // Try to recover existing session first
      res = await fetch(`${API_BASE}/contests/${contestId}/participate`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 404 && isStart) {
        // Start fresh
        res = await fetch(`${API_BASE}/contests/${contestId}/start`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
      }

      data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load contest session');

      setSession(data);

      // Normalize security rules_config from contest session
      const rawSecCfg = data.contest?.security_config || {};
      const secEnabled = Boolean(data.contest?.security_enabled);
      
      const secCfg = {
        ...rawSecCfg,
        requireWebcam: Boolean(rawSecCfg.enable_webcam || rawSecCfg.requireWebcam),
        requireMicrophone: Boolean(rawSecCfg.enable_mic || rawSecCfg.requireMicrophone),
        requireScreenShare: Boolean(rawSecCfg.enable_screen_share || rawSecCfg.requireScreenShare),
        requireFullscreen: Boolean(rawSecCfg.enforce_fullscreen || rawSecCfg.requireFullscreen),
        disableCopyPaste: Boolean(rawSecCfg.disable_copy_paste),
        disableRightClick: Boolean(rawSecCfg.disable_right_click),
        detectTabSwitch: Boolean(rawSecCfg.disable_tab_switch),
        maxAllowedWarnings: Number(rawSecCfg.max_warnings || rawSecCfg.maxAllowedWarnings || 3)
      };

      // Store normalized security_config on session
      if (data.contest) {
        data.contest.security_config = secCfg;
      }

      const needsPreCheck = secEnabled && (
        secCfg.requireWebcam || secCfg.requireMicrophone ||
        secCfg.requireScreenShare || secCfg.requireFullscreen
      );

      if (secEnabled) {
        if (needsPreCheck) {
          setShowPreCheckModal(true);
        } else {
          setHasPassedPreCheck(true);
        }
      } else {
        setHasPassedPreCheck(true);
      }

      // Check if already submitted
      if (data.status === 'SUBMITTED' || data.status === 'AUTO_SUBMITTED' || data.status === 'EXPIRED') {
        setSubmitted(true);
        if (data.status === 'EXPIRED') setTimeExpired(true);
      }

      // Initialize codes from existing submissions or starter code
      const initialCodes = {};
      const initialLastSubs = {};
      const initialLangs = {};

      if (data.problems) {
        data.problems.forEach(p => {
          const lastSub = data.submissions?.find(s => s.problem_id === p.id);
          const starterMap = typeof p.starter_code === 'string'
            ? JSON.parse(p.starter_code || '{}')
            : (p.starter_code || {});

          initialCodes[p.id] = {};
          ['javascript', 'python', 'cpp', 'java', 'c'].forEach(lang => {
            initialCodes[p.id][lang] = starterMap[lang] || DEFAULT_CODE[lang] || '';
          });

          if (lastSub) {
            initialCodes[p.id][lastSub.language] = lastSub.source_code;
            initialLangs[p.id] = lastSub.language;
            initialLastSubs[p.id] = lastSub;
          }
        });
      }
      setCodes(initialCodes);
      setLastSubmissions(initialLastSubs);
    } catch (e) {
      setError(e.message || 'Failed to start contest session');
    } finally {
      setLoading(false);
    }
  };

  // Security monitoring — event listeners attached once after pre-check passes
  useEffect(() => {
    if (!session || !hasPassedPreCheck || submitted || timeExpired) return;
    const secEnabled = Boolean(session?.contest?.security_enabled);
    if (!secEnabled) return;
    const secCfg = session?.contest?.security_config || {};

    // Sync initial fullscreen state
    setIsFullscreenActive(Boolean(document.fullscreenElement));

    const handleVisibilityChange = () => {
      if (document.hidden) reportSecurityEvent('TAB_SWITCH');
    };
    const handleBlur = () => reportSecurityEvent('WINDOW_BLUR');
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreenActive(isFull);
      if (!isFull && (secCfg.enforce_fullscreen || secCfg.requireFullscreen)) {
        reportSecurityEvent('FULLSCREEN_EXIT');
      }
    };
    const preventCopy = (e) => { if (secCfg.disable_copy_paste) { e.preventDefault(); reportSecurityEvent('COPY_ATTEMPT'); } };
    const preventPaste = (e) => { if (secCfg.disable_copy_paste) { e.preventDefault(); reportSecurityEvent('PASTE_ATTEMPT'); } };
    const preventCut = (e) => { if (secCfg.disable_copy_paste) { e.preventDefault(); reportSecurityEvent('CUT_ATTEMPT'); } };
    const preventRightClick = (e) => { if (secCfg.disable_right_click) e.preventDefault(); };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('paste', preventPaste);
    document.addEventListener('cut', preventCut);
    document.addEventListener('contextmenu', preventRightClick);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('paste', preventPaste);
      document.removeEventListener('cut', preventCut);
      document.removeEventListener('contextmenu', preventRightClick);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, hasPassedPreCheck, submitted, timeExpired]);

  const reportSecurityEvent = async (eventType) => {
    const now = Date.now();
    if (now - lastViolationTimeRef.current < 2000) return; // 2s debounce — prevents duplicate events
    lastViolationTimeRef.current = now;

    if (!session?.attempt_id) return;
    try {
      const res = await fetch(`${API_BASE}/contests/${contestId}/security-event`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ attempt_id: session.attempt_id, event_type: eventType })
      });
      if (res.ok) {
        const data = await res.json();
        const newCount = data.warning_count || 0;
        // Use server-provided max_warnings — server is authoritative, not client config
        const maxW = data.max_warnings || session?.contest?.security_config?.maxAllowedWarnings || 3;
        setSecurityWarnings(newCount);
        setSecurityMaxWarnings(maxW);
        if (data.terminated) {
          // Stop all media streams on termination
          if (webcamStreamRef.current) { webcamStreamRef.current.getTracks().forEach(t => t.stop()); webcamStreamRef.current = null; }
          if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null; }
          setIsCameraActive(false);
          setIsScreenActive(false);
          setActiveWarningModal({ terminated: true, number: newCount, max: maxW, message: data.message || 'Maximum security violations reached. Contest terminated.' });
          setTimeout(() => { setSubmitted(true); onContestEnd?.(contestId); }, 4000);
        } else {
          setActiveWarningModal({ terminated: false, number: newCount, max: maxW, message: `Security Warning ${newCount}/${maxW}: ${eventType.replace(/_/g, ' ')}. Stay focused on the contest.` });
        }
      }
    } catch (err) {
      console.error('Contest security event error:', err);
    }
  };

  const handlePreCheckPassed = ({ webcamStream, screenStream }) => {
    if (webcamStream) {
      webcamStreamRef.current = webcamStream;
      setIsCameraActive(true);
    }
    if (screenStream) {
      screenStreamRef.current = screenStream;
      setIsScreenActive(true);
      screenStream.getVideoTracks()[0].onended = () => {
        setIsScreenActive(false);
        reportSecurityEvent('SCREEN_SHARE_STOPPED');
      };
    }
    setIsFullscreenActive(Boolean(document.fullscreenElement));
    setShowPreCheckModal(false);
    setHasPassedPreCheck(true);
  };

  // Sync webcam stream to video element when active and mounted
  useEffect(() => {
    if (isCameraActive && videoRef.current && webcamStreamRef.current) {
      videoRef.current.srcObject = webcamStreamRef.current;
    }
  }, [isCameraActive]);

  const currentProblem = session?.problems?.[selectedProblemIdx];
  const currentCode = (currentProblem && codes[currentProblem.id]?.[language]) || DEFAULT_CODE[language] || '';

  const updateCode = (val) => {
    if (!currentProblem) return;
    setCodes(prev => ({
      ...prev,
      [currentProblem.id]: {
        ...(prev[currentProblem.id] || {}),
        [language]: val
      }
    }));
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
  };

  const handleRun = async () => {
    if (!currentProblem) {
      setRunResult({ error: 'No problem selected.' });
      setRightTab('output');
      return;
    }
    if (!currentCode.trim()) {
      setRunResult({ error: 'Please enter your code before running.' });
      setRightTab('output');
      return;
    }

    setRunning(true);
    setRunResult(null);
    setSubmitResult(null);
    try {
      const res = await fetch(`${API_BASE}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: currentProblem.id,
          language: language,
          code: currentCode,
          custom_input: currentProblem.sample_input || ''
        })
      });
      const data = await res.json();
      setRunResult(data);
    } catch {
      setRunResult({ error: 'Run execution failed. Please check network connection.' });
    } finally {
      setRunning(false);
      setRightTab('output');
    }
  };

  const handleSubmit = async () => {
    if (!currentProblem) {
      setError('No problem selected.');
      return;
    }
    if (!currentCode.trim() || submitting) return;

    setSubmitting(true);
    setSubmitResult(null);
    setRunResult(null);
    try {
      const res = await fetch(`${API_BASE}/contests/${contestId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: currentProblem.id,
          language: language,
          code: currentCode
        })
      });
      const data = await res.json();
      setSubmitResult(data);
      if (res.ok) {
        setLastSubmissions(prev => ({ ...prev, [currentProblem.id]: data }));
      } else {
        setError(data.error || 'Submission failed');
      }
    } catch {
      setError('Network error during submission');
    } finally {
      setSubmitting(false);
      setRightTab('output');
    }
  };

  const handleEndContest = async () => {
    if (!window.confirm('Are you sure you want to submit and end your contest? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/contests/${contestId}/submit-final`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setSubmitted(true);
        onContestEnd?.(contestId);
      }
    } catch {}
  };

  const handleTimeExpired = useCallback(() => {
    setTimeExpired(true);
    setSubmitted(true);
    // Auto-submit
    fetch(`${API_BASE}/contests/${contestId}/submit-final`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    }).catch(() => {});
    setTimeout(() => onContestEnd?.(contestId), 2000);
  }, [contestId, token]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '80vh', gap: 16, color: 'var(--text-muted)',
      }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#a855f7' }} />
        <p style={{ fontSize: 14 }}>Loading contest workspace...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <AlertTriangle size={40} style={{ color: '#ef4444', marginBottom: 12 }} />
        <p style={{ color: '#ef4444', marginBottom: 16 }}>{error}</p>
        <button
          onClick={onBack}
          style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >← Back to Contests</button>
      </div>
    );
  }

  // Pre-security check gate — blocks access to workspace until checks pass
  if (showPreCheckModal && !hasPassedPreCheck && session) {
    const secCfg = session?.contest?.security_config || {};
    return (
      <div style={{ height: '100vh', display: 'flex', position: 'relative' }}>
        <PreAssessmentSecurityCheckModal
          assessmentTitle={session.contest?.title}
          rulesConfig={secCfg}
          onPassedChecks={handlePreCheckPassed}
          onCancel={onBack}
        />
      </div>
    );
  }

  // Contest Ended
  if (timeExpired || submitted) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '80vh', gap: 20, textAlign: 'center', padding: 40,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(168,85,247,0.4)',
        }}>
          {timeExpired ? <Clock size={36} color="#fff" /> : <Trophy size={36} color="#fff" />}
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          {timeExpired ? '⏰ Time Expired!' : '🏆 Contest Submitted!'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 400 }}>
          {timeExpired
            ? 'Your contest time has ended. Your latest submissions have been auto-saved.'
            : 'Your contest submission has been recorded. Check the leaderboard for your position!'}
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => onContestEnd?.(contestId)}
            style={{
              padding: '12px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15,
            }}
          >View Results</button>
          <button
            onClick={onBack}
            style={{
              padding: '12px 24px', borderRadius: 10, border: '1px solid var(--border-light)',
              background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer',
            }}
          >Back to Contests</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px',
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-light)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
          >
            <ArrowLeft size={15} /> Exit
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--border-light)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session?.contest?.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Security Status Bar — shown only when security is active, matches Assessment workspace header */}
          {session?.contest?.security_enabled && hasPassedPreCheck && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              background: 'var(--bg-panel-elevated, #f8f6ff)', padding: '5px 16px',
              borderRadius: '20px', border: '1px solid var(--border-light, #e4deff)', fontSize: '0.78rem',
              color: 'var(--text-dark, #17152a)', fontWeight: '600'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: isCameraActive ? '#10b981' : 'var(--text-muted, #6f6a80)', fontWeight: isCameraActive ? '700' : '500' }}>
                <Camera size={14} /> Camera: {isCameraActive ? 'Active' : 'Inactive'}
              </span>
              <span style={{ color: 'var(--border-light, #e4deff)' }}>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: isScreenActive ? '#10b981' : 'var(--text-muted, #6f6a80)', fontWeight: isScreenActive ? '700' : '500' }}>
                <Eye size={14} /> Screen: {isScreenActive ? 'Active' : 'Inactive'}
              </span>
              <span style={{ color: 'var(--border-light, #e4deff)' }}>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: isFullscreenActive ? '#10b981' : 'var(--text-muted, #6f6a80)', fontWeight: isFullscreenActive ? '700' : '500' }}>
                <Maximize2 size={14} /> Fullscreen: {isFullscreenActive ? 'Active' : 'Off'}
              </span>
              <span style={{ color: 'var(--border-light, #e4deff)' }}>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: securityWarnings > 0 ? '#d97706' : 'var(--primary, #6c4dff)', fontWeight: 800 }}>
                <AlertTriangle size={14} /> Warnings: {securityWarnings} / {securityMaxWarnings}
              </span>
            </div>
          )}

          {/* Solved count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#22c55e', fontWeight: 700 }}>
            <CheckCircle size={14} />
            {Object.values(lastSubmissions).filter(s => s.status === 'ACCEPTED' || s.status === 'Accepted').length}/{session?.problems?.length || 0} solved
          </div>

          {/* Timer */}
          {session?.expires_at && (
            <ContestTimer expiresAt={session.expires_at} onExpired={handleTimeExpired} />
          )}

          {/* End Contest */}
          <button
            id="end-contest-btn"
            onClick={handleEndContest}
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
              color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Flag size={13} /> End Contest
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Problem List Sidebar */}
        <div style={{
          width: showSidebar ? 220 : 0,
          overflow: 'hidden',
          borderRight: '1px solid var(--border-light)',
          background: 'var(--card-bg)',
          transition: 'width 0.2s ease',
          flexShrink: 0,
        }}>
          <div style={{ padding: '12px 10px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingLeft: 6 }}>
              Problems
            </div>
            {session?.problems?.map((p, i) => {
              const sub = lastSubmissions[p.id];
              const isAccepted = sub && (sub.status === 'ACCEPTED' || sub.status === 'Accepted');
              const isAttempted = sub && !isAccepted;
              return (
                <div
                  key={p.id}
                  id={`contest-problem-${i}`}
                  onClick={() => setSelectedProblemIdx(i)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                    background: selectedProblemIdx === i ? 'rgba(168,85,247,0.15)' : 'transparent',
                    border: selectedProblemIdx === i ? '1px solid rgba(168,85,247,0.4)' : '1px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>#{i + 1}</span>
                    {isAccepted && <CheckCircle size={12} style={{ color: '#22c55e' }} />}
                    {isAttempted && <AlertTriangle size={12} style={{ color: '#f59e0b' }} />}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: selectedProblemIdx === i ? '#c084fc' : 'var(--text-primary)', lineHeight: 1.3 }}>
                    {p.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: p.difficulty === 'Easy' ? '#22c55e' : p.difficulty === 'Hard' ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
                      {p.difficulty}
                    </span>
                    <span style={{ fontSize: 11, color: '#a855f7', fontWeight: 600 }}>{p.points || 100}pt</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Problem Panel + Code Editor */}
        {currentProblem && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Left: Problem Description */}
            <div style={{
              width: 420, borderRight: '1px solid var(--border-light)',
              overflow: 'auto', background: 'var(--bg-secondary, var(--card-bg))',
              flexShrink: 0,
            }}>
              {/* Problem header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 0, background: 'inherit', zIndex: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Problem {selectedProblemIdx + 1} of {session?.problems?.length}</span>
                  <span style={{ fontSize: 12, color: '#a855f7', fontWeight: 700 }}>{currentProblem.points || 100} pts</span>
                </div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{currentProblem.title}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                    color: currentProblem.difficulty === 'Easy' ? '#22c55e' : currentProblem.difficulty === 'Hard' ? '#ef4444' : '#f59e0b',
                    background: currentProblem.difficulty === 'Easy' ? 'rgba(34,197,94,0.1)' : currentProblem.difficulty === 'Hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                  }}>{currentProblem.difficulty}</span>
                  {lastSubmissions[currentProblem.id] && (
                    <StatusBadge status={lastSubmissions[currentProblem.id].status} />
                  )}
                </div>
              </div>

              <div style={{ padding: '16px 20px', fontSize: 13, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                {/* Description */}
                <section style={{ marginBottom: 20 }}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{currentProblem.description}</div>
                </section>

                {/* Constraints */}
                {currentProblem.constraints && (
                  <section style={{ marginBottom: 20 }}>
                    <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>Constraints</h4>
                    <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.15)', borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                      {currentProblem.constraints}
                    </div>
                  </section>
                )}

                {/* Sample I/O */}
                {currentProblem.sample_input && (
                  <section style={{ marginBottom: 20 }}>
                    <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>Sample Input</h4>
                    <pre style={{ margin: 0, padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 12, overflowX: 'auto', color: '#e2e8f0' }}>
                      {currentProblem.sample_input}
                    </pre>
                  </section>
                )}
                {currentProblem.sample_output && (
                  <section style={{ marginBottom: 20 }}>
                    <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>Sample Output</h4>
                    <pre style={{ margin: 0, padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 12, overflowX: 'auto', color: '#22c55e' }}>
                      {currentProblem.sample_output}
                    </pre>
                  </section>
                )}

                {/* Previous Submissions */}
                {lastSubmissions[currentProblem.id] && (
                  <section>
                    <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>My Latest Submission</h4>
                    <div style={{
                      padding: '10px 14px', borderRadius: 8, fontSize: 12,
                      background: lastSubmissions[currentProblem.id].status === 'ACCEPTED' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${lastSubmissions[currentProblem.id].status === 'ACCEPTED' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}>
                      <StatusBadge status={lastSubmissions[currentProblem.id].status} />
                      <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 11 }}>
                        {lastSubmissions[currentProblem.id].test_cases_passed}/{lastSubmissions[currentProblem.id].total_test_cases} tests passed
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </div>

            {/* Right: Code Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Code toolbar */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', borderBottom: '1px solid var(--border-light)',
                background: 'var(--card-bg)', flexShrink: 0,
              }}>
                <select
                  id="contest-lang-select"
                  value={language}
                  onChange={e => handleLanguageChange(e.target.value)}
                  style={{
                    padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-light)',
                    background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {(session?.contest?.allowed_languages || ['javascript', 'python', 'cpp', 'java']).map(lang => (
                    <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    id="contest-run-btn"
                    onClick={handleRun}
                    disabled={running || submitting}
                    style={{
                      padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border-light)',
                      background: 'transparent', color: '#22c55e', fontWeight: 700, cursor: 'pointer', fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 6,
                      opacity: running ? 0.6 : 1,
                    }}
                  >
                    {running ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={13} />}
                    {running ? 'Running...' : 'Run'}
                  </button>
                  <button
                    id="contest-submit-btn"
                    onClick={handleSubmit}
                    disabled={submitting || running}
                    style={{
                      padding: '7px 18px', borderRadius: 8, border: 'none',
                      background: submitting ? 'rgba(168,85,247,0.4)' : 'linear-gradient(135deg, #6366f1, #a855f7)',
                      color: '#fff', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {submitting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>

              {/* Code Area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Code editor */}
                <div style={{ flex: 3, overflow: 'hidden', position: 'relative' }}>
                  <textarea
                    id={`contest-code-editor-${currentProblem?.id}`}
                    value={currentCode}
                    onChange={e => updateCode(e.target.value)}
                    spellCheck={false}
                    style={{
                      width: '100%', height: '100%', resize: 'none', border: 'none', outline: 'none',
                      background: '#0d1117',
                      color: '#e6edf3',
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                      fontSize: 13,
                      lineHeight: 1.6,
                      padding: '16px 20px',
                      boxSizing: 'border-box',
                      tabSize: 2,
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const start = e.target.selectionStart;
                        const end = e.target.selectionEnd;
                        const val = currentCode;
                        updateCode(val.substring(0, start) + '  ' + val.substring(end));
                        setTimeout(() => e.target.setSelectionRange(start + 2, start + 2), 0);
                      }
                    }}
                  />
                </div>

                {/* Output Panel */}
                <div style={{
                  flex: 1, minHeight: 140, maxHeight: 200,
                  borderTop: '1px solid var(--border-light)',
                  background: 'var(--card-bg)', overflow: 'auto',
                }}>
                  {/* Output Tabs */}
                  <div style={{ display: 'flex', padding: '8px 16px 0', borderBottom: '1px solid var(--border-light)', gap: 2 }}>
                    {['output', 'testcases'].map(t => (
                      <button
                        key={t}
                        onClick={() => setRightTab(t)}
                        style={{
                          padding: '5px 12px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: rightTab === t ? 700 : 500,
                          color: rightTab === t ? '#a855f7' : 'var(--text-muted)',
                          borderBottom: `2px solid ${rightTab === t ? '#a855f7' : 'transparent'}`,
                          marginBottom: -1, textTransform: 'capitalize',
                        }}
                      >{t}</button>
                    ))}
                  </div>

                  <div style={{ padding: '12px 16px' }}>
                    {rightTab === 'output' && (
                      <>
                        {/* Submit result */}
                        {submitResult && (
                          <div style={{ marginBottom: 12 }}>
                            <StatusBadge status={submitResult.status} />
                            {submitResult.status === 'ACCEPTED' ? (
                              <div style={{ marginTop: 8, color: '#22c55e', fontSize: 12 }}>
                                ✅ Passed {submitResult.test_cases_passed}/{submitResult.total_test_cases} test cases · {submitResult.score} pts earned
                              </div>
                            ) : (
                              <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                  Passed {submitResult.test_cases_passed}/{submitResult.total_test_cases} test cases
                                </div>
                                {submitResult.stderr && (
                                  <pre style={{ fontSize: 11, color: '#ef4444', marginTop: 6, background: 'rgba(239,68,68,0.06)', padding: 8, borderRadius: 6 }}>
                                    {submitResult.stderr}
                                  </pre>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Run result */}
                        {runResult && !submitResult && (
                          <div>
                            {runResult.error ? (
                              <pre style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{runResult.error}</pre>
                            ) : (
                              <>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Output:</div>
                                <pre style={{ color: '#e6edf3', fontSize: 12, margin: 0, background: '#0d1117', padding: 10, borderRadius: 6, overflow: 'auto' }}>
                                  {runResult.stdout || runResult.output || '(no output)'}
                                </pre>
                                {runResult.stderr && (
                                  <pre style={{ color: '#ef4444', fontSize: 12, margin: '8px 0 0', background: 'rgba(239,68,68,0.06)', padding: 10, borderRadius: 6 }}>
                                    {runResult.stderr}
                                  </pre>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        {!submitResult && !runResult && (
                          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>Run your code or submit to see output here.</p>
                        )}
                      </>
                    )}
                    {rightTab === 'testcases' && (
                      <div>
                        {currentProblem?.sample_input && (
                          <>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Sample Input:</div>
                            <pre style={{ margin: 0, fontSize: 12, color: '#e6edf3', background: '#0d1117', padding: 8, borderRadius: 6 }}>{currentProblem.sample_input}</pre>
                            {currentProblem.sample_output && (
                              <>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 4px' }}>Expected Output:</div>
                                <pre style={{ margin: 0, fontSize: 12, color: '#22c55e', background: '#0d1117', padding: 8, borderRadius: 6 }}>{currentProblem.sample_output}</pre>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!currentProblem && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>
            <Code size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
            <h3 style={{ fontSize: 18, color: 'var(--text-primary)', margin: '0 0 6px' }}>No Problems Available</h3>
            <p style={{ fontSize: 13, margin: 0 }}>This contest does not have any active problems assigned yet or problems are loading.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes timer-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
      `}</style>

      {/* FLOATING WEBCAM PREVIEW */}
      {isCameraActive && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 40,
          background: 'var(--bg-panel-elevated, #f8f6ff)',
          border: '1px solid var(--border-light, #e4deff)',
          borderRadius: 16,
          padding: 8, boxShadow: 'var(--shadow-lg, 0 10px 25px -4px rgba(108, 77, 255, 0.15))',
          width: isCamMinimized ? 130 : 180, transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, padding: '0 4px', fontSize: '0.72rem', color: 'var(--text-muted, #6f6a80)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 800 }}>
              <Camera size={12} /> Proctor Cam
            </span>
            <button onClick={() => setIsCamMinimized(p => !p)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #6f6a80)', cursor: 'pointer', padding: 0 }}>
              {isCamMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
            </button>
          </div>
          <div style={{ height: isCamMinimized ? 60 : 110, borderRadius: 10, overflow: 'hidden', background: '#090d16', border: '1px solid var(--border-light, #e4deff)' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          </div>
        </div>
      )}

      {/* SECURITY WARNING / TERMINATION MODAL */}
      {activeWarningModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: 460, width: '90%', padding: 32, borderRadius: 24, background: 'var(--bg-panel, #ffffff)', border: activeWarningModal.terminated ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-light, #e4deff)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              {activeWarningModal.terminated
                ? <ShieldAlert size={52} color="#ef4444" style={{ margin: '0 auto 14px auto', display: 'block' }} />
                : <AlertTriangle size={52} color="#d97706" style={{ margin: '0 auto 14px auto', display: 'block' }} />}
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: activeWarningModal.terminated ? '#ef4444' : '#d97706', margin: 0 }}>
                {activeWarningModal.terminated ? 'Contest Terminated' : `Security Warning (${activeWarningModal.number}/${activeWarningModal.max})`}
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-main, #544f7d)', textAlign: 'center', lineHeight: 1.6, marginBottom: 28 }}>
              {activeWarningModal.message}
            </p>
            {!activeWarningModal.terminated && (
              <button
                onClick={() => setActiveWarningModal(null)}
                style={{
                  width: '100%', padding: '12px',
                  background: 'linear-gradient(135deg, #6c4dff, #5638d8)',
                  color: '#ffffff', border: 'none', borderRadius: 12,
                  fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(108, 77, 255, 0.35)'
                }}
              >Return to Contest</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
