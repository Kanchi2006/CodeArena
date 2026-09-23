import React, { useState, useEffect } from 'react';

export default function OrgSettingsView({ token }) {
  const [settings, setSettings] = useState({ notification_preferences: {}, organization_details: {} });

  useEffect(() => {
    fetch('/api/org/settings', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setSettings(data))
    .catch(err => console.error('Error fetching settings:', err));
  }, [token]);

  const handleSave = async () => {
    await fetch('/api/org/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(settings)
    });
    alert('Settings updated!');
  };

  return (
    <div style={{ padding: '24px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
      <h3>Account Settings</h3>
      <section>
        <h4>Notification Preferences</h4>
        <label>
          <input type="checkbox" checked={settings.notification_preferences.email || false} 
            onChange={e => setSettings({...settings, notification_preferences: {...settings.notification_preferences, email: e.target.checked}})} />
          Email Notifications
        </label>
      </section>
      <section style={{ marginTop: '20px' }}>
        <h4>Organization Details</h4>
        <input placeholder="Official Email" value={settings.organization_details?.official_email || ''} 
          onChange={e => setSettings({...settings, organization_details: {...settings.organization_details, official_email: e.target.value}})} />
      </section>
      <button onClick={handleSave} style={{ marginTop: '20px' }}>Save Changes</button>
    </div>
  );
}
