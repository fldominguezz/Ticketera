import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Container, Table, Button, Badge, Card, Form, Spinner, Dropdown } from 'react-bootstrap';
import { Plus, Search, LayoutGrid, Clock, AlertCircle, CheckSquare, Square, UserPlus, Tag } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function TicketsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) return;
      
      const res = await fetch('/api/v1/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleBulkUpdate = async (updateData: any) => {
    if (selectedTickets.length === 0) return;
    setBulkActionLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/tickets/bulk-update', {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticket_ids: selectedTickets,
          ...updateData
        })
      });
      if (res.ok) {
        setSelectedTickets([]);
        fetchTickets();
      }
    } catch (e) { console.error(e); }
    finally { setBulkActionLoading(false); }
  };

  const toggleSelectTicket = (id: string) => {
    setSelectedTickets(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!Array.isArray(tickets)) return;
    if (selectedTickets.length === tickets.length) setSelectedTickets([]);
    else setSelectedTickets(tickets.map(ticket => ticket.id));
  };

  const getStatusBadge = (status: string) => {
    const s = status || 'open';
    const colors: any = { 'open': 'success', 'in_progress': 'primary', 'pending': 'warning', 'resolved': 'info', 'closed': 'secondary' };
    return <Badge bg={colors[s] || 'secondary'} className="text-uppercase small">{t(`status_${s}`)}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const p = priority || 'medium';
    const colors: any = { 'low': 'info', 'medium': 'warning', 'high': 'danger', 'critical': 'danger' };
    return <Badge bg={colors[p] || 'light'} text={p === 'critical' || p === 'high' ? 'white' : 'dark'} className="border">
      {(t(`priority_${p}`) || p).toUpperCase()}
    </Badge>;
  };

  const filteredTickets = Array.isArray(tickets) ? tickets.filter(ticket => 
    ticket && ((ticket.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ticket.id || '').toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  if (!mounted) return null;

  return (
    <Layout title={t('tickets') || 'Tickets'}>
      <Container fluid className="px-0">
        {selectedTickets.length > 0 && (
          <div className="bg-dark text-white p-3 rounded mb-4 d-flex justify-content-between align-items-center shadow-lg sticky-top" style={{top: '80px', zIndex: 900}}>
            <div className="d-flex align-items-center">
              <CheckSquare size={20} className="text-primary me-3" />
              <span className="fw-bold">{selectedTickets.length} seleccionados</span>
            </div>
            <div className="d-flex gap-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-light" size="sm" className="d-flex align-items-center" disabled={bulkActionLoading}>
                  <Tag size={14} className="me-2" /> Cambiar Estado
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleBulkUpdate({ status: 'open' })}>Abierto</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleBulkUpdate({ status: 'in_progress' })}>En Progreso</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleBulkUpdate({ status: 'pending' })}>Pendiente</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleBulkUpdate({ status: 'resolved' })}>Resuelto</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleBulkUpdate({ status: 'closed' })}>Cerrado</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              <Dropdown>
                <Dropdown.Toggle variant="outline-light" size="sm" className="d-flex align-items-center" disabled={bulkActionLoading}>
                  <AlertCircle size={14} className="me-2" /> Prioridad
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleBulkUpdate({ priority: 'low' })}>Baja</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleBulkUpdate({ priority: 'medium' })}>Media</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleBulkUpdate({ priority: 'high' })}>Alta</Dropdown.Item>
                  <Dropdown.Item onClick={() => handleBulkUpdate({ priority: 'critical' })}>Crítica</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              <Button variant="link" className="text-white text-decoration-none" onClick={() => setSelectedTickets([])}>Cancelar</Button>
            </div>
          </div>
        )}

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
          <div>
            <h2 className="fw-bold mb-1">{t('operational_tickets')}</h2>
            <p className="text-muted mb-0">{t('tickets_desc')}</p>
          </div>
          <div className="d-flex gap-2">
            <Link href="/tickets/kanban" passHref legacyBehavior>
              <Button variant="outline-primary" className="d-flex align-items-center"><LayoutGrid size={18} className="me-md-2"/> <span className="d-none d-md-inline">Kanban</span></Button>
            </Link>
            <Button 
              variant="primary" 
              className="d-flex align-items-center shadow-sm"
              onClick={() => router.push('/tickets/new')}
            >
              <Plus size={18} className="me-md-2"/> 
              <span className="d-none d-md-inline">{t('new_ticket')}</span>
            </Button>
          </div>
        </div>

        <Card className="shadow-sm border-0 mb-4">
          <Card.Body className="p-2 p-md-3">
            <div className="input-group bg-light rounded px-2">
              <span className="input-group-text bg-transparent border-0"><Search size={18} className="text-muted" /></span>
              <Form.Control 
                className="bg-transparent border-0 shadow-none py-2" 
                placeholder={t('search_tickets_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </Card.Body>
        </Card>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <>
            <div className="d-none d-lg-block">
              <Card className="shadow-sm border-0 overflow-hidden">
                <Table hover responsive className="mb-0 align-middle">
                  <thead className="bg-dark text-white border-0">
                    <tr className="small text-uppercase">
                      <th className="ps-4 py-3" style={{ width: '40px' }}>
                        <div onClick={toggleSelectAll} className="cursor-pointer">
                          {Array.isArray(tickets) && selectedTickets.length === tickets.length && tickets.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                      </th>
                      <th className="py-3">Ticket</th>
                      <th>Prioridad</th>
                      <th>Estado</th>
                      <th>Creado</th>
                      <th className="text-end pe-4">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(filteredTickets) && filteredTickets.map(ticket => (
                      <tr key={ticket.id} className={selectedTickets.includes(ticket.id) ? 'bg-primary bg-opacity-10' : ''}>
                        <td className="ps-4">
                          <div onClick={() => toggleSelectTicket(ticket.id)} className="cursor-pointer">
                            {selectedTickets.includes(ticket.id) ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-muted" />}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="fw-bold text-dark">{ticket.title}</div>
                          <div className="small text-muted font-monospace">#{ticket.id ? ticket.id.substring(0,8) : 'N/A'}</div>
                        </td>
                        <td>{getPriorityBadge(ticket.priority)}</td>
                        <td>{getStatusBadge(ticket.status)}</td>
                        <td className="small text-muted"><Clock size={12} className="me-1"/> {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '---'}</td>
                        <td className="text-end pe-4">
                          <Button variant="light" size="sm" onClick={() => router.push(`/tickets/${ticket.id}`)} className="fw-bold border">{t('view')}</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            </div>

            <div className="d-lg-none">
              {Array.isArray(filteredTickets) && filteredTickets.map(ticket => (
                <Card key={ticket.id} className="mb-3 shadow-sm border-0 border-start border-4 border-primary" onClick={() => router.push(`/tickets/${ticket.id}`)}>
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="fw-bold mb-0 text-dark text-truncate" style={{maxWidth:'70%'}}>{ticket.title}</h6>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <div className="d-flex justify-content-between align-items-center small mt-3">
                      <div className="text-muted">
                        {getPriorityBadge(ticket.priority)}
                        <span className="ms-2 font-monospace">#{ticket.id ? ticket.id.substring(0,8) : 'N/A'}</span>
                      </div>
                      <div className="text-muted"><Clock size={12}/> {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '---'}</div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </>
        )}

        {filteredTickets.length === 0 && !loading && (
          <div className="text-center py-5">
            <AlertCircle size={48} className="text-muted mb-3 opacity-25" />
            <p className="text-muted">{t('no_data')}</p>
          </div>
        )}
      </Container>
    </Layout>
  );
}
