import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../api/client.js';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const wrapRef = useRef(null);

  async function load() {
    try {
      setData(await api('/notifications'));
    } catch {
      // Keep the UI stable if network is unavailable.
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function onClickOutside(event) {
      if (open && wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('touchstart', onClickOutside);

    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('touchstart', onClickOutside);
    };
  }, [open]);

  async function markRead(id) {
    await api(`/notifications/${id}/read`, { method: 'PATCH' });
    await load();
    // Keep panel open so users can continue scrolling up/down through messages.
  }

  async function markAllRead() {
    await api('/notifications/read-all', { method: 'PATCH' });
    await load();
  }

  return (
    <div className="bellWrap" ref={wrapRef}>
      <button
        type="button"
        className="iconBtn"
        aria-label="Open Notifications"
        onClick={() => setOpen(value => !value)}
      >
        <Bell />
        {data.unread > 0 && <span className="badge">{data.unread}</span>}
      </button>

      {open && (
        <div className="notificationPanel" role="dialog" aria-label="Notifications">
          <div className="notificationHead">
            <div>
              <h3>Notifications</h3>
              <small>{data.notifications.length} Message{data.notifications.length === 1 ? '' : 's'}</small>
            </div>

            {data.unread > 0 && (
              <button type="button" onClick={markAllRead}>
                Mark All Read
              </button>
            )}
          </div>

          <div className="notificationList">
            {data.notifications.length === 0 && (
              <p className="muted notificationEmpty">No Notifications</p>
            )}

            {data.notifications.map(notification => (
              <button
                type="button"
                key={notification._id}
                className={`note ${notification.isRead ? '' : 'unread'}`}
                onClick={() => markRead(notification._id)}
              >
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
                <small>{formatDate(notification.createdAt)}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
