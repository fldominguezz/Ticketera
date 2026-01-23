import React, { useState, useEffect } from 'react';
import { NavDropdown, Badge, ListGroup } from 'react-bootstrap';
import { Bell, BellOff, Circle } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link?: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch('/api/v1/notifications/?unread_only=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.length);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const markAllAsRead = async () => {
    const token = localStorage.getItem('access_token');
    try {
      await fetch('/api/v1/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  };

  return (
    <NavDropdown 
      title={
        <span className="position-relative">
          <Bell size={20} className="text-white" />
          {unreadCount > 0 && (
            <Badge 
              pill bg="danger" 
              className="position-absolute top-0 start-100 translate-middle"
              style={{ fontSize: '0.6rem' }}
            >
              {unreadCount}
            </Badge>
          )}
        </span>
      } 
      id="notifications-dropdown"
      align="end"
      className="me-3"
    >
      <div className="p-2 border-bottom d-flex justify-content-between align-items-center" style={{ minWidth: '300px' }}>
        <span className="fw-bold">Notifications</span>
        {unreadCount > 0 && (
          <button className="btn btn-link btn-sm p-0 text-decoration-none" onClick={markAllAsRead}>
            Mark all read
          </button>
        )}
      </div>
      <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
        {Array.isArray(notifications) && notifications.length > 0 ? notifications.map(n => (
          <NavDropdown.Item key={n.id} className="p-3 border-bottom whitespace-normal">
            <div className="fw-bold small">{n.title || 'Notification'}</div>
            <div className="small text-muted">{n.message || ''}</div>
            <div className="text-end" style={{ fontSize: '0.65rem' }}>
              {n.created_at ? new Date(n.created_at).toLocaleTimeString() : '--:--'}
            </div>
          </NavDropdown.Item>
        )) : (
          <div className="p-4 text-center text-muted">
            <BellOff size={24} className="mb-2 opacity-50" />
            <div className="small">No unread notifications</div>
          </div>
        )}
      </div>
    </NavDropdown>
  );
}
