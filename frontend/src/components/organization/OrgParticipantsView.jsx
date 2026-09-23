import React, { useState, useEffect } from 'react';

export default function OrgParticipantsView({ token }) {
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    fetch('/api/org/participants', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setParticipants(data));
  }, [token]);

  return (
    <div className="card">
      <h3>Participants</h3>
      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Event</th><th>Score</th></tr>
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
