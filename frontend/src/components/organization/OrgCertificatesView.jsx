import React, { useState, useEffect } from 'react';
import { Award, Download } from 'lucide-react';

export default function OrgCertificatesView({ token }) {
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    fetch('/api/org/certificates', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setCertificates(data))
    .catch(err => console.error('Error fetching certificates:', err));
  }, [token]);

  return (
    <div style={{ padding: '24px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
      <h3>Issued Certificates</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
            <th>Participant</th><th>Event</th><th>Date</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {certificates.map(c => (
            <tr key={c.id}>
              <td>{c.display_name}</td>
              <td>{c.course_title}</td>
              <td>{new Date(c.issued_at).toLocaleDateString()}</td>
              <td><button><Download size={16} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
