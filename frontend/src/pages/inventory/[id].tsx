import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { 
  Monitor, 
  MapPin, 
  Shield, 
  History, 
  ChevronLeft, 
  Clock, 
  Activity, 
  Network,
  FileText,
  AlertCircle,
  Ticket,
  Plus
} from 'lucide-react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Badge, 
  Tabs, 
  Tab, 
  Spinner, 
  Button,
  Table
} from 'react-bootstrap';

const AssetDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assetTickets, setAssetTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    if (id) {
        fetchAssetDetails();
        fetchAssetTickets();
    }
  }, [id]);

  const fetchAssetTickets = async () => {
    setLoadingTickets(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/tickets?asset_id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssetTickets(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching asset tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchAssetDetails = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/assets/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Equipo no encontrado");
      const data = await res.json();
      setAsset(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Layout title="Cargando..."><div className="text-center py-5"><Spinner animation="border" /></div></Layout>;
  if (!asset) return <Layout title="No encontrado"><Container className="py-5 text-center"><AlertCircle size={48} className="text-danger mb-3"/><p>Activo no encontrado.</p></Container></Layout>;

  return (
    <Layout title={`Detalle: ${asset.hostname}`}>
      <Container fluid className="px-0">
        <div className="d-flex align-items-center mb-4">
          <Button variant="link" onClick={() => router.back()} className="p-0 me-3 text-dark">
            <ChevronLeft size={24} />
          </Button>
          <div>
            <h2 className="fw-bold mb-0">{asset.hostname}</h2>
            <div className="d-flex gap-2 mt-1">
              <Badge bg={asset.status === 'operative' ? 'success' : 'secondary'}>{asset.status.toUpperCase()}</Badge>
              <Badge bg="info">{asset.criticality.toUpperCase()}</Badge>
              <span className="text-muted small font-monospace">ID: {asset.id.substring(0,8)}</span>
            </div>
          </div>
        </div>

        <Row className="g-4">
          {/* Info Principal */}
          <Col lg={4}>
            <Card className="border-0 shadow-sm mb-4">
              <Card.Body className="p-4">
                <h6 className="fw-bold mb-3 d-flex align-items-center">
                  <Monitor size={18} className="me-2 text-primary" /> Información General
                </h6>
                <div className="small border-bottom py-2 d-flex justify-content-between">
                  <span className="text-muted">Serial</span>
                  <span className="fw-medium">{asset.serial || 'N/A'}</span>
                </div>
                <div className="small border-bottom py-2 d-flex justify-content-between">
                  <span className="text-muted">Asset Tag</span>
                  <span className="fw-medium">{asset.asset_tag || 'N/A'}</span>
                </div>
                <div className="small border-bottom py-2 d-flex justify-content-between">
                  <span className="text-muted">MAC</span>
                  <span className="fw-medium font-monospace">{asset.mac_address || '---'}</span>
                </div>
                <div className="small border-bottom py-2 d-flex justify-content-between">
                  <span className="text-muted">IP Actual</span>
                  <span className="fw-bold text-primary">{asset.ip_address || '---'}</span>
                </div>
                <div className="small py-2 d-flex justify-content-between">
                  <span className="text-muted">Visto por última vez</span>
                  <span>{asset.last_seen ? new Date(asset.last_seen).toLocaleString() : 'Nunca'}</span>
                </div>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <h6 className="fw-bold mb-3 d-flex align-items-center">
                  <Shield size={18} className="me-2 text-success" /> Seguridad y Sistema
                </h6>
                <div className="small border-bottom py-2 d-flex justify-content-between">
                  <span className="text-muted">Antivirus / EDR</span>
                  <span className="fw-medium">{asset.av_product || 'Ninguno'}</span>
                </div>
                <div className="small border-bottom py-2 d-flex justify-content-between">
                  <span className="text-muted">Tipo</span>
                  <span className="fw-medium">{asset.device_type}</span>
                </div>
                <div className="small py-2 d-flex justify-content-between">
                  <span className="text-muted">Sist. Operativo</span>
                  <span>{asset.os_name} {asset.os_version}</span>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Línea de Tiempo y Registros */}
          <Col lg={8}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <Tabs defaultActiveKey="history" className="px-4 pt-3 custom-tabs">
                  <Tab eventKey="history" title={<span><History size={16} className="me-1"/> Historial Movimientos</span>} className="p-4">
                    {(!asset.location_history || asset.location_history.length === 0) ? (
                      <p className="text-muted small italic">No hay registros de movimientos.</p>
                    ) : (
                      <div className="timeline">
                        {asset.location_history?.map((h: any, idx: number) => (
                          <div key={idx} className="timeline-item pb-3 border-start ps-3 position-relative">
                            <div className="dot position-absolute bg-primary rounded-circle" style={{width:'10px', height:'10px', left:'-5px', top:'5px'}}></div>
                            <div className="small fw-bold">{new Date(h.created_at).toLocaleString()}</div>
                            <div className="small text-muted">
                                <div>Cambio de ubicación: <span className="text-dark fw-medium">{h.reason || 'Movimiento manual'}</span></div>
                                <div className="x-small opacity-75">Modificado por: <span className="text-primary">{h.changed_by_name || 'System'}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Tab>
                  <Tab eventKey="installs" title={<span><FileText size={16} className="me-1"/> Fichas GDE</span>} className="p-4">
                    <Table hover responsive size="sm" className="small">
                      <thead>
                        <tr className="text-muted">
                          <th>Fecha</th>
                          <th>Nro Expediente / GDE</th>
                          <th>Técnico</th>
                        </tr>
                      </thead>
                      <tbody>
                        {asset.install_records?.map((r: any, idx: number) => (
                          <tr key={idx}>
                            <td>{new Date(r.created_at).toLocaleDateString()}</td>
                            <td className="fw-bold">{r.gde_number || 'S/N'}</td>
                            <td>{r.created_by_name || 'System'}</td>
                          </tr>
                        ))}
                        {asset.install_records?.length === 0 && <tr><td colSpan={3} className="text-center py-3">Sin fichas administrativas.</td></tr>}
                      </tbody>
                    </Table>
                  </Tab>
                  <Tab eventKey="tickets" title={<span><Ticket size={16} className="me-1"/> Tickets ({assetTickets.length})</span>} className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-bold mb-0">Tickets asociados a este equipo</h6>
                      <Button variant="primary" size="sm" onClick={() => router.push(`/tickets/new?asset_id=${asset.id}`)}>
                        <Plus size={14} className="me-1"/> Abrir Ticket
                      </Button>
                    </div>
                    
                    {loadingTickets ? (
                        <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
                    ) : assetTickets.length === 0 ? (
                        <p className="small text-muted italic text-center py-4">No hay tickets vinculados a este activo.</p>
                    ) : (
                        <Table hover responsive size="sm" className="small align-middle">
                            <thead className="bg-light text-muted">
                                <tr>
                                    <th className="ps-3">Asunto</th>
                                    <th>Estado</th>
                                    <th>Prioridad</th>
                                    <th className="text-end pe-3">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assetTickets.map(ticket => (
                                    <tr key={ticket.id} className="cursor-pointer" onClick={() => router.push(`/tickets/${ticket.id}`)}>
                                        <td className="ps-3 fw-bold text-primary">{ticket.title}</td>
                                        <td>
                                            <Badge bg={ticket.status === 'open' ? 'success' : 'secondary'} className="text-uppercase" style={{fontSize: '9px'}}>
                                                {ticket.status}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge bg="light" text="dark" className="border x-small">
                                                {ticket.priority.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="text-end pe-3 text-muted">{new Date(ticket.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <style jsx global>{`
        .custom-tabs .nav-link { border: none; color: #6c757d; font-weight: 500; padding: 1rem 1.5rem; }
        .custom-tabs .nav-link.active { color: var(--bs-primary); border-bottom: 2px solid var(--bs-primary); background: transparent; }
        .timeline-item:last-child { border-left: none !important; }
      `}</style>
    </Layout>
  );
};

export default AssetDetailPage;
