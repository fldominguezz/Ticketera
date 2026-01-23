import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppNavbar from '../../components/AppNavbar';
import { Container, Table, Button, Badge, Row, Col, Card, Form, Spinner } from 'react-bootstrap';
import { Plus, Search, LayoutGrid, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function TicketsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/tickets/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getStatusBadge = (status: string) => {
    const s = status || 'open';
    const colors: any = { 'open': 'success', 'in_progress': 'primary', 'pending': 'warning', 'resolved': 'info', 'closed': 'secondary' };
    return <Badge bg={colors[s] || 'secondary'} className="text-uppercase small">{t(`status_${s}`)}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const p = priority || 'medium';
    return <Badge bg={p === 'critical' ? 'danger' : 'light'} text={p === 'critical' ? 'white' : 'dark'} className="border">
      {t(`priority_${p}`).toUpperCase()}
    </Badge>;
  };

  const filteredTickets = Array.isArray(tickets) ? tickets.filter(t => 
    (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (!mounted) return null;

  return (
    <>
      <Head><title>{t('tickets')} - Ticketera</title></Head>
      <AppNavbar />
      <Container className="mt-4 mb-5">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
          <div>
            <h1 className="fw-bold mb-0">{t('operational_tickets')}</h1>
            <p className="text-muted mb-0">{t('tickets_desc')}</p>
          </div>
          <div className="d-flex gap-2">
            <Link href="/tickets/kanban" passHref legacyBehavior>
              <Button variant="outline-primary" className="d-flex align-items-center"><LayoutGrid size={18} className="me-2"/> Kanban</Button>
            </Link>
            <Button variant="primary" className="d-flex align-items-center shadow-sm"><Plus size={18} className="me-2"/> {t('new_ticket')}</Button>
          </div>
        </div>

        <Card className="shadow-sm border-0 mb-4 bg-light">
          <Card.Body className="p-3">
            <Row className="g-2">
              <Col md={12}>
                <div className="input-group">
                  <span className="input-group-text bg-white border-0"><Search size={16} /></span>
                  <Form.Control 
                    className="border-0 shadow-none" 
                    placeholder={t('search_tickets_placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <>
            <div className="d-none d-lg-block">
              <Card className="shadow-sm border-0">
                <Table hover responsive className="mb-0 align-middle">
                  <thead className="table-dark border-0">
                    <tr className="small text-uppercase">
                      <th className="ps-4">Ticket</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th className="text-end pe-4">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets?.map(t => (
                      <tr key={t.id}>
                        <td className="ps-4 py-3">
                          <div className="fw-bold text-dark">{t.title}</div>
                          <div className="small text-muted">#{t.id ? t.id.substring(0,8) : 'N/A'}</div>
                        </td>
                        <td>{getPriorityBadge(t.priority)}</td>
                        <td>{getStatusBadge(t.status)}</td>
                        <td className="small text-muted"><Clock size={12} className="me-1"/> {t.created_at ? new Date(t.created_at).toLocaleDateString() : '---'}</td>
                        <td className="text-end pe-4">
                          <Button variant="link" onClick={() => router.push(`/tickets/${t.id}`)} className="p-0 fw-bold text-decoration-none">{t('view')}</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            </div>

            <div className="d-lg-none">
              {filteredTickets?.map(t => (
                <Card key={t.id} className="mb-3 shadow-sm border-0 border-start border-4 border-primary" onClick={() => router.push(`/tickets/${t.id}`)}>
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="fw-bold mb-0 text-dark text-truncate" style={{maxWidth:'70%'}}>{t.title}</h6>
                      {getStatusBadge(t.status)}
                    </div>
                                    <div className="d-flex justify-content-between align-items-center small mt-3">
                                      <div className="text-muted">
                                        {getPriorityBadge(t.priority)}
                                        <span className="ms-2">#{t.id ? t.id.substring(0,8) : 'N/A'}</span>
                                      </div>
                                      <div className="text-muted"><Clock size={12}/> {t.created_at ? new Date(t.created_at).toLocaleDateString() : '---'}</div>
                                    </div>                  </Card.Body>
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
    </>
  );
}