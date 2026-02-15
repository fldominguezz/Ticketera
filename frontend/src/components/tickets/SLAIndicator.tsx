import React, { useState, useEffect } from 'react';
import { Badge, ProgressBar } from 'react-bootstrap';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SLAProps {
 deadline: string;
 completedAt?: string | null;
 label: string;
}

export const SLAIndicator: React.FC<SLAProps> = ({ deadline, completedAt, label }) => {
 const [timeLeft, setTimeLeft] = useState<string>('');
 const [percentage, setPercentage] = useState<number>(0);
 const [status, setStatus] = useState<'normal' | 'warning' | 'danger' | 'success'>('normal');

 useEffect(() => {
  const calculate = () => {
   if (completedAt) {
    setTimeLeft('COMPLETADO');
    setStatus('success');
    setPercentage(100);
    return;
   }

   const now = new Date();
   const end = new Date(deadline);
   const diff = end.getTime() - now.getTime();

   if (diff <= 0) {
    setTimeLeft('VENCIDO');
    setStatus('danger');
    setPercentage(100);
    return;
   }

   // Cálculo de tiempo legible
   const hours = Math.floor(diff / (1000 * 60 * 60));
   const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
   
   if (hours > 0) setTimeLeft(`${hours}h ${mins}m`);
   else setTimeLeft(`${mins}m`);

   // Color según urgencia (ej. < 1h es warning)
   if (hours === 0 && mins < 60) setStatus('warning');
   if (hours === 0 && mins < 15) setStatus('danger');

   // Un porcentaje simplificado (asumiendo base de 8h para visualización)
   const baseMinutes = 8 * 60;
   const currentMins = (hours * 60) + mins;
   const p = Math.max(0, Math.min(100, (currentMins / baseMinutes) * 100));
   setPercentage(100 - p);
  };

  calculate();
  const timer = setInterval(calculate, 60000); // Actualizar cada minuto
  return () => clearInterval(timer);
 }, [deadline, completedAt]);

 const colorMap = {
  normal: 'primary',
  warning: 'warning',
  danger: 'danger',
  success: 'success'
 };

 return (
  <div className="sla-indicator mb-3 p-2 rounded border border-subtle bg-surface-muted shadow-sm">
   <div className="d-flex justify-content-between align-items-center mb-1">
    <div className="d-flex align-items-center gap-2">
     {status === 'success' ? <CheckCircle2 size={12} className="text-success" /> : 
      status === 'danger' ? <AlertTriangle size={12} className="text-danger" /> : 
      <Clock size={12} className="text-muted" />}
     <span className="x-small fw-black text-muted uppercase tracking-tighter">{label}</span>
    </div>
    <Badge bg="transparent" className={`sla-status-badge status-${status} x-small`}>
     {timeLeft}
    </Badge>
   </div>
   <ProgressBar 
    variant={colorMap[status]} 
    now={percentage} 
    style={{ height: '3px', backgroundColor: 'var(--border-subtle)' }} 
    className="overflow-hidden rounded-pill"
   />
   <style jsx>{`
    .x-small { font-size: 9px; }
    .fw-black { font-weight: 900; }
    .sla-status-badge {
      font-weight: 800;
      border: 1px solid currentColor !important;
      padding: 3px 6px;
    }
    .status-normal { color: var(--primary); background: var(--primary-muted) !important; }
    .status-warning { color: var(--color-warning); background: color-mix(in srgb, var(--color-warning), transparent 90%) !important; }
    .status-danger { color: var(--color-danger); background: var(--primary-muted) !important; background-color: color-mix(in srgb, var(--color-danger), transparent 90%) !important; }
    .status-success { color: var(--color-success, #10b981); background: color-mix(in srgb, var(--color-success, #10b981), transparent 90%) !important; }
   `}</style>
  </div>
 );
};
