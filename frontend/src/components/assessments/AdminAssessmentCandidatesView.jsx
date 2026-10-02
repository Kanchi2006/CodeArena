import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Mail, CheckCircle, Clock } from 'lucide-react';

export default function AdminAssessmentCandidatesView({ assessmentId, token, onBack }) {
  const [candidates, setCandidates] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, [assessmentId, token]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/candidates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCandidates(await res.json());
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteCandidate = async (e) => {
    e.preventDefault();
    if (!emailInput) return;

    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/candidates/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: emailInput })
      });
      if (res.ok) {
        setEmailInput('');
        fetchCandidates();
      }
    } catch (err) {
      console.error('Error inviting candidate:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-16">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <UserPlus className="text-indigo-400" size={24} /> Candidate Invitation Manager
        </h1>

        <form onSubmit={handleInviteCandidate} className="flex gap-2">
          <input
            type="email"
            placeholder="Candidate Email Address..."
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
          />
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl">
            Invite Candidate
          </button>
        </form>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950 border-b border-slate-800 text-xs font-bold text-white">
          Invited Candidates ({candidates.length})
        </div>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading candidates...</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase">
              <tr>
                <th className="p-4">Email</th>
                <th className="p-4">Invite Code</th>
                <th className="p-4">Status</th>
                <th className="p-4">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {candidates.map(c => (
                <tr key={c.id}>
                  <td className="p-4 font-medium text-white">{c.email}</td>
                  <td className="p-4 font-mono text-indigo-400">{c.invite_code}</td>
                  <td className="p-4">{c.status}</td>
                  <td className="p-4 text-slate-400">{new Date(c.sent_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
