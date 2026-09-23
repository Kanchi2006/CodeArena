import React, { useState } from 'react';

export default function OrgContestWizard({ token, onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '', description: '', start_time: '', end_time: '', duration: 120,
    visibility: 'PUBLIC', max_participants: 0, problems: [], rules: {}
  });

  const handleSave = async () => {
    const res = await fetch('/api/contests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    if (res.ok) onComplete();
  };

  return (
    <div style={{ padding: '24px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
      <h3>{step === 1 ? 'Contest Configuration' : step === 2 ? 'Problem Selector' : 'Rules & Instructions'}</h3>
      
      {step === 1 && (
        <div>
          <input placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          <input type="datetime-local" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
          <input type="datetime-local" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
          <input type="number" placeholder="Duration (minutes)" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} />
          <select value={formData.visibility} onChange={e => setFormData({...formData, visibility: e.target.value})}>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
          <input type="number" placeholder="Max Participants (0 for unlimited)" value={formData.max_participants} onChange={e => setFormData({...formData, max_participants: parseInt(e.target.value)})} />
        </div>
      )}

      {step === 2 && <div>Problem Selector (Ordering & Points Assignment)</div>}
      
      {step === 3 && <div>Rules: Code of Conduct, Technical Requirements, Time Penalty, Leaderboard Freeze</div>}

      <div style={{ marginTop: '20px' }}>
        {step > 1 && <button onClick={() => setStep(step - 1)}>Back</button>}
        {step < 3 ? <button onClick={() => setStep(step + 1)}>Next</button> : <button onClick={handleSave}>Publish Contest</button>}
      </div>
    </div>
  );
}
