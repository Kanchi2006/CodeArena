import React, { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';

export default function OrgParticipantsView({ token }) {
  const [participants, setParticipants] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`/api/org/participants?search=${search}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setParticipants(data))
    .catch(err => console.error('Error fetching participants:', err));
  }, [token, search]);

  return (
    <div style={{ padding: '24px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
      <h3>Participants</h3>
      <input 
        placeholder="Search by name or email..." 
        value={search} 
        onChange={e => setSearch(e.target.value)}
        style={{ padding: '8px', marginBottom: '15px', width: '100%' }}
      />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
            <th>Name</th><th>Email</th><th>Event</th><th>Score</th>
          </tr>
        </thead>
        <tbody>
          {participants.map(p => (
            <tr key={p.id}>
              <td>{p.display_name}</td>
              <td>{p.email}</td>
              <td>{p.contest_title}</td>
              <td>{p.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
