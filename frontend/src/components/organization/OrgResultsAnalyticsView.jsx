import React, { useState, useEffect } from 'react';

export default function OrgResultsAnalyticsView({ token, eventId }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (eventId) {
      fetch(`/api/org/results-analytics?event_id=${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setAnalytics(data));
    }
  }, [token, eventId]);

  return (
    <div className="card">
      <h3>Analytics</h3>
      {analytics ? (
        <div>
          <p>Pass Rate: {analytics.analytics.pass_rate}%</p>
          <button className="btn-primary">Export CSV</button>
        </div>
      ) : <p>Select an event.</p>}
    </div>
  );
}
