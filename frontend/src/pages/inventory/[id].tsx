import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { 
  Container, Row, Col, Card, Badge, Button, Spinner, 
  Table, ListGroup, Nav, Tab, Alert, Modal, Form 
} from 'react-bootstrap';
import { 
  Monitor, Shield, MapPin, User, Clock, HardDrive, 
  Activity, ArrowLeft, RefreshCw, AlertTriangle, 
  History, FileText, Fingerprint, Database, Ticket, Plus
} from 'lucide-react';
import api from '../../lib/api';
import { getStatusBadge } from '../../lib/ui/badges';

export default function AssetDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [asset, setAsset] = useState<any>(null);
  const [relatedTickets, setRelatedTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExpedienteModal, setShowExpedienteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form States
  const [editData, setEditData] = useState<any>({});
  const [expedienteData, setExpedienteData] = useState({ number: '', title: '' });

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetRes, ticketsRes] = await Promise.all([
        api.get(`/assets/${id}`),
        api.get('/tickets', { params: { asset_id: id } })
      ]);
      setAsset(assetRes.data);
      setEditData(assetRes.data);
      setRelatedTickets(ticketsRes.data.items || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('No se pudo establecer conexión con el terminal de datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/assets/${id}`, editData);
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      alert('Error al actualizar el activo');
    } finally {
      setSaving(false);
    }
  };

  const handleAddExpediente = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/assets/${id}/expedientes`, expedienteData);
      setShowExpedienteModal(false);
      setExpedienteData({ number: '', title: '' });
      fetchData();
    } catch (err) {
      alert('Error al vincular expediente');
    } finally {
      setSaving(false);
    }
  };

  const isOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    const diff = (new Date().getTime() - new Date(lastSeen).getTime()) / 1000 / 60;
    return diff < 15; // Online si reportó hace menos de 15 min
  };

  if (loading) {
    return (
      <Layout title="Cargando Activo...">
        <div className="d-flex flex-column justify-content-center align-items-center min-vh-50 gap-3">
          <Spinner animation="border" variant="primary" />
          <div className="fw-black text-primary x-small tracking-widest uppercase">Consultando Terminal de Datos...</div>
        </div>
      </Layout>
    );
  }

  if (error || !asset) {
    return (
      <Layout title="Error">
        <Alert variant="danger" className="border-0 shadow-sm rounded-4 p-4">
          <div className="d-flex align-items-center gap-3">
            <AlertTriangle size={32} />
            <div>
              <h5 className="fw-black m-0">ACTIVO NO ENCONTRADO</h5>
              <p className="m-0 opacity-75">{error || 'El ID del activo no es válido o ha sido eliminado.'}</p>
            </div>
          </div>
          <Button variant="outline-danger" className="mt-4 fw-bold rounded-pill px-4" onClick={() => router.push('/inventory')}>
            VOLVER AL INVENTARIO
          </Button>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout title={`Activo: ${asset.hostname}`}>
      <Container fluid className="px-0 animate-fade-in">
        {/* Header con Navegación */}
        <div className="mb-4 d-flex justify-content-between align-items-end">
          <div>
            <Button variant="link" className="p-0 text-muted text-decoration-none d-flex align-items-center gap-2 mb-3 hover-text-primary transition-all" onClick={() => router.back()}>
              <ArrowLeft size={16} /> VOLVER
            </Button>
            <h4 className="fw-black text-uppercase m-0 d-flex align-items-center gap-3 text-main">
              <div className="p-2 bg-primary bg-opacity-10 rounded-3 text-primary"><Monitor size={28} /></div>
              {asset.hostname}
            </h4>
            <p className="text-muted-foreground small m-0 text-uppercase tracking-widest fw-bold opacity-75 mt-2">
              Detalle Técnico de Infraestructura // ID: {String(asset.id).substring(0,8)}
            </p>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-primary" className="fw-black x-small uppercase rounded-pill px-3" onClick={() => setShowEditModal(true)}>
              <RefreshCw size={14} className="me-2" /> Editar Datos
            </Button>
            <Button variant="outline-primary" className="fw-black x-small uppercase rounded-pill px-3" onClick={() => alert('Próximamente: Módulo de Movimientos')}>
              <MapPin size={14} className="me-2" /> Mover
            </Button>
            <Button variant="danger" className="fw-black x-small uppercase rounded-pill px-3 shadow-sm border-0" onClick={() => alert('Próximamente: Baja de Activo')}>
              <AlertTriangle size={14} className="me-2" /> Dar de Baja
            </Button>
          </div>
        </div>

        <Row className="g-4">
          {/* Columna Izquierda: Specs y Ubicación */}
          <Col lg={4}>
            <Card className="border-0 shadow-sm bg-card mb-4 overflow-hidden">
              <div className="p-1 bg-primary d-flex justify-content-between px-3">
                <span className="x-tiny fw-black text-white uppercase tracking-tighter">System Health</span>
                {asset.last_seen && (
                  <span className={`x-tiny fw-black uppercase ${isOnline(asset.last_seen) ? 'text-success-light' : 'text-white opacity-50'}`}>
                    {isOnline(asset.last_seen) ? '● Online' : 'Offline'}
                  </span>
                )}
              </div>
              <Card.Body className="p-4">
                <h6 className="fw-black text-uppercase mb-4 small tracking-widest text-primary">Especificaciones del Sistema</h6>
                
                <div className="d-flex flex-column gap-4">
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 bg-muted rounded-3 text-muted"><HardDrive size={20} /></div>
                    <div>
                      <div className="x-tiny text-muted uppercase fw-bold">Sistema Operativo</div>
                      <div className="fw-black text-main small">{asset.os_name} {asset.os_version}</div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 bg-muted rounded-3 text-muted"><Activity size={20} /></div>
                    <div>
                      <div className="x-tiny text-muted uppercase fw-bold">Dirección IP Actual</div>
                      <div className="fw-black text-primary font-monospace">{asset.ip_address}</div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 bg-muted rounded-3 text-muted"><Fingerprint size={20} /></div>
                    <div>
                      <div className="x-tiny text-muted uppercase fw-bold">Dirección Física MAC</div>
                      <div className="fw-black text-main font-monospace small">{asset.mac_address}</div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 bg-muted rounded-3 text-muted"><Shield size={20} /></div>
                    <div>
                      <div className="x-tiny text-muted uppercase fw-bold">Protección Antimalware</div>
                      <div className={`fw-black small ${asset.av_product?.includes('FREE') ? 'text-warning' : 'text-success'}`}>{asset.av_product}</div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm bg-card overflow-hidden">
              <Card.Body className="p-4">
                <h6 className="fw-black text-uppercase mb-4 small tracking-widest text-primary">Asignación y Ubicación</h6>
                <div className="d-flex flex-column gap-4">
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 bg-muted rounded-3 text-muted"><MapPin size={20} /></div>
                    <div>
                      <div className="x-tiny text-muted uppercase fw-bold">Dependencia / Carpeta</div>
                      <div className="fw-black text-main small">{asset.location?.name || asset.dependencia || 'Sin Ubicación'}</div>
                      <div className="x-tiny text-primary fw-black">CODE: #{asset.codigo_dependencia || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 bg-muted rounded-3 text-muted"><User size={20} /></div>
                    <div>
                      <div className="x-tiny text-muted uppercase fw-bold">Usuario Responsable</div>
                      <div className="fw-black text-main small">
                        {asset.responsible_user ? `${asset.responsible_user.first_name} ${asset.responsible_user.last_name}` : 'Sin responsable asignado'}
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Columna Derecha: Tabs de Historial y Actividad */}
          <Col lg={8}>
            <Card className="border-0 shadow-sm bg-card h-100 overflow-hidden">
              <Tab.Container defaultActiveKey="events">
                <Card.Header className="bg-muted bg-opacity-50 border-0 p-0">
                  <Nav variant="tabs" className="custom-tabs px-3 pt-2">
                    <Nav.Item>
                      <Nav.Link eventKey="events" className="fw-black x-small uppercase tracking-wider py-3 px-4 border-0">
                        <History size={14} className="me-2" /> Log de Eventos
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="tickets" className="fw-black x-small uppercase tracking-wider py-3 px-4 border-0">
                        <Ticket size={14} className="me-2" /> Tickets ({relatedTickets.length})
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="history" className="fw-black x-small uppercase tracking-wider py-3 px-4 border-0">
                        <Database size={14} className="me-2" /> Movimientos
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="expedientes" className="fw-black x-small uppercase tracking-wider py-3 px-4 border-0">
                        <FileText size={14} className="me-2" /> Expedientes GDE
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>
                </Card.Header>
                <Card.Body className="p-0">
                  <Tab.Content>
                    <Tab.Pane eventKey="events" className="p-0">
                      <div className="table-responsive">
                        <Table hover className="m-0 ticket-table border-0">
                          <thead>
                            <tr className="bg-muted">
                              <th className="ps-4 border-0">FECHA</th>
                              <th className="border-0">EVENTO</th>
                              <th className="pe-4 border-0">DESCRIPCIÓN</th>
                            </tr>
                          </thead>
                          <tbody>
                            {asset.event_logs?.length > 0 ? asset.event_logs.map((log: any) => (
                              <tr key={log.id} className="ticket-row border-bottom border-subtle">
                                <td className="ps-4">
                                  <div className="ticket-date">
                                    <div className="date fw-bold">{new Date(log.created_at).toLocaleDateString()}</div>
                                    <div className="time opacity-75 small">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                  </div>
                                </td>
                                <td><Badge bg="primary" className="bg-opacity-10 text-primary fw-black x-small">{log.event_type.toUpperCase()}</Badge></td>
                                <td className="pe-4 py-3">
                                  <div className="fw-bold small text-main">{log.description}</div>
                                  {log.user && <div className="x-tiny text-muted uppercase">Por: {log.user.first_name} {log.user.last_name}</div>}
                                </td>
                              </tr>
                            )) : (
                              <tr><td colSpan={3} className="text-center py-5 text-muted opacity-50 fw-bold uppercase x-small">Sin registros de eventos</td></tr>
                            )}
                          </tbody>
                        </Table>
                      </div>
                    </Tab.Pane>

                    <Tab.Pane eventKey="tickets" className="p-0">
                      <div className="p-3 bg-muted bg-opacity-25 border-bottom d-flex justify-content-between align-items-center">
                        <span className="x-small fw-black text-muted uppercase">Incidentes Registrados</span>
                        <Button variant="primary" size="sm" className="fw-black x-small uppercase rounded-pill px-3" onClick={() => router.push(`/tickets/new?asset_id=${asset.id}`)}>
                          <Plus size={12} className="me-1" /> Nuevo Ticket
                        </Button>
                      </div>
                      <div className="table-responsive">
                        <Table hover className="m-0 ticket-table border-0">
                          <thead>
                            <tr className="bg-muted">
                              <th className="ps-4 border-0">TICKET ID</th>
                              <th className="border-0">ASUNTO / ESTADO</th>
                              <th className="pe-4 text-end border-0">PRIORIDAD</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relatedTickets.length > 0 ? relatedTickets.map((t: any) => (
                              <tr key={t.id} className="ticket-row border-bottom border-subtle" onClick={() => router.push(`/tickets/${t.id}`)}>
                                <td className="ps-4 fw-black text-primary font-monospace">{t.id.split('-')[0].toUpperCase()}</td>
                                <td className="py-3">
                                  <div className="fw-bold small text-main">{t.title}</div>
                                  <div className="x-tiny text-muted uppercase">Estado actual: {t.status}</div>
                                </td>
                                <td className="pe-4 text-end">
                                  <Badge bg="transparent" className={`ticket-status-badge status-${t.status}`}>
                                    {t.priority.toUpperCase()}
                                  </Badge>
                                </td>
                              </tr>
                            )) : (
                              <tr><td colSpan={3} className="text-center py-5 text-muted opacity-50 fw-bold uppercase x-small">Este activo no tiene incidentes reportados</td></tr>
                            )}
                          </tbody>
                        </Table>
                      </div>
                    </Tab.Pane>

                    <Tab.Pane eventKey="history" className="p-4">
                      <div className="text-center py-5 text-muted opacity-50 fw-bold uppercase x-small border rounded border-dashed">
                        Módulo de trazabilidad de ubicación activo
                      </div>
                    </Tab.Pane>

                    <Tab.Pane eventKey="expedientes" className="p-0">
                      <div className="p-3 bg-muted bg-opacity-25 border-bottom d-flex justify-content-between align-items-center">
                        <span className="x-small fw-black text-muted uppercase">Documentación GDE</span>
                        <Button variant="outline-primary" size="sm" className="fw-black x-small uppercase rounded-pill px-3" onClick={() => setShowExpedienteModal(true)}>
                          <Plus size={12} className="me-1" /> Vincular Expediente
                        </Button>
                      </div>
                      <div className="table-responsive">
                        <Table hover className="m-0 ticket-table border-0">
                          <thead>
                            <tr className="bg-muted">
                              <th className="ps-4 border-0">NRO. EXPEDIENTE</th>
                              <th className="pe-4 border-0">TÍTULO / TRÁMITE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {asset.expedientes?.length > 0 ? asset.expedientes.map((exp: any) => (
                              <tr key={exp.id} className="ticket-row border-bottom border-subtle">
                                <td className="ps-4 fw-black text-primary font-monospace">{exp.number}</td>
                                <td className="pe-4 py-3 fw-bold small text-main">{exp.title}</td>
                              </tr>
                            )) : (
                              <tr><td colSpan={2} className="text-center py-5 text-muted opacity-50 fw-bold uppercase x-small">Sin expedientes vinculados</td></tr>
                            )}
                          </tbody>
                        </Table>
                      </div>
                    </Tab.Pane>
                  </Tab.Content>
                </Card.Body>
              </Tab.Container>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* MODAL: EDITAR ACTIVO */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
        <Modal.Header closeButton className="bg-muted border-0">
          <Modal.Title className="fw-black x-small uppercase tracking-widest text-primary">Editor Técnico de Activo</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 bg-card">
          <Form onSubmit={handleUpdateAsset}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="x-small fw-bold text-muted uppercase">Hostname</Form.Label>
                  <Form.Control 
                    className="custom-input"
                    value={editData.hostname || ''} 
                    onChange={e => setEditData({...editData, hostname: e.target.value})} 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="x-small fw-bold text-muted uppercase">Dirección IP</Form.Label>
                  <Form.Control 
                    className="custom-input"
                    value={editData.ip_address || ''} 
                    onChange={e => setEditData({...editData, ip_address: e.target.value})} 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="x-small fw-bold text-muted uppercase">Sist. Operativo</Form.Label>
                  <Form.Control 
                    className="custom-input"
                    value={editData.os_name || ''} 
                    onChange={e => setEditData({...editData, os_name: e.target.value})} 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="x-small fw-bold text-muted uppercase">Protección AV</Form.Label>
                  <Form.Select 
                    className="custom-input"
                    value={editData.av_product || ''} 
                    onChange={e => setEditData({...editData, av_product: e.target.value})}
                  >
                    <option value="AV FREE">AV FREE</option>
                    <option value="FORTICLIENT">FORTICLIENT</option>
                    <option value="ESET ENDPOINT">ESET ENDPOINT</option>
                    <option value="SIN PROTECCIÓN">SIN PROTECCIÓN</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <div className="text-end mt-4">
              <Button variant="link" onClick={() => setShowEditModal(false)} className="text-muted text-decoration-none fw-bold me-3">CANCELAR</Button>
              <Button variant="primary" type="submit" className="fw-black px-4 rounded-pill" disabled={saving}>
                {saving ? <Spinner size="sm" /> : 'GUARDAR CAMBIOS'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* MODAL: VINCULAR EXPEDIENTE */}
      <Modal show={showExpedienteModal} onHide={() => setShowExpedienteModal(false)} centered>
        <Modal.Header closeButton className="bg-muted border-0">
          <Modal.Title className="fw-black x-small uppercase tracking-widest text-primary">Vincular Documentación GDE</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 bg-card">
          <Form onSubmit={handleAddExpediente}>
            <Form.Group className="mb-3">
              <Form.Label className="x-small fw-bold text-muted uppercase">Número de Expediente (GDE)</Form.Label>
              <Form.Control 
                className="custom-input font-monospace"
                placeholder="EX-2026-..."
                value={expedienteData.number} 
                onChange={e => setExpedienteData({...expedienteData, number: e.target.value})} 
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="x-small fw-bold text-muted uppercase">Título / Referencia</Form.Label>
              <Form.Control 
                className="custom-input"
                placeholder="ej: Nota de Instalación"
                value={expedienteData.title} 
                onChange={e => setExpedienteData({...expedienteData, title: e.target.value})} 
              />
            </Form.Group>
            <div className="text-end mt-4">
              <Button variant="link" onClick={() => setShowExpedienteModal(false)} className="text-muted text-decoration-none fw-bold me-3">CANCELAR</Button>
              <Button variant="primary" type="submit" className="fw-black px-4 rounded-pill" disabled={saving}>
                {saving ? <Spinner size="sm" /> : 'VINCULAR EXPEDIENTE'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <style jsx global>{`
        .custom-tabs .nav-link {
          color: var(--text-muted-foreground) !important;
          border-radius: 0 !important;
          transition: all 0.2s ease;
        }
        .custom-tabs .nav-link.active {
          background-color: var(--bg-card) !important;
          color: var(--primary) !important;
          border-top: 3px solid var(--primary) !important;
        }
        .min-vh-50 { min-height: 50vh; }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </Layout>
  );
}
