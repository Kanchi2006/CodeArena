import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Download, 
  RotateCcw, 
  BarChart2, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  Edit3, 
  X,
  FileText
} from 'lucide-react';

export default function AdminAssessmentResultsView({ assessmentId, token, onBack }) {
  const [results, setResults] = useState([]);
  const [violations, setViolations] = useState([]);
  const [activeTab, setActiveTab] = useState('results'); // 'results' | 'proctoring'
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [selectedSecurityTimeline, setSelectedSecurityTimeline] = useState(null);
  const [gradingModal, setGradingModal] = useState(null);
  const [manualScoreInput, setManualScoreInput] = useState('');
  const [manualFeedbackInput, setManualFeedbackInput] = useState('');

  useEffect(() => {
    fetchResults();
    fetchViolations();
  }, [assessmentId, token]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/results`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setResults(await res.json());
    } catch (err) {
      console.error('Error fetching admin results:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/violations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setViolations(await res.json());
    } catch (err) {
      console.error('Error fetching violations:', err);
    }
  };

  const handleExportCSV = () => {
    window.open(`/api/admin/assessments/${assessmentId}/export?token=${token}`, '_blank');
  };

  const handleReevaluate = async () => {
    if (!window.confirm('Are you sure you want to re-evaluate all submitted attempt scores for this assessment?')) return;
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/re-evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Admin triggered re-evaluation' })
      });
      if (res.ok) {
        alert('Re-evaluation completed successfully.');
        fetchResults();
      }
    } catch (err) {
      console.error('Error re-evaluating:', err);
    }
  };

  const openCandidatePerformance = async (attemptId) => {
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/candidate-performance/${attemptId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setSelectedAttempt(await res.json());
    } catch (err) {
      console.error('Error fetching candidate performance:', err);
    }
  };

  const handleSaveManualEvaluation = async (e) => {
    e.preventDefault();
    if (!gradingModal) return;

    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/evaluations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          attemptId: gradingModal.attemptId,
          questionId: gradingModal.questionId,
          score: Number(manualScoreInput),
          feedback: manualFeedbackInput
        })
      });

      if (res.ok) {
        setGradingModal(null);
        fetchResults();
        if (selectedAttempt) openCandidatePerformance(selectedAttempt.attempt.attempt_id);
      }
    } catch (err) {
      console.error('Error submitting manual grade:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Back Header */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="text-indigo-400" size={24} /> Candidate Results & Performance
          </h1>
          <p className="text-xs text-slate-400 mt-1">Review candidate attempt scores, examine source code, submit manual grades, and export CSV reports.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReevaluate}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> Re-evaluate All
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'results'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart2 size={15} /> Candidate Results ({results.length})
        </button>

        <button
          onClick={() => setActiveTab('proctoring')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'proctoring'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <AlertCircle size={15} className="text-amber-400" /> Security & Proctoring Audit ({violations.length})
        </button>
      </div>

      {/* TAB 1: RESULTS TABLE */}
      {activeTab === 'results' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Candidate Attempts ({results.length})</h3>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">Loading candidate results...</div>
          ) : results.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">No candidate attempts completed yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Candidate</th>
                    <th className="p-4">Attempt #</th>
                    <th className="p-4">Score Marks</th>
                    <th className="p-4">Percentage</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {results.map(item => (
                    <tr key={item.attempt_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-semibold text-white">
                        <div>{item.display_name || item.username}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{item.email}</div>
                      </td>
                      <td className="p-4 font-mono">#{item.attempt_number}</td>
                      <td className="p-4 font-bold">{item.total_earned_marks} / {item.total_possible_marks}</td>
                      <td className="p-4 font-black text-indigo-400">{item.percentage}%</td>
                      <td className="p-4">
                        {item.status === 'TERMINATED' ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-[11px]">
                            Terminated - Security Violation
                          </span>
                        ) : item.is_passed ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
                            Passed
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-[11px]">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => openCandidatePerformance(item.attempt_id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={13} /> View Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROCTORING & SECURITY AUDIT TABLE */}
      {activeTab === 'proctoring' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Proctoring Violations Log ({violations.length})</h3>
          </div>

          {violations.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">No security violations recorded for this assessment.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Candidate</th>
                    <th className="p-4">Attempt ID</th>
                    <th className="p-4">Violation Type</th>
                    <th className="p-4">Warning #</th>
                    <th className="p-4">Action Taken</th>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4 text-right">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {violations.map(v => (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-semibold text-white">
                        <div>{v.username}</div>
                        <div className="text-[10px] text-slate-500">{v.email}</div>
                      </td>
                      <td className="p-4 font-mono text-indigo-400">{v.attempt_id}</td>
                      <td className="p-4 font-bold text-amber-400">{v.violation_type}</td>
                      <td className="p-4 font-mono">Warning {v.warning_number || 1}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.action_taken === 'TERMINATED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {v.action_taken}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{new Date(v.reported_at).toLocaleString()}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            const userEvents = violations.filter(item => item.attempt_id === v.attempt_id);
                            setSelectedSecurityTimeline({ attemptId: v.attempt_id, candidateName: v.username, events: userEvents });
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <FileText size={13} /> View Timeline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Security Activity Timeline Modal */}
      {selectedSecurityTimeline && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Security Activity Timeline</h3>
                <p className="text-xs text-slate-400">Candidate: {selectedSecurityTimeline.candidateName} ({selectedSecurityTimeline.attemptId})</p>
              </div>
              <button onClick={() => setSelectedSecurityTimeline(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {selectedSecurityTimeline.events.map((evt, idx) => (
                <div key={evt.id || idx} className="flex gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <div className="font-bold text-white">{evt.violation_type} — Warning {evt.warning_number || 1}</div>
                    <div className="text-slate-400 text-[11px]">{new Date(evt.reported_at).toLocaleTimeString()} — Action: {evt.action_taken}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Candidate Performance Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Candidate Attempt Detail</h3>
                <p className="text-xs text-slate-400">{selectedAttempt.attempt.display_name} ({selectedAttempt.attempt.email})</p>
              </div>
              <button onClick={() => setSelectedAttempt(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-center text-xs">
              <div>Score: <strong className="text-emerald-400">{selectedAttempt.attempt.total_earned_marks} / {selectedAttempt.attempt.total_possible_marks}</strong></div>
              <div>Percentage: <strong className="text-indigo-400">{selectedAttempt.attempt.percentage}%</strong></div>
              <div>Status: <strong className="text-amber-400">{selectedAttempt.attempt.is_passed ? 'PASSED' : 'FAILED'}</strong></div>
            </div>

            {/* Questions Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Responses ({selectedAttempt.responses.length})</h4>
              {selectedAttempt.responses.map((resp, idx) => (
                <div key={resp.question_id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Q{idx + 1}. {resp.question_text}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Score: {resp.score_earned} / {resp.marks}</span>
                      <button
                        onClick={() => {
                          setGradingModal({ attemptId: selectedAttempt.attempt.attempt_id, questionId: resp.question_id });
                          setManualScoreInput(resp.score_earned);
                          setManualFeedbackInput(resp.evaluator_feedback || '');
                        }}
                        className="p-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded"
                        title="Manual Grade"
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Grading Form Modal */}
      {gradingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
          <form onSubmit={handleSaveManualEvaluation} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-white">Manual Score Grade</h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Enter Score</label>
              <input
                type="number"
                step="0.5"
                value={manualScoreInput}
                onChange={(e) => setManualScoreInput(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Feedback</label>
              <textarea
                value={manualFeedbackInput}
                onChange={(e) => setManualFeedbackInput(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setGradingModal(null)} className="flex-1 py-2 bg-slate-800 text-xs text-white rounded-lg">Cancel</button>
              <button type="submit" className="flex-1 py-2 bg-indigo-600 text-xs font-bold text-white rounded-lg">Save Grade</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
