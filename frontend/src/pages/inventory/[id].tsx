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

  useEffect(() => {
    if (id) fetchAssetDetails();
  }, [id]);

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
                            <div className="small text-muted">Cambio de ubicación: <span className="text-dark fw-medium">{h.reason || 'Movimiento manual'}</span></div>
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
                            <td>{r.created_by_id?.substring(0,8) || 'System'}</td>
                          </tr>
                        ))}
                        {asset.install_records?.length === 0 && <tr><td colSpan={3} className="text-center py-3">Sin fichas administrativas.</td></tr>}
                      </tbody>
                    </Table>
                  </Tab>
                  <Tab eventKey="network" title={<span><Network size={16} className="me-1"/> Historial Red</span>} className="p-4">
                    <Table hover responsive size="sm" className="small">
                      <thead>
                        <tr className="text-muted">
                          <th>Fecha</th>
                          <th>Dirección IP</th>
                          <th>Origen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {asset.ip_history?.map((i: any, idx: number) => (
                          <tr key={idx}>
                            <td>{new Date(i.assigned_at).toLocaleString()}</td>
                            <td className="font-monospace fw-bold">{i.ip_address}</td>
                            <td>{i.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Tab>
                  <Tab eventKey="tickets" title={<span><Ticket size={16} className="me-1"/> Tickets</span>} className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-bold mb-0">Tickets asociados a este equipo</h6>
                      <Button variant="primary" size="sm" onClick={() => router.push(`/tickets/new?asset_id=${asset.id}`)}>
                        <Plus size={14} className="me-1"/> Abrir Ticket
                      </Button>
                    </div>
                    {/* Lista de tickets vinculados - Por ahora placeholder hasta tener el fetch de tickets por asset */}
                    <p className="small text-muted italic text-center py-4">No hay tickets recientes para este activo.</p>
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
