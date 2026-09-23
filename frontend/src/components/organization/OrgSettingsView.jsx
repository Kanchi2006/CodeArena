import React, { useState, useEffect } from 'react';

export default function OrgSettingsView({ token }) {
  const [settings, setSettings] = useState({ notification_preferences: {}, organization_details: {} });

  useEffect(() => {
    fetch('/api/org/settings', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setSettings(data));
  }, [token]);

  return (
    <div className="card">
      <h3>Settings</h3>
      <div className="form-group">
        <label>Email Notifications</label>
        <input type="checkbox" checked={settings.notification_preferences.email || false} />
      </div>
      <button className="btn-primary">Save Changes</button>
    </div>
  );
}
