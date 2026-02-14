import React, { useState, useEffect, useCallback } from 'react';
import { Dropdown, Badge, Button } from 'react-bootstrap';
import { Bell, BellOff, Circle, Check, Clock, ShieldAlert, Activity } from 'lucide-react';
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
   const res = await api.get('/notifications/me');
   const data = res.data;
   setNotifications(Array.isArray(data) ? data : []);
   const unread = Array.isArray(data) ? data.filter(n => !n.is_read).length : 0;
   setUnreadCount(unread);
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
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(newNotif.title, { body: newNotif.message });
      }
    }
  };

  window.addEventListener('soc-notification', handleWsNotification);
  return () => window.removeEventListener('soc-notification', handleWsNotification);
 }, [fetchNotifications]);

  const markAllAsRead = async () => {
   try {
    await api.post('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
   } catch (e) { console.error(e); }
  };
 
  const markAsRead = async (id: string, e: React.MouseEvent) => {
   e.stopPropagation();
   try {
    await api.patch(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
   } catch (e) { console.error(e); }
  };
 
  const getNotificationStyles = (title: string) => {
   const t = (title || '').toLowerCase();
   if (t.includes('alerta') || t.includes('siem') || t.includes('security')) {
    return { icon: <ShieldAlert size={14} className="text-danger" />, class: 'notif-security' };
   }
   if (t.includes('ticket') || t.includes('asignado')) {
    return { icon: <Activity size={14} className="text-primary" />, class: 'notif-ticket' };
   }
   return { icon: <Circle size={10} className="text-muted" />, class: '' };
  };
 
  return (
   <Dropdown align="end">
    <Dropdown.Toggle as="div" className="icon-btn clickable position-relative text-main opacity-75 hover-opacity-100">
     <Bell size={20} className={unreadCount > 0 ? 'animate-swing' : ''} />
     {unreadCount > 0 && (
      <Badge 
       pill bg="danger" 
       className="position-absolute top-0 start-100 translate-middle border border-color shadow-sm"
       style={{ fontSize: '0.6rem', padding: '0.35em 0.5em', minWidth: '18px', zIndex: 10 }}
      >
       {unreadCount > 9 ? '9+' : unreadCount}
      </Badge>
     )}
    </Dropdown.Toggle>
 
    <Dropdown.Menu className="mt-3 shadow-2xl border-0 p-0" style={{ width: '380px', borderRadius: '16px', overflow: 'hidden', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
     <div className="p-3 border-bottom border-color d-flex justify-content-between align-items-center bg-surface">
      <div className="d-flex align-items-center gap-2">
       <span className="fw-black x-small text-uppercase tracking-widest text-primary">Notificaciones</span>
       {unreadCount > 0 && <Badge bg="primary" className="bg-opacity-10 text-primary rounded-pill x-small px-2">{unreadCount}</Badge>}
      </div>
      {unreadCount > 0 && (
       <Button variant="link" className="p-0 text-decoration-none x-small fw-bold text-muted hover-text-primary" onClick={markAllAsRead}>
        <Check size={12} className="me-1" /> Marcar todas
       </Button>
      )}
     </div>
     
     <div style={{ maxHeight: '480px', overflowY: 'auto' }} className="custom-scrollbar bg-card">
      {notifications.length > 0 ? (
       notifications.map(n => {
        const styles = getNotificationStyles(n.title);
        return (
         <div 
          key={n.id} 
          className={`notification-item p-3 border-bottom border-color clickable d-flex gap-3 ${styles.class}`}
          onClick={() => n.link && router.push(n.link)}
         >
          <div className="mt-1">{styles.icon}</div>
          <div className="flex-grow-1">
           <div className="d-flex justify-content-between align-items-start mb-1">
            <div className="fw-black x-small text-main uppercase tracking-tight" style={{ fontSize: '11px' }}>{n.title}</div>
            <Button variant="link" className="p-0 text-muted hover-text-primary mark-read-btn" onClick={(e) => markAsRead(n.id, e)} title="Marcar como leída">
             <Check size={14} />
            </Button>
           </div>
           <div className="small text-muted mb-2 line-clamp-2" style={{ fontSize: '12px', lineHeight: '1.4' }}>{n.message}</div>
           <div className="x-small text-muted opacity-50 fw-bold d-flex align-items-center">
             <Clock size={10} className="me-1" /> Hace unos instantes
           </div>
          </div>
         </div>
        );
       })
      ) : (
       <div className="p-5 text-center text-muted bg-card">
        <div className="p-4 rounded-circle bg-surface d-inline-block mb-3">
         <BellOff size={32} className="opacity-20" />
        </div>
        <div className="x-small fw-black uppercase tracking-widest opacity-50">Sin novedades pendientes</div>
       </div>
      )}
     </div>
     
     <div className="p-2 border-top border-color text-center bg-surface">
       <Button variant="link" className="w-100 p-2 text-decoration-none x-small fw-black text-muted uppercase hover-text-primary" onClick={() => router.push('/notifications')}>
        Ver historial completo
       </Button>
     </div>
    </Dropdown.Menu>
 
    <style jsx global>{`
     .notification-item { transition: all 0.2s; position: relative; }
     .notification-item:hover { background-color: var(--bg-surface-muted); }
     .notif-security { border-start: 3px solid #ef4444 !important; }
     .notif-ticket { border-start: 3px solid var(--primary) !important; }
     
     .mark-read-btn { opacity: 0; transition: opacity 0.2s; }
     .notification-item:hover .mark-read-btn { opacity: 1; }
     
     .animate-swing { animation: swing 3s infinite; }
     @keyframes swing {
      0%, 100% { transform: rotate(0deg); }
      5%, 15% { transform: rotate(10deg); }
      10% { transform: rotate(-10deg); }
      20% { transform: rotate(0deg); }
     }
     .hover-text-primary:hover { color: var(--primary) !important; }
    `}</style>
   </Dropdown>
  );
 }   