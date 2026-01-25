import React, { useState, useEffect } from 'react';
import { Dropdown, Badge, Button } from 'react-bootstrap';
import { Bell, BellOff, Circle, Check } from 'lucide-react';
import { useRouter } from 'next/router';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link?: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch('/api/v1/notifications?unread_only=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
        setUnreadCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (e) { 
      console.error('Failed to fetch notifications:', e); 
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every 60s
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
    <Dropdown align="end">
      <Dropdown.Toggle as="div" className="icon-btn clickable position-relative">
        <Bell size={18} />
        {unreadCount > 0 && (
          <Badge 
            pill bg="danger" 
            className="position-absolute top-0 start-100 translate-middle"
            style={{ fontSize: '0.6rem', padding: '0.25em 0.4em' }}
          >
            {unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="mt-2 shadow border-0 p-0" style={{ width: '320px', overflow: 'hidden' }}>
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light bg-opacity-10">
          <span className="fw-bold small text-uppercase letter-spacing-1">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="link" className="p-0 text-decoration-none x-small fw-bold" onClick={markAllAsRead}>
              <Check size={12} className="me-1" /> Mark all read
            </Button>
          )}
        </div>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {notifications.length > 0 ? (
            notifications.map(n => (
              <div 
                key={n.id} 
                className="notification-item p-3 border-bottom clickable"
                onClick={() => {
                  if (n.link) {
                    router.push(n.link);
                  }
                }}
              >
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <div className="fw-bold small">{n.title || 'Security Alert'}</div>
                  {!n.is_read && <Circle size={8} fill="#0d6efd" color="#0d6efd" />}
                </div>
                <div className="small text-muted mb-2 line-clamp-2">{n.message}</div>
                <div className="x-small text-muted opacity-75">
                  {n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now'}
                </div>
              </div>
            ))
          ) : (
            <div className="p-5 text-center text-muted">
              <BellOff size={32} className="mb-3 opacity-25" />
              <div className="small fw-bold">No new notifications</div>
              <div className="x-small">Everything looks secure.</div>
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="p-2 border-top text-center bg-light bg-opacity-10">
            <Button variant="link" className="w-100 p-0 text-decoration-none x-small fw-bold" onClick={() => router.push('/notifications')}>
              View all notifications
            </Button>
          </div>
        )}
      </Dropdown.Menu>

      <style jsx>{`
        .notification-item {
          transition: background 0.2s;
        }
        .notification-item:hover {
          background: rgba(13, 110, 253, 0.05);
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .letter-spacing-1 { letter-spacing: 1px; }
        .x-small { font-size: 11px; }
      `}</style>
    </Dropdown>
  );
}
