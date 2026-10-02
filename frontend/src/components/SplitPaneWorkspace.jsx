import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  ArrowLeft, 
  Play, 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  Bookmark, 
  Share2, 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Code2, 
  History, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  Sparkles, 
  Terminal,
  Building2,
  Tag,
  Lightbulb,
  Clock,
  HardDrive,
  Plus,
  Sun,
  Moon,
  Monitor,
  Lock,
  Unlock,
  FileCode
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from '../i18n/I18nContext';

const defaultProblem = {
  id: 1,
  title: 'Two Sum',
  category: 'Arrays & Hashing',
  difficulty: 'Easy',
  description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.',
  constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.',
  input_format: 'First line: Space-separated integers representing array nums\nSecond line: An integer target',
  output_format: 'Space-separated 0-indexed integer indices',
  sample_input: '2 7 11 15\n9',
  sample_output: '0 1',
  test_cases: [],
  starter_code: {
    javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    // Write your solution code here\n}`,
    python: `from typing import List\n\nclass Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        # Write your solution code here\n        pass`,
    cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution code here\n        return {};\n    }\n};`,
    java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution code here\n        return new int[]{};\n    }\n}`
  }
};

// Helper for rendering inline markdown code
const renderFormattedText = (text) => {
  if (!text) return null;
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

export default function SplitPaneWorkspace({
  theme = 'dark',
  onToggleTheme,
  problem,
  onBack,
  onRunCode,
  onSubmitCode,
  isRunning,
  isSubmitting,
  consoleOutput,
  executionResult,
  submissions = []
}) {
  const { t } = useTranslation();
  // Active Problem state initialized with prop, then fetched from database
  const [activeProb, setActiveProb] = useState(problem || defaultProblem);

  // Layout Resizing States
  const [leftWidthPercent, setLeftWidthPercent] = useState(42); // 42% left pane width
  const [editorHeightPercent, setEditorHeightPercent] = useState(62); // 62% top right editor height
  const [isDraggingH, setIsDraggingH] = useState(false);
  const [isDraggingV, setIsDraggingV] = useState(false);

  // Left Content Tabs: 'description', 'editorial', 'submissions'
  const [activeLeftTab, setActiveLeftTab] = useState('description');

  // Metadata Actions
  const [copiedExampleIndex, setCopiedExampleIndex] = useState(null);
  const [expandedHints, setExpandedHints] = useState({ 0: true }); // Hint 1 expanded by default

  // Monaco Editor Language & Code State
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [editorCode, setEditorCode] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Secure Editorial Access & Solution Content State
  const [editorialAccess, setEditorialAccess] = useState({ unlocked: false, failedAttempts: 0, attemptsRemaining: 3, solved: false });
  const [editorialData, setEditorialData] = useState(null);
  const [editorialLoading, setEditorialLoading] = useState(false);
  const [editorialSnippetLang, setEditorialSnippetLang] = useState('javascript');
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [pendingSolutionCode, setPendingSolutionCode] = useState('');

  // Bottom Drawer Tabs: 'testcase' or 'testresult'
  const [activeRightTab, setActiveRightTab] = useState('testcase');
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);

  // Custom Test Runner State
  const [testRunnerMode, setTestRunnerMode] = useState('standard'); // 'standard' or 'custom'
  const [customInputText, setCustomInputText] = useState(activeProb?.sample_input || '');
  const [testCasesInput, setTestCasesInput] = useState([]);

  // Map language to Monaco language identifier
  const monacoLanguageMap = {
    javascript: 'javascript',
    python: 'python',
    cpp: 'cpp',
    java: 'java'
  };

  // Dynamically fetch complete problem details from backend database when problem changes
  useEffect(() => {
    let isMounted = true;
    const fetchFullProblem = async () => {
      const target = problem || defaultProblem;
      if (!target?.id) return;

      // Set initial problem object immediately
      setActiveProb(target);

      try {
        const res = await fetch(`/api/problems/${target.id}`);
        if (res.ok && isMounted) {
          const fullData = await res.json();
          setActiveProb(fullData);
        }
      } catch (err) {
        console.error('Error fetching full problem details:', err);
      }
    };

    fetchFullProblem();
    return () => { isMounted = false; };
  }, [problem]);

  // Safely retrieve starter code for selected language
  const getStarterCodeForLang = (lang) => {
    let parsed = null;
    if (activeProb?.starter_code) {
      if (typeof activeProb.starter_code === 'string') {
        try { parsed = JSON.parse(activeProb.starter_code); } catch (e) { parsed = null; }
      } else {
        parsed = activeProb.starter_code;
      }
    }
    if (parsed && parsed[lang]) return parsed[lang];
    if (defaultProblem.starter_code[lang]) return defaultProblem.starter_code[lang];
    return `// Write your ${lang.toUpperCase()} solution code here`;
  };

  // Code persistence during session (localStorage)
  useEffect(() => {
    if (!activeProb?.id) return;
    const sessionKey = `code_session_${activeProb.id}_${selectedLanguage}`;
    const savedCode = localStorage.getItem(sessionKey);
    if (savedCode) {
      setEditorCode(savedCode);
    } else {
      const code = getStarterCodeForLang(selectedLanguage);
      setEditorCode(code);
    }
  }, [activeProb, selectedLanguage]);

  const handleEditorChange = (value) => {
    setEditorCode(value || '');
    if (activeProb?.id) {
      const sessionKey = `code_session_${activeProb.id}_${selectedLanguage}`;
      localStorage.setItem(sessionKey, value || '');
    }
  };

  // Synchronize dynamic test cases when active problem updates
  useEffect(() => {
    let tcList = [];
    if (activeProb?.test_cases) {
      if (typeof activeProb.test_cases === 'string') {
        try { tcList = JSON.parse(activeProb.test_cases); } catch (e) { tcList = []; }
      } else if (Array.isArray(activeProb.test_cases)) {
        tcList = activeProb.test_cases;
      }
    }

    // Fallback to sample_input & sample_output if specific test_cases array is empty
    if (tcList.length === 0 && activeProb?.sample_input) {
      tcList = [{ input: activeProb.sample_input, expected: activeProb.sample_output || '' }];
    }

    // Fallback dictionary for common problems if test_cases list is empty
    if (tcList.length === 0) {
      const titleLower = (activeProb?.title || '').toLowerCase();
      if (titleLower.includes('reverse string')) {
        tcList = [
          { input: 'hello', expected: 'olleh' },
          { input: 'Hannah', expected: 'hannaH' },
          { input: 'CodeArena', expected: 'anerAedoC' },
          { input: 'a', expected: 'a' },
          { input: 'racecar', expected: 'racecar' }
        ];
      } else if (titleLower.includes('two sum')) {
        tcList = [
          { input: '2 7 11 15\n9', expected: '0 1' },
          { input: '3 2 4\n6', expected: '1 2' },
          { input: '3 3\n6', expected: '0 1' }
        ];
      } else {
        tcList = [
          { input: activeProb?.sample_input || 'Sample Input 1', expected: activeProb?.sample_output || 'Sample Output 1' }
        ];
      }
    }

    const formatted = tcList.map((tc, idx) => ({
      id: idx + 1,
      label: `Case ${idx + 1}`,
      input: tc.input || '',
      expected: tc.expected || ''
    }));

    setTestCasesInput(formatted);
    setSelectedCaseIndex(0);
    if (activeProb?.sample_input) {
      setCustomInputText(activeProb.sample_input);
    }
  }, [activeProb]);

  // Handle Horizontal Split Dragging
  const handleMouseDownH = (e) => {
    e.preventDefault();
    setIsDraggingH(true);
  };

  // Handle Vertical Split Dragging
  const handleMouseDownV = (e) => {
    e.preventDefault();
    setIsDraggingV(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingH) {
        const newWidthPercent = (e.clientX / window.innerWidth) * 100;
        if (newWidthPercent >= 20 && newWidthPercent <= 80) {
          setLeftWidthPercent(newWidthPercent);
        }
      }
      if (isDraggingV) {
        const workspaceTopOffset = 48; // top bar height
        const availableHeight = window.innerHeight - workspaceTopOffset;
        const relativeY = e.clientY - workspaceTopOffset;
        const newHeightPercent = (relativeY / availableHeight) * 100;
        if (newHeightPercent >= 20 && newHeightPercent <= 85) {
          setEditorHeightPercent(newHeightPercent);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingH(false);
      setIsDraggingV(false);
    };

    if (isDraggingH || isDraggingV) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingH, isDraggingV]);

  // Secure Editorial Fetching Logic
  const fetchEditorialAccess = async () => {
    if (!activeProb?.id) return;
    try {
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/editorial-access/${activeProb.id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setEditorialAccess(data);

        if (data.unlocked) {
          fetchEditorialContent();
        } else {
          setEditorialData(null);
        }
      } else {
        setEditorialAccess({ unlocked: false, failedAttempts: 0, attemptsRemaining: 3, solved: false });
        setEditorialData(null);
      }
    } catch (err) {
      console.error('Error fetching editorial access:', err);
      setEditorialAccess({ unlocked: false, failedAttempts: 0, attemptsRemaining: 3, solved: false });
      setEditorialData(null);
    }
  };

  const fetchEditorialContent = async () => {
    if (!activeProb?.id) return;
    setEditorialLoading(true);

    const fallbackSnippets = {
      javascript: `/**\n * Optimal solution implementation for "${activeProb.title}"\n */\nfunction solve(s) {\n    if (typeof s === 'string') return s.split('').reverse().join('');\n    return s;\n}`,
      python: `class Solution:\n    def solve(self, s):\n        # Optimal solution implementation for ${activeProb.title}\n        if isinstance(s, list):\n            return s[::-1]\n        return str(s)[::-1]`,
      cpp: `class Solution {\npublic:\n    auto solve(string s) {\n        // Optimal solution implementation for ${activeProb.title}\n        reverse(s.begin(), s.end());\n        return s;\n    }\n};`,
      java: `class Solution {\n    public String solve(String s) {\n        // Optimal solution implementation for ${activeProb.title}\n        return new StringBuilder(s).reverse().toString();\n    }\n}`
    };

    try {
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/problems/${activeProb.id}/editorial`, { headers });
      if (res.ok) {
        const data = await res.json();
        setEditorialData(data);
      } else {
        setEditorialData(null);
        if (res.status === 403) {
          const errData = await res.json();
          setEditorialAccess({
            unlocked: false,
            failedAttempts: errData.failedAttempts || 0,
            attemptsRemaining: errData.attemptsRemaining || 3,
            solved: false
          });
        }
      }
    } catch (err) {
      console.error('Error fetching editorial content:', err);
      setEditorialData({
        unlocked: true,
        problemTitle: activeProb.title,
        overview: `Optimal solution strategies for ${activeProb.title}.`,
        codeSnippets: fallbackSnippets
      });
    } finally {
      setEditorialLoading(false);
    }
  };

  useEffect(() => {
    setEditorialAccess({ unlocked: false, failedAttempts: 0, attemptsRemaining: 3, solved: false });
    setEditorialData(null);
    fetchEditorialAccess();
  }, [activeProb.id, executionResult, activeLeftTab]);

  const handleUseEditorialSolution = (code) => {
    setPendingSolutionCode(code);
    setShowReplaceModal(true);
  };

  const confirmReplaceCode = () => {
    if (pendingSolutionCode) {
      setEditorCode(pendingSolutionCode);
      const sessionKey = `code_session_${activeProb.id}_${selectedLanguage}`;
      localStorage.setItem(sessionKey, pendingSolutionCode);
    }
    setShowReplaceModal(false);
    setPendingSolutionCode('');
  };

  // Trigger Run
  const triggerRun = (overrideInput) => {
    setActiveRightTab('testresult');
    if (onRunCode) {
      const inputToUse = overrideInput || (testRunnerMode === 'custom' ? customInputText : undefined);
      onRunCode('run', selectedLanguage, editorCode, inputToUse);
    }
  };

  // Trigger Submit
  const triggerSubmit = () => {
    setActiveRightTab('testresult');
    if (onSubmitCode) {
      onSubmitCode('submit', selectedLanguage, editorCode);
    }
  };

  // Helper for adding custom testcase
  const addCustomTestCase = () => {
    const newId = testCasesInput.length + 1;
    const newCase = {
      id: newId,
      label: `Case ${newId}`,
      input: '',
      expected: ''
    };
    setTestCasesInput([...testCasesInput, newCase]);
    setSelectedCaseIndex(testCasesInput.length);
  };

  return (
    <div className={`workspace-wrapper leetcode-workspace-container ${isFullscreen ? 'fullscreen-workspace' : ''}`}>
      
      {/* ============================================================== */}
      {/* 1. TOP TOOLBAR: Back button, Title, Run & Submit Actions       */}
      {/* ============================================================== */}
      <header className="workspace-top-bar">
        <div className="workspace-bar-left">
          <button className="workspace-back-btn" onClick={onBack}>
            <ArrowLeft size={14} /> {t('workspace.back_to_problems', 'Problems')}
          </button>
          <div className="workspace-problem-title-bar">
            <h2 className="workspace-title">{activeProb.title}</h2>
            <span className={`badge-difficulty ${(activeProb.difficulty || 'Easy').toLowerCase()}`}>
              {activeProb.difficulty || 'Easy'}
            </span>
          </div>
        </div>

        {/* Center / Right: Action Buttons ONLY (Run & Submit) */}
        <div className="workspace-bar-right">
          <button 
            className="btn-action-run"
            onClick={() => triggerRun()}
            disabled={isRunning || isSubmitting}
            title="Run Code (Ctrl+Enter)"
          >
            {isRunning ? (
              <div className="loading-ring-sm"></div>
            ) : (
              <><Play size={14} fill="currentColor" /> {t('workspace.run', 'Run')}</>
            )}
          </button>

          <button 
            className="btn-action-submit"
            onClick={triggerSubmit}
            disabled={isRunning || isSubmitting}
            title="Submit Solution"
          >
            {isSubmitting ? (
              <div className="loading-ring-sm"></div>
            ) : (
              <><Send size={14} /> {t('workspace.submit', 'Submit')}</>
            )}
          </button>

          {/* Global Searchable Language Selector */}
          <LanguageSelector variant="workspace" />

          {/* Theme Toggle Pill */}
          <div className="theme-toggle-pill">
            <button 
              className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => onToggleTheme && onToggleTheme('light')}
              title="Light Mode"
            >
              <Sun size={13} />
            </button>
            <button 
              className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => onToggleTheme && onToggleTheme('dark')}
              title="Dark Mode"
            >
              <Moon size={13} />
            </button>
            <button 
              className={`theme-toggle-btn ${theme === 'system' ? 'active' : ''}`}
              onClick={() => onToggleTheme && onToggleTheme('system')}
              title="System Theme"
            >
              <Monitor size={13} />
            </button>
          </div>

          <button 
            className="btn btn-secondary" 
            style={{ padding: '5px 10px', fontSize: '0.8rem' }}
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Workspace"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. RESIZABLE SPLIT WORKSPACE BODY                               */}
      {/* ============================================================== */}
      <div className="workspace-split-body">
        
        {/* ------------------------------------------------------------ */}
        {/* LEFT PANE: Problem Description, Examples, Constraints, Tabs  */}
        {/* ------------------------------------------------------------ */}
        <div className="workspace-left-pane" style={{ width: `${leftWidthPercent}%` }}>
          
          {/* Header Tabs */}
          <div className="workspace-left-tabs">
            <button 
              className={`tab-btn-item ${activeLeftTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('description')}
            >
              <Code2 size={14} /> {t('workspace.tab.description', 'Description')}
            </button>
            <button 
              className={`tab-btn-item ${activeLeftTab === 'editorial' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('editorial')}
            >
              <Sparkles size={14} /> {t('workspace.tab.editorial', 'Editorial')}
            </button>
            <button 
              className={`tab-btn-item ${activeLeftTab === 'submissions' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('submissions')}
            >
              <History size={14} /> {t('workspace.tab.submissions', 'Submissions')}
            </button>
          </div>

          {/* Left Tab Content: Description */}
          {activeLeftTab === 'description' && (
            <div className="workspace-left-content">
              <div className="prob-title-row">
                <h1 className="prob-title-text">{activeProb.title}</h1>
                <span className={`badge-difficulty ${(activeProb.difficulty || 'Easy').toLowerCase()}`}>
                  {activeProb.difficulty || 'Easy'}
                </span>
              </div>

              {/* Problem Statement Narrative */}
              <div style={{ marginBottom: '20px', lineHeight: '1.6' }}>
                {(activeProb.description || '').split('\n\n').map((para, idx) => (
                  <p key={idx} style={{ marginBottom: '12px' }}>
                    {renderFormattedText(para)}
                  </p>
                ))}
              </div>

              {/* Input Format Section */}
              {activeProb.input_format && (
                <div className="format-section-box" style={{ marginBottom: '18px', padding: '12px 14px', borderRadius: '8px' }}>
                  <h4 className="format-section-title" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCode size={14} color="#6366f1" /> Input Format:
                  </h4>
                  <div className="format-section-content" style={{ fontSize: '0.83rem', lineHeight: '1.5' }}>
                    {renderFormattedText(activeProb.input_format)}
                  </div>
                </div>
              )}

              {/* Output Format Section */}
              {activeProb.output_format && (
                <div className="format-section-box" style={{ marginBottom: '18px', padding: '12px 14px', borderRadius: '8px' }}>
                  <h4 className="format-section-title" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Terminal size={14} color="#10b981" /> Output Format:
                  </h4>
                  <div className="format-section-content" style={{ fontSize: '0.83rem', lineHeight: '1.5' }}>
                    {renderFormattedText(activeProb.output_format)}
                  </div>
                </div>
              )}

              {/* Examples Section */}
              <div style={{ marginTop: '20px' }}>
                <h3 className="examples-heading" style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Examples</h3>
                {(() => {
                  let tcList = [];
                  if (activeProb.test_cases) {
                    if (typeof activeProb.test_cases === 'string') {
                      try { tcList = JSON.parse(activeProb.test_cases); } catch(e) {}
                    } else if (Array.isArray(activeProb.test_cases)) {
                      tcList = activeProb.test_cases;
                    }
                  }

                  if (tcList.length === 0 && activeProb.sample_input) {
                    tcList = [{ input: activeProb.sample_input, expected: activeProb.sample_output }];
                  }

                  if (tcList.length === 0) {
                    return <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No sample examples available.</div>;
                  }

                  return tcList.slice(0, 3).map((tc, idx) => (
                    <div key={idx} className="example-container">
                      <div className="example-title-row">
                        <span className="example-label">Example {idx + 1}:</span>
                        <button 
                          className="example-copy-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(`Input: ${tc.input}\nOutput: ${tc.expected}`);
                            setCopiedExampleIndex(idx + 1);
                            setTimeout(() => setCopiedExampleIndex(null), 2000);
                          }}
                          title="Copy Example"
                        >
                          {copiedExampleIndex === (idx + 1) ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                        </button>
                      </div>
                      <div className="example-content">
                        <div className="example-io-box input-box">
                          <strong className="example-io-label">Input:</strong> <span className="example-io-value">{tc.input}</span>
                        </div>
                        <div className="example-io-box output-box">
                          <strong className="example-io-label">Output:</strong> <span className="example-io-value">{tc.expected}</span>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Constraints Section */}
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600, marginBottom: '8px' }}>Constraints</h3>
                <ul className="constraint-bullet-list" style={{ paddingLeft: '20px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                  {(activeProb.constraints || 'None specified').split('\n').filter(Boolean).map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{renderFormattedText(item)}</li>
                  ))}
                </ul>
              </div>

              {/* Topic & Category Tags */}
              <div style={{ marginTop: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="case-pill"><Tag size={12} /> {activeProb.category || 'Algorithms'}</span>
              </div>
            </div>
          )}

          {/* Left Tab Content: Editorial */}
          {activeLeftTab === 'editorial' && (
            <div className="workspace-left-content">
              {!editorialAccess.unlocked ? (
                <div className="editorial-lock-card">
                  <div className="lock-icon-circle">
                    <Lock size={32} color="var(--warning)" />
                  </div>
                  <h2 className="editorial-lock-title">Editorial & Hints Locked</h2>
                  <p className="editorial-lock-desc">
                    To encourage independent problem solving, hints and the editorial solution are initially locked. You can unlock them by submitting an <strong>Accepted</strong> solution or reaching <strong>3 unsuccessful attempts</strong>.
                  </p>

                  <div className="attempts-progress-container">
                    <div className="attempts-progress-header">
                      <span>Failed Attempts Progress:</span>
                      <span className="attempts-count-badge">
                        {editorialAccess.failedAttempts} / 3 Attempts
                      </span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar fill-medium" 
                        style={{ width: `${Math.min(100, (editorialAccess.failedAttempts / 3) * 100)}%` }} 
                      />
                    </div>
                    <div className="attempts-remaining-sub">
                      {editorialAccess.attemptsRemaining > 0 ? (
                        <span>{editorialAccess.attemptsRemaining} more attempt(s) required to unlock hints & editorial.</span>
                      ) : (
                        <span>Editorial unlocked!</span>
                      )}
                    </div>
                  </div>

                  <div className="lock-actions-row">
                    <button className="btn btn-primary" onClick={() => triggerRun()}>
                      <Play size={14} fill="currentColor" /> Run Test Suite
                    </button>
                    <button className="btn btn-secondary" onClick={() => setActiveLeftTab('description')}>
                      Return to Description
                    </button>
                  </div>
                </div>
              ) : (
                <div className="editorial-unlocked-container">
                  <div className="editorial-unlocked-header">
                    <div className="editorial-unlocked-badge">
                      <Sparkles size={16} color="var(--success)" /> Solution & Hints Unlocked
                    </div>
                    <h2 className="editorial-main-title">{editorialData?.problemTitle || activeProb.title} — Editorial</h2>
                    <p className="editorial-overview-text">{editorialData?.overview}</p>
                  </div>

                  {/* Structured Hints Section */}
                  {editorialData?.hints && editorialData.hints.length > 0 && (
                    <div className="editorial-hints-container" style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Lightbulb size={18} color="#f59e0b" /> Problem Hints
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {editorialData.hints.map((hintText, idx) => {
                          const isExpanded = expandedHints[idx];
                          return (
                            <div 
                              key={idx} 
                              style={{ 
                                background: 'rgba(245, 158, 11, 0.08)', 
                                border: '1px solid rgba(245, 158, 11, 0.25)', 
                                borderRadius: '8px', 
                                padding: '12px 14px' 
                              }}
                            >
                              <div 
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                onClick={() => setExpandedHints(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              >
                                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Sparkles size={14} /> Hint {idx + 1}
                                </span>
                                {isExpanded ? <ChevronDown size={16} color="#fbbf24" /> : <ChevronRight size={16} color="#fbbf24" />}
                              </div>
                              {isExpanded && (
                                <div style={{ marginTop: '8px', fontSize: '0.84rem', color: '#e2e8f0', lineHeight: '1.5', borderTop: '1px dashed rgba(245, 158, 11, 0.2)', paddingTop: '8px' }}>
                                  {renderFormattedText(hintText)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Approach 1 */}
                  {editorialData?.approach1 && (
                    <div className="editorial-approach-card">
                      <h3 className="approach-title">{editorialData.approach1.title}</h3>
                      <p className="approach-idea">{editorialData.approach1.idea}</p>
                      <ul className="approach-steps-list">
                        {editorialData.approach1.steps?.map((st, i) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ul>
                      <div className="complexity-row">
                        <span>Time Complexity: <code>{editorialData.approach1.timeComplexity}</code></span>
                        <span>Space Complexity: <code>{editorialData.approach1.spaceComplexity}</code></span>
                      </div>
                    </div>
                  )}

                  {/* Approach 2 */}
                  {editorialData?.approach2 && (
                    <div className="editorial-approach-card highlight">
                      <h3 className="approach-title">{editorialData.approach2.title}</h3>
                      <p className="approach-idea"><strong>Key Insight:</strong> {editorialData.approach2.keyInsight}</p>
                      <ul className="approach-steps-list">
                        {editorialData.approach2.steps?.map((st, i) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ul>
                      <div className="complexity-row">
                        <span>Time Complexity: <code>{editorialData.approach2.timeComplexity}</code></span>
                        <span>Space Complexity: <code>{editorialData.approach2.spaceComplexity}</code></span>
                      </div>
                    </div>
                  )}

                  {/* Walkthrough */}
                  {editorialData?.walkthrough && (
                    <div className="editorial-walkthrough-card">
                      <h4 className="walkthrough-title">Execution Walkthrough</h4>
                      <div className="walkthrough-input">Input: <code>{editorialData.walkthrough.input}</code></div>
                      <div className="walkthrough-steps">
                        {editorialData.walkthrough.steps?.map((s, i) => (
                          <div key={i} className="walkthrough-step-item">{s}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Code Snippets */}
                  {editorialData?.codeSnippets && (
                    <div className="editorial-snippets-container">
                      <div className="snippets-header">
                        <h4 className="solution-implementations-title" style={{ fontSize: '0.9rem' }}>Solution Implementations</h4>
                        <div className="snippets-lang-tabs">
                          {['javascript', 'python', 'cpp', 'java'].map((lang) => (
                            <button 
                              key={lang}
                              className={`snippet-tab ${editorialSnippetLang === lang ? 'active' : ''}`}
                              onClick={() => setEditorialSnippetLang(lang)}
                            >
                              {lang.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="snippet-code-box">
                        <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                          {editorialData.codeSnippets[editorialSnippetLang]}
                        </pre>
                        <div className="snippet-actions-bar" style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            onClick={() => {
                              navigator.clipboard.writeText(editorialData.codeSnippets[editorialSnippetLang]);
                              alert('Solution code copied to clipboard!');
                            }}
                          >
                            <Copy size={13} /> Copy Code
                          </button>

                          <button 
                            className="btn btn-primary"
                            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                            onClick={() => handleUseEditorialSolution(editorialData.codeSnippets[editorialSnippetLang])}
                          >
                            <Sparkles size={13} /> Use This Solution
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Left Tab Content: Submissions */}
          {activeLeftTab === 'submissions' && (
            <div className="workspace-left-content">
              <h3 style={{ fontSize: '1rem', color: '#ffffff', marginBottom: '16px' }}>Submission History</h3>
              {submissions.length === 0 ? (
                <div style={{ color: '#888', fontSize: '0.85rem' }}>
                  No submission history logged for this session yet. Click <strong>Submit</strong> to evaluate solution!
                </div>
              ) : (
                <table className="problems-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Language</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub, idx) => (
                      <tr key={idx} className="problem-row">
                        <td>
                          <span className={`status-text ${sub.status === 'Accepted' ? 'accepted' : 'wrong'}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td>{sub.language.toUpperCase()}</td>
                        <td style={{ color: '#888' }}>{new Date(sub.submitted_at || Date.now()).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>

        {/* ------------------------------------------------------------ */}
        {/* HORIZONTAL DRAG HANDLE                                       */}
        {/* ------------------------------------------------------------ */}
        <div 
          className={`workspace-resizer-h ${isDraggingH ? 'dragging' : ''}`}
          onMouseDown={handleMouseDownH}
        />

        {/* ------------------------------------------------------------ */}
        {/* RIGHT PANE: Monaco Code Editor Top + Test Case Drawer Bottom */}
        {/* ------------------------------------------------------------ */}
        <div className="workspace-right-pane" style={{ width: `${100 - leftWidthPercent}%` }}>
          
          {/* Top Editor Area */}
          <div style={{ height: `${editorHeightPercent}%`, display: 'flex', flexDirection: 'column' }}>
            
            {/* Editor Toolbar Header (Language Switcher & Run/Submit Action Buttons) */}
            <div className="editor-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select 
                  className="lang-select-monaco"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                  <option value="javascript">JavaScript (Node.js)</option>
                  <option value="python">Python 3</option>
                  <option value="cpp">C++ (GCC 11)</option>
                  <option value="java">Java (JDK 17)</option>
                </select>
              </div>

              {/* In-Editor Run & Submit Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  className="btn-action-run"
                  onClick={() => triggerRun()}
                  disabled={isRunning || isSubmitting}
                  title="Run Code (Ctrl+Enter)"
                  style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                >
                  {isRunning ? (
                    <div className="loading-ring-sm"></div>
                  ) : (
                    <><Play size={14} fill="currentColor" /> Run</>
                  )}
                </button>

                <button 
                  className="btn-action-submit"
                  onClick={triggerSubmit}
                  disabled={isRunning || isSubmitting}
                  title="Submit Solution"
                  style={{ padding: '6px 16px', fontSize: '0.82rem' }}
                >
                  {isSubmitting ? (
                    <div className="loading-ring-sm"></div>
                  ) : (
                    <><Send size={14} /> Submit</>
                  )}
                </button>
              </div>
            </div>

            {/* MONACO CODE EDITOR INTEGRATION */}
            <div className="monaco-editor-wrapper">
              <Editor
                height="100%"
                language={monacoLanguageMap[selectedLanguage] || 'javascript'}
                theme={theme === 'light' ? 'vs' : 'vs-dark'}
                value={editorCode}
                onChange={handleEditorChange}
                options={{
                  fontSize: 14,
                  fontFamily: "'Fira Code', 'Courier New', monospace",
                  minimap: { enabled: false },
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  cursorBlinking: 'smooth',
                  smoothScrolling: true,
                  padding: { top: 12, bottom: 12 },
                  renderLineHighlight: 'all',
                  folding: true,
                  bracketPairColorization: { enabled: true }
                }}
              />
            </div>

          </div>

          {/* ------------------------------------------------------------ */}
          {/* VERTICAL DRAG HANDLE                                         */}
          {/* ------------------------------------------------------------ */}
          <div 
            className={`workspace-resizer-v ${isDraggingV ? 'dragging' : ''}`}
            onMouseDown={handleMouseDownV}
          />

          {/* Bottom Testcase & Test Result Panel */}
          <div 
            className="testcase-drawer-container" 
            style={{ height: `${100 - editorHeightPercent}%` }}
          >
            
            {/* Drawer Header Tabs & Run/Submit Action Buttons */}
            <div className="testcase-drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  className={`tab-btn-item ${activeRightTab === 'testcase' ? 'active' : ''}`}
                  onClick={() => setActiveRightTab('testcase')}
                >
                  <Code2 size={13} /> Testcase
                </button>
                <button 
                  className={`tab-btn-item ${activeRightTab === 'testresult' ? 'active' : ''}`}
                  onClick={() => setActiveRightTab('testresult')}
                >
                  <Terminal size={13} /> Test Result
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
                <button 
                  className="btn-action-run"
                  style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                  onClick={() => triggerRun()}
                  disabled={isRunning || isSubmitting}
                  title="Run Code"
                >
                  {isRunning ? (
                    <div className="loading-ring-sm"></div>
                  ) : (
                    <><Play size={12} fill="currentColor" /> Run</>
                  )}
                </button>

                <button 
                  className="btn-action-submit"
                  style={{ padding: '4px 14px', fontSize: '0.78rem' }}
                  onClick={triggerSubmit}
                  disabled={isRunning || isSubmitting}
                  title="Submit Solution"
                >
                  {isSubmitting ? (
                    <div className="loading-ring-sm"></div>
                  ) : (
                    <><Send size={12} /> Submit</>
                  )}
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="testcase-drawer-body">
              
              {/* TAB 1: TESTCASES PANEL */}
              {activeRightTab === 'testcase' && (
                <div>
                  {/* Mode Selector */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <button 
                      className={`tc-pill-item ${testRunnerMode === 'standard' ? 'active' : ''}`}
                      onClick={() => setTestRunnerMode('standard')}
                    >
                      Standard Suite ({testCasesInput.length})
                    </button>
                    <button 
                      className={`tc-pill-item ${testRunnerMode === 'custom' ? 'active' : ''}`}
                      onClick={() => setTestRunnerMode('custom')}
                    >
                      ⚡ Custom Testcase
                    </button>
                  </div>

                  {testRunnerMode === 'standard' ? (
                    <>
                      {/* Case Pill Selectors */}
                      <div className="tc-pill-list">
                        {testCasesInput.map((tc, idx) => (
                          <button 
                            key={tc.id}
                            className={`tc-pill-item ${selectedCaseIndex === idx ? 'active' : ''}`}
                            onClick={() => setSelectedCaseIndex(idx)}
                          >
                            {tc.label}
                          </button>
                        ))}
                        <button className="tc-pill-item" onClick={addCustomTestCase} title="Add Custom Test Case">
                          <Plus size={12} /> Add
                        </button>
                      </div>

                      {/* Input Editor Box */}
                      <div className="io-card">
                        <div className="io-card-label">Input Parameters:</div>
                        <textarea 
                          className="form-input" 
                          style={{ height: '60px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-light)' }}
                          value={testCasesInput[selectedCaseIndex]?.input || ''}
                          onChange={(e) => {
                            const updated = [...testCasesInput];
                            if (updated[selectedCaseIndex]) {
                              updated[selectedCaseIndex].input = e.target.value;
                              setTestCasesInput(updated);
                            }
                          }}
                        />
                      </div>

                      {/* Expected Output Box */}
                      {testCasesInput[selectedCaseIndex]?.expected !== undefined && (
                        <div className="io-card" style={{ marginTop: '8px' }}>
                          <div className="io-card-label">Expected Output:</div>
                          <div className="io-card-val" style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                            {testCasesInput[selectedCaseIndex]?.expected || '(Empty)'}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="io-card">
                      <div className="io-card-label">Custom Input Parameters:</div>
                      <textarea 
                        className="form-input" 
                        style={{ height: '80px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-light)' }}
                        placeholder="Type input parameters here (e.g. 2 7 11 15\n9)..."
                        value={customInputText}
                        onChange={(e) => setCustomInputText(e.target.value)}
                      />
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-action-run" onClick={() => triggerRun(customInputText)}>
                          <Play size={12} fill="currentColor" /> Run Custom Testcase
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TEST RESULTS PANEL (PASS / FAIL / ERROR VISUAL DIFF) */}
              {activeRightTab === 'testresult' && (
                <div>
                  {isRunning || isSubmitting ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#007aff', fontWeight: 600 }}>
                      <div className="loading-ring-sm"></div>
                      <span>Evaluating solution against sandbox runner...</span>
                    </div>
                  ) : (
                    <>
                      {/* Overall Verdict Status Header */}
                      <div className="verdict-header-row">
                        {consoleOutput && (consoleOutput.includes('Accepted') || consoleOutput.includes('Passed')) ? (
                          <div className="verdict-badge accepted">
                            <CheckCircle2 size={20} />
                            <span>Accepted</span>
                          </div>
                        ) : consoleOutput && consoleOutput.includes('Compilation Error') ? (
                          <div className="verdict-badge error">
                            <AlertTriangle size={20} />
                            <span>Compilation Error</span>
                          </div>
                        ) : consoleOutput && consoleOutput.includes('Time Limit Exceeded') ? (
                          <div className="verdict-badge tle">
                            <Clock size={20} />
                            <span>Time Limit Exceeded</span>
                          </div>
                        ) : (
                          <div className="verdict-badge wrong">
                            <XCircle size={20} />
                            <span>Wrong Answer</span>
                          </div>
                        )}

                        <div className="verdict-metrics">
                          <span><Clock size={12} /> {executionResult?.executionTime || 38} ms</span>
                          <span><HardDrive size={12} /> {executionResult?.memoryUsage || '38.4 MB'}</span>
                        </div>
                      </div>

                      {/* Detailed Test Results Cards */}
                      {executionResult?.results && executionResult.results.length > 0 ? (
                        <div style={{ marginTop: '12px' }}>
                          <div className="tc-pill-list">
                            {executionResult.results.map((res, idx) => (
                              <span 
                                key={res.id} 
                                className={`tc-pill-item ${res.status === 'PASS' ? 'active' : ''}`}
                                style={{ borderColor: res.status === 'PASS' ? '#2cbb5d' : (res.status === 'FAIL' ? '#ff375f' : '#ffc01e') }}
                              >
                                Case {res.id}: 
                                <span className={`tc-badge ${res.status.toLowerCase()}`}>
                                  {res.status}
                                </span>
                              </span>
                            ))}
                          </div>

                          {/* Selected Case Result Card */}
                          {executionResult.results.map((res, idx) => (
                            <div key={idx} style={{ marginTop: '8px' }}>
                              <div className="io-card">
                                <div className="io-card-label">Input:</div>
                                <div className="io-card-val">{res.input}</div>
                              </div>

                              <div className="io-card">
                                <div className="io-card-label">Expected Output:</div>
                                <div className="io-card-val" style={{ color: '#2cbb5d' }}>{res.expected}</div>
                              </div>

                              <div className="io-card">
                                <div className="io-card-label">Actual Output:</div>
                                <div className="io-card-val" style={{ color: res.status === 'PASS' ? '#2cbb5d' : '#ff375f' }}>
                                  {res.actual || (res.stderr ? `Error: ${res.stderr}` : 'No output returned')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="test-output-console" style={{ marginTop: '8px' }}>
                          <pre style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                            {consoleOutput || 'Click "Run" or "Submit" to evaluate code.'}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Replacing Editor Code */}
      {showReplaceModal && (
        <div className="modal-overlay" onClick={() => setShowReplaceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-container warning">
              <AlertTriangle size={32} />
            </div>
            <h3 className="modal-title">Replace Editor Code?</h3>
            <p className="modal-desc">
              Replacing your current editor code with the official editorial solution will overwrite any unsaved code changes in your workspace. Are you sure you want to proceed?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setShowReplaceModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmReplaceCode}>
                Replace Code
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

