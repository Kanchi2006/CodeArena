import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  X,
  Minus,
  RotateCcw,
  Trash2,
  Settings,
  Send,
  User,
  AlertCircle,
  Code2,
  ShieldCheck,
  Shield,
  BarChart2,
  Users,
  Database,
  Trophy,
  Award
} from 'lucide-react';

// ─── Suggested prompts: two modes ────────────────────────────────────────────

const USER_SUGGESTED_PROMPTS = [
  "What is my current streak and solved problem count?",
  "Can you explain the problem I am working on?",
  "How can I earn certificates on CodeArena?",
  "Give me tips on optimizing time complexity for algorithms.",
  "What features does CodeArena provide?"
];

const ADMIN_SUGGESTED_PROMPTS = [
  "Give me a full platform health report.",
  "How many users registered today and this week?",
  "What is today's submission count and acceptance rate?",
  "Show me the top 10 leaderboard users.",
  "Which problems have the lowest acceptance rate?",
  "How many certificates have been issued by milestone?",
  "Show me the most recent platform activity."
];

// ─── Welcome messages: two modes ─────────────────────────────────────────────

const USER_WELCOME_MSG = {
  id: 'welcome',
  sender: 'ai',
  text: "Hello! I'm your CodeArena Personal AI Assistant powered by Gemini. Ask me about your profile, streak, problem-solving strategies, CodeArena contests, or coding questions!",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

const ADMIN_WELCOME_MSG = {
  id: 'welcome',
  sender: 'ai',
  text: "👋 Welcome, Admin! I'm your **CodeArena Admin AI Assistant** powered by Gemini with live database access.\n\nI can answer questions about **users, submissions, problems, assessments, leaderboard, certificates, and platform analytics** — all using real-time data from your database.\n\nTry asking: *\"Give me a full platform health report\"* or *\"How many users joined this week?\"*",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

// ─── Detect admin from localStorage ──────────────────────────────────────────

function getStoredUser() {
  try {
    const raw = localStorage.getItem('codearena_user');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}

function isAdminUser(user) {
  return user && user.role === 'admin';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIChatbot({ arenaProblem = null, currentUser: propUser = null }) {
  const [isOpen, setIsOpen]           = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState(null);
  const [lastFailedText, setLastFailedText] = useState('');
  const [inputText, setInputText]     = useState('');

  // Detect current user role reactively so admin login updates the UI
  const [currentUser, setCurrentUser] = useState(() => propUser || getStoredUser());
  const isAdmin = isAdminUser(currentUser);

  // Sync user from propUser or localStorage when props change or chatbot opens (handles login/logout transitions)
  useEffect(() => {
    if (propUser) {
      setCurrentUser(propUser);
    } else if (isOpen) {
      setCurrentUser(getStoredUser());
    }
  }, [propUser, isOpen]);

  // Per-role chat history keys so histories don't mix
  const historyKey = isAdmin ? 'codearena_admin_chat_history' : 'codearena_chat_history';
  const welcomeMsg = isAdmin ? ADMIN_WELCOME_MSG : USER_WELCOME_MSG;

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(isAdmin ? 'codearena_admin_chat_history' : 'codearena_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { /* ignore */ }
    return [isAdmin ? ADMIN_WELCOME_MSG : USER_WELCOME_MSG];
  });

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);

  // Re-initialise messages when role changes (e.g. admin logs in while chatbot was open)
  const prevIsAdminRef = useRef(isAdmin);
  useEffect(() => {
    if (prevIsAdminRef.current !== isAdmin) {
      prevIsAdminRef.current = isAdmin;
      setMessages([isAdmin ? ADMIN_WELCOME_MSG : USER_WELCOME_MSG]);
      setErrorMsg(null);
    }
  }, [isAdmin]);

  // Auto-save messages to correct localStorage key
  useEffect(() => {
    try {
      localStorage.setItem(historyKey, JSON.stringify(messages));
    } catch (e) { /* ignore */ }
  }, [messages, historyKey]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  useEffect(() => {
    if (isOpen && !isMinimized) scrollToBottom();
  }, [messages, isOpen, isMinimized, isLoading]);

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = async (overrideText = null) => {
    const textToSend = overrideText !== null ? overrideText : inputText;
    if (!textToSend || !textToSend.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setErrorMsg(null);
    setIsLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('You must be signed in to use the AI Assistant.');

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Route to correct endpoint
      const endpoint = isAdmin ? '/api/admin/chat' : '/api/chat';

      const payload = isAdmin
        ? { messages: newMessages.map(m => ({ sender: m.sender, text: m.text })) }
        : {
            messages: newMessages.map(m => ({ sender: m.sender, text: m.text })),
            currentProblem: arenaProblem ? {
              title: arenaProblem.title,
              difficulty: arenaProblem.difficulty,
              category: arenaProblem.category,
              description: arenaProblem.description
            } : null
          };

      const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to get response from AI assistant.');

      const aiReply = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.reply || 'No response returned.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: data.provider
      };

      setMessages(prev => [...prev, aiReply]);
    } catch (err) {
      console.error('AIChatbot error:', err);
      setErrorMsg(err.message || 'Network error occurred. Please try again.');
      setLastFailedText(textToSend.trim());
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaInput = (e) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleNewConversation = () => {
    setMessages([welcomeMsg]);
    setErrorMsg(null);
    try { localStorage.removeItem(historyKey); } catch (e) {}
  };

  const handleClearHistory = () => {
    setMessages([]);
    setErrorMsg(null);
    try { localStorage.removeItem(historyKey); } catch (e) {}
  };

  const handleRetry = () => {
    if (lastFailedText) handleSend(lastFailedText);
  };

  // ── Markdown renderer (unchanged) ─────────────────────────────────────────

  const renderFormattedMessage = (content) => {
    if (!content) return null;

    // Split code blocks ```...```
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        let language = '';
        let codeBody = part.slice(3, -3).trim();
        if (lines.length > 0 && /^[a-zA-Z0-9_-]+$/.test(lines[0].trim())) {
          language = lines[0].trim();
          codeBody = lines.slice(1).join('\n');
        }
        return (
          <div key={idx} style={{ margin: '8px 0', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {language && (
              <div style={{ padding: '4px 12px', fontSize: '0.75rem', color: 'var(--primary-hover)', backgroundColor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code2 size={12} />{language.toUpperCase()}
              </div>
            )}
            <pre style={{ margin: 0, padding: '10px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem', overflowX: 'auto', color: '#f8fafc', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <code>{codeBody}</code>
            </pre>
          </div>
        );
      }

      // Inline bold + bullet lines
      return (
        <span key={idx}>
          {part.split(/(\*\*.*?\*\*)/g).map((sub, sIdx) => {
            if (sub.startsWith('**') && sub.endsWith('**')) {
              return <strong key={sIdx} style={{ fontWeight: 600, color: 'var(--primary-hover, #818cf8)' }}>{sub.slice(2, -2)}</strong>;
            }
            // Render newlines as line breaks
            return sub.split('\n').map((line, lIdx, arr) => (
              <React.Fragment key={`${sIdx}-${lIdx}`}>
                {line}
                {lIdx < arr.length - 1 && <br />}
              </React.Fragment>
            ));
          })}
        </span>
      );
    });
  };

  // ── Theme colors based on role ─────────────────────────────────────────────
  const primaryColor    = isAdmin ? '#f59e0b' : '#6366f1';
  const primaryGradient = isAdmin
    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
    : 'linear-gradient(135deg, #6366f1, #8b5cf6)';
  const borderColor = isAdmin
    ? 'rgba(245, 158, 11, 0.45)'
    : 'rgba(99, 102, 241, 0.4)';
  const glowColor = isAdmin
    ? '0 20px 50px rgba(0,0,0,0.6), 0 0 20px rgba(245,158,11,0.15)'
    : '0 20px 50px rgba(0,0,0,0.6), 0 0 20px rgba(99,102,241,0.15)';
  const headerGrad = isAdmin
    ? 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.18))'
    : 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: 'var(--font-sans, sans-serif)' }}>

      {/* ── Trigger Button ──────────────────────────────────────────────────── */}
      {(!isOpen || isMinimized) && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); setCurrentUser(getStoredUser()); }}
          aria-label="Open AI Assistant"
          title={isAdmin ? 'Admin AI Assistant' : 'CodeArena AI Assistant'}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 18px', borderRadius: '50px',
            backgroundColor: 'var(--bg-panel-solid, #0f172a)',
            color: '#ffffff',
            border: `1px solid ${borderColor}`,
            boxShadow: isAdmin ? '0 8px 30px rgba(245,158,11,0.35)' : '0 8px 30px rgba(99,102,241,0.35)',
            cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)', backdropFilter: 'blur(12px)'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: primaryGradient, color: '#fff' }}>
            {isAdmin ? <Shield size={18} /> : <Bot size={20} />}
            <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.2px' }}>
            {isAdmin ? 'Admin AI' : 'AI Assistant'}
          </span>
          <Sparkles size={16} style={{ color: isAdmin ? '#f59e0b' : '#d946ef', animation: 'pulse 2s infinite' }} />
        </button>
      )}

      {/* ── Main Chat Window ─────────────────────────────────────────────────── */}
      {isOpen && !isMinimized && (
        <div style={{
          width: '400px', maxWidth: 'calc(100vw - 32px)',
          height: isAdmin ? '600px' : '560px',
          maxHeight: 'calc(100vh - 100px)',
          backgroundColor: 'var(--bg-panel-solid, #0f172a)',
          borderRadius: '16px',
          border: `1px solid ${borderColor}`,
          boxShadow: glowColor,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out', backdropFilter: 'blur(16px)'
        }}>

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div style={{ padding: '12px 16px', background: headerGrad, borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: primaryGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: isAdmin ? '0 2px 10px rgba(245,158,11,0.3)' : '0 2px 10px rgba(99,102,241,0.3)' }}>
                {isAdmin ? <Shield size={18} /> : <Bot size={20} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main, #f8fafc)' }}>
                    {isAdmin ? 'Admin AI' : 'CodeArena AI'}
                  </h4>
                  {isAdmin ? (
                    <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: '10px', backgroundColor: 'rgba(245,158,11,0.18)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)', fontWeight: 700 }}>
                      ADMIN MODE
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600 }}>
                      Gemini
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                  {isAdmin ? '🔴 Live DB Access · Function Calling' : 'Personal CodeArena Assistant'}
                </p>
              </div>
            </div>

            {/* Header action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button onClick={handleNewConversation} title="New Conversation" style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted, #94a3b8)'}
              ><RotateCcw size={16} /></button>

              <button onClick={() => setShowSettings(!showSettings)} title="Settings" style={{ background: showSettings ? `rgba(${isAdmin ? '245,158,11' : '99,102,241'},0.2)` : 'none', border: 'none', color: showSettings ? primaryColor : 'var(--text-muted, #94a3b8)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                <Settings size={16} />
              </button>

              <button onClick={() => setIsMinimized(true)} title="Minimize" style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted, #94a3b8)'}
              ><Minus size={16} /></button>

              <button onClick={() => setIsOpen(false)} title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted, #94a3b8)'}
              ><X size={16} /></button>
            </div>
          </div>

          {/* ── Admin Data Access Indicator Bar ─────────────────────────────── */}
          {isAdmin && (
            <div style={{ padding: '6px 14px', background: 'linear-gradient(90deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08))', borderBottom: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.72rem', color: '#f59e0b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Database size={11} />Live DB</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Users size={11} />Users</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><BarChart2 size={11} />Analytics</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Trophy size={11} />Leaderboard</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Award size={11} />Certs</span>
            </div>
          )}

          {/* ── Problem context badge (user-only) ────────────────────────────── */}
          {!isAdmin && arenaProblem && (
            <div style={{ padding: '6px 14px', backgroundColor: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.2)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted, #94a3b8)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Code2 size={13} style={{ color: 'var(--primary, #6366f1)' }} />
                <span>Context: <strong style={{ color: 'var(--text-main, #f8fafc)' }}>{arenaProblem.title}</strong></span>
              </span>
              <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: arenaProblem.difficulty === 'Easy' ? 'rgba(16,185,129,0.2)' : arenaProblem.difficulty === 'Medium' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)', color: arenaProblem.difficulty === 'Easy' ? '#10b981' : arenaProblem.difficulty === 'Medium' ? '#f59e0b' : '#ef4444' }}>
                {arenaProblem.difficulty}
              </span>
            </div>
          )}

          {/* ── Settings drawer ──────────────────────────────────────────────── */}
          {showSettings && (
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-panel-elevated, #1e293b)', borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.08))', fontSize: '0.82rem', color: 'var(--text-main, #f8fafc)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.88rem' }}>Assistant Settings</strong>
                <button onClick={handleClearHistory} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Trash2 size={12} /> Clear Chat History
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} style={{ color: '#10b981' }} />
                    {isAdmin ? 'Admin Authorization Active' : 'Secure User Data Authorization'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>Active</span>
                </div>
                <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.2)', fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                  {isAdmin
                    ? 'Admin AI accesses live platform data (users, submissions, assessments, leaderboard, certificates) via secure server-side database queries. Passwords, tokens, API keys, and test case answers are never exposed.'
                    : 'The chatbot accesses only your authorized profile, streak, XP, and submission stats to deliver personal advice. Other users\' data, admin records, and hidden tests are strictly isolated.'}
                </div>
                {isAdmin && (
                  <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.75rem', color: '#f59e0b' }}>
                    🔧 <strong>Function Calling</strong> — Gemini uses 10 real-time tools:<br />
                    getPlatformStats · getUsers · getUserStats · getSubmissionStats · getProblemStats · getAssessmentStats · getLeaderboard · getCertificateStats · getRecentActivity · searchUsers
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Messages Body ────────────────────────────────────────────────── */}
          <div style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', maxWidth: '88%', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
                  {/* Avatar */}
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: msg.sender === 'user' ? primaryColor : 'var(--bg-panel-elevated, #1e293b)', border: msg.sender === 'user' ? 'none' : `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0, marginTop: '2px' }}>
                    {msg.sender === 'user'
                      ? <User size={14} />
                      : (isAdmin ? <Shield size={13} style={{ color: '#f59e0b' }} /> : <Bot size={14} style={{ color: 'var(--primary-hover, #818cf8)' }} />)
                    }
                  </div>
                  {/* Bubble */}
                  <div style={{ padding: '10px 14px', borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px', backgroundColor: msg.sender === 'user' ? primaryColor : 'var(--bg-panel-elevated, #1e293b)', color: msg.sender === 'user' ? '#ffffff' : 'var(--text-main, #f8fafc)', fontSize: '0.85rem', lineHeight: '1.5', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', wordBreak: 'break-word', border: msg.sender === 'user' ? 'none' : '1px solid var(--border-light, rgba(255,255,255,0.08))' }}>
                    {renderFormattedMessage(msg.text)}
                  </div>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748b)', marginTop: '4px', marginLeft: msg.sender === 'user' ? 0 : '34px', marginRight: msg.sender === 'user' ? '34px' : 0 }}>
                  {msg.timestamp}
                  {msg.provider && msg.sender === 'ai' && (
                    <span style={{ marginLeft: '6px', opacity: 0.5, fontSize: '0.62rem' }}>{msg.provider}</span>
                  )}
                </span>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--bg-panel-elevated, #1e293b)', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isAdmin ? <Shield size={13} style={{ color: '#f59e0b' }} /> : <Bot size={14} style={{ color: 'var(--primary-hover, #818cf8)' }} />}
                </div>
                <div style={{ padding: '8px 14px', borderRadius: '14px 14px 14px 2px', backgroundColor: 'var(--bg-panel-elevated, #1e293b)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', backgroundColor: primaryColor, borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                  <span style={{ width: '6px', height: '6px', backgroundColor: primaryColor, borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }} />
                  <span style={{ width: '6px', height: '6px', backgroundColor: primaryColor, borderRadius: '50%', animation: 'pulse 1s infinite 0.4s' }} />
                </div>
                {isAdmin && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Querying database…</span>
                )}
              </div>
            )}

            {/* Error + retry */}
            {errorMsg && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={15} /><span>{errorMsg}</span>
                </div>
                {lastFailedText && (
                  <button onClick={handleRetry} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: '#ffffff', fontSize: '0.72rem', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
                )}
              </div>
            )}

            {/* Suggested prompts (when short conversation) */}
            {messages.length <= 2 && !isLoading && (
              <div style={{ marginTop: '8px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
                  {isAdmin ? '⚡ Quick Admin Queries:' : 'Suggested Questions:'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(isAdmin ? ADMIN_SUGGESTED_PROMPTS : USER_SUGGESTED_PROMPTS).map((prompt, idx) => (
                    <button key={idx} onClick={() => handleSend(prompt)}
                      style={{ textAlign: 'left', padding: '7px 10px', borderRadius: '8px', backgroundColor: isAdmin ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isAdmin ? 'rgba(245,158,11,0.18)' : 'var(--border-light, rgba(255,255,255,0.08))'}`, color: 'var(--text-main, #f8fafc)', fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = isAdmin ? 'rgba(245,158,11,0.14)' : 'rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor = isAdmin ? 'rgba(245,158,11,0.4)' : 'rgba(99,102,241,0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = isAdmin ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = isAdmin ? 'rgba(245,158,11,0.18)' : 'var(--border-light, rgba(255,255,255,0.08))'; }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input area ───────────────────────────────────────────────────── */}
          <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-panel-elevated, #1e293b)', borderTop: '1px solid var(--border-light, rgba(255,255,255,0.08))', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={isAdmin ? 'Ask about users, submissions, analytics… (Enter to send)' : 'Ask CodeArena Assistant… (Shift+Enter for newline)'}
              rows={1}
              style={{ flex: 1, backgroundColor: 'var(--bg-input, #090d16)', border: `1px solid ${isAdmin ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.12)'}`, borderRadius: '10px', padding: '8px 12px', color: 'var(--text-main, #f8fafc)', fontSize: '0.85rem', resize: 'none', outline: 'none', fontFamily: 'inherit', maxHeight: '120px', overflowY: 'auto' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              title="Send Message (Enter)"
              style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: inputText.trim() && !isLoading ? primaryColor : 'rgba(255,255,255,0.08)', color: inputText.trim() && !isLoading ? '#ffffff' : 'var(--text-muted, #64748b)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: inputText.trim() && !isLoading ? 'pointer' : 'not-allowed', transition: 'all 0.2s ease', flexShrink: 0 }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
