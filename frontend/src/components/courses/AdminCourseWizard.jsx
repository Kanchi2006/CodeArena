import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Save, 
  Eye, 
  Layers, 
  BookOpen, 
  Code, 
  Info, 
  Check, 
  Sparkles 
} from 'lucide-react';

export default function AdminCourseWizard({ courseId, token, onBack, onSaveSuccess }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Course Metadata State
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [category, setCategory] = useState('Programming');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [estimatedDurationHours, setEstimatedDurationHours] = useState('10 Hours');
  const [learningObjectives, setLearningObjectives] = useState('');
  const [prerequisites, setPrerequisites] = useState('');
  const [status, setStatus] = useState('PUBLISHED');

  // Modules & Lessons State
  const [modules, setModules] = useState([
    {
      id: 'temp-m1',
      title: 'Module 1: Getting Started',
      description: 'Introduction to fundamentals',
      lessons: [
        {
          id: 'temp-l1',
          title: 'Lesson 1: Introduction',
          content: 'Welcome to this course. In this lesson, we cover the basic concepts...',
          code_snippet: '// Example code snippet\nconsole.log("Hello CodeArena!");',
          notes: 'Make sure to complete the exercise before continuing.',
          estimated_minutes: 15,
          is_required: true
        }
      ]
    }
  ]);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load course details');
      const data = await res.json();
      const c = data.course;
      setTitle(c.title || '');
      setShortDescription(c.short_description || '');
      setFullDescription(c.full_description || '');
      setThumbnailUrl(c.thumbnail_url || '');
      setCategory(c.category || 'Programming');
      setDifficulty(c.difficulty || 'Beginner');
      setEstimatedDurationHours(c.estimated_duration_hours || '10 Hours');
      setLearningObjectives(c.learning_objectives || '');
      setPrerequisites(c.prerequisites || '');
      setStatus(c.status || 'PUBLISHED');

      if (Array.isArray(data.modules) && data.modules.length > 0) {
        setModules(data.modules.map(m => ({
          ...m,
          lessons: m.lessons || []
        })));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Module Actions
  const handleAddModule = () => {
    const newMod = {
      id: `temp-m-${Date.now()}`,
      title: `Module ${modules.length + 1}: New Module`,
      description: '',
      lessons: [
        {
          id: `temp-l-${Date.now()}`,
          title: 'Lesson 1: Introduction',
          content: 'Enter lesson content here...',
          code_snippet: '',
          notes: '',
          estimated_minutes: 15,
          is_required: true
        }
      ]
    };
    setModules([...modules, newMod]);
  };

  const handleUpdateModule = (modIdx, field, value) => {
    const updated = [...modules];
    updated[modIdx][field] = value;
    setModules(updated);
  };

  const handleDeleteModule = (modIdx) => {
    if (modules.length === 1) {
      alert('A course must have at least one module.');
      return;
    }
    const updated = modules.filter((_, idx) => idx !== modIdx);
    setModules(updated);
  };

  const handleMoveModule = (modIdx, direction) => {
    if (direction === 'up' && modIdx === 0) return;
    if (direction === 'down' && modIdx === modules.length - 1) return;

    const targetIdx = direction === 'up' ? modIdx - 1 : modIdx + 1;
    const updated = [...modules];
    const temp = updated[modIdx];
    updated[modIdx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setModules(updated);
  };

  // Lesson Actions inside Module
  const handleAddLesson = (modIdx) => {
    const updated = [...modules];
    const newLes = {
      id: `temp-l-${Date.now()}`,
      title: `Lesson ${updated[modIdx].lessons.length + 1}: Topic Name`,
      content: 'Enter detailed lesson content slide text here...',
      code_snippet: '',
      notes: '',
      estimated_minutes: 15,
      is_required: true
    };
    updated[modIdx].lessons.push(newLes);
    setModules(updated);
  };

  const handleUpdateLesson = (modIdx, lesIdx, field, value) => {
    const updated = [...modules];
    updated[modIdx].lessons[lesIdx][field] = value;
    setModules(updated);
  };

  const handleDeleteLesson = (modIdx, lesIdx) => {
    if (modules[modIdx].lessons.length === 1) {
      alert('Each module must have at least one lesson.');
      return;
    }
    const updated = [...modules];
    updated[modIdx].lessons = updated[modIdx].lessons.filter((_, idx) => idx !== lesIdx);
    setModules(updated);
  };

  const handleMoveLesson = (modIdx, lesIdx, direction) => {
    const lessons = modules[modIdx].lessons;
    if (direction === 'up' && lesIdx === 0) return;
    if (direction === 'down' && lesIdx === lessons.length - 1) return;

    const targetIdx = direction === 'up' ? lesIdx - 1 : lesIdx + 1;
    const updated = [...modules];
    const temp = updated[modIdx].lessons[lesIdx];
    updated[modIdx].lessons[lesIdx] = updated[modIdx].lessons[targetIdx];
    updated[modIdx].lessons[targetIdx] = temp;
    setModules(updated);
  };

  const handleSubmit = async (e, saveStatus) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert('Course title is required');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      title,
      short_description: shortDescription,
      full_description: fullDescription,
      thumbnail_url: thumbnailUrl,
      category,
      difficulty,
      estimated_duration_hours: estimatedDurationHours,
      learning_objectives: learningObjectives,
      prerequisites,
      status: saveStatus || status,
      modules
    };

    try {
      const apiBase = import.meta.env.VITE_BACKEND_URL 
        ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '')}/api/courses/admin`
        : '/api/courses/admin';
      const url = courseId ? `${apiBase}/${courseId}` : apiBase;
      const method = courseId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type');
      let resData = {};
      if (contentType && contentType.includes('application/json')) {
        resData = await res.json();
      } else {
        const text = await res.text();
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? 'Server route not loaded (HTTP 404). Please restart your backend terminal process (node server.js) to load the new course routes.'
              : `Server error (HTTP ${res.status})`
          );
        }
      }

      if (!res.ok) throw new Error(resData.error || 'Failed to save course');

      alert(courseId ? 'Course updated successfully!' : 'Course created successfully!');
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      console.error('Error saving course:', err);
      setError(err.message || 'Could not save course');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="loading-ring" style={{ width: '40px', height: '40px', margin: '0 auto 12px' }}></div>
        <p>Loading course editor...</p>
      </div>
    );
  }

  return (
    <div className="admin-course-wizard" style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ padding: '8px 14px', borderRadius: '10px' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              {courseId ? 'Edit Course' : 'Create New Course'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '2px 0 0' }}>
              Build structured modules, lessons, and interactive code slides.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button"
            className="btn btn-secondary"
            disabled={saving}
            onClick={(e) => handleSubmit(e, 'DRAFT')}
            style={{ padding: '10px 18px', borderRadius: '10px', fontWeight: '600' }}
          >
            Save as Draft
          </button>

          <button 
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={(e) => handleSubmit(e, 'PUBLISHED')}
            style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: '700', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {saving ? <div className="loading-ring"></div> : <><Save size={18} /> Publish Course</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', color: 'var(--danger)', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* SECTION 1: COURSE METADATA */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={18} color="#818cf8" /> Course Overview & Metadata
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" style={{ fontWeight: '700' }}>Course Title *</label>
            <input 
              type="text" 
              className="form-input"
              placeholder="e.g., Basic C Programming"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '600' }}>Category</label>
            <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="C Programming">C Programming</option>
              <option value="C++ Programming">C++ Programming</option>
              <option value="Java Programming">Java Programming</option>
              <option value="Python Programming">Python Programming</option>
              <option value="Web Development">Web Development</option>
              <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
              <option value="Software Engineering">Software Engineering</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '600' }}>Difficulty Level</label>
            <select className="form-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '600' }}>Estimated Duration</label>
            <input 
              type="text" 
              className="form-input"
              placeholder="e.g., 10 Hours"
              value={estimatedDurationHours}
              onChange={(e) => setEstimatedDurationHours(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" style={{ fontWeight: '600' }}>Thumbnail Image URL</label>
            <input 
              type="text" 
              className="form-input"
              placeholder="https://images.unsplash.com/..."
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" style={{ fontWeight: '600' }}>Short Description (Card summary)</label>
            <textarea 
              className="form-input"
              rows={2}
              placeholder="Brief summary of what students will learn..."
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" style={{ fontWeight: '600' }}>Full Description</label>
            <textarea 
              className="form-input"
              rows={3}
              placeholder="Detailed course description, target audience..."
              value={fullDescription}
              onChange={(e) => setFullDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '600' }}>Learning Objectives</label>
            <textarea 
              className="form-input"
              rows={2}
              placeholder="Understand variables; Master memory management; Write loops..."
              value={learningObjectives}
              onChange={(e) => setLearningObjectives(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '600' }}>Prerequisites</label>
            <textarea 
              className="form-input"
              rows={2}
              placeholder="Basic computer operation, No prior programming required..."
              value={prerequisites}
              onChange={(e) => setPrerequisites(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: MODULES AND LESSONS BUILDER */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#a855f7" /> Course Modules & Lesson Slides
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Organize your curriculum into modules and rich content slides.
            </p>
          </div>

          <button 
            type="button"
            className="btn btn-secondary"
            onClick={handleAddModule}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '700' }}
          >
            <Plus size={16} /> Add Module
          </button>
        </div>

        {/* Module Accordions List */}
        {modules.map((mod, modIdx) => (
          <div key={mod.id || modIdx} style={{ background: 'var(--bg-input)', borderRadius: '14px', border: '1px solid var(--border-light)', marginBottom: '20px', padding: '20px' }}>
            
            {/* Module Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', width: '24px', height: '24px', borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {modIdx + 1}
                </span>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Module Title..."
                  value={mod.title}
                  onChange={(e) => handleUpdateModule(modIdx, 'title', e.target.value)}
                  style={{ fontWeight: '700', fontSize: '1rem', flex: 1 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  title="Move Up" 
                  onClick={() => handleMoveModule(modIdx, 'up')}
                  disabled={modIdx === 0}
                  style={{ padding: '6px 10px' }}
                >
                  <MoveUp size={14} />
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  title="Move Down" 
                  onClick={() => handleMoveModule(modIdx, 'down')}
                  disabled={modIdx === modules.length - 1}
                  style={{ padding: '6px 10px' }}
                >
                  <MoveDown size={14} />
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  title="Delete Module" 
                  onClick={() => handleDeleteModule(modIdx)}
                  style={{ padding: '6px 10px', color: 'var(--danger)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Lessons Builder List */}
            <div style={{ paddingLeft: '16px', borderLeft: '2px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Lessons / Slides in Module ({mod.lessons.length})
                </span>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => handleAddLesson(modIdx)}
                  style={{ fontSize: '0.8rem', padding: '5px 10px', borderRadius: '8px', fontWeight: '600' }}
                >
                  <Plus size={14} /> Add Lesson Slide
                </button>
              </div>

              {mod.lessons.map((les, lesIdx) => (
                <div key={les.id || lesIdx} style={{ background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border-light)', padding: '16px', marginBottom: '12px' }}>
                  
                  {/* Lesson Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px' }}>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="Lesson Title..."
                      value={les.title}
                      onChange={(e) => handleUpdateLesson(modIdx, lesIdx, 'title', e.target.value)}
                      style={{ fontWeight: '600', fontSize: '0.92rem', flex: 1 }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input 
                        type="number"
                        className="form-input"
                        placeholder="Mins"
                        value={les.estimated_minutes || 15}
                        onChange={(e) => handleUpdateLesson(modIdx, lesIdx, 'estimated_minutes', parseInt(e.target.value) || 15)}
                        style={{ width: '70px', fontSize: '0.82rem', padding: '6px 8px' }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>mins</span>

                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleMoveLesson(modIdx, lesIdx, 'up')}
                        disabled={lesIdx === 0}
                        style={{ padding: '5px 8px' }}
                      >
                        <MoveUp size={12} />
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleMoveLesson(modIdx, lesIdx, 'down')}
                        disabled={lesIdx === mod.lessons.length - 1}
                        style={{ padding: '5px 8px' }}
                      >
                        <MoveDown size={12} />
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleDeleteLesson(modIdx, lesIdx)}
                        style={{ padding: '5px 8px', color: 'var(--danger)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Lesson Text Content */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Slide Text / Educational Content (Paragraphs separated by blank lines)
                    </label>
                    <textarea 
                      className="form-input"
                      rows={3}
                      placeholder="Detailed lesson explanation text..."
                      value={les.content}
                      onChange={(e) => handleUpdateLesson(modIdx, lesIdx, 'content', e.target.value)}
                    />
                  </div>

                  {/* Lesson Code Snippet */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Code Snippet (Optional)
                    </label>
                    <textarea 
                      className="form-input"
                      rows={3}
                      placeholder="# Example code here..."
                      value={les.code_snippet || ''}
                      onChange={(e) => handleUpdateLesson(modIdx, lesIdx, 'code_snippet', e.target.value)}
                      style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* Lesson Callout Notes */}
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Key Note / Pro Tip Callout (Optional)
                    </label>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="Important note for learners..."
                      value={les.notes || ''}
                      onChange={(e) => handleUpdateLesson(modIdx, lesIdx, 'notes', e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>

                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
