import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { Container, Card, Button, Badge, Spinner, Row, Col } from 'react-bootstrap';
import { Bell, Trash2, Check, Clock, ShieldAlert, Activity, ArrowLeft, BellOff } from 'lucide-react';
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

export default function NotificationsPage() {
 const router = useRouter();
 const [notifications, setNotifications] = useState<Notification[]>([]);
 const [loading, setLoading] = useState(true);

 const fetchNotifications = useCallback(async () => {
  setLoading(true);
  try {
   const res = await api.get('/notifications/me?limit=100');
   setNotifications(Array.isArray(res.data) ? res.data : []);
  } catch (e) {
   console.error(e);
  } finally {
   setLoading(false);
  }
 }, []);

 useEffect(() => {
  fetchNotifications();
 }, [fetchNotifications]);

 const markAsRead = async (id: string) => {
  try {
   await api.patch(`/notifications/${id}/read`);
   setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  } catch (e) { console.error(e); }
 };

 const markAllAsRead = async () => {
  try {
   await api.post('/notifications/read-all');
   setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  } catch (e) { console.error(e); }
 };

 const clearRead = async () => {
  try {
   await api.delete('/notifications/clear-read');
   setNotifications(prev => prev.filter(n => !n.is_read));
  } catch (e) { console.error(e); }
 };

 const deleteAll = async () => {
  if (!confirm('¿Estás seguro de que deseas eliminar todas las notificaciones?')) return;
  try {
   await api.delete('/notifications/delete-all');
   setNotifications([]);
  } catch (e) { console.error(e); }
 };

 const getNotificationStyles = (title: string) => {
  const t = (title || '').toLowerCase();
  if (t.includes('alerta') || t.includes('siem') || t.includes('security')) {
   return { icon: <ShieldAlert size={20} className="text-danger" />, class: 'notif-security' };
  }
  if (t.includes('ticket') || t.includes('asignado')) {
   return { icon: <Activity size={20} className="text-primary" />, class: 'notif-ticket' };
  }
  return { icon: <Bell size={18} className="text-muted" />, class: '' };
 };

 return (
  <Layout title="Centro de Notificaciones">
   <Container fluid className="py-4">
    <div className="d-flex justify-content-between align-items-center mb-4">
     <div>
      <Button variant="link" className="p-0 text-muted text-decoration-none d-flex align-items-center gap-2 mb-2" onClick={() => router.back()}>
       <ArrowLeft size={16} /> Volver
      </Button>
      <h4 className="fw-black m-0 uppercase tracking-tighter d-flex align-items-center gap-3">
       <Bell className="text-primary" size={24} /> HISTORIAL DE NOTIFICACIONES
      </h4>
     </div>
     <div className="d-flex gap-2">
      <Button variant="outline-muted" size="sm" className="fw-bold x-small uppercase px-3 rounded-pill border" onClick={markAllAsRead}>
       <Check size={14} className="me-2" /> Marcar todas leídas
      </Button>
      <Button variant="outline-danger" size="sm" className="fw-bold x-small uppercase px-3 rounded-pill" onClick={clearRead}>
       <Trash2 size={14} className="me-2" /> Limpiar leídas
      </Button>
      <Button variant="danger" size="sm" className="fw-bold x-small uppercase px-3 rounded-pill border-0" onClick={deleteAll}>
       Eliminar Todo
      </Button>
     </div>
    </div>

    <Card className="border-0 shadow-2xl rounded-xl overflow-hidden bg-card">
     {loading ? (
      <div className="text-center py-5">
       <Spinner animation="border" variant="primary" />
       <div className="mt-3 x-small fw-black text-muted uppercase tracking-widest">Sincronizando novedades...</div>
      </div>
     ) : notifications.length > 0 ? (
      <div className="divide-y border-color">
       {notifications.map(n => {
        const styles = getNotificationStyles(n.title);
        return (
         <div 
          key={n.id} 
          className={`p-4 d-flex gap-4 align-items-start transition-all notification-row ${!n.is_read ? 'bg-surface-muted bg-opacity-25' : ''} ${styles.class}`}
          style={{ borderLeft: '4px solid transparent' }}
         >
          <div className="p-3 bg-surface rounded-4 shadow-sm">
           {styles.icon}
          </div>
          <div className="flex-grow-1">
           <div className="d-flex justify-content-between align-items-start">
            <div>
             <div className="d-flex align-items-center gap-2 mb-1">
              <h6 className="fw-black m-0 text-uppercase tracking-tight" style={{ fontSize: '14px' }}>{n.title}</h6>
              {!n.is_read && <Badge bg="primary" pill className="x-tiny">NUEVO</Badge>}
             </div>
             <div className="text-muted small mb-3" style={{ maxWidth: '800px', lineHeight: '1.5' }}>{n.message}</div>
            </div>
            <div className="text-end">
             <div className="x-small text-muted fw-bold mb-2 opacity-50 d-flex align-items-center justify-content-end">
              <Clock size={12} className="me-1" /> {new Date(n.created_at).toLocaleString()}
             </div>
             <div className="d-flex gap-2 justify-content-end">
              {!n.is_read && (
               <Button variant="outline-primary" size="sm" className="rounded-pill x-small fw-black px-3" onClick={() => markAsRead(n.id)}>
                MARCAR LEÍDA
               </Button>
              )}
              {n.link && (
               <Button variant="primary" size="sm" className="rounded-pill x-small fw-black px-4" onClick={() => router.push(n.link)}>
                VER DETALLE
               </Button>
              )}
             </div>
            </div>
           </div>
          </div>
         </div>
        );
       })}
      </div>
     ) : (
      <div className="py-5 text-center">
       <div className="p-5 rounded-circle bg-surface d-inline-block mb-4 shadow-inner">
        <BellOff size={64} className="opacity-10" />
       </div>
       <h5 className="fw-black text-muted uppercase opacity-50">No hay notificaciones registradas</h5>
       <p className="text-muted small">Tu bandeja de entrada está limpia por ahora.</p>
      </div>
     )}
    </Card>
   </Container>

   <style jsx global>{`
    .notification-row { border-bottom: 1px solid var(--border-border); position: relative; }
    .notification-row:hover { background-color: var(--bg-surface-muted) !important; }
    .notif-security { border-left-color: #ef4444 !important; }
    .notif-ticket { border-left-color: var(--primary) !important; }
    .x-tiny { font-size: 9px; padding: 0.3em 0.6em; }
    .divide-y > * + * { border-top: 1px solid var(--border-border); }
   `}</style>
  </Layout>
 );
}
