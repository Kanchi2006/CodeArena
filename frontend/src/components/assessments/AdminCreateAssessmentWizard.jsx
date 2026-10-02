import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Save,
  Clock,
  Layers,
  HelpCircle,
  CheckSquare,
  FileText,
  Code,
  Shield,
  Eye,
  Settings,
  Users,
  Lock,
  BarChart2,
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Loader2,
  Sparkles
} from 'lucide-react';

// ─── Step Definitions ───────────────────────────────────────────────────────
const STEPS = [
  { num: 1,  name: 'Basic Info',        icon: FileText,     desc: 'Title, type & category' },
  { num: 2,  name: 'Schedule',          icon: Clock,        desc: 'Duration & timing' },
  { num: 3,  name: 'Attempts',          icon: Layers,       desc: 'Attempt limits' },
  { num: 4,  name: 'Scoring',           icon: BarChart2,    desc: 'Marks & passing score' },
  { num: 5,  name: 'Questions',         icon: HelpCircle,   desc: 'Build question bank' },
  { num: 6,  name: 'Randomization',     icon: Settings,     desc: 'Order randomization' },
  { num: 7,  name: 'Visibility',        icon: Eye,          desc: 'Access & visibility' },
  { num: 8,  name: 'Candidate Limits',  icon: Users,        desc: 'Max participants' },
  { num: 9,  name: 'Instructions',      icon: BookOpen,     desc: 'Rules & guidelines' },
  { num: 10, name: 'Result Timing',     icon: CheckSquare,  desc: 'Result release settings' },
  { num: 11, name: 'Security',          icon: Shield,       desc: 'Proctoring & anti-cheat' },
  { num: 12, name: 'Review & Publish',  icon: Check,        desc: 'Finalize & publish' },
];

// ─── Reusable Field Components ────────────────────────────────────────────────
const fieldStyle = {
  width: '100%',
  padding: '11px 14px',
  background: '#ffffff',
  border: '1px solid #e0d7fe',
  borderRadius: '10px',
  color: '#2d2b55',
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box',
  boxShadow: '0 1px 3px rgba(108,77,255,0.05)',
  transition: 'all 0.2s ease',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: '700',
  color: '#4e4685',
  marginBottom: '6px',
  letterSpacing: '0.02em',
};

const sectionTitle = {
  fontSize: '0.7rem',
  fontWeight: '700',
  color: '#6c4dff',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '14px',
};

const checkRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '14px 16px',
  background: '#ffffff',
  border: '1.5px solid #e8e3fe',
  borderRadius: '12px',
  cursor: 'pointer',
  marginBottom: '10px',
  transition: 'all 0.2s ease',
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AdminCreateAssessmentWizard({ assessmentId, token, onBack, onSaveSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [problemsBank, setProblemsBank] = useState([]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assessmentType, setAssessmentType] = useState('Mixed');
  const [difficulty, setDifficulty] = useState('Medium');
  const [category, setCategory] = useState('Software Engineering');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingScorePercentage, setPassingScorePercentage] = useState(60.00);
  const [defaultPositiveMarks, setDefaultPositiveMarks] = useState(2.00);
  const [defaultNegativeMarks, setDefaultNegativeMarks] = useState(0.50);
  const [attemptLimit, setAttemptLimit] = useState(1);
  const [randomQuestionOrder, setRandomQuestionOrder] = useState(false);
  const [randomOptionOrder, setRandomOptionOrder] = useState(false);
  const [visibility, setVisibility] = useState('PUBLIC');
  const [candidateLimit, setCandidateLimit] = useState(0);
  const [instructions, setInstructions] = useState('1. Total duration is 60 minutes.\n2. Answers auto-save.\n3. Click Submit when done.');
  const [rules, setRules] = useState('Do not open unauthorized tabs or external resources during the test.');
  const [status, setStatus] = useState('DRAFT');
  const [showScoreImmediately, setShowScoreImmediately] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [certificateEnabled, setCertificateEnabled] = useState(true);

  // Security & Proctoring
  const [enableProctoring, setEnableProctoring] = useState(true);
  const [requireWebcam, setRequireWebcam] = useState(true);
  const [requireMicrophone, setRequireMicrophone] = useState(false);
  const [requireScreenShare, setRequireScreenShare] = useState(true);
  const [requireFullscreen, setRequireFullscreen] = useState(true);
  const [detectTabSwitch, setDetectTabSwitch] = useState(true);
  const [detectVisibilityChange, setDetectVisibilityChange] = useState(true);
  const [preventCopy, setPreventCopy] = useState(true);
  const [preventCut, setPreventCut] = useState(true);
  const [preventPaste, setPreventPaste] = useState(true);
  const [preventRightClick, setPreventRightClick] = useState(true);
  const [maxAllowedWarnings, setMaxAllowedWarnings] = useState(3);
  const [maxViolationAction, setMaxViolationAction] = useState('terminate');

  // Questions
  const [questions, setQuestions] = useState([]);
  const [newQType, setNewQType] = useState('mcq');
  const [newQText, setNewQText] = useState('');
  const [newQMarks, setNewQMarks] = useState(2.00);
  const [newQNegative, setNewQNegative] = useState(0.50);
  const [newQOpt1, setNewQOpt1] = useState('');
  const [newQOpt2, setNewQOpt2] = useState('');
  const [newQOpt3, setNewQOpt3] = useState('');
  const [newQOpt4, setNewQOpt4] = useState('');
  const [newQCorrectOpt, setNewQCorrectOpt] = useState('opt1');
  const [newQSelectedProblemId, setNewQSelectedProblemId] = useState('');

  useEffect(() => {
    fetchProblemBank();
    if (assessmentId) fetchExistingAssessment();
  }, [assessmentId, token]);

  const fetchProblemBank = async () => {
    try {
      const res = await fetch('/api/problems');
      if (res.ok) setProblemsBank(await res.json());
    } catch (err) {
      console.error('Error fetching problem bank:', err);
    }
  };

  const fetchExistingAssessment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTitle(data.title || '');
        setDescription(data.description || '');
        setAssessmentType(data.assessment_type || 'Mixed');
        setDifficulty(data.difficulty || 'Medium');
        setCategory(data.category || 'Software Engineering');
        setDurationMinutes(data.duration_minutes || 60);
        setPassingScorePercentage(data.passing_score_percentage || 60.00);
        setDefaultPositiveMarks(data.default_positive_marks || 2.00);
        setDefaultNegativeMarks(data.default_negative_marks || 0.50);
        setAttemptLimit(data.attempt_limit || 1);
        setRandomQuestionOrder(Boolean(data.random_question_order));
        setRandomOptionOrder(Boolean(data.random_option_order));
        setVisibility(data.visibility || 'PUBLIC');
        setCandidateLimit(data.candidate_limit || 0);
        setInstructions(data.instructions || '');
        setRules(data.rules || '');
        setStatus(data.status || 'DRAFT');
        setShowScoreImmediately(Boolean(data.show_score_immediately));
        setShowCorrectAnswers(Boolean(data.show_correct_answers));
        setShowExplanations(Boolean(data.show_explanations));
        setCertificateEnabled(Boolean(data.certificate_enabled));

        let rulesConfig = {};
        try {
          rulesConfig = typeof data.rules_config === 'string' ? JSON.parse(data.rules_config) : (data.rules_config || {});
        } catch (e) {}

        if (rulesConfig) {
          if (rulesConfig.enableProctoring !== undefined) setEnableProctoring(Boolean(rulesConfig.enableProctoring));
          if (rulesConfig.requireWebcam !== undefined) setRequireWebcam(Boolean(rulesConfig.requireWebcam));
          if (rulesConfig.requireMicrophone !== undefined) setRequireMicrophone(Boolean(rulesConfig.requireMicrophone));
          if (rulesConfig.requireScreenShare !== undefined) setRequireScreenShare(Boolean(rulesConfig.requireScreenShare));
          if (rulesConfig.requireFullscreen !== undefined) setRequireFullscreen(Boolean(rulesConfig.requireFullscreen));
          if (rulesConfig.detectTabSwitch !== undefined) setDetectTabSwitch(Boolean(rulesConfig.detectTabSwitch));
          if (rulesConfig.detectVisibilityChange !== undefined) setDetectVisibilityChange(Boolean(rulesConfig.detectVisibilityChange));
          if (rulesConfig.preventCopy !== undefined) setPreventCopy(Boolean(rulesConfig.preventCopy));
          if (rulesConfig.preventCut !== undefined) setPreventCut(Boolean(rulesConfig.preventCut));
          if (rulesConfig.preventPaste !== undefined) setPreventPaste(Boolean(rulesConfig.preventPaste));
          if (rulesConfig.preventRightClick !== undefined) setPreventRightClick(Boolean(rulesConfig.preventRightClick));
          if (rulesConfig.maxAllowedWarnings !== undefined) setMaxAllowedWarnings(Number(rulesConfig.maxAllowedWarnings));
          if (rulesConfig.maxViolationAction) setMaxViolationAction(rulesConfig.maxViolationAction);
        }

        const qRes = await fetch(`/api/admin/assessments/${assessmentId}/sections`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          setQuestions(qData.questions || []);
        }
      }
    } catch (err) {
      setError('Error loading assessment for edit.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    if (!newQText && newQType !== 'coding') return;

    let optionsParsed = [];
    let correctAnswersParsed = [];

    if (newQType === 'mcq' || newQType === 'output_based') {
      optionsParsed = [
        { id: 'opt1', text: newQOpt1 || 'Option 1', is_correct: newQCorrectOpt === 'opt1' },
        { id: 'opt2', text: newQOpt2 || 'Option 2', is_correct: newQCorrectOpt === 'opt2' },
        { id: 'opt3', text: newQOpt3 || 'Option 3', is_correct: newQCorrectOpt === 'opt3' },
        { id: 'opt4', text: newQOpt4 || 'Option 4', is_correct: newQCorrectOpt === 'opt4' }
      ].filter(o => o.text);
      correctAnswersParsed = [newQCorrectOpt];
    } else if (newQType === 'coding') {
      const selectedProb = problemsBank.find(p => String(p.id) === String(newQSelectedProblemId));
      if (!selectedProb) return;
    }

    const newQ = {
      id: Date.now(),
      question_type: newQType,
      problem_id: newQType === 'coding' ? Number(newQSelectedProblemId) : null,
      question_text: newQText || (newQType === 'coding' ? 'Solve the requested algorithm challenge' : 'Question Text'),
      options: optionsParsed,
      correct_answers: correctAnswersParsed,
      marks: newQMarks,
      negative_marks: newQNegative,
      order_index: questions.length + 1
    };

    setQuestions([...questions, newQ]);
    setNewQText('');
    setNewQOpt1('');
    setNewQOpt2('');
    setNewQOpt3('');
    setNewQOpt4('');
  };

  const handleRemoveQuestion = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleSaveWizard = async (targetStatus) => {
    setLoading(true);
    setError('');

    const payload = {
      title, description,
      assessment_type: assessmentType,
      difficulty, category,
      duration_minutes: Number(durationMinutes),
      passing_score_percentage: Number(passingScorePercentage),
      default_positive_marks: Number(defaultPositiveMarks),
      default_negative_marks: Number(defaultNegativeMarks),
      attempt_limit: Number(attemptLimit),
      random_question_order: randomQuestionOrder,
      random_option_order: randomOptionOrder,
      visibility,
      candidate_limit: Number(candidateLimit),
      instructions, rules,
      status: targetStatus || status,
      show_score_immediately: showScoreImmediately,
      show_correct_answers: showCorrectAnswers,
      show_explanations: showExplanations,
      certificate_enabled: certificateEnabled,
      rules_config: {
        enableProctoring, requireWebcam, requireMicrophone, requireScreenShare,
        requireFullscreen, detectTabSwitch, detectVisibilityChange,
        preventCopy, preventCut, preventPaste, preventRightClick,
        maxAllowedWarnings: Number(maxAllowedWarnings), maxViolationAction
      }
    };

    try {
      const endpoint = assessmentId ? `/api/admin/assessments/${assessmentId}` : '/api/admin/assessments';
      const method = assessmentId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        const savedAssId = assessmentId || data.id;
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await fetch(`/api/admin/assessments/${savedAssId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              question_type: q.question_type,
              problem_id: q.problem_id,
              question_text: q.question_text,
              code_snippet: q.code_snippet,
              options: q.options,
              correct_answers: q.correct_answers,
              marks: q.marks,
              negative_marks: q.negative_marks,
              order_index: i + 1
            })
          });
        }
        onSaveSuccess();
      } else {
        setError(data.error || 'Failed to save assessment.');
      }
    } catch (err) {
      setError('Network communication error.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Sidebar Stepper ───────────────────────────────────────────────────────
  const SidebarStepper = () => (
    <div style={{
      width: '250px',
      flexShrink: 0,
      background: '#ffffff',
      border: '1px solid #e8e3fe',
      borderRadius: '20px',
      padding: '24px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
      alignSelf: 'flex-start',
      position: 'sticky',
      top: '24px',
      boxShadow: '0 10px 30px rgba(108,77,255,0.04)',
    }}>
      <div style={{ padding: '0 10px 16px', borderBottom: '1px solid #f0ebff', marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#6c4dff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Assessment Builder
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#7c75a6' }}>
            {Math.round((currentStep / STEPS.length) * 100)}%
          </div>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#6b6693', fontWeight: '600' }}>
          Step {currentStep} of {STEPS.length}
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: '10px', height: '6px', background: '#eef0f8', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(currentStep / STEPS.length) * 100}%`,
            background: 'linear-gradient(90deg, #6c4dff, #9333ea)',
            borderRadius: '99px',
            transition: 'width 0.35s ease',
          }} />
        </div>
      </div>

      {STEPS.map(step => {
        const Icon = step.icon;
        const isActive = currentStep === step.num;
        const isDone = currentStep > step.num;
        return (
          <button
            key={step.num}
            onClick={() => setCurrentStep(step.num)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '14px',
              border: isActive ? '1px solid #d4c8fe' : '1px solid transparent',
              background: isActive
                ? '#f2ebfe'
                : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 4px 12px rgba(108,77,255,0.08)' : 'none',
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: isDone
                ? '#10b981'
                : isActive
                ? '#6c4dff'
                : '#f0ebfe',
              color: isDone || isActive ? '#ffffff' : '#6c4dff',
              fontSize: '0.72rem',
              fontWeight: '800',
              transition: 'all 0.2s ease',
            }}>
              {isDone
                ? <Check size={14} color="#ffffff" strokeWidth={3} />
                : isActive
                ? <Icon size={14} color="#ffffff" />
                : String(step.num).padStart(2, '0')
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.79rem',
                fontWeight: isActive ? '700' : '600',
                color: isActive ? '#4c1d95' : isDone ? '#10b981' : '#5c548a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.3,
              }}>{step.name}</div>
              <div style={{
                fontSize: '0.67rem',
                color: isActive ? '#6d28d9' : '#8c85b5',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>{step.desc}</div>
            </div>
            {isActive && <ChevronRight size={14} color="#6c4dff" style={{ flexShrink: 0 }} />}
          </button>
        );
      })}
    </div>
  );

  // ─── Step Content ─────────────────────────────────────────────────────────
  const renderStep = () => {
    // Shared input style helpers
    const inputCls = { ...fieldStyle };
    const textareaCls = { ...fieldStyle, resize: 'vertical', minHeight: '80px' };

    switch (currentStep) {
      // ── Step 1: Basic Info ─────────────────────────────────────────────────
      case 1: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Assessment Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Java & Web Developer Screening"
              style={inputCls}
            />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Detailed summary of what skills this assessment evaluates..."
              style={textareaCls}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Assessment Type</label>
              <select value={assessmentType} onChange={e => setAssessmentType(e.target.value)} style={inputCls}>
                <option value="Mixed">Mixed (MCQ + Coding)</option>
                <option value="Coding">Coding Only</option>
                <option value="MCQ">MCQ Only</option>
                <option value="Technical">Technical Exam</option>
                <option value="Practice">Practice Assessment</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={inputCls}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={inputCls}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Certificate</label>
            <label style={{ ...checkRow, marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={certificateEnabled}
                onChange={e => setCertificateEnabled(e.target.checked)}
                style={{ accentColor: '#6c4dff', width: '16px', height: '16px' }}
              />
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text-main, #faf9ff)' }}>Issue Completion Certificate</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted, #a0a0b8)' }}>Candidates who pass will receive a certificate</div>
              </div>
            </label>
          </div>
        </div>
      );

      // ── Step 2: Schedule ───────────────────────────────────────────────────
      case 2: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Duration (Minutes) *</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={e => setDurationMinutes(e.target.value)}
                style={inputCls}
              />
            </div>
          </div>
          <div style={{
            padding: '16px',
            background: 'rgba(108,77,255,0.08)',
            border: '1px solid rgba(108,77,255,0.2)',
            borderRadius: '12px',
            fontSize: '0.82rem',
            color: 'var(--text-muted, #a0a0b8)',
          }}>
            ⏱ The assessment will automatically submit when the timer reaches zero.
            Candidates can submit early at any time.
          </div>
        </div>
      );

      // ── Step 3: Attempts ───────────────────────────────────────────────────
      case 3: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Allowed Attempts (0 = Unlimited)</label>
            <input
              type="number"
              value={attemptLimit}
              onChange={e => setAttemptLimit(e.target.value)}
              style={{ ...inputCls, maxWidth: '200px' }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Set to 1 for single-attempt assessments (recommended for hiring).
            </div>
          </div>
        </div>
      );

      // ── Step 4: Scoring ────────────────────────────────────────────────────
      case 4: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Passing Score (%)</label>
              <input
                type="number"
                value={passingScorePercentage}
                onChange={e => setPassingScorePercentage(e.target.value)}
                style={inputCls}
              />
            </div>
            <div>
              <label style={labelStyle}>Default Positive Marks</label>
              <input
                type="number"
                step="0.5"
                value={defaultPositiveMarks}
                onChange={e => setDefaultPositiveMarks(e.target.value)}
                style={inputCls}
              />
            </div>
            <div>
              <label style={labelStyle}>Default Negative Marks</label>
              <input
                type="number"
                step="0.25"
                value={defaultNegativeMarks}
                onChange={e => setDefaultNegativeMarks(e.target.value)}
                style={inputCls}
              />
            </div>
          </div>
          <div style={{
            padding: '14px',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '12px',
            fontSize: '0.82rem',
            color: '#f59e0b',
          }}>
            💡 Per-question marks can be customized when adding each question in Step 5.
          </div>
        </div>
      );

      // ── Step 5: Questions ──────────────────────────────────────────────────
      case 5: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Question List */}
          <div>
            <div style={{ ...sectionTitle }}>Questions Added ({questions.length})</div>
            {questions.length === 0 ? (
              <div style={{
                padding: '28px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px dashed rgba(108,77,255,0.25)',
                borderRadius: '12px',
                textAlign: 'center',
                color: 'var(--text-muted, #a0a0b8)',
                fontSize: '0.84rem',
              }}>
                No questions yet. Use the form below to add questions.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {questions.map((q, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(108,77,255,0.15)',
                    borderRadius: '10px',
                    gap: '12px',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text-main, #faf9ff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Q{idx + 1}. {q.question_text}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {q.question_type.toUpperCase()} • +{q.marks} marks
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveQuestion(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', display: 'flex' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Question Form */}
          <div style={{
            padding: '20px',
            background: 'rgba(108,77,255,0.06)',
            border: '1px solid rgba(108,77,255,0.2)',
            borderRadius: '14px',
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#a78bfa', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} /> Add Question
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Question Type</label>
                <select value={newQType} onChange={e => setNewQType(e.target.value)} style={inputCls}>
                  <option value="mcq">MCQ (Single Choice)</option>
                  <option value="multiple_select">Multiple Select</option>
                  <option value="output_based">Output Based Prediction</option>
                  <option value="coding">Coding Problem (From Bank)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Question Marks</label>
                <input
                  type="number"
                  value={newQMarks}
                  onChange={e => setNewQMarks(e.target.value)}
                  style={inputCls}
                />
              </div>
            </div>

            {newQType === 'coding' ? (
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Select Problem from Problem Bank</label>
                <select
                  value={newQSelectedProblemId}
                  onChange={e => setNewQSelectedProblemId(e.target.value)}
                  style={inputCls}
                >
                  <option value="">-- Choose Problem --</option>
                  {problemsBank.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.difficulty} - {p.category})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Question statement..."
                  value={newQText}
                  onChange={e => setNewQText(e.target.value)}
                  style={inputCls}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input type="text" placeholder="Option 1" value={newQOpt1} onChange={e => setNewQOpt1(e.target.value)} style={{ ...inputCls, fontSize: '0.82rem' }} />
                  <input type="text" placeholder="Option 2" value={newQOpt2} onChange={e => setNewQOpt2(e.target.value)} style={{ ...inputCls, fontSize: '0.82rem' }} />
                  <input type="text" placeholder="Option 3" value={newQOpt3} onChange={e => setNewQOpt3(e.target.value)} style={{ ...inputCls, fontSize: '0.82rem' }} />
                  <input type="text" placeholder="Option 4" value={newQOpt4} onChange={e => setNewQOpt4(e.target.value)} style={{ ...inputCls, fontSize: '0.82rem' }} />
                </div>
                <div>
                  <label style={labelStyle}>Correct Answer</label>
                  <select value={newQCorrectOpt} onChange={e => setNewQCorrectOpt(e.target.value)} style={{ ...inputCls, maxWidth: '200px' }}>
                    <option value="opt1">Option 1</option>
                    <option value="opt2">Option 2</option>
                    <option value="opt3">Option 3</option>
                    <option value="opt4">Option 4</option>
                  </select>
                </div>
              </div>
            )}

            <button
              onClick={handleAddQuestion}
              style={{
                padding: '9px 20px',
                background: 'linear-gradient(135deg, #6c4dff, #a855f7)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontWeight: '700',
                fontSize: '0.83rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(108,77,255,0.25)',
              }}
            >
              <Plus size={14} /> Add Question
            </button>
          </div>
        </div>
      );

      // ── Step 6: Randomization ──────────────────────────────────────────────
      case 6: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={checkRow}>
            <input type="checkbox" checked={randomQuestionOrder} onChange={e => setRandomQuestionOrder(e.target.checked)} style={{ accentColor: '#6c4dff', width: '16px', height: '16px' }} />
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text-main, #faf9ff)' }}>Randomize Question Order</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted, #a0a0b8)' }}>Each candidate sees questions in a different random order</div>
            </div>
          </label>
          <label style={checkRow}>
            <input type="checkbox" checked={randomOptionOrder} onChange={e => setRandomOptionOrder(e.target.checked)} style={{ accentColor: '#6c4dff', width: '16px', height: '16px' }} />
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text-main, #faf9ff)' }}>Randomize MCQ Option Order</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted, #a0a0b8)' }}>Options for each MCQ question are shuffled per candidate</div>
            </div>
          </label>
        </div>
      );

      // ── Step 7: Visibility ─────────────────────────────────────────────────
      case 7: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Visibility</label>
            <select value={visibility} onChange={e => setVisibility(e.target.value)} style={inputCls}>
              <option value="PUBLIC">Public (Visible to all users)</option>
              <option value="PRIVATE">Private (Restricted access)</option>
              <option value="INVITE_ONLY">Invite Only (Invitation link/email required)</option>
            </select>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
          }}>
            {[
              { value: 'PUBLIC', icon: '🌐', label: 'Public', desc: 'Listed and open to all' },
              { value: 'PRIVATE', icon: '🔒', label: 'Private', desc: 'Hidden, direct link only' },
              { value: 'INVITE_ONLY', icon: '✉️', label: 'Invite Only', desc: 'Requires invitation' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value)}
                style={{
                  padding: '16px',
                  background: visibility === opt.value ? 'rgba(108,77,255,0.18)' : 'rgba(0,0,0,0.15)',
                  border: `1px solid ${visibility === opt.value ? 'rgba(108,77,255,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{opt.icon}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main, #faf9ff)' }}>{opt.label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      );

      // ── Step 8: Candidate Limits ───────────────────────────────────────────
      case 8: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Maximum Candidates (0 = Unlimited)</label>
            <input
              type="number"
              value={candidateLimit}
              onChange={e => setCandidateLimit(e.target.value)}
              placeholder="0 for unlimited"
              style={{ ...inputCls, maxWidth: '200px' }}
            />
          </div>
          <div style={{
            padding: '14px',
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '12px',
            fontSize: '0.82rem',
            color: '#10b981',
          }}>
            ✅ After the candidate limit is reached, new registrations will be automatically blocked.
          </div>
        </div>
      );

      // ── Step 9: Instructions ───────────────────────────────────────────────
      case 9: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Assessment Instructions</label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={5}
              placeholder="Instructions shown to candidates before they start..."
              style={textareaCls}
            />
          </div>
          <div>
            <label style={labelStyle}>Integrity Rules</label>
            <textarea
              value={rules}
              onChange={e => setRules(e.target.value)}
              rows={4}
              placeholder="Rules candidates must agree to..."
              style={textareaCls}
            />
          </div>
        </div>
      );

      // ── Step 10: Result Timing ─────────────────────────────────────────────
      case 10: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            {
              id: 'showScoreImmediately',
              title: 'Show Score Immediately',
              desc: 'Candidates see their score and percentage right after submitting the assessment.',
              icon: Clock,
              checked: showScoreImmediately,
              setter: setShowScoreImmediately,
            },
            {
              id: 'showCorrectAnswers',
              title: 'Show Correct Answers',
              desc: 'Reveal which answers were correct on the result page.',
              icon: FileText,
              checked: showCorrectAnswers,
              setter: setShowCorrectAnswers,
            },
            {
              id: 'showExplanations',
              title: 'Show Explanations',
              desc: 'Show answer explanations after submission.',
              icon: Sparkles,
              checked: showExplanations,
              setter: setShowExplanations,
            },
          ].map((item) => {
            const ItemIcon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => item.setter(!item.checked)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 20px',
                  background: '#ffffff',
                  border: item.checked ? '2px solid #6c4dff' : '1px solid #e8e3fe',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  boxShadow: item.checked ? '0 4px 20px rgba(108,77,255,0.08)' : '0 2px 8px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {item.checked && (
                  <div style={{
                    position: 'absolute',
                    top: '-1px',
                    right: '-1px',
                    width: '20px',
                    height: '20px',
                    background: '#6c4dff',
                    borderBottomLeftRadius: '10px',
                    borderTopRightRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Check size={12} color="#ffffff" strokeWidth={3} />
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: '#f2ebfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <ItemIcon size={22} color="#6c4dff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#2d2b55' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#686095', marginTop: '2px' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>

                {/* Custom Pill Toggle Switch */}
                <div style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '99px',
                  background: item.checked ? '#6c4dff' : '#d8d4ec',
                  padding: '2px',
                  boxSizing: 'border-box',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    transform: item.checked ? 'translateX(20px)' : 'translateX(0px)',
                    transition: 'transform 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </div>
            );
          })}

          {/* Info Banner at bottom */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            background: '#f6f2fe',
            border: '1px solid #e7ddfd',
            borderRadius: '14px',
            marginTop: '8px',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1.5px solid #6c4dff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '0.8rem',
              fontWeight: '800',
              color: '#6c4dff',
            }}>
              i
            </div>
            <div style={{ fontSize: '0.8rem', color: '#686095', lineHeight: '1.4' }}>
              These settings will control what information candidates can see after completing the assessment. You can configure different combinations based on your requirements.
            </div>
          </div>
        </div>
      );

      // ── Step 11: Security & Proctoring ─────────────────────────────────────
      case 11: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Master toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            background: 'rgba(108,77,255,0.1)',
            border: '1px solid rgba(108,77,255,0.3)',
            borderRadius: '12px',
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main, #faf9ff)' }}>Security & Proctoring</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Real-time browser monitoring and anti-cheat measures</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={enableProctoring} onChange={e => setEnableProctoring(e.target.checked)} style={{ accentColor: '#6c4dff', width: '18px', height: '18px' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: enableProctoring ? '#a78bfa' : 'var(--text-muted)' }}>
                {enableProctoring ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          {enableProctoring && (
            <>
              <div>
                <div style={sectionTitle}>Required Streams & Display</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { state: requireWebcam, setter: setRequireWebcam, label: 'Require Live Webcam', desc: 'Request webcam stream & show minimizable preview' },
                    { state: requireMicrophone, setter: setRequireMicrophone, label: 'Require Microphone Stream', desc: 'Request audio input permission during pre-check' },
                    { state: requireScreenShare, setter: setRequireScreenShare, label: 'Require Screen Sharing', desc: 'Monitor MediaStream track and flag if sharing stops' },
                    { state: requireFullscreen, setter: setRequireFullscreen, label: 'Require Fullscreen Mode', desc: 'Detect exit fullscreen & issue warnings' },
                  ].map((item, i) => (
                    <label key={i} style={{ ...checkRow, marginBottom: 0 }}>
                      <input type="checkbox" checked={item.state} onChange={e => item.setter(e.target.checked)} style={{ accentColor: '#6c4dff', width: '15px', height: '15px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-main, #faf9ff)' }}>{item.label}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #a0a0b8)' }}>{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div style={sectionTitle}>Browser Event Detection & Clipboard Lock</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { state: detectTabSwitch, setter: setDetectTabSwitch, label: 'Detect Tab Switching & Window Blur' },
                    { state: preventCopy, setter: setPreventCopy, label: 'Disable Copying Text' },
                    { state: preventPaste, setter: setPreventPaste, label: 'Disable Pasting Content' },
                    { state: preventRightClick, setter: setPreventRightClick, label: 'Disable Right Click (Context Menu)' },
                  ].map((item, i) => (
                    <label key={i} style={{ ...checkRow, marginBottom: 0 }}>
                      <input type="checkbox" checked={item.state} onChange={e => item.setter(e.target.checked)} style={{ accentColor: '#6c4dff', width: '15px', height: '15px', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-main, #faf9ff)' }}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '12px',
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#f59e0b', marginBottom: '12px' }}>⚠️ Violation Threshold & Action Policy</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Maximum Allowed Warnings</label>
                    <input type="number" min="1" max="10" value={maxAllowedWarnings} onChange={e => setMaxAllowedWarnings(e.target.value)} style={{ ...inputCls, maxWidth: '140px' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Action After Maximum Violations</label>
                    <select value={maxViolationAction} onChange={e => setMaxViolationAction(e.target.value)} style={inputCls}>
                      <option value="terminate">Automatically Terminate Assessment</option>
                      <option value="submit">Automatically Submit Assessment</option>
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(245,158,11,0.8)', marginTop: '10px' }}>
                  Summary: Users receive <strong>{maxAllowedWarnings} warnings</strong>. After warning #{maxAllowedWarnings}, the assessment will be <strong>automatically {maxViolationAction === 'submit' ? 'submitted' : 'terminated'}</strong>.
                </div>
              </div>
            </>
          )}
        </div>
      );

      // ── Step 12: Review & Publish ──────────────────────────────────────────
      case 12: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary card */}
          <div style={{
            padding: '20px',
            background: 'rgba(108,77,255,0.07)',
            border: '1px solid rgba(108,77,255,0.2)',
            borderRadius: '14px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}>
            {[
              { label: 'Title', value: title || '(not set)', color: 'var(--text-main, #faf9ff)' },
              { label: 'Type', value: assessmentType, color: '#a78bfa' },
              { label: 'Duration', value: `${durationMinutes} minutes`, color: '#10b981' },
              { label: 'Difficulty', value: difficulty, color: '#f59e0b' },
              { label: 'Questions', value: `${questions.length} added`, color: '#a855f7' },
              { label: 'Visibility', value: visibility, color: '#06b6d4' },
              { label: 'Passing Score', value: `${passingScorePercentage}%`, color: '#22c55e' },
              { label: 'Proctoring', value: enableProctoring ? `On (${maxAllowedWarnings} warnings max)` : 'Off', color: enableProctoring ? '#10b981' : '#6b7280' },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: '600', color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              disabled={loading}
              onClick={() => handleSaveWizard('DRAFT')}
              style={{
                flex: 1,
                padding: '13px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                color: 'var(--text-main, #faf9ff)',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
              Save as Draft
            </button>
            <button
              disabled={loading}
              onClick={() => handleSaveWizard('PUBLISHED')}
              style={{
                flex: 1,
                padding: '13px',
                background: 'linear-gradient(135deg, #6c4dff, #a855f7)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(108,77,255,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
              Publish Assessment
            </button>
          </div>
        </div>
      );

      default: return null;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '8px 0 40px' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .aw-field:focus { border-color: rgba(108,77,255,0.6) !important; box-shadow: 0 0 0 3px rgba(108,77,255,0.12); }
      `}</style>

      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <button
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6c4dff',
              fontSize: '0.84rem',
              fontWeight: '700',
              marginBottom: '8px',
              padding: 0,
            }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '800', color: '#2d2b55' }}>
            {assessmentId ? 'Edit Assessment' : 'Create New Assessment'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#686095', fontWeight: '500' }}>
            Build, configure and publish an assessment for your candidates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => handleSaveWizard('DRAFT')}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              border: '1px solid #d4c8fe',
              background: '#ffffff',
              color: '#5b5293',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(108,77,255,0.06)',
            }}
          >
            <Save size={15} /> Save Draft
          </button>
          <button
            onClick={onBack}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              border: '1px solid #e2d9fe',
              background: '#f6f2fe',
              color: '#5b5293',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Exit
          </button>
        </div>
      </div>

      {/* Two-column Layout */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left Sidebar Stepper */}
        <SidebarStepper />

        {/* Right Content Panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Content Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e8e3fe',
            borderRadius: '20px',
            padding: '32px',
            minHeight: '380px',
            boxShadow: '0 10px 30px rgba(108,77,255,0.03)',
          }}>
            {/* Step Header Banner */}
            <div style={{
              marginBottom: '28px',
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #f3eefd 0%, #f8f5fe 100%)',
              border: '1px solid #e7ddfd',
              borderRadius: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#6c4dff',
                  boxShadow: '0 4px 12px rgba(108,77,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {(() => { const Icon = STEPS[currentStep - 1]?.icon; return Icon ? <Icon size={20} color="#ffffff" /> : null; })()}
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6c4dff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Step {currentStep} of {STEPS.length}
                  </div>
                  <h2 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: '800', color: '#2d2b55' }}>
                    {STEPS[currentStep - 1]?.name}
                  </h2>
                  <div style={{ fontSize: '0.82rem', color: '#686095', marginTop: '2px' }}>
                    {STEPS[currentStep - 1]?.desc}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px',
                color: '#ef4444',
                fontSize: '0.84rem',
                marginBottom: '20px',
              }}>
                <AlertTriangle size={15} /> {error}
              </div>
            )}

            {/* Loading overlay */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                <div style={{ fontSize: '0.84rem' }}>Loading...</div>
              </div>
            ) : renderStep()}
          </div>

          {/* Navigation Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '20px',
            padding: '18px 24px',
            background: '#ffffff',
            border: '1px solid #e8e3fe',
            borderRadius: '18px',
            boxShadow: '0 4px 20px rgba(108,77,255,0.03)',
          }}>
            <button
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(prev => prev - 1)}
              style={{
                padding: '10px 22px',
                borderRadius: '12px',
                border: '1px solid #e2d9fe',
                background: '#f6f2fe',
                color: '#5b5293',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                opacity: currentStep === 1 ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
              }}
            >
              <ArrowLeft size={16} /> Previous
            </button>

            {/* Step dots */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {STEPS.map(s => (
                <div
                  key={s.num}
                  onClick={() => setCurrentStep(s.num)}
                  style={{
                    width: currentStep === s.num ? '24px' : '7px',
                    height: '7px',
                    borderRadius: '99px',
                    background: s.num < currentStep
                      ? '#10b981'
                      : s.num === currentStep
                      ? '#6c4dff'
                      : '#e6e1fe',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            {currentStep < STEPS.length ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#6c4dff',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(108,77,255,0.35)',
                  transition: 'all 0.2s ease',
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => handleSaveWizard(status)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                }}
              >
                <Save size={16} /> Finish Assessment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
