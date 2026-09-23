import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Play, CheckCircle, Clock, Ban } from 'lucide-react';

export default function OrgAssessmentsView({ token, onNavigateToWizard }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assessments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssessments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [token]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/assessments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchAssessments();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  return (
    <div style={{ padding: '24px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3>My Assessments</h3>
        <button onClick={onNavigateToWizard}><Plus size={16} /> Create New</button>
      </div>
      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
              <th>Title</th><th>Category</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td>{a.title}</td>
                <td>{a.category}</td>
                <td>{a.status}</td>
                <td>
                  <button onClick={() => handleStatusChange(a.id, 'PUBLISHED')}><Play size={16} /></button>
                  <button onClick={() => handleStatusChange(a.id, 'CANCELLED')}><Ban size={16} /></button>
                  <button><Edit2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
