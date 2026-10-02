import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Star, HelpCircle, Shield, AlertTriangle, 
  CheckCircle, Filter, Search, PlusCircle, Clock, Send, X, 
  User, Building, RefreshCw, FileText, Lock, Award
} from 'lucide-react';

export default function AdminSupportDashboard({ user, isOrgPortal = false, orgId = null, theme = 'dark' }) {
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets', 'feedback', 'faqs', 'rules'
  const [tickets, setTickets] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Ticket Thread Modal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [priorityUpdate, setPriorityUpdate] = useState('');

  // FAQ Modal / Form
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: 'General', display_order: 0 });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, [activeTab, isOrgPortal, orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'tickets') {
        const url = isOrgPortal && orgId 
          ? `/api/support/tickets?organization_id=${orgId}`
          : '/api/support/tickets';
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setTickets(await res.json());
      } else if (activeTab === 'feedback') {
        const url = isOrgPortal && orgId 
          ? `/api/feedback?organization_id=${orgId}`
          : '/api/feedback';
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setFeedbackList(await res.json());
      } else if (activeTab === 'faqs') {
        const res = await fetch('/api/faqs');
        if (res.ok) setFaqs(await res.json());
      }
    } catch (err) {
      console.error('Error loading admin support data:', err);
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
        setStatusUpdate(data.ticket.status);
        setPriorityUpdate(data.ticket.priority);
      }
    } catch (err) {
      console.error('Error fetching ticket thread:', err);
    }
  };

  const handleAdminReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;
    setReplySubmitting(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: replyMessage })
      });
      if (res.ok) {
        setReplyMessage('');
        fetchTicketDetails(selectedTicket.id);
        fetchData();
      }
    } catch (err) {
      console.error('Error posting admin response:', err);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleUpdateStatusPriority = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: statusUpdate, priority: priorityUpdate })
      });
      if (res.ok) {
        fetchTicketDetails(selectedTicket.id);
        fetchData();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleCreateFaq = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/faqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(faqForm)
      });
      if (res.ok) {
        setShowFaqModal(false);
        setFaqForm({ question: '', answer: '', category: 'General', display_order: 0 });
        fetchData();
      }
    } catch (err) {
      console.error('Error creating FAQ:', err);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.ticket_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPriority && matchesCategory && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span style={{ background: '#3b82f620', color: '#60a5fa', border: '1px solid #3b82f640', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>OPEN</span>;
      case 'IN_PROGRESS':
        return <span style={{ background: '#f59e0b20', color: '#fbbf24', border: '1px solid #f59e0b40', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>IN PROGRESS</span>;
      case 'WAITING_FOR_USER':
        return <span style={{ background: '#8b5cf620', color: '#a78bfa', border: '1px solid #8b5cf640', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>WAITING FOR USER</span>;
      case 'RESOLVED':
        return <span style={{ background: '#10b98120', color: '#34d399', border: '1px solid #10b98140', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>RESOLVED</span>;
      case 'CLOSED':
        return <span style={{ background: '#6b728020', color: '#9ca3af', border: '1px solid #6b728040', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>CLOSED</span>;
      default:
        return <span style={{ background: '#6b728020', color: '#9ca3af', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{status}</span>;
    }
  };

  const styles = {
    container: {
      padding: '24px',
      maxWidth: '1300px',
      margin: '0 auto',
      color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
      fontFamily: "'Inter', sans-serif"
    },
    header: {
      display: 'flex',
      justify: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    title: {
      fontSize: '1.8rem',
      fontWeight: 800,
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '28px'
    },
    statCard: {
      background: theme === 'dark' ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
      border: '1px solid rgba(108, 77, 255, 0.2)',
      borderRadius: '12px',
      padding: '18px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px'
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
      textTransform: 'uppercase'
    },
    td: {
      padding: '16px 18px',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      fontSize: '0.9rem'
    },
    filterBar: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    input: {
      padding: '8px 14px',
      borderRadius: '8px',
      border: '1px solid rgba(108, 77, 255, 0.3)',
      background: theme === 'dark' ? '#1e293b' : '#f8fafc',
      color: 'inherit',
      fontSize: '0.85rem',
      outline: 'none'
    },
    select: {
      padding: '8px 14px',
      borderRadius: '8px',
      border: '1px solid rgba(108, 77, 255, 0.3)',
      background: theme === 'dark' ? '#1e293b' : '#f8fafc',
      color: 'inherit',
      fontSize: '0.85rem',
      outline: 'none'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px'
    },
    modalContent: {
      background: theme === 'dark' ? '#0f172a' : '#ffffff',
      border: '1px solid rgba(108, 77, 255, 0.3)',
      borderRadius: '16px',
      width: '100%', maxWidth: '800px', maxHeight: '90vh',
      overflowY: 'auto', padding: '28px'
    }
  };

  const openTicketsCount = tickets.filter(t => t.status === 'OPEN').length;
  const urgentTicketsCount = tickets.filter(t => t.priority === 'Urgent').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const avgRating = feedbackList.length > 0
    ? (feedbackList.reduce((acc, curr) => acc + (curr.rating || 5), 0) / feedbackList.length).toFixed(1)
    : '5.0';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Shield size={28} color="#6c4dff" />
          {isOrgPortal ? 'Organization Support & Feedback Dashboard' : 'Admin Support & Feedback Center'}
        </h1>
        <button onClick={fetchData} style={{ background: 'transparent', border: 'none', color: '#6c4dff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare color="#3b82f6" size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{openTicketsCount}</h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Open Tickets</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle color="#ef4444" size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#f87171' }}>{urgentTicketsCount}</h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Urgent Priority</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock color="#f59e0b" size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{inProgressCount}</h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>In Progress</span>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'rgba(217, 70, 239, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star color="#d946ef" size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{avgRating} / 5.0</h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Average Rating</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.navTabs}>
        <button style={styles.tabBtn(activeTab === 'tickets')} onClick={() => setActiveTab('tickets')}>
          Support Tickets ({tickets.length})
        </button>
        <button style={styles.tabBtn(activeTab === 'feedback')} onClick={() => setActiveTab('feedback')}>
          User Feedback ({feedbackList.length})
        </button>
        {!isOrgPortal && (
          <button style={styles.tabBtn(activeTab === 'faqs')} onClick={() => setActiveTab('faqs')}>
            Manage FAQs ({faqs.length})
          </button>
        )}
      </div>

      {/* TAB 1: TICKETS */}
      {activeTab === 'tickets' && (
        <div>
          {/* Filters */}
          <div style={styles.filterBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} color="#6c4dff" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter:</span>
            </div>

            <select style={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_USER">Waiting for User</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select style={styles.select} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="ALL">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <input
              type="text"
              placeholder="Search Code / Subject / Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...styles.input, width: '240px' }}
            />
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(30,41,59,0.3)', borderRadius: '12px' }}>
              No support tickets found matching your filters.
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>User Email</th>
                  <th style={styles.th}>Subject</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Priority</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Updated</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(t => (
                  <tr key={t.id}>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, color: '#a78bfa' }}>{t.ticket_code}</td>
                    <td style={{ ...styles.td, fontSize: '0.85rem' }}>{t.user_email || `User #${t.user_id}`}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{t.subject}</td>
                    <td style={styles.td}>{t.category}</td>
                    <td style={styles.td}>{t.priority}</td>
                    <td style={styles.td}>{getStatusBadge(t.status)}</td>
                    <td style={{ ...styles.td, color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(t.updated_at).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <button
                        style={{ background: '#6c4dff', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                        onClick={() => fetchTicketDetails(t.id)}
                      >
                        Manage Ticket
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: FEEDBACK */}
      {activeTab === 'feedback' && (
        <div>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading user feedback...</div>
          ) : feedbackList.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(30,41,59,0.3)', borderRadius: '12px' }}>
              No user feedback received yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {feedbackList.map(fb => (
                <div key={fb.id} style={{ background: theme === 'dark' ? 'rgba(30,41,59,0.5)' : '#ffffff', border: '1px solid rgba(108,77,255,0.2)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.8rem', background: 'rgba(217,70,239,0.15)', color: '#d946ef', padding: '2px 8px', borderRadius: '8px', fontWeight: 600 }}>
                      {fb.category}
                    </span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={14} color={s <= (fb.rating || 5) ? '#f59e0b' : '#475569'} fill={s <= (fb.rating || 5) ? '#f59e0b' : 'transparent'} />
                      ))}
                    </div>
                  </div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700 }}>{fb.subject || 'User Feedback'}</h4>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>{fb.message}</p>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                    <span>By: {fb.user_email || `User #${fb.user_id}`}</span>
                    <span>{new Date(fb.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MANAGE FAQS */}
      {activeTab === 'faqs' && !isOrgPortal && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Platform Frequently Asked Questions</h3>
            <button
              onClick={() => setShowFaqModal(true)}
              style={{ background: '#6c4dff', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={16} /> Add FAQ Item
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map(f => (
              <div key={f.id} style={{ background: theme === 'dark' ? 'rgba(30,41,59,0.4)' : '#fff', border: '1px solid rgba(108,77,255,0.2)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '1rem', color: '#a78bfa' }}>Q: {f.question}</strong>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(108,77,255,0.1)', padding: '2px 8px', borderRadius: '6px' }}>{f.category}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1' }}>A: {f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TICKET MANAGEMENT MODAL */}
      {selectedTicket && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Manage Ticket: {selectedTicket.ticket_code}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Submitted by {selectedTicket.user_email} • Category: {selectedTicket.category}
                </p>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setSelectedTicket(null)} />
            </div>

            {/* Status & Priority Control */}
            <div style={{ background: 'rgba(108,77,255,0.1)', padding: '14px', borderRadius: '10px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Status:</label>
                <select style={styles.select} value={statusUpdate} onChange={(e) => setStatusUpdate(e.target.value)}>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="WAITING_FOR_USER">WAITING_FOR_USER</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Priority:</label>
                <select style={styles.select} value={priorityUpdate} onChange={(e) => setPriorityUpdate(e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <button
                onClick={handleUpdateStatusPriority}
                style={{ marginTop: '18px', background: '#6c4dff', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                Update Status
              </button>
            </div>

            {/* Original Problem Description */}
            <div style={{ background: 'rgba(30,41,59,0.6)', padding: '14px', borderRadius: '10px', marginBottom: '20px' }}>
              <strong style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Initial Ticket Request:</strong>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', lineHeight: '1.5' }}>{selectedTicket.description}</p>
            </div>

            {/* Messages Thread */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
              {threadMessages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  style={{
                    background: msg.sender_type === 'USER' ? 'rgba(30,41,59,0.8)' : 'rgba(108,77,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a78bfa', marginBottom: '4px' }}>
                    <span>{msg.sender_name || msg.sender_type}</span>
                    <span>{new Date(msg.created_at).toLocaleString()}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>{msg.message}</p>
                </div>
              ))}
            </div>

            {/* Admin Response Box */}
            <form onSubmit={handleAdminReply}>
              <textarea
                placeholder="Type response to user..."
                rows={3}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                style={{ ...styles.input, width: '100%', marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="submit" disabled={replySubmitting || !replyMessage.trim()} style={{ background: '#6c4dff', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  {replySubmitting ? 'Sending...' : 'Send Staff Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE FAQ MODAL */}
      {showFaqModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Add New FAQ Item</h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowFaqModal(false)} />
            </div>

            <form onSubmit={handleCreateFaq}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Category</label>
                <select
                  value={faqForm.category}
                  onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                  style={{ ...styles.select, width: '100%' }}
                >
                  <option value="General">General</option>
                  <option value="Contests">Contests</option>
                  <option value="Assessments">Assessments</option>
                  <option value="Account">Account</option>
                  <option value="Certificates">Certificates</option>
                  <option value="Technical">Technical</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Question *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How do I download my contest certificate?"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  style={{ ...styles.input, width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Answer *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detailed answer text..."
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  style={{ ...styles.input, width: '100%', minHeight: '90px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowFaqModal(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ background: '#6c4dff', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  Publish FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
