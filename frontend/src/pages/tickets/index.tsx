import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../../components/Layout';
import { Container, Card, Table, Badge, Button, Form, InputGroup, Spinner, Row, Col } from 'react-bootstrap';
import { Search, Filter, Plus, Clock, User, AlertCircle, Paperclip } from 'lucide-react';
import api from '../../lib/api';
import { useRouter } from 'next/router';

export default function TicketsPage() {
 const [tickets, setTickets] = useState<any[]>([]);
 const [groups, setGroups] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 
 // Paginación
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(20);
 const [totalPages, setTotalPages] = useState(1);
 const [totalItems, setTotalItems] = useState(0);

 const [searchTerm, setSearchTerm] = useState('');
 
 // Filters
 const [statusFilter, setStatusFilter] = useState('');
 const [priorityFilter, setPriorityFilter] = useState('');
 const [groupFilter, setGroupFilter] = useState('');

   const router = useRouter();
 
   const fetchMetadata = useCallback(async () => {
     try {
       const res = await api.get('/groups');
       setGroups(res.data);
     } catch (e) {
       console.error(e);
     }
   }, []);
 
   const fetchTickets = useCallback(async () => {
     setLoading(true);
     try {
       const res = await api.get('/tickets', {
         params: {
           page,
           size: pageSize,
           q: searchTerm,
           status: statusFilter || undefined,
           priority: priorityFilter || undefined,
           group_id: groupFilter || undefined,
         },
       });
 
       setTickets(res.data.items);
       setTotalPages(res.data.pages);
       setTotalItems(res.data.total);
     } catch (err) {
       console.error('Error fetching tickets:', err);
     } finally {
       setLoading(false);
     }
   }, [page, pageSize, searchTerm, statusFilter, priorityFilter, groupFilter]);
 
   useEffect(() => {
     fetchMetadata();
   }, [fetchMetadata]);
 
   useEffect(() => {
     fetchTickets();
   }, [fetchTickets]);
   const getStatusBadge = (status: string) => {
     const map: any = {
       open: { color: 'var(--color-danger)', label: 'ABIERTO' },
       in_progress: { color: 'var(--primary)', label: 'EN PROGRESO' },
       pending: { color: 'var(--color-warning)', label: 'PENDIENTE' },
       resolved: { color: 'var(--color-success)', label: 'RESUELTO' },
       closed: { color: 'var(--text-muted)', label: 'CERRADO' },
     };
     const s = map[status] || { color: 'var(--text-muted)', label: status.toUpperCase() };
     return (
       <Badge
         bg="transparent"
         className="text-uppercase border"
         style={{
           color: s.color,
           borderColor: `${s.color}44`,
           backgroundColor: `${s.color}11`,
           fontSize: '9px',
           fontWeight: 900,
           letterSpacing: '0.5px',
           padding: '4px 8px',
         }}
       >
         {s.label}
       </Badge>
     );
   };
 
   const getPriorityBadge = (prio: string) => {
     const map: any = {
       critical: { color: 'var(--color-danger)', label: 'CRÍTICA' },
       high: { color: 'var(--color-warning)', label: 'ALTA' },
       medium: { color: 'var(--color-info)', label: 'MEDIA' },
       low: { color: 'var(--color-success)', label: 'BAJA' },
     };
     const p = map[prio] || { color: 'var(--text-muted)', label: prio.toUpperCase() };
     return (
       <div className="d-flex align-items-center gap-2">
         <div className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: p.color, boxShadow: `0 0 5px ${p.color}66` }}></div>
         <span className="x-small fw-black uppercase tracking-wider" style={{ color: p.color, fontSize: '10px' }}>
           {p.label}
         </span>
       </div>
     );
   };
 const getSLABadge = (ticket: any) => {
  if (!ticket.sla_metric) return <span className="text-muted opacity-25">--</span>;
  
  const now = new Date();
  const deadline = new Date(ticket.sla_metric.resolution_deadline || ticket.sla_metric.response_deadline);
  const diffMs = deadline.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  let color = 'success';
  let icon = 'CheckCircle';
  
  if (diffMins < 0) { color = 'danger'; icon = 'AlertCircle'; }
  else if (diffMins < 60) { color = 'danger'; icon = 'Clock'; }
  else if (diffMins < 180) { color = 'warning'; icon = 'Clock'; }

  return (
   <div className={`d-flex align-items-center gap-1 text-${color} fw-black`} style={{ fontSize: '10px' }}>
    <Clock size={12} className={diffMins < 60 ? 'animate-pulse' : ''} />
    {diffMins < 0 ? 'VENCIDO' : `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`}
   </div>
  );
 };

 return (
  <Layout title="Gestión de Tickets">
   <Container fluid className="py-3 px-lg-4">
    <div className="d-flex justify-content-between align-items-center mb-3">
     <div>
      <h5 className="fw-black m-0 uppercase tracking-tighter text-main">CENTRO DE TICKETS</h5>
      <div className="text-muted x-small fw-bold uppercase opacity-50">Visualización de Incidentes en Tiempo Real</div>
     </div>
     <Button variant="primary" size="sm" className="fw-black x-small px-3 rounded-pill shadow-sm" onClick={() => router.push('/tickets/new')}>
       <Plus size={14} className="me-1" /> NUEVO TICKET
     </Button>
    </div>

    <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-card">
     <Card.Body className="p-0">
      {/* Search & Filter Header */}
      <div className="p-3 bg-surface border-bottom border-color">
        <Row className="g-2 align-items-center">
         <Col md={4}>
          <Form.Group controlId="ticket-search">
           <InputGroup size="sm" className="rounded-pill border border-color overflow-hidden bg-surface-muted px-2">
            <InputGroup.Text className="bg-transparent border-0 text-muted"><Search size={14} /></InputGroup.Text>
            <Form.Control 
             id="ticket-search"
             name="searchTerm"
             placeholder="Buscar..." 
             className="bg-transparent border-0 shadow-none x-small fw-bold"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
            />
           </InputGroup>
          </Form.Group>
         </Col>
         <Col md={8} className="d-flex justify-content-md-end gap-2 flex-wrap">
           <Form.Group controlId="status-filter">
            <Form.Select id="status-filter" name="status-filter" size="sm" className="w-auto rounded-pill border-color x-small fw-bold bg-surface text-muted" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
             <option value="">TODOS LOS ESTADOS</option>
             <option value="open">ABIERTOS</option>
             <option value="in_progress">EN PROGRESO</option>
             <option value="pending">PENDIENTES</option>
             <option value="resolved">RESUELTOS</option>
             <option value="closed">CERRADOS</option>
            </Form.Select>
           </Form.Group>
           <Form.Group controlId="priority-filter">
            <Form.Select id="priority-filter" name="priority-filter" size="sm" className="w-auto rounded-pill border-color x-small fw-bold bg-surface text-muted" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
             <option value="">TODAS LAS PRIORIDADES</option>
             <option value="critical">CRÍTICA</option>
             <option value="high">ALTA</option>
             <option value="medium">MEDIA</option>
             <option value="low">BAJA</option>
            </Form.Select>
           </Form.Group>
           <Form.Group controlId="group-filter">
            <Form.Select id="group-filter" name="group-filter" size="sm" className="w-auto rounded-pill border-color x-small fw-bold bg-surface text-muted" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
             <option value="">TODOS LOS GRUPOS</option>
             {groups.map(g => <option key={g.id} value={g.id}>{g.name.toUpperCase()}</option>)}
            </Form.Select>
           </Form.Group>
           <Button variant="link" size="sm" className="text-muted x-small fw-black text-decoration-none p-0 ms-2 opacity-50" onClick={() => { setStatusFilter(''); setPriorityFilter(''); setGroupFilter(''); setSearchTerm(''); }}>LIMPIAR</Button>
         </Col>
        </Row>
      </div>

      <div className="table-responsive">
       <Table hover className="align-middle m-0 compact-table">
        <thead>
         <tr className="small text-muted uppercase tracking-widest border-bottom border-color bg-surface">
          <th className="ps-4 py-3" style={{width: '120px'}}>ID</th>
          <th className="py-3" style={{width: '20%'}}>ASUNTO / TÍTULO</th>
          <th className="py-3">ESTADO</th>
          <th className="py-3">PLATAFORMA</th>
          <th className="py-3">PRIORIDAD</th>
          <th className="py-3">SLA RESTANTE</th>
          <th className="py-3" style={{width: '180px'}}>CREADOR</th>
          <th className="py-3">ASIGNACIÓN</th>
          <th className="pe-4 py-3 text-end">FECHA</th>
         </tr>
        </thead>
        <tbody>
         {tickets.map((t) => (
          <tr 
           key={t.id} 
           className="border-bottom border-color cursor-pointer transition-all" 
           onClick={() => router.push(`/tickets/${t.id}`)}
           style={{ height: '65px' }}
          >
           <td className="ps-4 py-2 font-monospace text-primary fw-black" style={{fontSize: '12px'}}>
             {t.id.split('-')[0].toUpperCase()}
           </td>
           <td className="py-2">
             <div className="d-flex align-items-center gap-2">
              <div className="fw-bold text-main" style={{ fontSize: '14px' }}>{t.title}</div>
              {t.has_attachments && (
               <Paperclip size={14} className="text-primary opacity-75" />
              )}
             </div>
             <div className="x-small text-muted opacity-75 fw-bold">{t.group?.name || 'SOPORTE'}</div>
           </td>
           <td className="py-2">{getStatusBadge(t.status)}</td>
           <td className="py-2">
             {t.platform ? (
              <Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-25 x-small fw-black">
               {t.platform.toUpperCase()}
              </Badge>
             ) : (
              <span className="text-muted opacity-50 small">MANUAL</span>
             )}
           </td>
           <td className="py-2">{getPriorityBadge(t.priority)}</td>
           <td className="py-2">{getSLABadge(t)}</td>
           <td className="py-2">
             <div className="d-flex align-items-center gap-2">
              <span className="small fw-black text-muted">{t.created_by_name}</span>
             </div>
           </td>
           <td className="py-2">
             <div className="d-flex align-items-center gap-2">
              {t.assigned_to ? (
               <>
                <div className="avatar-mini" style={{ width: 24, height: 24, fontSize: '11px' }}>{t.assigned_to.username.charAt(0).toUpperCase()}</div>
                <span className="small fw-black text-primary">{t.assigned_to.username}</span>
               </>
              ) : (
               <span className="small text-muted opacity-50 italic">Sin asignar</span>
              )}
             </div>
           </td>
           <td className="pe-4 py-2 text-end text-muted small font-monospace">
             <div>{new Date(t.created_at).toLocaleDateString()}</div>
             <div style={{ fontSize: '10px', opacity: 0.7 }}>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
           </td>
          </tr>
         ))}
         {!loading && tickets.length === 0 && (
          <tr><td colSpan={6} className="text-center py-5 text-muted small fw-bold opacity-50 uppercase">Sin tickets que coincidan</td></tr>
         )}
        </tbody>
       </Table>
      </div>
      
      {loading && (
       <div className="text-center py-5">
        <Spinner animation="border" size="sm" variant="primary" />
       </div>
      )}
     </Card.Body>
    </Card>

    {/* Pagination Footer */}
    <div className="d-flex justify-content-between align-items-center mt-4 bg-surface p-3 rounded-4 shadow-sm border border-color">
      <div className="d-flex align-items-center gap-3">
        <span className="x-small fw-black text-muted text-uppercase">Mostrar</span>
        <Form.Group controlId="page-size-selector">
         <Form.Select 
          id="page-size-selector"
          name="pageSize"
          size="sm" 
          className="rounded-pill border-0 bg-surface-muted px-3 fw-bold" 
          style={{width: '80px'}}
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
         >
           <option value={20}>20</option>
           <option value={50}>50</option>
           <option value={100}>100</option>
         </Form.Select>
        </Form.Group>
        <span className="x-small text-muted fw-bold">Total: {totalItems}</span>
      </div>
      <div className="d-flex gap-2">
        <Button variant="surface-muted" size="sm" className="rounded-pill px-3 x-small fw-black border-color shadow-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>ANTERIOR</Button>
        <div className="d-flex align-items-center px-3 bg-primary bg-opacity-10 text-primary rounded-pill x-small fw-black">PÁGINA {page} DE {totalPages}</div>
        <Button variant="surface-muted" size="sm" className="rounded-pill px-3 x-small fw-black border-color shadow-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>SIGUIENTE</Button>
      </div>
    </div>
   </Container>

   <style jsx global>{`
    .x-small { font-size: 10px; }
    .fw-black { font-weight: 900; }
    .compact-table tbody tr:hover { background-color: var(--bg-surface-muted) !important; }
    .avatar-mini { 
     width: 18px; 
     height: 18px; 
     min-width: 18px;
     min-height: 18px;
     flex-shrink: 0;
     background: var(--primary-muted); 
     color: var(--primary); 
     border-radius: 4px; 
     display: flex; 
     align-items: center; 
     justify-content: center; 
     font-size: 9px; 
     font-weight: 900; 
    }
    .border-color { border-color: var(--border-subtle) !important; }
   `}</style>
  </Layout>
 );
}
