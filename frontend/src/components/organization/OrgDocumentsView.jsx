import React, { useState } from 'react';
import { FileText, Upload, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function OrgDocumentsView({ documents }) {
  const getStatusIcon = (status) => {
    if (status === 'VERIFIED') return <CheckCircle color="var(--success)" />;
    if (status === 'REJECTED') return <XCircle color="var(--danger)" />;
    return <Clock color="var(--warning)" />;
  };

  return (
    <div className="org-documents-view" style={{ padding: '20px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
      <h3>Uploaded Documents</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
            <th>Document Name</th>
            <th>Type</th>
            <th>Upload Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents?.map((doc) => (
            <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
              <td><FileText size={16} /> {doc.filename}</td>
              <td>{doc.doc_type}</td>
              <td>{new Date(doc.upload_date).toLocaleDateString()}</td>
              <td>{getStatusIcon(doc.status)} {doc.status}</td>
              <td><button>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button style={{ marginTop: '20px' }}><Upload size={16} /> Upload New Document</button>
    </div>
  );
}
