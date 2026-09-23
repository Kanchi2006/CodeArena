import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

export default function OrgNotificationsView({ token }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetch('/api/org/notifications', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setNotifications(data));
  }, [token]);

  return (
    <div className="card">
      <h3>Notifications</h3>
      <div className="notification-list">
        {notifications.map(n => (
          <div key={n.id} className="notification-item">
            <div><strong>{n.title}</strong><p>{n.message}</p></div>
            {!n.is_read && <button className="btn-icon"><Check size={16} /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}
