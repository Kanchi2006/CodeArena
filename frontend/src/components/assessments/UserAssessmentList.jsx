import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Clock, 
  Award, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  RotateCcw, 
  Search, 
  Layers, 
  FileText,
  ChevronRight
} from 'lucide-react';

export default function UserAssessmentList({ token, onSelectAssessment, onOpenResult, onViewHistory }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'available', 'in_progress', 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  useEffect(() => {
    fetchAssessments();
  }, [token]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/assessments', { headers });
      if (res.ok) {
        const data = await res.json();
        setAssessments(data);
      }
    } catch (err) {
      console.error('Error fetching assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyBadge = (difficulty) => {
    switch ((difficulty || '').toLowerCase()) {
      case 'easy':
        return <span className="difficulty-badge easy">Easy</span>;
      case 'medium':
        return <span className="difficulty-badge medium">Medium</span>;
      case 'hard':
        return <span className="difficulty-badge hard">Hard</span>;
      default:
        return <span className="difficulty-badge medium">{difficulty || 'Mixed'}</span>;
    }
  };

  const getStatusBadge = (item) => {
    if (item.hasActiveAttempt) {
      return <span className="badge-status in-progress"><Clock size={12} /> In Progress</span>;
    }
    if (item.latestAttempt && item.latestAttempt.status === 'COMPLETED') {
      return item.latestAttempt.is_passed 
        ? <span className="badge-status passed"><CheckCircle size={12} /> Passed ({item.latestAttempt.percentage}%)</span>
        : <span className="badge-status failed"><AlertCircle size={12} /> Failed ({item.latestAttempt.percentage}%)</span>;
    }
    return <span className="badge-status available">Available</span>;
  };

  const filteredAssessments = assessments.filter(item => {
    // Search query filter
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Type filter
    const matchesType = typeFilter === 'All' || item.assessment_type === typeFilter;

    // Tab filter
    let matchesTab = true;
    if (activeTab === 'available') {
      matchesTab = !item.latestAttempt || item.latestAttempt.status === 'IN_PROGRESS';
    } else if (activeTab === 'in_progress') {
      matchesTab = item.hasActiveAttempt;
    } else if (activeTab === 'completed') {
      matchesTab = item.latestAttempt && item.latestAttempt.status === 'COMPLETED';
    }

    return matchesSearch && matchesType && matchesTab;
  });

  const types = ['All', 'Coding', 'MCQ', 'Mixed', 'Technical', 'Practice'];

  return (
    <div className="assessment-container">
      {/* Header Banner */}
      <div className="assessment-hero-banner">
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '750px' }}>
          <div className="assessment-hero-badge">
            <Award size={14} /> Official Certification & Screening Hub
          </div>
          <h1 className="assessment-hero-title">
            CodeArena Assessments
          </h1>
          <p className="assessment-hero-desc">
            Test your programming expertise across algorithm coding challenges, multiple-choice questions, multiple-select quizzes, and system output predictions. Earn verifiable certificates upon passing.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              onClick={onViewHistory}
              className="btn btn-primary"
            >
              <FileText size={16} /> My Assessment History
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search Toolbar */}
      <div className="assessment-toolbar">
        {/* Navigation Tabs */}
        <div className="assessment-tabs-group">
          {[
            { id: 'all', label: 'All Assessments' },
            { id: 'available', label: 'Available' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'completed', label: 'Completed' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`assessment-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="assessment-search-box">
            <Search className="assessment-search-icon" size={16} />
            <input
              type="text"
              placeholder="Search assessments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="assessment-search-input"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="assessment-select-input"
          >
            {types.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{
            display: 'inline-block',
            width: '32px',
            height: '32px',
            border: '3px solid var(--primary)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ marginTop: '12px', fontSize: '0.9rem' }}>Loading CodeArena assessments...</p>
        </div>
      ) : filteredAssessments.length === 0 ? (
        /* Empty State */
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <BookOpen style={{ margin: '0 auto 12px auto', color: 'var(--text-muted)' }} size={48} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '8px' }}>No Assessments Found</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto' }}>
            {searchQuery || typeFilter !== 'All'
              ? 'No assessments matched your active search filters. Try clearing your search parameters.'
              : 'There are currently no published assessments available. Please check back soon.'}
          </p>
        </div>
      ) : (
        /* Grid of Assessment Cards */
        <div className="assessment-grid">
          {filteredAssessments.map(item => (
            <div key={item.id} className="assessment-card">
              <div>
                {/* Card Top Row */}
                <div className="assessment-card-header">
                  <span className="assessment-type-pill">
                    {item.assessment_type}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getDifficultyBadge(item.difficulty)}
                    {getStatusBadge(item)}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="assessment-card-title">
                    {item.title}
                  </h3>
                  <p className="assessment-card-desc">
                    {item.description || 'No description provided for this assessment.'}
                  </p>
                </div>

                {/* Info Pills */}
                <div className="assessment-card-metrics">
                  <div className="assessment-metric-item">
                    <Clock size={14} />
                    <span>{item.duration_minutes} Mins</span>
                  </div>
                  <div className="assessment-metric-item">
                    <Layers size={14} />
                    <span>{item.question_count || 0} Questions</span>
                  </div>
                  <div className="assessment-metric-item">
                    <Award size={14} />
                    <span>Pass: {item.passing_score_percentage}%</span>
                  </div>
                  <div className="assessment-metric-item">
                    <RotateCcw size={14} />
                    <span>Attempts: {item.userAttemptsCount} / {item.attempt_limit === 0 ? '∞' : item.attempt_limit}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                {item.hasActiveAttempt ? (
                  <button
                    onClick={() => onSelectAssessment(item)}
                    className="btn btn-primary"
                    style={{ width: '100%', background: 'linear-gradient(135deg, #d97706, #b45309)', borderColor: '#d97706' }}
                  >
                    <Play size={14} fill="currentColor" /> Resume Assessment
                  </button>
                ) : item.latestAttempt && item.latestAttempt.status === 'COMPLETED' ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => onOpenResult(item.latestAttempt.attempt_id)}
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                    >
                      <FileText size={14} /> View Results
                    </button>
                    {(item.attempt_limit === 0 || item.userAttemptsCount < item.attempt_limit) && (
                      <button
                        onClick={() => onSelectAssessment(item)}
                        className="btn btn-primary"
                        title="Retake Assessment"
                      >
                        <RotateCcw size={14} /> Retake
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectAssessment(item)}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    <span>Start Assessment</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
