import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { Container, Card, Table, Badge, Button, Form, InputGroup, Spinner, Row, Col } from 'react-bootstrap';
import { Search, Filter, Plus, Clock, User, AlertCircle, Paperclip, ChevronUp, ChevronDown, Globe } from 'lucide-react';
import api from '../../lib/api';
import { useRouter } from 'next/router';
import { UserAvatar } from '../../components/UserAvatar';

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
  const [platformFilter, setPlatformFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewTab, setViewTab] = useState<'all' | 'mine' | 'assigned'>('all');
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);

  // Sorting
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const router = useRouter();

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const fetchMetadata = useCallback(async () => {
    try {
      const [groupsRes, typesRes] = await Promise.all([
        api.get('/groups'),
        api.get('/ticket-types')
      ]);
      setGroups(groupsRes.data);
      setTicketTypes(typesRes.data);
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
          platform: platformFilter || undefined,
          type_id: typeFilter || undefined,
          created_by_me: viewTab === 'mine' ? true : undefined,
          assigned_to_me: viewTab === 'assigned' ? true : undefined,
          sort_by: sortField,
          order: sortOrder
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
  }, [page, pageSize, searchTerm, statusFilter, priorityFilter, groupFilter, platformFilter, typeFilter, viewTab, sortField, sortOrder]);

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
    const map: any = {
      critical: { class: 'prio-critical', label: 'CRÍTICA' },
      high: { class: 'prio-high', label: 'ALTA' },
      medium: { class: 'prio-medium', label: 'MEDIA' },
      low: { class: 'prio-low', label: 'BAJA' },
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

  const getGroupBadge = (ticket: any) => {
    if (ticket.is_global) {
      return (
        <Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-50 x-small fw-black uppercase px-2 py-1 shadow-sm" style={{ fontSize: '9px' }}>
          <Globe size={10} className="me-1" /> GLOBAL
        </Badge>
      );
    }
    if (!ticket.group) return <Badge bg="secondary" className="bg-opacity-10 text-muted border x-small fw-black px-2 py-1">SOPORTE</Badge>;
    return (
      <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-50 x-small fw-black uppercase px-2 py-1 shadow-sm" style={{ fontSize: '9px' }}>
        {ticket.group.name}
      </Badge>
    );
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

        {/* View Selection Tabs */}
        <div className="d-flex bg-surface-muted p-1 rounded-pill mb-4 gap-1 border border-color shadow-inner" style={{ width: 'fit-content' }}>
          <Button 
            variant={viewTab === 'all' ? 'primary' : 'link'} 
            size="sm" 
            onClick={() => { setViewTab('all'); setPage(1); }} 
            className={`rounded-pill px-4 x-small fw-black text-decoration-none ${viewTab !== 'all' ? 'text-muted' : 'text-white'}`}
          >
            TODOS LOS TICKETS
          </Button>
          <Button 
            variant={viewTab === 'mine' ? 'primary' : 'link'} 
            size="sm" 
            onClick={() => { setViewTab('mine'); setPage(1); }} 
            className={`rounded-pill px-4 x-small fw-black text-decoration-none ${viewTab !== 'mine' ? 'text-muted' : 'text-white'}`}
          >
            CREADOS POR MÍ
          </Button>
          <Button 
            variant={viewTab === 'assigned' ? 'primary' : 'link'} 
            size="sm" 
            onClick={() => { setViewTab('assigned'); setPage(1); }} 
            className={`rounded-pill px-4 x-small fw-black text-decoration-none ${viewTab !== 'assigned' ? 'text-muted' : 'text-white'}`}
          >
            ASIGNADOS A MÍ
          </Button>
        </div>

        {/* Filters Card */}
        <Card className="border-0 shadow-sm mb-4 bg-card rounded-4">
          <Card.Body className="p-3">
            <Row className="g-3">
              <Col lg={12}>
                <InputGroup className="bg-surface-muted rounded-pill border-0 overflow-hidden shadow-inner">
                  <InputGroup.Text className="bg-transparent border-0 pe-0 text-muted">
                    <Search size={18} />
                  </InputGroup.Text>
                  <Form.Control 
                    placeholder="Búsqueda global por asunto, descripción o ID..."
                    className="bg-transparent border-0 py-2 fw-medium shadow-none"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  />
                </InputGroup>
              </Col>
              
              <Col sm={6} lg={2}>
                <Form.Select 
                  size="sm"
                  className="bg-surface-muted border-0 py-2 fw-bold text-main small shadow-none rounded-pill px-3"
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
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
                  size="sm"
                  className="bg-surface-muted border-0 py-2 fw-bold text-main small shadow-none rounded-pill px-3"
                  value={priorityFilter}
                  onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
                >
                  <option value="">TODAS LAS PRIORIDADES</option>
                  <option value="critical">CRÍTICA</option>
                  <option value="high">ALTA</option>
                  <option value="medium">MEDIA</option>
                  <option value="low">BAJA</option>
                </Form.Select>
              </Col>

              <Col sm={6} lg={3}>
                <Form.Select 
                  size="sm"
                  className="bg-surface-muted border-0 py-2 fw-bold text-main small shadow-none rounded-pill px-3"
                  value={groupFilter}
                  onChange={e => { setGroupFilter(e.target.value); setPage(1); }}
                >
                  <option value="">TODOS LOS GRUPOS</option>
                  {groups.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name.toUpperCase()}</option>
                  ))}
                </Form.Select>
              </Col>

              <Col sm={6} lg={2}>
                <Form.Select 
                  size="sm"
                  className="bg-surface-muted border-0 py-2 fw-bold text-main small shadow-none rounded-pill px-3"
                  value={typeFilter}
                  onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                >
                  <option value="">TODOS LOS TIPOS</option>
                  {ticketTypes.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>
                  ))}
                </Form.Select>
              </Col>

              <Col sm={6} lg={3}>
                <Form.Select 
                  size="sm"
                  className="bg-surface-muted border-0 py-2 fw-bold text-main small shadow-none rounded-pill px-3"
                  value={platformFilter}
                  onChange={e => { setPlatformFilter(e.target.value); setPage(1); }}
                >
                  <option value="">TODAS LAS PLATAFORMAS</option>
                  <option value="GENERAL">GENERAL</option>
                  <option value="INTERNO">INTERNO</option>
                  <option value="Forti-EMS">FORTI-EMS</option>
                  <option value="Forti-EDR">FORTI-EDR</option>
                  <option value="ESET CLOUD">ESET CLOUD</option>
                  <option value="ESET BIENESTAR">ESET BIENESTAR</option>
                  <option value="Forti-SIEM">FORTI-SIEM</option>
                  <option value="Forti-ANALYZER">FORTI-ANALYZER</option>
                  <option value="GDE">GDE</option>
                  <option value="OTRO">OTRO</option>
                </Form.Select>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Tickets Table */}
        <Card className="border-0 shadow-sm overflow-hidden bg-card rounded-4">
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="align-middle m-0 ticket-table border-0">
                <thead>
                  <tr className="bg-surface-muted">
                    <th className="ps-4 border-0 sortable-header" onClick={() => handleSort('id')}>
                      ID {sortField === 'id' && (sortOrder === 'asc' ? <ChevronUp size={14} className="sort-icon active" /> : <ChevronDown size={14} className="sort-icon active" />)}
                    </th>
                    <th className="border-0 sortable-header" onClick={() => handleSort('title')}>
                      ASUNTO / TÍTULO {sortField === 'title' && (sortOrder === 'asc' ? <ChevronUp size={14} className="sort-icon active" /> : <ChevronDown size={14} className="sort-icon active" />)}
                    </th>
                    <th className="border-0 sortable-header" onClick={() => handleSort('status')}>
                      ESTADO {sortField === 'status' && (sortOrder === 'asc' ? <ChevronUp size={14} className="sort-icon active" /> : <ChevronDown size={14} className="sort-icon active" />)}
                    </th>
                    <th className="border-0 sortable-header" onClick={() => handleSort('platform')}>
                      PLATAFORMA {sortField === 'platform' && (sortOrder === 'asc' ? <ChevronUp size={14} className="sort-icon active" /> : <ChevronDown size={14} className="sort-icon active" />)}
                    </th>
                    <th className="border-0 sortable-header" onClick={() => handleSort('type_id')}>
                      TIPO {sortField === 'type_id' && (sortOrder === 'asc' ? <ChevronUp size={14} className="sort-icon active" /> : <ChevronDown size={14} className="sort-icon active" />)}
                    </th>
                    <th className="border-0 sortable-header" onClick={() => handleSort('priority')}>
                      PRIORIDAD {sortField === 'priority' && (sortOrder === 'asc' ? <ChevronUp size={14} className="sort-icon active" /> : <ChevronDown size={14} className="sort-icon active" />)}
                    </th>
                    <th className="border-0 sortable-header" onClick={() => handleSort('group')}>
                      GRUPO {sortField === 'group' && (sortOrder === 'asc' ? <ChevronUp size={14} className="sort-icon active" /> : <ChevronDown size={14} className="sort-icon active" />)}
                    </th>
                    <th className="border-0">SLA</th>
                    <th className="border-0">CREADOR</th>
                    <th className="border-0">ASIGNACIÓN</th>
                    <th className="pe-4 text-end border-0 sortable-header" onClick={() => handleSort('created_at')}>
                      FECHA {sortField === 'created_at' && (sortOrder === 'asc' ? <ChevronUp size={14} className="sort-icon active" /> : <ChevronDown size={14} className="sort-icon active" />)}
                    </th>
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
                        <div className="d-flex align-items-center gap-2 mb-1">
                          {t.attachments && t.attachments.length > 0 && (
                            <Paperclip size={16} className="text-warning fw-bold" style={{ flexShrink: 0 }} title={`${t.attachments.length} adjuntos`} />
                          )}
                          <div className="ticket-title text-main">{t.title}</div>
                        </div>
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
                      <td>
                        <Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-25 x-small fw-black uppercase px-2 py-1">
                          {t.ticket_type_name || 'General'}
                        </Badge>
                      </td>
                      <td>{getPriorityBadge(t.priority)}</td>
                      <td>{getGroupBadge(t)}</td>
                      <td>{getSLABadge(t)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <UserAvatar 
                            user={t.created_by || { username: t.created_by_name }} 
                            size={24} 
                            fontSize="10px" 
                          />
                          <span className="creator-name text-main small fw-medium">{t.created_by_name || 'Sistema'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {t.assigned_to ? (
                            <>
                              <UserAvatar user={t.assigned_to} size={24} fontSize="10px" />
                              <span className="assignee-name text-main small fw-medium">{t.assigned_to.username}</span>
                            </>
                          ) : (
                            <span className="unassigned-text text-muted x-small italic">Sin asignar</span>
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
