import React, { useState } from 'react';

export default function OrgAssessmentWizard({ token, onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '', category: '', difficulty: 'Easy', duration: 60, 
    questions: [], rules: { duration: 60, randomization: true, visibility: 'public' }
  });

  const handleSave = async () => {
    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    if (res.ok) onComplete();
  };

  return (
    <div style={{ padding: '24px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
      <h3>{step === 1 ? 'Basic Details' : step === 2 ? 'Questions Builder' : 'Rules & Instructions'}</h3>
      
      {step === 1 && (
        <div>
          <input placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
        </div>
      )}

      {step === 2 && <div>Questions Builder (Coding, MCQ, Multi-select, Output-based)</div>}
      
      {step === 3 && <div>Rules: Duration, Randomization, Resume Policy, Certificate Eligibility</div>}

      <div style={{ marginTop: '20px' }}>
        {step > 1 && <button onClick={() => setStep(step - 1)}>Back</button>}
        {step < 3 ? <button onClick={() => setStep(step + 1)}>Next</button> : <button onClick={handleSave}>Publish Assessment</button>}
      </div>
    </div>
  );
}
