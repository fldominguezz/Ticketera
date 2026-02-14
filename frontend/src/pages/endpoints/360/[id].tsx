import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { Container, Row, Col, Card, Badge, ListGroup, Tab, Tabs, Table, Button } from 'react-bootstrap';
import { Laptop, Shield, Activity, FileText, Clock, AlertCircle } from 'lucide-react';
import axios from 'axios';

const Endpoint360 = () => {
  const router = useRouter();
  const { id } = router.query;
  const [endpoint, setEndpoint] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchEndpointData();
  }, [id]);

  const fetchEndpointData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [epRes, tRes] = await Promise.all([
        axios.get(`/api/v1/endpoints/${id}`, { headers }),
        axios.get('/api/v1/tickets', { headers }) // En prod filtrar por endpoint_id en backend
      ]);
      
      setEndpoint(epRes.data);
      if (Array.isArray(tRes.data)) {
        setTickets(tRes.data.filter((ticket: any) => 
          (ticket.description && (ticket.description.includes(epRes.data.hostname) || ticket.description.includes(epRes.data.ip))) ||
          (ticket.title && (ticket.title.includes(epRes.data.hostname) || ticket.title.includes(epRes.data.ip)))
        ));
      } else {
        setTickets([]);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (loading) return <Layout title="Cargando 360..."><div>Cargando rastro del activo...</div></Layout>;
  if (!endpoint) return <Layout title="No encontrado"><div>Activo no encontrado.</div></Layout>;

  return (
    <Layout title={`360: ${endpoint.hostname}`}>
      <div className="mb-4 d-flex justify-content-between align-items-start">
        <div>
          <h1 className="fw-bold mb-1">{endpoint.hostname}</h1>
          <p className="text-muted"><Badge bg="secondary" className="me-2">{endpoint.ip}</Badge> ID: {endpoint.id}</p>
        </div>
        <Badge bg={endpoint.status === 'active' ? 'success' : 'danger'} className="p-2 px-3 fs-6">
          {endpoint.status.toUpperCase()}
        </Badge>
      </div>

      <Row className="g-4">
        <Col lg={4}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white border-0 pt-4">
              <h5 className="fw-bold mb-0 d-flex align-items-center">
                <Shield size={20} className="text-primary me-2" /> Protección
              </h5>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between px-0">
                  <span className="text-muted">Producto:</span>
                  <span className="fw-bold">{endpoint.product}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between px-0">
                  <span className="text-muted">MAC:</span>
                  <span className="font-monospace">{endpoint.mac || 'N/A'}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between px-0">
                  <span className="text-muted">S.O.:</span>
                  <span>Windows 10 Pro</span>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm ">
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-3 d-flex align-items-center">
                <Activity size={18} className="text-success me-2" /> Últimos Eventos
              </h6>
              <div className="small opacity-75">
                <div className="mb-2 border-start border-success ps-3 py-1">
                  <strong>SIEM:</strong> Alerta de login fallido (Hace 2h)
                </div>
                <div className="border-start border-light ps-3 py-1">
                  <strong>SISTEMA:</strong> Inventario actualizado (Ayer)
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Tabs defaultActiveKey="tickets" className="custom-tabs mb-4 border-0 shadow-sm bg-white rounded p-2">
            <Tab eventKey="tickets" title={<><FileText size={16} className="me-1"/> Tickets Relacionados</>}>
              <Card className="border-0 shadow-sm">
                <Card.Body className="p-0">
                  {tickets.length > 0 ? (
                    <Table responsive hover className="align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Título</th>
                          <th>Estado</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map(ticket => (
                          <tr key={ticket.id}>
                            <td>{ticket.title}</td>
                            <td><Badge bg="info">{ticket.status}</Badge></td>
                            <td className="small text-muted">{new Date(ticket.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <Clock size={40} className="mb-3 opacity-25" />
                      <p>No hay tickets registrados para este activo.</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Tab>
            <Tab eventKey="forms" title={<><FileText size={16} className="me-1"/> Formularios</>}>
              <Card className="border-0 shadow-sm py-5 text-center text-muted">
                <p>Historial de instalaciones y revisiones técnicas.</p>
              </Card>
            </Tab>
          </Tabs>
        </Col>
      </Row>
    </Layout>
  );
};

export default Endpoint360;
