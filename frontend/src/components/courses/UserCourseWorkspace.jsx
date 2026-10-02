import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle, 
  Circle, 
  BookOpen, 
  Clock, 
  Code, 
  Info, 
  Award, 
  Sparkles, 
  Check, 
  X,
  ExternalLink,
  Download,
  Share2
} from 'lucide-react';

export default function UserCourseWorkspace({ courseId, token, onBack, onGoToCertificates }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [completing, setCompleting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [earnedCert, setEarnedCert] = useState(null);

  useEffect(() => {
    fetchCourseDetail();
  }, [courseId, token]);

  const fetchCourseDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/courses/${courseId}`, { headers });
      if (!res.ok) throw new Error('Failed to load course content');
      const resData = await res.json();
      setData(resData);

      // Auto-expand all modules
      const initExpanded = {};
      (resData.modules || []).forEach(m => {
        initExpanded[m.id] = true;
      });
      setExpandedModules(initExpanded);

      // Auto-select first uncompleted lesson or very first lesson
      let targetLessonId = null;
      for (const m of resData.modules || []) {
        for (const l of m.lessons || []) {
          if (!l.completed && !targetLessonId) {
            targetLessonId = l.id;
          }
        }
      }
      if (!targetLessonId && resData.modules?.[0]?.lessons?.[0]) {
        targetLessonId = resData.modules[0].lessons[0].id;
      }
      setActiveLessonId(targetLessonId);

      // If already 100% completed, set earned certificate if available
      if (resData.certificate) {
        setEarnedCert(resData.certificate);
      }
    } catch (err) {
      console.error('Error loading workspace:', err);
      setError(err.message || 'Could not load course');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = (modId) => {
    setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  // Flatten all lessons across modules for prev/next ordering
  const allLessons = [];
  if (data?.modules) {
    data.modules.forEach(m => {
      (m.lessons || []).forEach(l => {
        allLessons.push({ ...l, moduleTitle: m.title });
      });
    });
  }

  const currentLessonIndex = allLessons.findIndex(l => l.id === activeLessonId);
  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];

  const handleMarkComplete = async () => {
    if (!currentLesson || completing) return;
    setCompleting(true);

    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${currentLesson.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to complete lesson');

      // Update local state for lesson completion
      setData(prev => {
        if (!prev) return prev;
        const newMods = prev.modules.map(m => ({
          ...m,
          lessons: m.lessons.map(l => l.id === currentLesson.id ? { ...l, completed: true } : l)
        }));
        return {
          ...prev,
          modules: newMods,
          progress: resData.progress
        };
      });

      // If course is 100% completed, trigger completion modal & set certificate
      if (resData.progress?.is_completed || resData.progress?.percentage === 100) {
        if (resData.certificate) {
          setEarnedCert(resData.certificate);
        }
        setShowCompletionModal(true);
      } else {
        // Auto advance to next lesson if available
        if (currentLessonIndex < allLessons.length - 1) {
          setActiveLessonId(allLessons[currentLessonIndex + 1].id);
        }
      }
    } catch (err) {
      console.error('Error completing lesson:', err);
      alert(err.message || 'Could not update progress');
    } finally {
      setCompleting(false);
    }
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setActiveLessonId(allLessons[currentLessonIndex - 1].id);
    }
  };

  const handleNextLesson = () => {
    if (currentLessonIndex < allLessons.length - 1) {
      setActiveLessonId(allLessons[currentLessonIndex + 1].id);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="loading-ring" style={{ width: '44px', height: '44px', margin: '0 auto 16px' }}></div>
        <p style={{ fontSize: '1.05rem', fontWeight: '600' }}>Loading Course Workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '32px', borderRadius: '16px', color: 'var(--danger)' }}>
          <h3>Error Loading Workspace</h3>
          <p style={{ marginTop: '8px' }}>{error || 'Course not found'}</p>
          <button className="btn btn-primary" onClick={onBack} style={{ marginTop: '20px' }}>
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const { course, modules, progress } = data;
  const progressPct = progress?.percentage || 0;

  return (
    <div className="course-workspace" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', background: 'var(--bg-main)' }}>
      
      {/* TOP WORKSPACE HEADER */}
      <header 
        style={{ 
          height: '64px', 
          borderBottom: '1px solid var(--border-light)', 
          background: 'var(--bg-panel)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 24px',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onBack}
            style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600' }}
          >
            <ArrowLeft size={16} /> Back to Courses
          </button>

          <div style={{ height: '24px', width: '1px', background: 'var(--border-light)' }} />

          <div>
            <span style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {course.category}
            </span>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)', margin: 0, lineHeight: '1.2' }}>
              {course.title}
            </h2>
          </div>
        </div>

        {/* Course Progress Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              Overall Progress
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: progressPct === 100 ? '#10b981' : '#6366f1' }}>
              {progressPct}% Completed ({progress?.completed_lessons || 0}/{progress?.total_lessons || 0} Lessons)
            </div>
          </div>

          <div style={{ width: '120px', height: '10px', background: 'var(--bg-input)', borderRadius: '10px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${progressPct}%`, 
                height: '100%', 
                background: progressPct === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #6366f1, #a855f7)', 
                borderRadius: '10px',
                transition: 'width 0.4s ease'
              }} 
            />
          </div>

          {progressPct === 100 && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowCompletionModal(true)}
              style={{ background: '#10b981', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Award size={16} /> Certificate
            </button>
          )}
        </div>
      </header>

      {/* WORKSPACE BODY (LEFT SIDEBAR & MAIN CONTENT) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT NAVIGATION ACCORDION */}
        <aside 
          style={{ 
            width: '320px', 
            minWidth: '320px', 
            borderRight: '1px solid var(--border-light)', 
            background: 'var(--bg-panel)',
            display: 'flex', 
            flexDirection: 'column',
            overflowY: 'auto'
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', background: 'rgba(99, 102, 241, 0.05)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Course Modules & Lessons
            </h4>
          </div>

          <div style={{ padding: '12px 8px', flex: 1 }}>
            {modules.map((mod, mIdx) => {
              const isExpanded = expandedModules[mod.id] !== false;
              const completedInMod = (mod.lessons || []).filter(l => l.completed).length;
              const totalInMod = (mod.lessons || []).length;
              const isModCompleted = totalInMod > 0 && completedInMod === totalInMod;

              return (
                <div key={mod.id} style={{ marginBottom: '8px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                  
                  {/* Module Header */}
                  <div 
                    onClick={() => handleToggleModule(mod.id)}
                    style={{ 
                      padding: '12px 14px', 
                      background: 'var(--bg-input)', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      {isModCompleted ? (
                        <CheckCircle size={16} color="#10b981" />
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {mIdx + 1}
                        </span>
                      )}
                      <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.3' }}>
                        {mod.title}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        {completedInMod}/{totalInMod}
                      </span>
                      {isExpanded ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                    </div>
                  </div>

                  {/* Lessons List */}
                  {isExpanded && (
                    <div style={{ background: 'var(--bg-panel)' }}>
                      {(mod.lessons || []).map((les, lIdx) => {
                        const isActive = les.id === activeLessonId;
                        return (
                          <div 
                            key={les.id}
                            onClick={() => setActiveLessonId(les.id)}
                            style={{ 
                              padding: '10px 16px 10px 38px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              cursor: 'pointer',
                              background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                              borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              {les.completed ? (
                                <CheckCircle size={15} color="#10b981" />
                              ) : (
                                <Circle size={15} color="var(--text-muted)" />
                              )}
                              <span style={{ fontSize: '0.84rem', fontWeight: isActive ? '700' : '500', color: isActive ? '#818cf8' : 'var(--text-main)' }}>
                                {les.title}
                              </span>
                            </div>

                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {les.estimated_minutes || 15}m
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* MAIN SLIDE CONTENT VIEWER */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '32px 40px', background: 'var(--bg-main)' }}>
          {currentLesson ? (
            <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
              
              {/* Module & Lesson Title Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                <span>{currentLesson.moduleTitle}</span>
                <ChevronRight size={14} />
                <span style={{ color: '#818cf8', fontWeight: '600' }}>{currentLesson.title}</span>
              </div>

              <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '24px', letterSpacing: '-0.01em' }}>
                {currentLesson.title}
              </h1>

              {/* Lesson Metadata */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '12px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', marginBottom: '28px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} color="#818cf8" />
                  <span>Estimated Time: <strong>{currentLesson.estimated_minutes || 15} mins</strong></span>
                </div>
                <div style={{ width: '1px', height: '16px', background: 'var(--border-light)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen size={16} color="#a855f7" />
                  <span>Interactive Slide</span>
                </div>
                {currentLesson.completed && (
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: '700' }}>
                    <CheckCircle size={16} /> Completed
                  </div>
                )}
              </div>

              {/* Lesson Text Body */}
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '32px', 
                  borderRadius: '18px', 
                  marginBottom: '28px', 
                  fontSize: '1rem', 
                  lineHeight: '1.75', 
                  color: 'var(--text-main)' 
                }}
              >
                {currentLesson.content.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} style={{ marginBottom: '18px' }}>
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Code Snippet Box */}
              {currentLesson.code_snippet && (
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#1e1e2e', color: '#cdd6f4', borderRadius: '12px 12px 0 0', border: '1px solid #313244', borderBottom: 'none', fontSize: '0.85rem', fontWeight: '700' }}>
                    <Code size={16} color="#89b4fa" /> Code Example
                  </div>
                  <pre 
                    style={{ 
                      margin: 0, 
                      padding: '20px 24px', 
                      background: '#181825', 
                      color: '#a6adc8', 
                      borderRadius: '0 0 12px 12px', 
                      border: '1px solid #313244', 
                      fontFamily: 'Fira Code, monospace, Consolas', 
                      fontSize: '0.92rem', 
                      overflowX: 'auto', 
                      lineHeight: '1.6' 
                    }}
                  >
                    <code>{currentLesson.code_snippet}</code>
                  </pre>
                </div>
              )}

              {/* Important Notes Callout */}
              {currentLesson.notes && (
                <div 
                  style={{ 
                    padding: '20px 24px', 
                    borderRadius: '14px', 
                    background: 'rgba(99, 102, 241, 0.08)', 
                    border: '1px solid rgba(99, 102, 241, 0.25)', 
                    display: 'flex', 
                    gap: '14px', 
                    alignItems: 'flex-start',
                    marginBottom: '32px' 
                  }}
                >
                  <Info size={22} color="#818cf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: '700', color: '#818cf8', marginBottom: '4px' }}>
                      Key Takeaway / Pro Tip
                    </h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: 0, lineHeight: '1.5' }}>
                      {currentLesson.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Select a lesson from the left sidebar to begin studying.
            </div>
          )}
        </main>
      </div>

      {/* BOTTOM CONTROL NAVIGATION BAR */}
      <footer 
        style={{ 
          height: '68px', 
          borderTop: '1px solid var(--border-light)', 
          background: 'var(--bg-panel)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 32px',
          zIndex: 10
        }}
      >
        <button 
          className="btn btn-secondary"
          onClick={handlePrevLesson}
          disabled={currentLessonIndex <= 0}
          style={{ padding: '10px 18px', borderRadius: '10px', opacity: currentLessonIndex <= 0 ? 0.5 : 1 }}
        >
          Previous Lesson
        </button>

        {currentLesson && (
          <button 
            className="btn btn-primary"
            onClick={handleMarkComplete}
            disabled={completing}
            style={{ 
              padding: '12px 28px', 
              borderRadius: '12px', 
              fontWeight: '700',
              background: currentLesson.completed ? '#10b981' : 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {completing ? (
              <div className="loading-ring"></div>
            ) : currentLesson.completed ? (
              <>
                <CheckCircle size={18} /> Completed (Next)
              </>
            ) : (
              <>
                <Check size={18} /> Mark as Complete
              </>
            )}
          </button>
        )}

        <button 
          className="btn btn-secondary"
          onClick={handleNextLesson}
          disabled={currentLessonIndex >= allLessons.length - 1}
          style={{ padding: '10px 18px', borderRadius: '10px', opacity: currentLessonIndex >= allLessons.length - 1 ? 0.5 : 1 }}
        >
          Next Lesson
        </button>
      </footer>

      {/* COURSE COMPLETION CELEBRATION MODAL */}
      {showCompletionModal && (
        <div className="modal-overlay" onClick={() => setShowCompletionModal(false)}>
          <div 
            className="modal-content glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', padding: '36px', textAlign: 'center', borderRadius: '24px' }}
          >
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(99, 102, 241, 0.2))', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid #10b981' }}>
              <Award size={44} />
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
              Congratulations! 🎉
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.5' }}>
              You have successfully completed 100% of <strong>{course.title}</strong>!
            </p>

            {earnedCert && (
              <div style={{ background: 'var(--bg-input)', padding: '16px 20px', borderRadius: '14px', marginBottom: '24px', textAlign: 'left', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Official Course Certificate Issued
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  Verification Code: {earnedCert.verification_code}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Issued on {earnedCert.completion_date} at {earnedCert.completion_time}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCompletionModal(false)}
                style={{ flex: 1, padding: '12px' }}
              >
                Close
              </button>
              
              {onGoToCertificates && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setShowCompletionModal(false);
                    onGoToCertificates();
                  }}
                  style={{ flex: 1, padding: '12px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Award size={18} /> View Certificate
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
