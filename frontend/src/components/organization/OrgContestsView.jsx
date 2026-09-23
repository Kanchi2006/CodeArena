import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Play, Ban, Clock } from 'lucide-react';

export default function OrgContestsView({ token, onNavigateToWizard }) {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchContests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching contests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, [token]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/contests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchContests();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  return (
    <div style={{ padding: '24px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3>My Contests</h3>
        <button onClick={onNavigateToWizard}><Plus size={16} /> Create New Contest</button>
      </div>
      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
              <th>Title</th><th>Start Time</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contests.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td>{c.title}</td>
                <td>{new Date(c.start_time).toLocaleString()}</td>
                <td>{c.status}</td>
                <td>
                  <button onClick={() => handleStatusChange(c.id, 'LIVE')}><Play size={16} /></button>
                  <button onClick={() => handleStatusChange(c.id, 'CANCELLED')}><Ban size={16} /></button>
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
