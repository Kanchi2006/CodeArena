import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Play, Ban } from 'lucide-react';

export default function OrgAssessmentsView({ token, onNavigateToWizard }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/assessments', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { setAssessments(Array.isArray(data) ? data : []); setLoading(false); });
  }, [token]);

  return (
    <div className="card">
      <div className="card-header">
        <h3>My Assessments</h3>
        <button className="btn-primary" onClick={onNavigateToWizard}><Plus size={16} /> Create New</button>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>Title</th><th>Category</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {assessments.map(a => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>{a.category}</td>
                <td>{a.status}</td>
                <td>
                  <button className="btn-icon"><Play size={16} /></button>
                  <button className="btn-icon"><Ban size={16} /></button>
                  <button className="btn-icon"><Edit2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
