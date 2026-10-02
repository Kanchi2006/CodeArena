import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, Search, PlusCircle, MessageSquare, AlertCircle, 
  CheckCircle, Clock, ChevronRight, Filter, RefreshCw, Send, X, 
  Paperclip, Tag, Shield, BookOpen, Award, Code, Building, Cpu, 
  User, Star, FileText, Lock, AlertTriangle
} from 'lucide-react';

export default function SupportCenter({ user, theme = 'dark', initialCategory = '', contextInfo = null, onBack }) {
  const [activeTab, setActiveTab] = useState('help'); // 'help', 'tickets', 'faqs'
  const [faqs, setFaqs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'ALL');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Form State - Ticket
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: initialCategory || 'Technical Issue',
    priority: 'Medium',
    description: '',
    related_feature: contextInfo?.type || 'General',
    contest_id: contextInfo?.contestId || '',
    assessment_id: contextInfo?.assessmentId || '',
    problem_id: contextInfo?.problemId || '',
    organization_id: contextInfo?.organizationId || ''
  });
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketMessage, setTicketMessage] = useState(null);

  // Form State - Feedback
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    category: 'General Feedback',
    subject: '',
    message: '',
    related_page: window.location.pathname,
    contest_id: contextInfo?.contestId || '',
    assessment_id: contextInfo?.assessmentId || '',
    problem_id: contextInfo?.problemId || '',
    organization_id: contextInfo?.organizationId || ''
  });
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Thread details
  const [threadMessages, setThreadMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchFaqs();
    fetchTickets();
  }, []);

  useEffect(() => {
    if (contextInfo) {
      if (contextInfo.autoOpenTicket) {
        setShowCreateModal(true);
      } else if (contextInfo.autoOpenFeedback) {
        setShowFeedbackModal(true);
      }
    }
  }, [contextInfo]);

  const fetchFaqs = async () => {
    try {
      const res = await fetch('/api/faqs');
      if (res.ok) {
        const data = await res.json();
        setFaqs(data);
      }
    } catch (err) {
      console.error('Error fetching FAQs:', err);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/support/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        setThreadMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching ticket details:', err);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setTicketSubmitting(true);
    setTicketMessage(null);

    const payload = {
      subject: ticketForm.subject,
      category: ticketForm.category,
      priority: ticketForm.priority,
      description: ticketForm.description,
      org_id: ticketForm.organization_id || contextInfo?.organizationId || null,
      contest_id: ticketForm.contest_id || contextInfo?.contestId || null,
      assessment_id: ticketForm.assessment_id || contextInfo?.assessmentId || null,
      problem_id: ticketForm.problem_id || contextInfo?.problemId || null
    };

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTicketMessage({ 
          type: 'success', 
          text: `✓ Support ticket raised successfully! Ticket ID: ${data.ticket_code || data.id}` 
        });
        setTicketForm({
          subject: '',
          category: 'Technical Issue',
          priority: 'Medium',
          description: '',
          related_feature: 'General',
          contest_id: '',
          assessment_id: '',
          problem_id: '',
          organization_id: ''
        });
        fetchTickets();
        setTimeout(() => {
          setShowCreateModal(false);
          setTicketMessage(null);
        }, 2200);
      } else {
        if (res.status === 401) {
          setTicketMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
        } else if (res.status === 403) {
          setTicketMessage({ type: 'error', text: 'You do not have permission to perform this action.' });
        } else if (res.status === 404) {
          setTicketMessage({ type: 'error', text: 'Support service endpoint could not be found.' });
        } else {
          setTicketMessage({ type: 'error', text: data.error || `Server error (${res.status}). Please try again.` });
        }
      }
    } catch (err) {
      console.error('Error submitting support ticket:', err);
      setTicketMessage({ type: 'error', text: 'Unable to connect to CodeArena server. Please check your connection.' });
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;
    setReplySubmitting(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessage })
      });
      if (res.ok) {
        setNewMessage('');
        fetchTicketDetails(selectedTicket.id);
        fetchTickets();
      }
    } catch (err) {
      console.error('Error posting message:', err);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'RESOLVED' })
      });
      if (res.ok) {
        fetchTicketDetails(ticketId);
        fetchTickets();
      }
    } catch (err) {
      console.error('Error closing ticket:', err);
    }
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    setFeedbackSubmitting(true);
    setFeedbackMessage(null);

    const payload = {
      rating: feedbackForm.rating,
      feedback_type: feedbackForm.category,
      subject: feedbackForm.subject || `${feedbackForm.category} Submission`,
      message: feedbackForm.message,
      page_url: feedbackForm.related_page || window.location.pathname,
      org_id: feedbackForm.organization_id || contextInfo?.organizationId || null,
      contest_id: feedbackForm.contest_id || contextInfo?.contestId || null,
      assessment_id: feedbackForm.assessment_id || contextInfo?.assessmentId || null,
      problem_id: feedbackForm.problem_id || contextInfo?.problemId || null
    };

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFeedbackMessage({ type: 'success', text: '✓ Thank you! Your feedback has been submitted successfully and will help us improve CodeArena.' });
        setFeedbackForm({
          rating: 5,
          category: 'General Feedback',
          subject: '',
          message: '',
          related_page: window.location.pathname,
          contest_id: '',
          assessment_id: '',
          problem_id: '',
          organization_id: ''
        });
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackMessage(null);
        }, 2200);
      } else {
        if (res.status === 401) {
          setFeedbackMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
        } else if (res.status === 403) {
          setFeedbackMessage({ type: 'error', text: 'You do not have permission to perform this action.' });
        } else {
          setFeedbackMessage({ type: 'error', text: data.error || `Server error (${res.status}). Please try again.` });
        }
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setFeedbackMessage({ type: 'error', text: 'Unable to connect to CodeArena server. Please check your connection.' });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const categoriesList = [
    { id: 'Account', name: 'Account & Login', icon: User, desc: 'Passwords, verification, profile setup' },
    { id: 'Contest', name: 'Contests', icon: Code, desc: 'Rules, registration, submissions, scoring' },
    { id: 'Assessment', name: 'Assessments', icon: FileText, desc: 'Proctoring, auto-submit, results' },
    { id: 'Problem', name: 'Coding Problems', icon: Cpu, desc: 'Test cases, time limits, language support' },
    { id: 'Certificate', name: 'Certificates', icon: Award, desc: 'Verification, download, badge issues' },
    { id: 'Course', name: 'Courses', icon: BookOpen, desc: 'Progress, modules, enrollment' },
    { id: 'Technical Issue', name: 'Technical Issues', icon: AlertTriangle, desc: 'Editor crashes, network timeouts' }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span style={{ background: '#3b82f620', color: '#60a5fa', border: '1px solid #3b82f640', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>OPEN</span>;
      case 'IN_PROGRESS':
        return <span style={{ background: '#f59e0b20', color: '#fbbf24', border: '1px solid #f59e0b40', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>IN PROGRESS</span>;
      case 'WAITING_FOR_USER':
        return <span style={{ background: '#8b5cf620', color: '#a78bfa', border: '1px solid #8b5cf640', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>WAITING FOR YOU</span>;
      case 'RESOLVED':
        return <span style={{ background: '#10b98120', color: '#34d399', border: '1px solid #10b98140', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>RESOLVED</span>;
      case 'CLOSED':
        return <span style={{ background: '#6b728020', color: '#9ca3af', border: '1px solid #6b728040', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>CLOSED</span>;
      default:
        return <span style={{ background: '#6b728020', color: '#9ca3af', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{status}</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      Low: '#10b981',
      Medium: '#3b82f6',
      High: '#f59e0b',
      Urgent: '#ef4444'
    };
    return (
      <span style={{ color: colors[priority] || '#9ca3af', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors[priority] || '#9ca3af' }}></span>
        {priority}
      </span>
    );
  };

  const styles = {
    container: {
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
      color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
      fontFamily: "'Inter', sans-serif"
    },
    hero: {
      background: 'linear-gradient(135deg, rgba(108, 77, 255, 0.15) 0%, rgba(217, 70, 239, 0.1) 100%)',
      border: '1px solid rgba(108, 77, 255, 0.2)',
      borderRadius: '16px',
      padding: '36px 24px',
      textAlign: 'center',
      marginBottom: '32px',
      position: 'relative',
      overflow: 'hidden'
    },
    heroTitle: {
      fontSize: '2.2rem',
      fontWeight: '800',
      background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '12px'
    },
    heroSub: {
      fontSize: '1rem',
      color: theme === 'dark' ? '#94a3b8' : '#64748b',
      maxWidth: '600px',
      margin: '0 auto 24px auto'
    },
    searchBar: {
      display: 'flex',
      alignItems: 'center',
      maxWidth: '600px',
      margin: '0 auto',
      background: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : '#ffffff',
      border: '1px solid rgba(108, 77, 255, 0.3)',
      borderRadius: '30px',
      padding: '8px 20px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
    },
    searchInput: {
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: 'inherit',
      width: '100%',
      marginLeft: '12px',
      fontSize: '0.95rem'
    },
    quickActions: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '16px',
      marginBottom: '32px'
    },
    actionCard: {
      background: theme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : '#ffffff',
      border: '1px solid rgba(108, 77, 255, 0.2)',
      borderRadius: '12px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    categoryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: '20px',
      marginBottom: '36px'
    },
    categoryCard: {
      background: theme === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    navTabs: {
      display: 'flex',
      gap: '12px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      paddingBottom: '12px',
      marginBottom: '24px'
    },
    tabBtn: (active) => ({
      padding: '8px 18px',
      borderRadius: '8px',
      border: 'none',
      background: active ? '#6c4dff' : 'transparent',
      color: active ? '#ffffff' : (theme === 'dark' ? '#94a3b8' : '#64748b'),
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }),
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      background: theme === 'dark' ? 'rgba(30, 41, 59, 0.3)' : '#ffffff',
      borderRadius: '12px',
      overflow: 'hidden'
    },
    th: {
      textAlign: 'left',
      padding: '14px 18px',
      background: theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#f1f5f9',
      color: theme === 'dark' ? '#94a3b8' : '#64748b',
      fontSize: '0.85rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    td: {
      padding: '16px 18px',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      fontSize: '0.9rem'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalContent: {
      background: theme === 'dark' ? '#0f172a' : '#ffffff',
      border: '1px solid rgba(108, 77, 255, 0.3)',
      borderRadius: '16px',
      width: '100%',
      maxWidth: '650px',
      maxHeight: '90vh',
      overflowY: 'auto',
      padding: '28px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      color: theme === 'dark' ? '#e2e8f0' : '#1e293b'
    },
    formGroup: {
      marginBottom: '18px'
    },
    label: {
      display: 'block',
      fontSize: '0.85rem',
      fontWeight: 600,
      marginBottom: '6px',
      color: theme === 'dark' ? '#cbd5e1' : '#475569'
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: '8px',
      border: '1px solid rgba(108, 77, 255, 0.3)',
      background: theme === 'dark' ? '#1e293b' : '#f8fafc',
      color: 'inherit',
      fontSize: '0.9rem',
      outline: 'none'
    },
    select: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: '8px',
      border: '1px solid rgba(108, 77, 255, 0.3)',
      background: theme === 'dark' ? '#1e293b' : '#f8fafc',
      color: 'inherit',
      fontSize: '0.9rem',
      outline: 'none'
    },
    textarea: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: '8px',
      border: '1px solid rgba(108, 77, 255, 0.3)',
      background: theme === 'dark' ? '#1e293b' : '#f8fafc',
      color: 'inherit',
      fontSize: '0.9rem',
      minHeight: '110px',
      outline: 'none'
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #6c4dff 0%, #5638d8 100%)',
      color: '#ffffff',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '8px',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 12px rgba(108, 77, 255, 0.3)'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#6c4dff', cursor: 'pointer', fontWeight: 600 }}>
              ← Back
            </button>
          )}
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HelpCircle size={28} color="#6c4dff" /> CodeArena Support & Help Center
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={styles.btnPrimary} onClick={() => setShowCreateModal(true)}>
            <PlusCircle size={18} /> Create Support Ticket
          </button>
          <button style={{ ...styles.btnPrimary, background: 'rgba(217, 70, 239, 0.15)', border: '1px solid rgba(217, 70, 239, 0.4)', color: '#d946ef' }} onClick={() => setShowFeedbackModal(true)}>
            <Star size={18} /> Give Feedback
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div style={styles.hero}>
        <h2 style={styles.heroTitle}>How can we help you today?</h2>
        <p style={styles.heroSub}>
          Search our comprehensive knowledge base or submit a support ticket to get help from the CodeArena team.
        </p>
        <div style={styles.searchBar}>
          <Search size={20} color="#6c4dff" />
          <input
            type="text"
            placeholder="Search help articles, FAQs, error messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <X size={18} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
          )}
        </div>
      </div>

      {/* Quick Actions / Categories */}
      <div style={styles.quickActions}>
        <div style={styles.actionCard} onClick={() => setShowCreateModal(true)}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(108, 77, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare color="#6c4dff" size={24} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontWeight: 700 }}>Contact Support</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Open a official support ticket</p>
          </div>
        </div>

        <div style={styles.actionCard} onClick={() => setActiveTab('tickets')}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock color="#3b82f6" size={24} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontWeight: 700 }}>My Support Requests</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>{tickets.length} active or past tickets</p>
          </div>
        </div>

        <div style={styles.actionCard} onClick={() => setShowFeedbackModal(true)}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(217, 70, 239, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star color="#d946ef" size={24} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontWeight: 700 }}>Send Platform Feedback</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Share suggestions or feature ideas</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.navTabs}>
        <button style={styles.tabBtn(activeTab === 'help')} onClick={() => setActiveTab('help')}>
          Knowledge Base & FAQs
        </button>
        <button style={styles.tabBtn(activeTab === 'tickets')} onClick={() => setActiveTab('tickets')}>
          My Tickets ({tickets.length})
        </button>
      </div>

      {/* TAB 1: HELP & FAQS */}
      {activeTab === 'help' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Popular Help Categories</h3>
          <div style={styles.categoryGrid}>
            {categoriesList.map(cat => {
              const IconComp = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <div
                  key={cat.id}
                  style={{
                    ...styles.categoryCard,
                    borderColor: isSelected ? '#6c4dff' : 'rgba(255, 255, 255, 0.08)',
                    background: isSelected ? 'rgba(108, 77, 255, 0.1)' : styles.categoryCard.background
                  }}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'ALL' : cat.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(108, 77, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconComp color="#6c4dff" size={20} />
                    </div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{cat.name}</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>{cat.desc}</p>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              Frequently Asked Questions {selectedCategory !== 'ALL' && `(${selectedCategory})`}
            </h3>
            {selectedCategory !== 'ALL' && (
              <button 
                onClick={() => setSelectedCategory('ALL')} 
                style={{ background: 'transparent', border: 'none', color: '#6c4dff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Clear Filter
              </button>
            )}
          </div>

          {filteredFaqs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(30, 41, 59, 0.3)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <HelpCircle size={40} color="#64748b" style={{ marginBottom: '12px' }} />
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>No articles or FAQs found for your search query.</p>
              <button style={{ ...styles.btnPrimary, marginTop: '16px' }} onClick={() => setShowCreateModal(true)}>
                Ask Support Team
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredFaqs.map(faq => (
                <details
                  key={faq.id}
                  style={{
                    background: theme === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
                    border: '1px solid rgba(108, 77, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    cursor: 'pointer'
                  }}
                >
                  <summary style={{ fontWeight: 700, fontSize: '1rem', color: theme === 'dark' ? '#f1f5f9' : '#1e293b', outline: 'none' }}>
                    {faq.question}
                    <span style={{ float: 'right', fontSize: '0.75rem', background: 'rgba(108,77,255,0.1)', color: '#a78bfa', padding: '2px 8px', borderRadius: '8px' }}>
                      {faq.category}
                    </span>
                  </summary>
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY TICKETS */}
      {activeTab === 'tickets' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>My Support Requests</h3>
            <button style={{ background: 'transparent', border: 'none', color: '#6c4dff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={fetchTickets}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading support tickets...</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', background: 'rgba(30, 41, 59, 0.3)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <MessageSquare size={48} color="#64748b" style={{ marginBottom: '16px' }} />
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>No support tickets yet</h4>
              <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                Need help with a contest, assessment, or account issue? Create a ticket and our support team will assist you.
              </p>
              <button style={styles.btnPrimary} onClick={() => setShowCreateModal(true)}>
                <PlusCircle size={18} /> Create Support Ticket
              </button>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Ticket ID</th>
                  <th style={styles.th}>Subject</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Priority</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Last Updated</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, color: '#a78bfa' }}>{t.ticket_code}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{t.subject}</td>
                    <td style={styles.td}>{t.category}</td>
                    <td style={styles.td}>{getPriorityBadge(t.priority)}</td>
                    <td style={styles.td}>{getStatusBadge(t.status)}</td>
                    <td style={{ ...styles.td, color: '#94a3b8', fontSize: '0.85rem' }}>{new Date(t.updated_at).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <button
                        style={{ background: '#6c4dff20', color: '#a78bfa', border: '1px solid #6c4dff40', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                        onClick={() => fetchTicketDetails(t.id)}
                      >
                        View Thread
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare color="#6c4dff" size={22} /> Create Support Ticket
              </h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowCreateModal(false)} />
            </div>

            {ticketMessage && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                background: ticketMessage.type === 'success' ? '#10b98120' : '#ef444420',
                border: `1px solid ${ticketMessage.type === 'success' ? '#10b98140' : '#ef444440'}`,
                color: ticketMessage.type === 'success' ? '#34d399' : '#f87171',
                fontSize: '0.9rem'
              }}>
                {ticketMessage.text}
              </div>
            )}

            <form onSubmit={handleCreateTicket}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="Short summary of the issue"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Category *</label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    style={styles.select}
                  >
                    <option value="Account">Account & Login</option>
                    <option value="Contest">Contest Issue</option>
                    <option value="Assessment">Assessment Issue</option>
                    <option value="Problem">Coding Problem</option>
                    <option value="Submission">Submission Error</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Course">Course</option>
                    <option value="Organization">Organization</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Security">Security Concern</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Priority *</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    style={styles.select}
                  >
                    <option value="Low">Low - General query</option>
                    <option value="Medium">Medium - Standard issue</option>
                    <option value="High">High - Blocking problem</option>
                    <option value="Urgent">Urgent - Critical contest/exam bug</option>
                  </select>
                </div>
              </div>

              {contextInfo && (
                <div style={{ background: 'rgba(108,77,255,0.1)', border: '1px solid rgba(108,77,255,0.2)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                  <strong>Auto-Attached Context:</strong> {contextInfo.name || contextInfo.type} (ID: {contextInfo.id || 'N/A'})
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Description *</label>
                <textarea
                  required
                  placeholder="Provide detailed description of the problem, error messages, or steps to reproduce..."
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  style={styles.textarea}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={ticketSubmitting} style={styles.btnPrimary}>
                  {ticketSubmitting ? 'Submitting...' : 'Submit Support Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GIVE FEEDBACK MODAL */}
      {showFeedbackModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star color="#d946ef" size={22} /> Share Your Feedback
              </h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowFeedbackModal(false)} />
            </div>

            {feedbackMessage && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                background: feedbackMessage.type === 'success' ? '#10b98120' : '#ef444420',
                border: `1px solid ${feedbackMessage.type === 'success' ? '#10b98140' : '#ef444440'}`,
                color: feedbackMessage.type === 'success' ? '#34d399' : '#f87171',
                fontSize: '0.9rem'
              }}>
                {feedbackMessage.text}
              </div>
            )}

            <form onSubmit={handleSendFeedback}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <label style={{ ...styles.label, marginBottom: '10px' }}>How was your experience?</label>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={28}
                      color={star <= feedbackForm.rating ? '#f59e0b' : '#475569'}
                      fill={star <= feedbackForm.rating ? '#f59e0b' : 'transparent'}
                      style={{ cursor: 'pointer', transition: 'transform 0.1s ease' }}
                      onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Category</label>
                  <select
                    value={feedbackForm.category}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                    style={styles.select}
                  >
                    <option value="General Feedback">General Feedback</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="UI/UX Feedback">UI/UX Improvement</option>
                    <option value="Contest Feedback">Contest Feedback</option>
                    <option value="Assessment Feedback">Assessment Feedback</option>
                    <option value="Problem Quality">Problem Quality</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Subject</label>
                  <input
                    type="text"
                    placeholder="Headline for your feedback"
                    value={feedbackForm.subject}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, subject: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Feedback Message *</label>
                <textarea
                  required
                  placeholder="What did you like or what could we improve?"
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                  style={styles.textarea}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={feedbackSubmitting} style={{ ...styles.btnPrimary, background: '#d946ef' }}>
                  {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SELECTED TICKET THREAD MODAL */}
      {selectedTicket && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#a78bfa' }}>{selectedTicket.ticket_code}</span>
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>{selectedTicket.subject}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Category: {selectedTicket.category} • Created: {new Date(selectedTicket.created_at).toLocaleString()}
                </p>
              </div>
              <X size={22} style={{ cursor: 'pointer' }} onClick={() => setSelectedTicket(null)} />
            </div>

            {/* Conversation Thread */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px', marginBottom: '24px' }}>
              {threadMessages.map((msg, idx) => {
                const isUser = msg.sender_type === 'USER';
                const isStaff = msg.sender_type === 'ADMIN' || msg.sender_type === 'ORGANIZATION';
                return (
                  <div
                    key={msg.id || idx}
                    style={{
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      background: isUser ? 'rgba(108, 77, 255, 0.15)' : 'rgba(30, 41, 59, 0.8)',
                      border: `1px solid ${isUser ? 'rgba(108, 77, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '12px',
                      padding: '14px 16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '6px', fontSize: '0.8rem', color: isStaff ? '#f472b6' : '#a78bfa', fontWeight: 600 }}>
                      <span>{isUser ? 'You' : `${msg.sender_name || 'CodeArena Support'} (${msg.sender_type})`}</span>
                      <span style={{ color: '#64748b' }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                      {msg.message}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Reply Input */}
            {selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'RESOLVED' ? (
              <form onSubmit={handleSendReply} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <textarea
                    placeholder="Type your reply..."
                    rows={2}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    style={{ ...styles.textarea, minHeight: '60px', flex: 1 }}
                  />
                  <button type="submit" disabled={replySubmitting || !newMessage.trim()} style={styles.btnPrimary}>
                    <Send size={16} /> Reply
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleCloseTicket(selectedTicket.id)}
                    style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    ✓ Mark as Resolved
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#34d399', fontSize: '0.9rem' }}>
                This ticket has been marked as {selectedTicket.status}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
