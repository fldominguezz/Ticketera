import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Container, Card, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Save, ArrowLeft, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NewTicketPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { asset_id } = router.query;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ticket_type_id: '',
    group_id: '',
    priority: 'medium',
    asset_id: (asset_id as string) || ''
  });

  useEffect(() => {
    if (asset_id) {
      setFormData(prev => ({ ...prev, asset_id: asset_id as string }));
    }
  }, [asset_id]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const [typesRes, groupsRes] = await Promise.all([
        fetch('/api/v1/ticket-types', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/groups', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (typesRes.ok && groupsRes.ok) {
        const contentType1 = typesRes.headers.get("content-type");
        const contentType2 = groupsRes.headers.get("content-type");
        
        if (contentType1?.includes("application/json") && contentType2?.includes("application/json")) {
          const typesData = await typesRes.json();
          const groupsData = await groupsRes.json();
          setTicketTypes(typesData);
          setGroups(groupsData);
          
          if (typesData.length > 0) setFormData(prev => ({ ...prev, ticket_type_id: typesData[0].id }));
          if (groupsData.length > 0) setFormData(prev => ({ ...prev, group_id: groupsData[0].id }));
        } else {
          setError('Invalid response format from server (expected JSON)');
        }
      } else {
        setError('Failed to fetch required metadata');
      }
    } catch (e) {
      setError('An error occurred while loading form data');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/tickets/${data.id}`);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to create ticket');
      }
    } catch (e) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Layout title="Nuevo Ticket">
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      </Layout>
    );
  }

  return (
    <Layout title={t('new_ticket') || 'Nuevo Ticket'}>
      <Container>
        <div className="mb-4 d-flex align-items-center">
          <Button variant="link" className="p-0 me-3 text-dark" onClick={() => router.back()}>
            <ArrowLeft size={24} />
          </Button>
          <h2 className="fw-bold mb-0">{t('new_ticket')}</h2>
        </div>

        {error && (
          <Alert variant="danger" className="d-flex align-items-center">
            <AlertCircle size={18} className="me-2" />
            {error}
          </Alert>
        )}

        <Row className="justify-content-center">
          <Col lg={8}>
            <Card className="shadow-sm border-0">
              <Card.Body className="p-4">
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="ticket-title">
                    <Form.Label className="fw-bold">{t('title')}</Form.Label>
                    <Form.Control 
                      required
                      name="title"
                      placeholder="Resumen del incidente..."
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="ticket-type">
                        <Form.Label className="fw-bold">{t('type')}</Form.Label>
                        <Form.Select 
                          required
                          name="type_id"
                          value={formData.ticket_type_id}
                          onChange={e => setFormData({ ...formData, ticket_type_id: e.target.value })}
                        >
                          <option value="">Seleccionar...</option>
                          {ticketTypes.map((ticket: any) => (
                            <option key={ticket.id} value={ticket.id}>{ticket.name}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="ticket-priority">
                        <Form.Label className="fw-bold">{t('status')}</Form.Label>
                        <Form.Select 
                          required
                          name="priority"
                          value={formData.priority}
                          onChange={e => setFormData({ ...formData, priority: e.target.value })}
                        >
                          <option value="low">{t('priority_low')}</option>
                          <option value="medium">{t('priority_medium')}</option>
                          <option value="high">{t('priority_high')}</option>
                          <option value="critical">{t('priority_critical')}</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3" controlId="ticket-group">
                    <Form.Label className="fw-bold">{t('group')}</Form.Label>
                    <Form.Select 
                      required
                      name="group_id"
                      value={formData.group_id}
                      onChange={e => setFormData({ ...formData, group_id: e.target.value })}
                    >
                      <option value="">Seleccionar grupo responsable...</option>
                      {groups.map((g: any) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="ticket-description">
                    <Form.Label className="fw-bold">{t('description')}</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={5} 
                      name="description"
                      placeholder="Detalles técnicos del evento..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </Form.Group>

                  <div className="d-grid gap-2">
                    <Button variant="primary" type="submit" size="lg" disabled={loading} className="d-flex align-items-center justify-content-center shadow-sm">
                      {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <Save size={20} className="me-2" />}
                      {t('create_ticket') || 'Crear Ticket'}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
}
