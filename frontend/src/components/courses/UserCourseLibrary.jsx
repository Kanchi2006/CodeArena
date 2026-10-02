import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Clock, 
  Layers, 
  CheckCircle, 
  ArrowRight, 
  Play, 
  Search, 
  Filter, 
  Award, 
  Sparkles,
  TrendingUp
} from 'lucide-react';

export default function UserCourseLibrary({ token, onSelectCourse, onGoToCertificates }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');

  useEffect(() => {
    fetchCourses();
  }, [token]);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/courses', { headers });
      if (!res.ok) throw new Error('Failed to load courses');
      const data = await res.json();
      setCourses(data);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(err.message || 'Could not load courses');
    } finally {
      setLoading(false);
    }
  };

  // Categories extraction
  const categories = ['All', ...new Set(courses.map(c => c.category).filter(Boolean))];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  // Filtered courses
  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.short_description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || c.difficulty === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getDifficultyBadge = (level) => {
    switch (level) {
      case 'Beginner':
        return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'Intermediate':
        return { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
      case 'Advanced':
        return { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.3)' };
    }
  };

  return (
    <div className="course-library-container" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* HEADER BANNER */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '32px 36px', 
          borderRadius: '20px', 
          marginBottom: '32px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: '0.82rem', fontWeight: '700', marginBottom: '12px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <Sparkles size={14} /> Interactive CodeArena Courses
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Structured Learning & Skill Tracks
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '720px', lineHeight: '1.6' }}>
            Learn core programming languages, software engineering principles, and master algorithms with guided modular slides and instant course certificates upon completion.
          </p>
        </div>

        {onGoToCertificates && (
          <button 
            className="btn btn-secondary"
            onClick={onGoToCertificates}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: '600' }}
          >
            <Award size={18} color="#818cf8" />
            My Certificates
          </button>
        )}
      </div>

      {/* SEARCH AND FILTERS */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '480px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search courses by title or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '42px', borderRadius: '12px', height: '46px' }}
          />
        </div>

        {/* Filter Badges / Dropdowns */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', marginRight: '4px' }}>
            <Filter size={16} /> Filters:
          </div>
          
          <select 
            className="form-input"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: 'auto', padding: '8px 16px', borderRadius: '10px', fontSize: '0.88rem', height: '42px' }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
            ))}
          </select>

          <select 
            className="form-input"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            style={{ width: 'auto', padding: '8px 16px', borderRadius: '10px', fontSize: '0.88rem', height: '42px' }}
          >
            {difficulties.map(diff => (
              <option key={diff} value={diff}>{diff === 'All' ? 'All Levels' : diff}</option>
            ))}
          </select>
        </div>
      </div>

      {/* COURSE LIST GRID */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="loading-ring" style={{ width: '40px', height: '40px', margin: '0 auto 16px' }}></div>
          <p>Loading course library...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--danger)', borderRadius: '16px' }}>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchCourses} style={{ marginTop: '16px' }}>Retry</button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center', borderRadius: '20px' }}>
          <BookOpen size={48} color="var(--text-muted)" style={{ marginBottom: '16px', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>No courses match your filter</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Try clearing your search query or selecting a different category.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {filteredCourses.map(course => {
            const badge = getDifficultyBadge(course.difficulty);
            const isCompleted = course.user_status === 'COMPLETED' || course.progress_percentage === 100;
            const isEnrolled = course.user_enrolled;

            return (
              <div 
                key={course.id}
                className="glass-panel course-card"
                onClick={() => onSelectCourse(course.id)}
                style={{ 
                  borderRadius: '16px', 
                  overflow: 'hidden', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                  border: isCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-light)',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Thumbnail Header */}
                <div style={{ height: '160px', width: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg-input)' }}>
                  <img 
                    src={course.thumbnail_url || 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80'} 
                    alt={course.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
                  
                  {/* Category Pill */}
                  <span style={{ position: 'absolute', top: '14px', left: '14px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.65)', color: '#fff', fontSize: '0.75rem', fontWeight: '600', backdropFilter: 'blur(4px)' }}>
                    {course.category}
                  </span>

                  {/* Difficulty Badge */}
                  <span style={{ position: 'absolute', top: '14px', right: '14px', padding: '4px 10px', borderRadius: '8px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontSize: '0.75rem', fontWeight: '700', backdropFilter: 'blur(4px)' }}>
                    {course.difficulty}
                  </span>

                  {/* Completed Ribbon Badge */}
                  {isCompleted && (
                    <div style={{ position: 'absolute', bottom: '12px', right: '14px', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: '#10b981', color: '#fff', fontSize: '0.78rem', fontWeight: '700', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }}>
                      <CheckCircle size={14} /> Completed
                    </div>
                  )}
                </div>

                {/* Content Details */}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px', lineHeight: '1.35' }}>
                    {course.title}
                  </h3>

                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5', flex: 1 }}>
                    {course.short_description}
                  </p>

                  {/* Course Metadata Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Layers size={14} color="#818cf8" />
                      <span>{course.module_count} Modules</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <BookOpen size={14} color="#a855f7" />
                      <span>{course.lesson_count} Lessons</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={14} color="#10b981" />
                      <span>{course.estimated_duration_hours}</span>
                    </div>
                  </div>

                  {/* Progress Bar if Enrolled */}
                  {isEnrolled && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                        <span>Progress</span>
                        <span style={{ color: isCompleted ? '#10b981' : '#6366f1' }}>{course.progress_percentage}%</span>
                      </div>
                      <div style={{ width: '100%', height: '7px', background: 'var(--bg-input)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${course.progress_percentage}%`, 
                            height: '100%', 
                            background: isCompleted ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #6366f1, #a855f7)', 
                            borderRadius: '10px',
                            transition: 'width 0.4s ease'
                          }} 
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer Action Button */}
                  <button
                    className={`btn ${isCompleted ? 'btn-secondary' : isEnrolled ? 'btn-primary' : 'btn-primary'}`}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: isCompleted 
                        ? 'rgba(16, 185, 129, 0.15)' 
                        : isEnrolled 
                        ? 'linear-gradient(135deg, #6366f1, #a855f7)' 
                        : 'var(--bg-input)',
                      color: isCompleted ? '#10b981' : isEnrolled ? '#fff' : 'var(--text-main)',
                      border: isCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : isEnrolled ? 'none' : '1px solid var(--border-light)'
                    }}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle size={16} /> Review Course
                      </>
                    ) : isEnrolled ? (
                      <>
                        <Play size={16} fill="currentColor" /> Continue Course
                      </>
                    ) : (
                      <>
                        <BookOpen size={16} /> Start Course <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
