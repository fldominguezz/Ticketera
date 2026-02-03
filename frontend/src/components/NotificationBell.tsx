import React, { useState, useEffect, useCallback } from 'react';
import { Dropdown, Badge, Button } from 'react-bootstrap';
import { Bell, BellOff, Circle, Check } from 'lucide-react';
import { useRouter } from 'next/router';
import api from '../lib/api';

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

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const res = await api.get('/notifications?unread_only=true');
      const data = res.data;
      setNotifications(Array.isArray(data) ? data : []);
      setUnreadCount(Array.isArray(data) ? data.length : 0);
    } catch (e) { 
      console.error('Failed to fetch notifications:', e); 
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Integración con el WebSocket Manager
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Aquí usamos la conexión global que debería estar en el context
    // Pero para asegurar que "ande" ahora, intentaremos escuchar el evento de sistema
    const handleWsNotification = (event: any) => {
        if (event.detail?.type === 'notification') {
            const newNotif = event.detail.data;
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Sonido opcional o vibración visual
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification(newNotif.title, { body: newNotif.message });
            }
        }
    };

    window.addEventListener('soc-notification', handleWsNotification);
    return () => window.removeEventListener('soc-notification', handleWsNotification);
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  };

  return (
    <Dropdown align="end">
      <Dropdown.Toggle as="div" className="icon-btn clickable position-relative text-main opacity-75 hover-opacity-100">
        <Bell size={20} className={unreadCount > 0 ? 'animate-swing' : ''} />
        {unreadCount > 0 && (
          <Badge 
            pill bg="danger" 
            className="position-absolute top-0 start-100 translate-middle border border-color"
            style={{ fontSize: '0.6rem', padding: '0.35em 0.5em', minWidth: '18px' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="mt-3 shadow-2xl border-0 p-0" style={{ width: '350px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="p-3 border-bottom border-color d-flex justify-content-between align-items-center bg-surface">
          <span className="fw-black x-small text-uppercase tracking-widest text-primary">Notificaciones del Sistema</span>
          {unreadCount > 0 && (
            <Button variant="link" className="p-0 text-decoration-none x-small fw-bold text-muted hover-text-primary" onClick={markAllAsRead}>
              <Check size={12} className="me-1" /> Marcar leídas
            </Button>
          )}
        </div>
        
        <div style={{ maxHeight: '450px', overflowY: 'auto' }} className="custom-scrollbar bg-card">
          {notifications.length > 0 ? (
            notifications.map(n => (
              <div 
                key={n.id} 
                className="notification-item p-3 border-bottom border-color clickable"
                onClick={() => {
                  if (n.link) router.push(n.link);
                }}
              >
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <div className="fw-black x-small text-main uppercase tracking-tight">{n.title}</div>
                  {!n.is_read && <div className="notification-dot" />}
                </div>
                <div className="small text-muted mb-2 line-clamp-2" style={{ fontSize: '12px' }}>{n.message}</div>
                <div className="x-small text-muted opacity-50 fw-bold">
                   Hace unos instantes
                </div>
              </div>
            ))
          ) : (
            <div className="p-5 text-center text-muted bg-card">
              <BellOff size={32} className="mb-3 opacity-10" />
              <div className="x-small fw-black uppercase tracking-widest">Sin alertas nuevas</div>
            </div>
          )}
        </div>
        
        <div className="p-2 border-top border-color text-center bg-surface">
            <Button variant="link" className="w-100 p-0 text-decoration-none x-small fw-black text-muted uppercase" onClick={() => router.push('/notifications')}>
              Ver historial completo
            </Button>
        </div>
      </Dropdown.Menu>

      <style jsx global>{`
        .notification-item { transition: all 0.2s; background-color: var(--bg-card); }
        .notification-item:hover { background-color: var(--bg-surface-muted); }
        .notification-dot { width: 8px; height: 8px; background: var(--primary); border-radius: 50%; box-shadow: 0 0 10px var(--primary); }
        .animate-swing { animation: swing 2s infinite; }
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .hover-opacity-100:hover { opacity: 1 !important; }
        .hover-text-primary:hover { color: var(--primary) !important; }
            `}</style>
          </Dropdown>
        );
      }
      