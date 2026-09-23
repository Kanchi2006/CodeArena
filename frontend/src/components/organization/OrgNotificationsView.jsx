import React, { useState, useEffect } from 'react';
import { Mail, Check, Trash2 } from 'lucide-react';

export default function OrgNotificationsView({ token }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetch('/api/org/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setNotifications(data))
    .catch(err => console.error('Error fetching notifications:', err));
  }, [token]);

  const markAsRead = async (id) => {
    await fetch(`/api/org/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };

  return (
    <div style={{ padding: '24px', background: 'var(--bg-panel-solid)', borderRadius: '12px' }}>
      <h3>Notifications</h3>
      <button onClick={() => console.log('Mark all read')}>Mark All as Read</button>
      <div style={{ marginTop: '20px' }}>
        {notifications.map(n => (
          <div key={n.id} style={{ padding: '15px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{n.title}</strong>
              <p>{n.message}</p>
            </div>
            {!n.is_read && <button onClick={() => markAsRead(n.id)}><Check size={16} /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}
