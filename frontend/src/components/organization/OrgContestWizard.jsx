import React, { useState } from 'react';

export default function OrgContestWizard({ token, onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ title: '', start_time: '' });

  return (
    <div className="card">
      <h3>Contest Wizard - Step {step}</h3>
      <div className="form-group">
        <input placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
      </div>
      <div className="wizard-actions">
        {step > 1 && <button className="btn-secondary" onClick={() => setStep(step - 1)}>Back</button>}
        {step < 3 ? <button className="btn-primary" onClick={() => setStep(step + 1)}>Next</button> : <button className="btn-primary">Publish</button>}
      </div>
    </div>
  );
}
