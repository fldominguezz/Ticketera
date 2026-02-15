import React from 'react';
import { Badge } from 'react-bootstrap';

/**
 * Returns a Badge component based on the status string.
 * Supports both Alert/Ticket statuses and Inventory statuses.
 */
export const getStatusBadge = (status: string | null | undefined) => {
 if (!status) {
  return <Badge bg="secondary" className="bg-opacity-10 x-small text-uppercase">SIN ESTADO</Badge>;
 }

 const s = status.toLowerCase();
 
 // Mapping for Ticket/Alert statuses
 const ticketMap: Record<string, { className: string, label: string }> = {
  'open': { className: 'status-open', label: 'ABIERTO' },
  'in_progress': { className: 'status-progress', label: 'EN PROCESO' },
  'pending': { className: 'status-pending', label: 'PENDIENTE' },
  'resolved': { className: 'status-resolved', label: 'RESUELTO' },
  'closed': { className: 'status-closed', label: 'CERRADO' },
 };

 // Mapping for Inventory statuses
 const inventoryMap: Record<string, { className: string, label: string }> = {
  'operative': { className: 'status-operative', label: 'OPERATIVO' },
  'maintenance': { className: 'status-maintenance', label: 'MANTENIMIENTO' },
  'tagging_pending': { className: 'status-tagging', label: 'PEND. ETIQUETAR' },
  'decommissioned': { className: 'status-decommissioned', label: 'BAJA' },
 };

 const combinedMap = { ...ticketMap, ...inventoryMap };
 const val = combinedMap[s];

 if (val) {
  return <Badge bg="transparent" className={`ticket-status-badge ${val.className}`}>{val.label}</Badge>;
 }

 return <Badge bg="transparent" className="ticket-status-badge status-closed">{s.toUpperCase()}</Badge>;
};
