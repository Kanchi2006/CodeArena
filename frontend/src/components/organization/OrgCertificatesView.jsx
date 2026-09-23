import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function OrgCertificatesView({ token }) {
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    fetch('/api/org/certificates', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCertificates(data));
  }, [token]);

  return (
    <div className="card">
      <h3>Issued Certificates</h3>
      <table className="data-table">
        <thead>
          <tr><th>Participant</th><th>Event</th><th>Date</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {certificates.map(c => (
            <tr key={c.id}>
              <td>{c.display_name}</td>
              <td>{c.course_title}</td>
              <td>{new Date(c.issued_at).toLocaleDateString()}</td>
              <td><button className="btn-icon"><Download size={16} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
