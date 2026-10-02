import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldAlert, AlertTriangle } from 'lucide-react';

export default function AdminAssessmentViolationsView({ assessmentId, token, onBack }) {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchViolations();
  }, [assessmentId, token]);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/violations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setViolations(await res.json());
    } catch (err) {
      console.error('Error fetching violations:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-16">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-2">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="text-rose-400" size={24} /> Integrity Violations Log
        </h1>
        <p className="text-xs text-slate-400">Review flagged candidate activity such as tab switches, window blur events, or anomaly timestamps.</p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950 border-b border-slate-800 text-xs font-bold text-white">
          Logged Violations ({violations.length})
        </div>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading integrity logs...</div>
        ) : violations.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No violations logged for this assessment.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase">
              <tr>
                <th className="p-4">Candidate</th>
                <th className="p-4">Violation Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Reported At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {violations.map(v => (
                <tr key={v.id}>
                  <td className="p-4 font-medium text-white">{v.username} ({v.email})</td>
                  <td className="p-4 font-semibold text-rose-400">{v.violation_type}</td>
                  <td className="p-4">{v.status}</td>
                  <td className="p-4 text-slate-400">{new Date(v.reported_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
