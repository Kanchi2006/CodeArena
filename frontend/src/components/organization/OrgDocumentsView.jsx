import React from 'react';
import { FileText, Upload } from 'lucide-react';

export default function OrgDocumentsView({ documents }) {
  return (
    <div className="card">
      <h3>Uploaded Documents</h3>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>Document Name</th><th>Type</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {documents?.map((doc) => (
              <tr key={doc.id}>
                <td><FileText size={16} /> {doc.filename}</td>
                <td>{doc.doc_type}</td>
                <td>{doc.status}</td>
                <td><button className="btn-secondary">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn-primary"><Upload size={16} /> Upload New</button>
    </div>
  );
}
