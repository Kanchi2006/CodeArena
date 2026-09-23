import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Play, CheckCircle, AlertTriangle } from 'lucide-react';

export default function OrgAssessmentsView({ token, onNavigateToWizard }) {
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    fetch('/api/assessments', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setAssessments(data))
    .catch(err => console.error('Error fetching assessments:', err));
  }, [token]);

  return (
    <div className="org-assessments-view" style={{ padding: '20px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>My Assessments</h3>
        <button onClick={() => onNavigateToWizard()}><Plus size={16} /> Create New Assessment</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
            <th>Title</th>
            <th>Category</th>
            <th>Difficulty</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assessments.map(a => (
            <tr key={a.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
              <td>{a.title}</td>
              <td>{a.category}</td>
              <td>{a.difficulty}</td>
              <td>{a.status}</td>
              <td>
                <button><Edit2 size={16} /></button>
                <button><Play size={16} /></button>
                <button><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
