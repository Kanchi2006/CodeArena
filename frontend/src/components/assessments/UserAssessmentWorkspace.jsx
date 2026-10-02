import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Bookmark, 
  BookmarkCheck, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Send, 
  Play, 
  Code, 
  Layers, 
  CheckSquare, 
  Square, 
  Radio, 
  HelpCircle,
  ShieldAlert,
  X,
  RefreshCw,
  Camera,
  Monitor,
  Maximize,
  ShieldCheck,
  Minimize2,
  Maximize2
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import PreAssessmentSecurityCheckModal from './PreAssessmentSecurityCheckModal';

export default function UserAssessmentWorkspace({ attemptId, token, onFinishAssessment }) {
  // Workspace State
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation & Question State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [reviewFlags, setReviewFlags] = useState({});
  const [visitedSet, setVisitedSet] = useState(new Set());
  const [saveStatus, setSaveStatus] = useState('Saved');
  
  // Timer State
  const [remainingSeconds, setRemainingSeconds] = useState(3600);
  const [isExpired, setIsExpired] = useState(false);

  // Coding Question State
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [codingCode, setCodingCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('Write code and click "Run Code" or "Submit Code".');
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [activeTab, setActiveTab] = useState('problem');

  // Submit Modal & Integrity Warnings
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);

  // Proctoring & Security State
  const [hasPassedPreCheck, setHasPassedPreCheck] = useState(false);
  const [showPreCheckModal, setShowPreCheckModal] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [securityStatus, setSecurityStatus] = useState('Monitoring');
  const [activeWarningModal, setActiveWarningModal] = useState(null); // { type, number, max, message, terminated }
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScreenActive, setIsScreenActive] = useState(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const [isCamMinimized, setIsCamMinimized] = useState(false);

  const videoRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const lastViolationTimeRef = useRef(0);
  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    fetchAttemptWorkspace();
  }, [attemptId, token]);

  // Countdown Timer Effect
  useEffect(() => {
    if (remainingSeconds <= 0) {
      if (!isExpired && workspace && workspace.status === 'IN_PROGRESS') {
        setIsExpired(true);
        handleAutoSubmitOnExpiry();
      }
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, isExpired, workspace]);

  const fetchAttemptWorkspace = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/assessment-attempts/${attemptId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (res.ok) {
        setWorkspace(data);
        setRemainingSeconds(data.timeState.remainingSeconds);

        const initAnswers = {};
        const initReviews = {};
        const initVisited = new Set();

        if (data.responses) {
          Object.keys(data.responses).forEach(qId => {
            const item = data.responses[qId];
            initAnswers[qId] = item.responseData || {};
            if (item.isMarkedForReview) initReviews[qId] = true;
            if (item.isVisited) initVisited.add(Number(qId));
          });
        }

        setAnswers(initAnswers);
        setReviewFlags(initReviews);
        setVisitedSet(initVisited);
        setWarningCount(data.warningCount || 0);
        setSecurityStatus(data.securityStatus || 'Monitoring');

        // Check if proctoring rules require pre-check modal
        const rules = data.assessment.rules_config || {};
        if (rules.enableProctoring) {
          setShowPreCheckModal(true);
        } else {
          setHasPassedPreCheck(true);
        }

        if (data.questions.length > 0) {
          initVisited.add(data.questions[0].id);
          setVisitedSet(new Set(initVisited));

          const firstQ = data.questions[0];
          if (firstQ.question_type === 'coding' && firstQ.problem) {
            const savedCode = initAnswers[firstQ.id]?.coding_source;
            const starter = firstQ.problem.starter_code ? firstQ.problem.starter_code['javascript'] : '';
            setCodingCode(savedCode || starter || '// Write your code here');
          }
        }
      } else {
        setError(data.error || 'Failed to load assessment attempt.');
      }
    } catch (err) {
      setError('Network communication error.');
    } finally {
      setLoading(false);
    }
  };

  // Real Proctoring Event Listener & Server Violation Dispatcher
  const logSecurityViolationServer = async (type, details = {}) => {
    const now = Date.now();
    // Debounce duplicate events within 2000ms
    if (now - lastViolationTimeRef.current < 2000) return;
    lastViolationTimeRef.current = now;

    try {
      const res = await fetch(`/api/assessment-attempts/${attemptId}/log-violation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          violationType: type,
          details,
          clientInfo: {
            userAgent: navigator.userAgent,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        setWarningCount(data.warningCount);

        const maxWarnings = data.maxAllowedWarnings || 3;
        const currentCount = data.warningCount;

        if (data.terminated) {
          setActiveWarningModal({
            terminated: true,
            number: currentCount,
            max: maxWarnings,
            message: data.message || 'Maximum security violations reached. Assessment terminated.'
          });
          setTimeout(() => {
            onFinishAssessment(attemptId);
          }, 3500);
        } else {
          setActiveWarningModal({
            terminated: false,
            number: currentCount,
            max: maxWarnings,
            message: `Security Warning ${currentCount}/${maxWarnings}: ${type.replace(/_/g, ' ')}. Please remain focused on the assessment.`
          });
        }
      }
    } catch (err) {
      console.error('Error reporting proctoring violation:', err);
    }
  };

  // Attach Browser Event Listeners
  useEffect(() => {
    if (!workspace || !hasPassedPreCheck) return;
    const rules = workspace.assessment.rules_config || {};
    if (!rules.enableProctoring) return;

    // 1. Tab switch & visibility detection
    const handleVisibilityChange = () => {
      if (document.hidden && rules.detectVisibilityChange) {
        logSecurityViolationServer('PAGE_HIDDEN', { reason: 'Document became hidden/tab switched' });
      }
    };

    const handleWindowBlur = () => {
      if (rules.detectTabSwitch) {
        logSecurityViolationServer('WINDOW_BLUR', { reason: 'Window lost focus' });
      }
    };

    // 2. Fullscreen exit detection
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreenActive(isFull);
      if (!isFull && rules.requireFullscreen) {
        logSecurityViolationServer('FULLSCREEN_EXIT', { reason: 'Candidate exited fullscreen mode' });
      }
    };

    // 3. Clipboard & Context Menu Prevention
    const handleCopy = (e) => {
      if (rules.preventCopy) {
        e.preventDefault();
        logSecurityViolationServer('COPY_ATTEMPT', { text: 'Copy attempt blocked' });
      }
    };

    const handleCut = (e) => {
      if (rules.preventCut) {
        e.preventDefault();
        logSecurityViolationServer('CUT_ATTEMPT', { text: 'Cut attempt blocked' });
      }
    };

    const handlePaste = (e) => {
      if (rules.preventPaste) {
        e.preventDefault();
        logSecurityViolationServer('PASTE_ATTEMPT', { text: 'Paste attempt blocked' });
      }
    };

    const handleContextMenu = (e) => {
      if (rules.preventRightClick) {
        e.preventDefault();
        logSecurityViolationServer('RIGHT_CLICK_ATTEMPT', { text: 'Right click menu blocked' });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [workspace, hasPassedPreCheck]);

  const handlePreCheckPassed = ({ webcamStream, screenStream }) => {
    if (webcamStream) {
      webcamStreamRef.current = webcamStream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = webcamStream;
      }
    }
    if (screenStream) {
      screenStreamRef.current = screenStream;
      setIsScreenActive(true);

      screenStream.getVideoTracks()[0].onended = () => {
        setIsScreenActive(false);
        logSecurityViolationServer('SCREEN_SHARE_STOPPED', { reason: 'Screen share MediaStream track ended' });
      };
    }
    setIsFullscreenActive(Boolean(document.fullscreenElement));
    setShowPreCheckModal(false);
    setHasPassedPreCheck(true);
  };

  const handleAutoSubmitOnExpiry = async () => {
    try {
      await fetch(`/api/assessment-attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      onFinishAssessment(attemptId);
    } catch (err) {
      console.error('Error auto-submitting on expiry:', err);
    }
  };

  useEffect(() => {
    if (!workspace || !workspace.questions[currentIdx]) return;
    const q = workspace.questions[currentIdx];

    if (q.question_type === 'coding' && q.problem) {
      const savedCode = answers[q.id]?.coding_source;
      let templateCode = '';
      if (q.problem.starter_code) {
        templateCode = q.problem.starter_code[selectedLanguage] || q.problem.starter_code['javascript'] || '';
      }
      setCodingCode(savedCode || templateCode || `// Write your code here in ${selectedLanguage.toUpperCase()}`);
    }
  }, [currentIdx, selectedLanguage, workspace]);

  const saveResponseServer = async (qId, responseData, isReview, isVis) => {
    setSaveStatus('Saving...');
    try {
      const res = await fetch(`/api/assessment-attempts/${attemptId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          questionId: qId,
          responseData,
          isMarkedForReview: isReview,
          isVisited: isVis
        })
      });
      if (res.ok) setSaveStatus('Saved');
      else setSaveStatus('Error');
    } catch (err) {
      setSaveStatus('Error');
    }
  };

  const handleSelectOption = (qId, optId, isMultiple = false) => {
    const current = answers[qId] || {};
    let selectedOpts = current.selected_options || [];

    if (isMultiple) {
      if (selectedOpts.includes(optId)) {
        selectedOpts = selectedOpts.filter(o => o !== optId);
      } else {
        selectedOpts = [...selectedOpts, optId];
      }
    } else {
      selectedOpts = [optId];
    }

    const updatedData = { ...current, selected_options: selectedOpts };
    setAnswers(prev => ({ ...prev, [qId]: updatedData }));
    saveResponseServer(qId, updatedData, Boolean(reviewFlags[qId]), true);
  };

  const handleTextAnswerChange = (qId, val) => {
    const current = answers[qId] || {};
    const updatedData = { ...current, text_answer: val };
    setAnswers(prev => ({ ...prev, [qId]: updatedData }));

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveResponseServer(qId, updatedData, Boolean(reviewFlags[qId]), true);
    }, 600);
  };

  const handleCodingSourceChange = (val) => {
    setCodingCode(val);
    if (!workspace || !workspace.questions[currentIdx]) return;
    const qId = workspace.questions[currentIdx].id;

    const current = answers[qId] || {};
    const updatedData = { ...current, coding_source: val, language: selectedLanguage };
    setAnswers(prev => ({ ...prev, [qId]: updatedData }));

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveResponseServer(qId, updatedData, Boolean(reviewFlags[qId]), true);
    }, 1000);
  };

  const toggleMarkForReview = () => {
    if (!workspace || !workspace.questions[currentIdx]) return;
    const qId = workspace.questions[currentIdx].id;
    const newFlag = !reviewFlags[qId];

    setReviewFlags(prev => ({ ...prev, [qId]: newFlag }));
    saveResponseServer(qId, answers[qId] || {}, newFlag, true);
  };

  const handleNavigateQuestion = (idx) => {
    if (idx < 0 || idx >= workspace.questions.length) return;
    setCurrentIdx(idx);
    const targetQId = workspace.questions[idx].id;

    setVisitedSet(prev => {
      const next = new Set(prev);
      next.add(targetQId);
      return next;
    });

    saveResponseServer(targetQId, answers[targetQId] || {}, Boolean(reviewFlags[targetQId]), true);
  };

  const handleRunCodingTest = async () => {
    if (!workspace || !workspace.questions[currentIdx]) return;
    const q = workspace.questions[currentIdx];
    setIsRunningCode(true);
    setConsoleOutput('Running code against test suite...\n');

    try {
      const res = await fetch(`/api/assessment-attempts/${attemptId}/coding-run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          questionId: q.id,
          language: selectedLanguage,
          code: codingCode,
          customInput: activeTab === 'custom_input' ? customInput : undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setConsoleOutput(data.stdout || data.stderr || 'Execution completed.');
      } else {
        setConsoleOutput(`Error: ${data.error || 'Failed to run code'}`);
      }
    } catch (err) {
      setConsoleOutput(`Error: ${err.message || 'Execution failed'}`);
    } finally {
      setIsRunningCode(false);
    }
  };

  const handleSubmitCodingAnswer = async () => {
    if (!workspace || !workspace.questions[currentIdx]) return;
    const q = workspace.questions[currentIdx];
    setIsSubmittingCode(true);
    setConsoleOutput('Submitting solution to judge...\n');

    try {
      const res = await fetch(`/api/assessment-attempts/${attemptId}/coding-submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          questionId: q.id,
          language: selectedLanguage,
          code: codingCode
        })
      });
      const data = await res.json();
      if (res.ok) {
        setConsoleOutput(`Result: ${data.status}\nPassed: ${data.testCasesPassed}/${data.totalTestCases} Test Cases\nScore Earned: ${data.score}`);
        const updated = { ...answers[q.id], coding_source: codingCode, language: selectedLanguage, status: data.status };
        setAnswers(prev => ({ ...prev, [q.id]: updated }));
      } else {
        setConsoleOutput(`Error: ${data.error || 'Submission failed'}`);
      }
    } catch (err) {
      setConsoleOutput(`Error: ${err.message || 'Submission failed'}`);
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmittingFinal(true);
    try {
      const res = await fetch(`/api/assessment-attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        onFinishAssessment(attemptId);
      } else {
        alert('Submission failed. Please try again.');
      }
    } catch (err) {
      alert('Network error while submitting assessment.');
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '12px', fontSize: '0.9rem' }}>Preparing assessment workspace...</p>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
        <AlertTriangle size={40} color="#f59e0b" style={{ margin: '0 auto 12px auto' }} />
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '8px' }}>Workspace Error</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{error || 'Unable to open attempt.'}</p>
      </div>
    );
  }

  if (showPreCheckModal && !hasPassedPreCheck) {
    return (
      <div style={{ height: 'calc(100vh - 70px)', display: 'flex', position: 'relative' }}>
        <PreAssessmentSecurityCheckModal
          assessmentTitle={workspace.assessment.title}
          rulesConfig={workspace.assessment.rules_config || {}}
          onPassedChecks={handlePreCheckPassed}
          onCancel={() => onFinishAssessment(attemptId)}
        />
      </div>
    );
  }

  const currentQ = workspace.questions[currentIdx];
  const qId = currentQ.id;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const h = Math.floor(m / 60);
    const displayM = m % 60;
    return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(displayM).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).filter(k => {
    const a = answers[k];
    return (a.selected_options && a.selected_options.length > 0) || (a.text_answer && a.text_answer.trim().length > 0) || (a.coding_source && a.coding_source.trim().length > 0);
  }).length;
  const reviewCount = Object.keys(reviewFlags).filter(k => reviewFlags[k]).length;
  const totalQ = workspace.questions.length;
  const unansweredCount = totalQ - answeredCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', background: '#090d16', color: '#e2e8f0', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
      
      {/* WORKSPACE TOP HEADER */}
      <header style={{ height: '56px', background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>
            {workspace.assessment.title}
          </h2>
          <span style={{ padding: '3px 10px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', fontSize: '0.78rem', fontWeight: '700' }}>
            Question {currentIdx + 1} of {totalQ}
          </span>
        </div>

        {/* PROCTORING STATUS HEADER BAR */}
        {workspace.assessment.rules_config?.enableProctoring && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            background: 'var(--bg-panel-elevated, #f8f6ff)', padding: '5px 16px',
            borderRadius: '20px', border: '1px solid var(--border-light, #e4deff)', fontSize: '0.78rem',
            color: 'var(--text-dark, #17152a)', fontWeight: '600'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: isCameraActive ? '#10b981' : 'var(--text-muted, #6f6a80)', fontWeight: isCameraActive ? '700' : '500' }}>
              <Camera size={14} /> Camera: {isCameraActive ? 'Active' : 'Inactive'}
            </span>
            <span style={{ color: 'var(--border-light, #e4deff)' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: isScreenActive ? '#10b981' : 'var(--text-muted, #6f6a80)', fontWeight: isScreenActive ? '700' : '500' }}>
              <Monitor size={14} /> Screen: {isScreenActive ? 'Active' : 'Inactive'}
            </span>
            <span style={{ color: 'var(--border-light, #e4deff)' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: isFullscreenActive ? '#10b981' : 'var(--text-muted, #6f6a80)', fontWeight: isFullscreenActive ? '700' : '500' }}>
              <Maximize size={14} /> Fullscreen: {isFullscreenActive ? 'Active' : 'Off'}
            </span>
            <span style={{ color: 'var(--border-light, #e4deff)' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: warningCount > 0 ? '#d97706' : 'var(--primary, #6c4dff)', fontWeight: '800' }}>
              <AlertTriangle size={14} /> Warnings: {warningCount} / {workspace.assessment.rules_config?.maxAllowedWarnings || 3}
            </span>
          </div>
        )}

        {/* TIMER & ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
            <Save size={14} color={saveStatus === 'Saving...' ? '#f59e0b' : '#10b981'} />
            <span>{saveStatus}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '8px', background: remainingSeconds < 300 ? 'rgba(239, 68, 68, 0.2)' : '#020617', border: remainingSeconds < 300 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #1e293b', fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: '700', color: remainingSeconds < 300 ? '#fca5a5' : '#10b981' }}>
            <Clock size={16} />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="btn btn-primary"
            style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', borderColor: '#10b981', fontSize: '0.88rem', fontWeight: '700' }}
          >
            <Send size={14} /> Submit Assessment
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE BODY (2 COLUMNS) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT COLUMN: QUESTION CONTENT & INPUTS */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#090d16' }}>
          
          {/* Question Sub-Header */}
          <div style={{ padding: '14px 24px', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                Question {currentIdx + 1}
              </span>
              <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '700', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '4px' }}>
                +{currentQ.marks} Marks
              </span>
              {Number(currentQ.negative_marks) > 0 && (
                <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: '700', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '4px' }}>
                  -{currentQ.negative_marks} Wrong
                </span>
              )}
            </div>

            <button
              onClick={toggleMarkForReview}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: reviewFlags[qId] ? 'rgba(245, 158, 11, 0.2)' : '#1e293b',
                color: reviewFlags[qId] ? '#fcd34d' : '#94a3b8',
                border: reviewFlags[qId] ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #334155'
              }}
            >
              {reviewFlags[qId] ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              <span>{reviewFlags[qId] ? 'Marked for Review' : 'Mark for Review'}</span>
            </button>
          </div>

          {/* Question Text & Options Scroll Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ fontSize: '1rem', color: '#f8fafc', lineHeight: '1.6', fontWeight: '500' }}>
              {currentQ.question_text}
            </div>

            {currentQ.code_snippet && (
              <pre style={{ padding: '16px', background: '#020617', border: '1px solid #1e293b', borderRadius: '12px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#6EE7B7', overflowX: 'auto' }}>
                <code>{currentQ.code_snippet}</code>
              </pre>
            )}

            {/* MCQ OPTIONS */}
            {currentQ.question_type === 'mcq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
                {currentQ.options.map(opt => {
                  const selected = (answers[qId]?.selected_options || []).includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(qId, opt.id, false)}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: selected ? '1px solid #6366f1' : '1px solid #1e293b',
                        background: selected ? 'rgba(99, 102, 241, 0.15)' : '#0f172a',
                        color: selected ? '#fff' : '#cbd5e1',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: selected ? '5px solid #6366f1' : '2px solid #475569', background: selected ? '#fff' : 'transparent', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MULTIPLE SELECT */}
            {currentQ.question_type === 'multiple_select' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: '600' }}>Select all correct options that apply:</span>
                {currentQ.options.map(opt => {
                  const selected = (answers[qId]?.selected_options || []).includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(qId, opt.id, true)}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: selected ? '1px solid #6366f1' : '1px solid #1e293b',
                        background: selected ? 'rgba(99, 102, 241, 0.15)' : '#0f172a',
                        color: selected ? '#fff' : '#cbd5e1',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px'
                      }}
                    >
                      {selected ? <CheckSquare size={18} color="#818cf8" /> : <Square size={18} color="#475569" />}
                      <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* OUTPUT PREDICTION */}
            {currentQ.question_type === 'output_based' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '8px' }}>
                {currentQ.options && currentQ.options.length > 0 ? (
                  currentQ.options.map(opt => {
                    const selected = (answers[qId]?.selected_options || []).includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(qId, opt.id, false)}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          border: selected ? '1px solid #6366f1' : '1px solid #1e293b',
                          background: selected ? 'rgba(99, 102, 241, 0.15)' : '#0f172a',
                          color: selected ? '#fff' : '#cbd5e1',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px'
                        }}
                      >
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: selected ? '5px solid #6366f1' : '2px solid #475569', background: selected ? '#fff' : 'transparent' }} />
                        <span style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>{opt.text}</span>
                      </div>
                    );
                  })
                ) : (
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Enter predicted output string:</label>
                    <input
                      type="text"
                      value={answers[qId]?.text_answer || ''}
                      onChange={(e) => handleTextAnswerChange(qId, e.target.value)}
                      placeholder="Type predicted output..."
                      style={{ width: '100%', padding: '12px', background: '#020617', border: '1px solid #1e293b', borderRadius: '10px', color: '#fff', fontFamily: 'monospace', fontSize: '0.9rem' }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* CODING EDITOR */}
            {currentQ.question_type === 'coding' && currentQ.problem && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '480px', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '600' }}>Language:</span>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      style={{ background: '#020617', color: '#fff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '0.82rem' }}
                    >
                      <option value="javascript">JavaScript (Node.js)</option>
                      <option value="python">Python 3</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button disabled={isRunningCode} onClick={handleRunCodingTest} className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                      <Play size={13} color="#10b981" /> Run Code
                    </button>
                    <button disabled={isSubmittingCode} onClick={handleSubmitCodingAnswer} className="btn btn-primary" style={{ padding: '5px 14px', fontSize: '0.8rem' }}>
                      <Send size={13} /> Submit Code
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', overflow: 'hidden' }}>
                  <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #1e293b', background: '#0f172a' }}>
                    <Editor
                      height="100%"
                      language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage}
                      theme="vs-dark"
                      value={codingCode}
                      onChange={(val) => handleCodingSourceChange(val || '')}
                      options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
                    />
                  </div>
                  <div style={{ borderRadius: '10px', border: '1px solid #1e293b', background: '#020617', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '6px 12px', background: '#0f172a', borderBottom: '1px solid #1e293b', fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>
                      Console Output
                    </div>
                    <pre style={{ flex: 1, padding: '12px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#cbd5e1', overflowY: 'auto', margin: 0, whitespace: 'pre-wrap' }}>
                      {consoleOutput}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar Navigation Buttons */}
          <div style={{ height: '60px', background: '#0f172a', borderTop: '1px solid #1e293b', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <button
              disabled={currentIdx === 0}
              onClick={() => handleNavigateQuestion(currentIdx - 1)}
              className="btn btn-secondary"
              style={{ opacity: currentIdx === 0 ? 0.4 : 1 }}
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <button
              disabled={currentIdx === workspace.questions.length - 1}
              onClick={() => handleNavigateQuestion(currentIdx + 1)}
              className="btn btn-primary"
              style={{ opacity: currentIdx === workspace.questions.length - 1 ? 0.4 : 1, padding: '10px 24px' }}
            >
              <span>Save & Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: QUESTION PALETTE NAVIGATOR */}
        <div style={{ width: '280px', background: '#0f172a', borderLeft: '1px solid #1e293b', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#fff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Question Palette
            </h4>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
              {answeredCount} of {totalQ} Answered
            </div>
          </div>

          {/* Question Grid Buttons */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
              {workspace.questions.map((q, idx) => {
                const isCurrent = idx === currentIdx;
                const isAns = Boolean(
                  answers[q.id] && (
                    (answers[q.id].selected_options && answers[q.id].selected_options.length > 0) ||
                    (answers[q.id].text_answer && answers[q.id].text_answer.trim().length > 0) ||
                    (answers[q.id].coding_source && answers[q.id].coding_source.trim().length > 0)
                  )
                );
                const isRev = Boolean(reviewFlags[q.id]);
                const isVis = visitedSet.has(q.id);

                let bg = '#020617';
                let color = '#94a3b8';
                let border = '1px solid #1e293b';

                if (isCurrent) {
                  bg = '#6366f1';
                  color = '#fff';
                  border = '2px solid #a5b4fc';
                } else if (isRev) {
                  bg = 'rgba(245, 158, 11, 0.25)';
                  color = '#fcd34d';
                  border = '1px solid #f59e0b';
                } else if (isAns) {
                  bg = 'rgba(16, 185, 129, 0.25)';
                  color = '#6ee7b7';
                  border = '1px solid #10b981';
                } else if (isVis) {
                  bg = '#1e293b';
                  color = '#e2e8f0';
                  border = '1px solid #334155';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => handleNavigateQuestion(idx)}
                    style={{
                      height: '38px',
                      borderRadius: '8px',
                      background: bg,
                      color: color,
                      border: border,
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{idx + 1}</span>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.78rem', color: '#94a3b8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.3)', border: '1px solid #10b981' }} />
                <span>Answered</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.3)', border: '1px solid #f59e0b' }} />
                <span>Marked for Review</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#1e293b', border: '1px solid #334155' }} />
                <span>Visited</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#020617', border: '1px solid #1e293b' }} />
                <span>Not Visited</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUBMIT CONFIRMATION MODAL */}
      {showSubmitModal && (
        <div className="modal-overlay" style={{ background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', padding: '28px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={20} color="#10b981" /> Submit Assessment
              </h3>
              <button onClick={() => setShowSubmitModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
              Are you sure you want to finalize and submit your assessment attempt?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', textAlign: 'center', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#10b981' }}>{answeredCount}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Answered</div>
              </div>
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f59e0b' }}>{reviewCount}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Review</div>
              </div>
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ef4444' }}>{unansweredCount}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Unanswered</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSubmitModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                disabled={isSubmittingFinal}
                onClick={handleFinalSubmit}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderColor: '#10b981' }}
              >
                {isSubmittingFinal ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING MINIMIZABLE WEBCAM PREVIEW */}
      {isCameraActive && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 40,
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '6px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          width: isCamMinimized ? '130px' : '180px',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', padding: '0 4px', fontSize: '0.7rem', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: '700' }}>
              <Camera size={11} /> Proctor Cam
            </span>
            <button 
              onClick={() => setIsCamMinimized(prev => !prev)} 
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              title={isCamMinimized ? "Expand Camera" : "Minimize Camera"}
            >
              {isCamMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            </button>
          </div>
          <div style={{ height: isCamMinimized ? '60px' : '110px', borderRadius: '8px', overflow: 'hidden', background: '#020617', border: '1px solid #1e293b' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          </div>
        </div>
      )}

      {/* SECURITY WARNING / TERMINATION MODAL */}
      {activeWarningModal && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', zIndex: 60 }}>
          <div className="modal-content" style={{ maxWidth: '460px', padding: '32px', borderRadius: '24px', background: 'var(--bg-panel, #ffffff)', border: activeWarningModal.terminated ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-light, #e4deff)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              {activeWarningModal.terminated ? (
                <ShieldAlert size={52} color="#ef4444" style={{ margin: '0 auto 14px auto' }} />
              ) : (
                <AlertTriangle size={52} color="#d97706" style={{ margin: '0 auto 14px auto' }} />
              )}
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: activeWarningModal.terminated ? '#ef4444' : '#d97706', margin: 0 }}>
                {activeWarningModal.terminated ? 'Assessment Terminated' : `Security Warning (${activeWarningModal.number}/${activeWarningModal.max})`}
              </h3>
            </div>

            <p style={{ fontSize: '0.92rem', color: 'var(--text-main, #544f7d)', textAlign: 'center', lineHeight: '1.6', marginBottom: '28px' }}>
              {activeWarningModal.message}
            </p>

            {!activeWarningModal.terminated && (
              <div style={{ display: 'flex', justify: 'center' }}>
                <button 
                  onClick={() => setActiveWarningModal(null)} 
                  style={{
                    width: '100%', padding: '12px',
                    background: 'linear-gradient(135deg, #6c4dff, #5638d8)',
                    color: '#ffffff', border: 'none', borderRadius: '12px',
                    fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(108, 77, 255, 0.35)'
                  }}
                >
                  Return to Assessment
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
