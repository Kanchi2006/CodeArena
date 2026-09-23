import React, { useState, useEffect } from 'react';

export default function OrgResultsAnalyticsView({ token, eventId }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/org/results-analytics?event_id=${eventId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setAnalytics(data))
    .catch(err => console.error('Error fetching analytics:', err));
  }, [token, eventId]);

  if (!analytics) return <div>Select an event to view analytics.</div>;

  return (
    <div style={{ padding: '24px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
      <h3>Analytics: {analytics.contest_title}</h3>
      <p>Pass Rate: {analytics.analytics.pass_rate}%</p>
      <h4>Score Distribution</h4>
      <ul>
        {analytics.analytics.score_distribution.map((d, i) => (
          <li key={i}>{d.score_range}: {d.count}</li>
        ))}
      </ul>
      <button onClick={() => console.log('Exporting...')}>Export Results (CSV)</button>
    </div>
  );
}
