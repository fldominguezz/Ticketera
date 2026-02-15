import React, { useState, useEffect, useCallback } from 'react';
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
      open: { label: 'ABIERTO', class: 'status-open' },
      in_progress: { label: 'EN PROGRESO', class: 'status-progress' },
      pending: { label: 'PENDIENTE', class: 'status-pending' },
      resolved: { label: 'RESUELTO', class: 'status-resolved' },
      closed: { label: 'CERRADO', class: 'status-closed' },
    };
    const s = map[status] || { label: status.toUpperCase(), class: '' };
    return (
      <Badge bg="transparent" className={`ticket-status-badge ${s.class}`}>
        {s.label}
      </Badge>
    );
  };

  const getPriorityBadge = (prio: string) => {
    const pStr = String(prio || '').toLowerCase();
    
    // Mapeo flexible para SOC
    const map: any = {
      critical: { class: 'prio-critical', label: 'CRÍTICA' },
      critica: { class: 'prio-critical', label: 'CRÍTICA' },
      high: { class: 'prio-high', label: 'ALTA' },
      alta: { class: 'prio-high', label: 'ALTA' },
      medium: { class: 'prio-medium', label: 'MEDIA' },
      media: { class: 'prio-medium', label: 'MEDIA' },
      normal: { class: 'prio-medium', label: 'MEDIA' },
      low: { class: 'prio-low', label: 'BAJA' },
      baja: { class: 'prio-low', label: 'BAJA' },
    };
    
    const p = map[pStr] || { class: 'prio-low', label: pStr.toUpperCase() };
    return (
      <div className={`priority-indicator ${p.class}`}>
        <div className="dot"></div>
        <span className="label">{p.label}</span>
      </div>
    );
  };

  const getSLABadge = (ticket: any) => {
    if (ticket.status === 'closed' || ticket.status === 'resolved') return <span className="text-muted opacity-25">--</span>;
    return <div className="text-primary fw-bold small d-flex align-items-center"><Clock size={12} className="me-1 opacity-75" /> {ticket.sla_remaining || 'N/A'}</div>;
  };

  return (
    <Layout title="Gestión de Tickets">
      <Container fluid className="px-0">
        {/* Header Section */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h4 className="fw-black text-uppercase m-0 d-flex align-items-center gap-2 text-main">
              Tickets de Seguridad
            </h4>
            <p className="text-muted-foreground small m-0 text-uppercase tracking-widest fw-bold opacity-75">Administración y seguimiento de incidencias</p>
          </div>
          <Button 
            variant="primary" 
            className="d-flex align-items-center gap-2 shadow-sm py-2 px-4 border-0 rounded-pill"
            onClick={() => router.push('/tickets/new')}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span className="fw-bold x-small uppercase">Nuevo Ticket</span>
          </Button>
        </div>

        {/* Filters Card */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-3">
            <Row className="g-3">
              <Col lg={4}>
                <InputGroup className="bg-surface-muted rounded-3 border-0 overflow-hidden">
                  <InputGroup.Text className="bg-transparent border-0 pe-0 text-muted">
                    <Search size={18} />
                  </InputGroup.Text>
                  <Form.Control 
                    placeholder="Buscar por ID, título o descripción..."
                    className="bg-transparent border-0 py-2 fw-medium shadow-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Col>
              <Col sm={6} lg={2}>
                <Form.Select 
                  className="bg-surface-muted border-0 py-2 fw-bold text-main small shadow-none"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="">TODOS LOS ESTADOS</option>
                  <option value="open">ABIERTO</option>
                  <option value="in_progress">EN PROGRESO</option>
                  <option value="pending">PENDIENTE</option>
                  <option value="resolved">RESUELTO</option>
                  <option value="closed">CERRADO</option>
                </Form.Select>
              </Col>
              <Col sm={6} lg={2}>
                <Form.Select 
                  className="bg-surface-muted border-0 py-2 fw-bold text-main small shadow-none"
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                >
                  <option value="">TODAS LAS PRIORIDADES</option>
                  <option value="critical">CRÍTICA</option>
                  <option value="high">ALTA</option>
                  <option value="medium">MEDIA</option>
                  <option value="low">BAJA</option>
                </Form.Select>
              </Col>
              <Col sm={12} lg={4}>
                <Form.Select 
                  className="bg-surface-muted border-0 py-2 fw-bold text-main small shadow-none"
                  value={groupFilter}
                  onChange={e => setGroupFilter(e.target.value)}
                >
                  <option value="">TODOS LOS GRUPOS</option>
                  {groups.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name.toUpperCase()}</option>
                  ))}
                </Form.Select>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Tickets Table */}
        <Card className="border-0 shadow-sm overflow-hidden bg-card">
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="align-middle m-0 ticket-table border-0">
                <thead>
                  <tr className="bg-surface-muted">
                    <th className="ps-4 border-0">ID</th>
                    <th className="border-0">ASUNTO / TÍTULO</th>
                    <th className="border-0">ESTADO</th>
                    <th className="border-0">PLATAFORMA</th>
                    <th className="border-0">PRIORIDAD</th>
                    <th className="border-0">SLA</th>
                    <th className="border-0">CREADOR</th>
                    <th className="border-0">ASIGNACIÓN</th>
                    <th className="pe-4 text-end border-0">FECHA</th>
                  </tr>
                </thead>
                <tbody className="border-0">
                  {tickets.map((t) => (
                    <tr 
                      key={t.id} 
                      className="ticket-row border-bottom border-subtle" 
                      onClick={() => router.push(`/tickets/${t.id}`)}
                    >
                      <td className="ps-4 ticket-id-cell font-monospace">
                        {t.id.split('-')[0].toUpperCase()}
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="ticket-title text-main">{t.title}</div>
                          {t.has_attachments && (
                            <Paperclip size={14} className="text-primary opacity-50" />
                          )}
                        </div>
                        <div className="ticket-group">{t.group?.name || 'SOPORTE'}</div>
                      </td>
                      <td>{getStatusBadge(t.status)}</td>
                      <td>
                        {t.platform ? (
                          <div className="platform-pill">
                            {t.platform.toUpperCase()}
                          </div>
                        ) : (
                          <span className="text-muted opacity-50 small fw-bold">MANUAL</span>
                        )}
                      </td>
                      <td>{getPriorityBadge(t.priority)}</td>
                      <td>{getSLABadge(t)}</td>
                      <td>
                        <span className="creator-name text-main">{t.created_by_name}</span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {t.assigned_to ? (
                            <>
                              <div className="avatar-mini">{t.assigned_to.username.charAt(0).toUpperCase()}</div>
                              <span className="assignee-name text-main">{t.assigned_to.username}</span>
                            </>
                          ) : (
                            <span className="unassigned-text text-muted">Sin asignar</span>
                          )}
                        </div>
                      </td>
                      <td className="pe-4 text-end ticket-date">
                        <div className="date fw-bold">{new Date(t.created_at).toLocaleDateString()}</div>
                        <div className="time">{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                    </tr>
                  ))}
                  {!loading && tickets.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-5 no-results text-muted">
                        Sin tickets que coincidan
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
            
            {loading && (
              <div className="text-center py-5 bg-card">
                <Spinner animation="border" size="sm" variant="primary" />
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Pagination Footer */}
        <div className="pagination-container mt-4">
          <div className="d-flex align-items-center gap-3">
            <span className="label text-muted small fw-bold">MOSTRAR</span>
            <Form.Select 
              size="sm" 
              className="page-size-select bg-muted text-main border-0 shadow-none" 
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </Form.Select>
            <span className="total-count text-muted small fw-medium">Total: {totalItems}</span>
          </div>
          <div className="d-flex gap-2 pagination-controls">
            <Button 
              variant="outline-secondary" 
              size="sm" 
              className="rounded-pill px-3 fw-bold border-0 bg-muted text-muted hover:bg-primary hover:text-white" 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
            >
              ANTERIOR
            </Button>
            <div className="page-indicator small fw-bold text-primary bg-primary-muted px-3 py-1 rounded-pill">PÁGINA {page} DE {totalPages}</div>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              className="rounded-pill px-3 fw-bold border-0 bg-muted text-muted hover:bg-primary hover:text-white" 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
            >
              SIGUIENTE
            </Button>
          </div>
        </div>
      </Container>
    </Layout>
  );
}
