import React, { useState, useEffect } from 'react';
import { Card, Badge } from 'react-bootstrap';
import { Activity, User, Tag, Clock, ArrowRight } from 'lucide-react';
import api from '../../lib/api';

interface PulseEvent {
 id: string;
 event_type: string;
 details: any;
 created_at: string;
 user_name?: string;
}

export const PulseFeed: React.FC = () => {
 const [events, setEvents] = useState<PulseEvent[]>([]);
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
  setMounted(true);
  // Cargar iniciales
  api.get('/admin/audit-logs?limit=10').then(res => setEvents(res.data));

  // Aquí iría la conexión al WebSocket para recibir los nuevos en tiempo real
  // manager.subscribe('audit_logs', (newEvent) => setEvents(prev => [newEvent, ...prev].slice(0, 10)));
 }, []);

 if (!mounted) return null;

 const getEventIcon = (type: string) => {
  if (type.includes('ticket')) return <Tag size={12} className="text-primary" />;
  if (type.includes('user')) return <User size={12} className="text-success" />;
  return <Activity size={12} className="text-warning" />;
 };

 return (
  <Card className="bg-black bg-opacity-40 border-0 shadow-lg h-100 overflow-hidden">
   <div className="p-3 bg-primary bg-opacity-10 border-bottom border-opacity-5 d-flex justify-content-between align-items-center">
    <span className="x-small fw-black text-primary uppercase tracking-widest d-flex align-items-center">
     <Activity size={14} className="me-2 animate-pulse" /> SISTEMA PULSE
    </span>
    <Badge bg="success" className="bg-opacity-25 text-success x-small" style={{fontSize: '8px'}}>REAL-TIME</Badge>
   </div>
   <Card.Body className="p-0 overflow-auto" style={{ maxHeight: '400px' }}>
    {events.map((ev, i) => (
     <div key={ev.id || i} className="p-3 border-bottom border-opacity-5 hover- transition-all">
      <div className="d-flex justify-content-between mb-1">
       <div className="d-flex align-items-center gap-2">
        {getEventIcon(ev.event_type)}
        <span className="x-small fw-black uppercase" style={{fontSize: '9px'}}>
          {ev.event_type.replace('_', ' ')}
        </span>
       </div>
       <span className="x-small text-muted fw-bold" style={{fontSize: '8px'}}>
         {new Date(ev.created_at).toLocaleTimeString()}
       </span>
      </div>
      <div className="ps-4">
        <p className="text-muted m-0" style={{fontSize: '11px', lineHeight: '1.2'}}>
         {ev.details?.title || ev.details?.username || 'Acción del sistema registrada'}
        </p>
        <div className="d-flex align-items-center gap-1 mt-1">
         <User size={10} className="text-primary opacity-50" />
         <span className="x-small text-primary opacity-75 fw-bold uppercase">USUARIO SISTEMA</span>
        </div>
      </div>
     </div>
    ))}
   </Card.Body>
   <style jsx>{`
    .hover-:hover { background: rgba(255,255,255,0.03); }
    .transition-all { transition: all 0.2s ease; }
    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
   `}</style>
  </Card>
 );
};
