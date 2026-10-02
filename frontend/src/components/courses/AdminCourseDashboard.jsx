import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  BookOpen, 
  Layers, 
  Users, 
  CheckCircle, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  BarChart2, 
  Clock, 
  Search, 
  X,
  FileText,
  Award,
  Sparkles
} from 'lucide-react';

export default function AdminCourseDashboard({ token, onCreateNewCourse, onEditCourse }) {
  const [courses, setCourses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Analytics Modal for specific course
  const [selectedCourseAnalytics, setSelectedCourseAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    fetchAdminCourses();
  }, [token]);

  const fetchAdminCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/courses/admin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load admin courses');
      const data = await res.json();
      setCourses(data.courses || []);
      setAnalytics(data.analytics || null);
    } catch (err) {
      console.error('Error fetching admin courses:', err);
      setError(err.message || 'Could not load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (courseId, currentStatus) => {
    const newStatus = currentStatus === 'PUBLISHED' ? 'UNPUBLISHED' : 'PUBLISHED';
    try {
      const res = await fetch(`/api/courses/admin/${courseId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      fetchAdminCourses();
    } catch (err) {
      alert(err.message || 'Error updating status');
    }
  };

  const handleDeleteCourse = async (courseId, courseTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${courseTitle}"? This will remove all modules, lessons, and progress data.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/courses/admin/${courseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete course');
      fetchAdminCourses();
    } catch (err) {
      alert(err.message || 'Error deleting course');
    }
  };

  const handleViewAnalytics = async (courseId) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/courses/admin/${courseId}/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch course analytics');
      const data = await res.json();
      setSelectedCourseAnalytics(data);
    } catch (err) {
      alert(err.message || 'Could not load course analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="admin-course-dashboard" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* PAGE TITLE BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Sparkles size={14} /> Course Management System
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)', margin: '4px 0 0' }}>
            Admin Courses Dashboard
          </h1>
        </div>

        <button 
          className="btn btn-primary"
          onClick={onCreateNewCourse}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: '700' }}
        >
          <Plus size={18} /> Create New Course
        </button>
      </div>

      {/* OVERALL ANALYTICS CARDS */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '32px' }}>
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', borderLeft: '4px solid #6366f1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
              <span>Total Courses</span>
              <BookOpen size={20} color="#6366f1" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '8px' }}>
              {analytics.total_courses || 0}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', borderLeft: '4px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
              <span>Published Courses</span>
              <Eye size={20} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10b981', marginTop: '8px' }}>
              {analytics.published_courses || 0}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
              <span>Draft Courses</span>
              <EyeOff size={20} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f59e0b', marginTop: '8px' }}>
              {analytics.draft_courses || 0}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', borderLeft: '4px solid #a855f7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
              <span>Total Enrollments</span>
              <Users size={20} color="#a855f7" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '8px' }}>
              {analytics.total_enrollments || 0}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', borderLeft: '4px solid #06b6d4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>
              <span>Certificates Issued</span>
              <Award size={20} color="#06b6d4" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#06b6d4', marginTop: '8px' }}>
              {analytics.total_completions || 0}
            </div>
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
        <div style={{ position: 'relative', width: '360px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '42px', borderRadius: '10px' }}
          />
        </div>

        <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Showing {filteredCourses.length} courses
        </span>
      </div>

      {/* COURSES DATA TABLE */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="loading-ring" style={{ width: '36px', height: '36px', margin: '0 auto 12px' }}></div>
          <p>Loading course catalog...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)', borderRadius: '12px' }}>
          <p>{error}</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.78rem', letterSpacing: '0.05em' }}>
                <th style={{ padding: '14px 20px' }}>Course Title</th>
                <th style={{ padding: '14px 16px' }}>Category</th>
                <th style={{ padding: '14px 16px' }}>Level</th>
                <th style={{ padding: '14px 16px' }}>Structure</th>
                <th style={{ padding: '14px 16px' }}>Enrolled</th>
                <th style={{ padding: '14px 16px' }}>Completed</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map(course => (
                <tr key={course.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  
                  {/* Title & Thumbnail */}
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img 
                        src={course.thumbnail_url || 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80'} 
                        alt={course.title}
                        style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', background: 'var(--bg-input)' }}
                      />
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem' }}>{course.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{course.estimated_duration_hours}</div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', fontSize: '0.8rem', fontWeight: '600' }}>
                      {course.category}
                    </span>
                  </td>

                  {/* Level */}
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      {course.difficulty}
                    </span>
                  </td>

                  {/* Modules & Lessons */}
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      {course.module_count} Modules
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {course.lesson_count} Lessons
                    </div>
                  </td>

                  {/* Enrolled Count */}
                  <td style={{ padding: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                    {course.enrolled_count || 0} users
                  </td>

                  {/* Completed Count */}
                  <td style={{ padding: '16px', fontWeight: '700', color: '#10b981' }}>
                    {course.completed_count || 0} users
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: '16px' }}>
                    <span 
                      style={{ 
                        padding: '5px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.78rem', 
                        fontWeight: '700',
                        background: course.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: course.status === 'PUBLISHED' ? '#10b981' : '#f59e0b',
                        border: `1px solid ${course.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                      }}
                    >
                      {course.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      
                      {/* View Analytics */}
                      <button 
                        className="btn btn-secondary"
                        title="Course Analytics & Enrolled Learners"
                        onClick={() => handleViewAnalytics(course.id)}
                        style={{ padding: '8px', borderRadius: '8px' }}
                      >
                        <BarChart2 size={16} color="#818cf8" />
                      </button>

                      {/* Edit Course */}
                      <button 
                        className="btn btn-secondary"
                        title="Edit Course Content"
                        onClick={() => onEditCourse(course.id)}
                        style={{ padding: '8px', borderRadius: '8px' }}
                      >
                        <Edit size={16} />
                      </button>

                      {/* Toggle Status */}
                      <button 
                        className="btn btn-secondary"
                        title={course.status === 'PUBLISHED' ? 'Unpublish Course' : 'Publish Course'}
                        onClick={() => handleToggleStatus(course.id, course.status)}
                        style={{ padding: '8px', borderRadius: '8px' }}
                      >
                        {course.status === 'PUBLISHED' ? <EyeOff size={16} color="#f59e0b" /> : <Eye size={16} color="#10b981" />}
                      </button>

                      {/* Delete Course */}
                      <button 
                        className="btn btn-secondary"
                        title="Delete Course"
                        onClick={() => handleDeleteCourse(course.id, course.title)}
                        style={{ padding: '8px', borderRadius: '8px' }}
                      >
                        <Trash2 size={16} color="var(--danger)" />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* COURSE ANALYTICS MODAL */}
      {selectedCourseAnalytics && (
        <div className="modal-overlay" onClick={() => setSelectedCourseAnalytics(null)}>
          <div 
            className="modal-content glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '750px', padding: '32px', borderRadius: '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  {selectedCourseAnalytics.course.title}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0' }}>
                  Enrolled Learners & Completion Progress
                </p>
              </div>

              <button className="modal-close-btn" onClick={() => setSelectedCourseAnalytics(null)}>
                <X size={20} />
              </button>
            </div>

            {selectedCourseAnalytics.enrolled_users.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No users have enrolled in this course yet.
              </div>
            ) : (
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      <th style={{ padding: '10px 14px' }}>Learner</th>
                      <th style={{ padding: '10px 14px' }}>Email</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Progress</th>
                      <th style={{ padding: '10px 14px' }}>Enrolled Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCourseAnalytics.enrolled_users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '600', color: 'var(--text-main)' }}>
                          {u.display_name || u.username}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                          {u.email}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', background: u.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: u.status === 'COMPLETED' ? '#10b981' : '#818cf8' }}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', background: 'var(--bg-input)', borderRadius: '10px', overflow: 'hidden' }}>
                              <div style={{ width: `${u.progress_percentage}%`, height: '100%', background: u.status === 'COMPLETED' ? '#10b981' : '#6366f1' }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)' }}>
                              {u.progress_percentage}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(u.enrolled_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
