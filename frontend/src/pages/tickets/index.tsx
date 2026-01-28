import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Container, Table, Button, Badge, Card, Form, Spinner, Row, Col } from 'react-bootstrap';
import { Plus, Search, LayoutGrid, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { getStatusBadge } from '../../lib/ui/badges';

export default function TicketsPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { status: queryStatus } = router.query;
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mounted, setMounted] = useState(false);
  
  const isDark = theme === 'dark';

  useEffect(() => {
    setMounted(true);
    fetchTickets();
  }, []);

  useEffect(() => {
    if (queryStatus && typeof queryStatus === 'string') {
        setStatusFilter(queryStatus);
    }
  }, [queryStatus]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/tickets', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        // FILTRO ESTRICTO: Ocultar tickets SIEM de la lista general
        const filtered = (Array.isArray(data) ? data : []).filter((ticket: any) => {
            if (!ticket) return false;
            const isSiemType = ticket.ticket_type_name?.toLowerCase().includes('siem') || 
                               ticket.ticket_type?.name?.toLowerCase().includes('siem');
            const hasSiemData = ticket.extra_data && ticket.extra_data.siem_raw;
            const hasSiemTitle = ticket.title?.startsWith('SIEM:');
            return !(isSiemType || hasSiemData || hasSiemTitle);
        });
        setTickets(filtered);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = (ticket.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (ticket.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (!mounted) return null;

  return (
    <Layout title="Gestión de Incidentes">
      <Container fluid className="px-0">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold m-0 text-body">Tickets Operativos</h2>
            <small className="text-muted fw-bold text-uppercase">Incidentes y Requerimientos Manuales</small>
          </div>
          <Button variant="primary" onClick={() => router.push('/tickets/new')} className="shadow-sm fw-bold">
            <Plus size={18} className="me-2"/> NUEVO TICKET
          </Button>
        </div>

        <Card className="shadow-sm border-0 mb-4 overflow-hidden">
          <Card.Body className="p-3">
            <Row className="g-3">
              <Col md={8}>
                <div className={`input-group ${isDark ? 'bg-dark bg-opacity-50' : 'bg-light'} rounded-pill px-3`}>
                  <span className="input-group-text bg-transparent border-0"><Search size={18} className="text-muted" /></span>
                  <Form.Control 
                    className="bg-transparent border-0 shadow-none py-2" 
                    placeholder="Buscar incidentes por ID o título..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </Col>
              <Col md={4}>
                <Form.Select 
                    className="rounded-pill px-3 py-2 border-0 shadow-none bg-light"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">TODOS LOS ESTADOS</option>
                    <option value="open">ABIERTOS</option>
                    <option value="in_progress">EN PROCESO</option>
                    <option value="pending">PENDIENTES</option>
                    <option value="resolved">RESOLVIDOS</option>
                    <option value="closed">CERRADOS</option>
                </Form.Select>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="shadow-sm border-0 overflow-hidden">
          <Table hover responsive variant={isDark ? 'dark' : undefined} className="mb-0 align-middle">
            <thead className={`${isDark ? 'bg-black' : 'bg-light'} border-0 opacity-75`}>
              <tr className="small text-uppercase">
                <th className="ps-4 py-3">Incidente</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Fecha</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
              ) : filteredTickets.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-5 text-muted">No se encontraron incidentes con los filtros aplicados.</td></tr>
              ) : filteredTickets.map(ticket => (
                <tr key={ticket.id}>
                  <td className="ps-4 py-3">
                    <div className="fw-bold">{ticket.title}</div>
                    <div className="x-small text-muted font-monospace opacity-75">REF: {ticket.id.substring(0,8).toUpperCase()}</div>
                  </td>
                  <td>{getStatusBadge(ticket.status)}</td>
                  <td><Badge bg="light" text="dark" className="border opacity-75">{ticket.priority.toUpperCase()}</Badge></td>
                  <td className="small text-muted">{new Date(ticket.created_at).toLocaleDateString()}</td>
                  <td className="text-end pe-4">
                    <Button variant="outline-primary" size="sm" onClick={() => router.push(`/tickets/${ticket.id}`)} className="fw-bold">DETALLE</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </Container>
    </Layout>
  );
}