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
 const ticketMap: Record<string, { bg: string, label: string }> = {
  'open': { bg: 'success', label: 'ABIERTO' },
  'in_progress': { bg: 'primary', label: 'EN PROCESO' },
  'pending': { bg: 'warning', label: 'PENDIENTE' },
  'resolved': { bg: 'info', label: 'RESUELTO' },
  'closed': { bg: 'secondary', label: 'CERRADO' },
 };

 // Mapping for Inventory statuses
 const inventoryMap: Record<string, { bg: string, label: string }> = {
  'operative': { bg: 'success', label: 'OPERATIVO' },
  'maintenance': { bg: 'info', label: 'MANTENIMIENTO' },
  'tagging_pending': { bg: 'warning', label: 'PEND. ETIQUETAR' },
  'decommissioned': { bg: 'danger', label: 'BAJA' },
 };

 const combinedMap = { ...ticketMap, ...inventoryMap };
 const val = combinedMap[s];

 if (val) {
  return <Badge bg={val.bg} className="bg-opacity-10 x-small text-uppercase">{val.label}</Badge>;
 }

 return <Badge bg="secondary" className="bg-opacity-10 x-small text-uppercase">{s.toUpperCase()}</Badge>;
};
