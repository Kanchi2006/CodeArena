import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Play, Ban } from 'lucide-react';

export default function OrgContestsView({ token, onNavigateToWizard }) {
  const [contests, setContests] = useState([]);

  useEffect(() => {
    fetch('/api/contests', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setContests(Array.isArray(data) ? data : []));
  }, [token]);

  return (
    <div className="card">
      <div className="card-header">
        <h3>My Contests</h3>
        <button className="btn-primary" onClick={onNavigateToWizard}><Plus size={16} /> Create New</button>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>Title</th><th>Start Time</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {contests.map(c => (
            <tr key={c.id}>
              <td>{c.title}</td>
              <td>{new Date(c.start_time).toLocaleString()}</td>
              <td>{c.status}</td>
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
  );
}
