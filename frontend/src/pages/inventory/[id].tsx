import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { 
  Monitor, MapPin, Shield, History, ChevronLeft, Clock, Activity, Network, FileText, AlertCircle, Ticket, Plus, UserCheck, Hash, ExternalLink
} from 'lucide-react';
import { 
  Container, Row, Col, Card, Badge, Tabs, Tab, Spinner, Button, Table, ListGroup, Modal, Form
} from 'react-bootstrap';

const AssetDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assetTickets, setAssetTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  
  // GDE Modal States
  const [showGdeModal, setShowGdeModal] = useState(false);
  const [gdeNumber, setGdeNumber] = useState('');
  const [gdeTitle, setGdeTitle] = useState('');
  const [savingGde, setSavingGde] = useState(false);

  useEffect(() => {
    if (id) {
        fetchAssetDetails();
        fetchAssetTickets();
    }
  }, [id]);

  const handleLinkGde = async () => {
    if (!gdeNumber) return;
    setSavingGde(true);
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`/api/v1/assets/${id}/expedientes`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: gdeNumber, title: gdeTitle || 'Vinculación Manual' })
        });
        if (res.ok) {
            setShowGdeModal(false);
            setGdeNumber('');
            setGdeTitle('');
            fetchAssetDetails();
        }
    } catch (err) { console.error(err); } finally { setSavingGde(false); }
  };

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
    } catch (err) { console.error(err); } finally { setLoadingTickets(false); }
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
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (loading) return <Layout title="Cargando..."><div className="text-center py-5"><Spinner animation="border" /></div></Layout>;
  if (!asset) return <Layout title="No encontrado"><Container className="py-5 text-center"><AlertCircle size={48} className="text-danger mb-3"/><p>Activo no encontrado.</p></Container></Layout>;

  return (
    <Layout title={`Expediente Técnico: ${asset.hostname}`}>
      <Container fluid className="px-0 py-2">
        <div className="d-flex align-items-center mb-4">
          <Button variant="link" onClick={() => router.back()} className="p-0 me-3 text-main">
            <ChevronLeft size={24} />
          </Button>
          <div>
            <div className="d-flex align-items-center gap-2">
               <h2 className="fw-black mb-0 uppercase tracking-tighter">{asset.hostname || 'SIN NOMBRE'}</h2>
               <Badge bg="primary" className="fw-bold px-2 py-1" style={{fontSize: '10px'}}>#{asset.asset_tag || 'UNTAGGED'}</Badge>
            </div>
            <div className="d-flex gap-2 mt-1">
              <Badge bg={asset.status === 'operative' ? 'success' : 'warning'} className="x-small fw-bold">
                {(asset.status || 'unknown').toUpperCase()}
              </Badge>
              <Badge bg="dark" className="x-small fw-bold opacity-75">
                {(asset.device_type || 'device').toUpperCase()}
              </Badge>
              <span className="text-muted small font-monospace opacity-50 ms-2">UID: {asset.id?.substring(0,8)}</span>
            </div>
          </div>
        </div>

        <Row className="g-4">
          <Col lg={4}>
            {/* UBICACIÓN Y DEPENDENCIA */}
            <Card className="border-0 shadow-lg mb-4 bg-card overflow-hidden" style={{borderRadius: '16px'}}>
              <div className="bg-primary bg-opacity-10 p-3 border-bottom border-white border-opacity-5">
                 <h6 className="fw-black m-0 uppercase x-small tracking-widest text-primary d-flex align-items-center">
                    <MapPin size={14} className="me-2"/> Asignación Organizativa
                 </h6>
              </div>
              <Card.Body className="p-4">
                 <div className="mb-3">
                    <label className="x-small fw-black text-muted uppercase d-block mb-1">Dependencia Oficial</label>
                    <div className="h5 fw-bold text-main mb-0">{asset.location?.name || 'SIN ASIGNAR'}</div>
                 </div>
                 <div className="d-flex gap-4">
                    <div>
                       <label className="x-small fw-black text-muted uppercase d-block mb-1">Código DEP</label>
                       <div className="fw-black text-primary font-monospace h6">#{asset.location?.dependency_code || '---'}</div>
                    </div>
                    <div>
                       <label className="x-small fw-black text-muted uppercase d-block mb-1">Responsable</label>
                       <div className="small fw-bold text-main">{asset.responsible_user?.first_name} {asset.responsible_user?.last_name || 'No definido'}</div>
                    </div>
                 </div>
              </Card.Body>
            </Card>

            {/* ESPECIFICACIONES TÉCNICAS */}
            <Card className="border-0 shadow-sm mb-4">
              <Card.Body className="p-4">
                <h6 className="fw-black mb-3 d-flex align-items-center uppercase x-small tracking-widest text-muted">
                  <Monitor size={16} className="me-2 text-primary" /> Hardare & Network
                </h6>
                <div className="small border-bottom py-2 d-flex justify-content-between align-items-center">
                  <span className="text-muted fw-bold">SERIAL</span>
                  <span className="fw-black font-monospace">{asset.serial || 'N/A'}</span>
                </div>
                <div className="small border-bottom py-2 d-flex justify-content-between align-items-center">
                  <span className="text-muted fw-bold">MAC ADDRESS</span>
                  <span className="fw-black font-monospace text-primary">{asset.mac_address || '---'}</span>
                </div>
                <div className="small py-2 d-flex justify-content-between align-items-center">
                  <span className="text-muted fw-bold">DIRECCIÓN IP</span>
                  <Badge bg="light" text="dark" className="border fw-black">{asset.ip_address || '---'}</Badge>
                </div>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <h6 className="fw-black mb-3 d-flex align-items-center uppercase x-small tracking-widest text-muted">
                  <Shield size={16} className="me-2 text-success" /> Software & Security
                </h6>
                <div className="small border-bottom py-2 d-flex justify-content-between">
                  <span className="text-muted fw-bold">PROTECCIÓN</span>
                  <span className="fw-bold text-success">{asset.av_product || 'Ninguno'}</span>
                </div>
                <div className="small py-2 d-flex justify-content-between">
                  <span className="text-muted fw-bold">S. OPERATIVO</span>
                  <span className="fw-bold">{asset.os_name} {asset.os_version}</span>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={8}>
            <Card className="border-0 shadow-sm h-100" style={{borderRadius: '16px'}}>
              <Card.Body className="p-0">
                <Tabs defaultActiveKey="installs" className="px-4 pt-3 custom-tabs">
                  <Tab eventKey="installs" title={<span><Hash size={16} className="me-1"/> GDE / EXPEDIENTES</span>} className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h6 className="fw-black uppercase x-small tracking-widest text-muted m-0">Trazabilidad Administrativa</h6>
                        <Button variant="outline-primary" size="sm" className="fw-bold rounded-pill px-3 shadow-sm" onClick={() => setShowGdeModal(true)}>
                            <Plus size={14} className="me-1"/> VINCULAR GDE
                        </Button>
                    </div>

                    {(!asset.expedientes || asset.expedientes.length === 0) && (!asset.install_records || asset.install_records.length === 0) ? (
                      <div className="text-center py-5 text-muted small italic">No hay expedientes vinculados a este equipo.</div>
                    ) : (
                      <>
                        {/* Mostrar Expedientes Formales */}
                        {asset.expedientes?.map((e: any) => (
                            <div key={e.id} className="mb-3 p-3 rounded bg-surface border border-color shadow-sm d-flex justify-content-between align-items-center">
                                <div>
                                    <Badge bg="success" className="mb-1 uppercase x-small fw-black">Expediente Oficial</Badge>
                                    <h6 className="fw-black m-0">{e.number}</h6>
                                    <small className="text-muted small">{e.title}</small>
                                </div>
                                <Button variant="link" className="text-primary p-0" title="Ver Detalles"><ExternalLink size={18}/></Button>
                            </div>
                        ))}

                        {/* Mostrar Fichas de Instalación (Legacy/Manual) */}
                        {asset.install_records?.map((r: any, idx: number) => (
                            <div key={`install-${idx}`} className="mb-4 p-4 rounded bg-surface-muted border-start border-4 border-primary shadow-sm">
                               <div className="d-flex justify-content-between align-items-start mb-3">
                                  <div>
                                     <Badge bg="primary" className="mb-2 uppercase fw-black">Ficha de Despliegue</Badge>
                                     <h5 className="fw-black m-0">{r.gde_number || 'SIN NÚMERO GDE'}</h5>
                                     <small className="text-muted fw-bold uppercase x-small">Registrado el {new Date(r.created_at).toLocaleString()}</small>
                                  </div>
                                  <FileText size={32} className="text-primary opacity-25" />
                               </div>
                               <Row className="g-3">
                                  <Col md={6}>
                                     <label className="x-small fw-black text-muted uppercase d-block">Instalador</label>
                                     <div className="small fw-bold d-flex align-items-center mt-1"><UserCheck size={14} className="me-2 text-success"/> {r.tecnico_instalacion || '---'}</div>
                                  </Col>
                                  <Col md={6}>
                                     <label className="x-small fw-black text-muted uppercase d-block">Observaciones</label>
                                     <p className="small mb-0 italic">"{r.observations || 'Sin observaciones.'}"</p>
                                  </Col>
                               </Row>
                            </div>
                        ))}
                      </>
                    )}
                  </Tab>

                  <Tab eventKey="history" title={<span><History size={16} className="me-1"/> LOG DE EVENTOS</span>} className="p-4">
                    <div className="timeline">
                      {asset.location_history?.map((h: any, idx: number) => (
                        <div key={idx} className="timeline-item pb-3 border-start ps-3 position-relative">
                          <div className="dot position-absolute bg-primary rounded-circle" style={{width:'10px', height:'10px', left:'-5px', top:'5px'}}></div>
                          <div className="small fw-black text-muted">{new Date(h.created_at).toLocaleString()}</div>
                          <div className="small mt-1">
                              <span className="fw-bold">{h.reason || 'Sincronización de sistema'}</span>
                              <div className="x-small text-muted mt-1 uppercase fw-bold">Operador: {h.changed_by_name || 'System Auto'}</div>
                          </div>
                        </div>
                      ))}
                      {(!asset.location_history || asset.location_history.length === 0) && <p className="text-center py-4 text-muted small">No hay historial disponible.</p>}
                    </div>
                  </Tab>

                  <Tab eventKey="tickets" title={<span><Ticket size={16} className="me-1"/> TICKETS ({assetTickets.length})</span>} className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-black uppercase x-small tracking-widest text-muted m-0">Historial de Incidencias</h6>
                      <Button variant="primary" size="sm" onClick={() => router.push(`/tickets/new?asset_id=${asset.id}`)} className="fw-bold rounded-pill px-3 shadow-sm">
                        <Plus size={14} className="me-1"/> ABRIR TICKET
                      </Button>
                    </div>
                    {/* Tabla de tickets igual que antes pero con estilo black label */}
                    <Table hover responsive className="small align-middle border-0">
                        <thead className="bg-light text-muted x-small fw-black uppercase">
                            <tr><th className="ps-3 border-0">Asunto</th><th className="border-0">Estado</th><th className="text-end pe-3 border-0">Fecha</th></tr>
                        </thead>
                        <tbody>
                            {assetTickets.map(t => (
                                <tr key={t.id} className="cursor-pointer border-bottom" onClick={() => router.push(`/tickets/${t.id}`)}>
                                    <td className="ps-3 fw-bold text-primary">{t.title}</td>
                                    <td><Badge bg={t.status === 'open' ? 'danger' : 'secondary'} className="x-small">{(t.status || 'open').toUpperCase()}</Badge></td>
                                    <td className="text-end pe-3 text-muted fw-bold">{new Date(t.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <GdeModal 
        show={showGdeModal} 
        onHide={() => setShowGdeModal(false)}
        onSave={handleLinkGde}
        number={gdeNumber}
        setNumber={setGdeNumber}
        title={gdeTitle}
        setTitle={setGdeTitle}
        saving={savingGde}
      />

      <style jsx global>{`
        .fw-black { font-weight: 900; }
        .x-small { font-size: 10px; }
        .custom-tabs .nav-link { border: none; color: #adb5bd; font-weight: 900; padding: 1rem 1.5rem; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
        .custom-tabs .nav-link.active { color: var(--bs-primary); border-bottom: 3px solid var(--bs-primary); background: transparent; }
        .timeline-item:last-child { border-left: none !important; }
      `}</style>
    </Layout>
  );
};

/* Modal Component */
const GdeModal = ({ show, onHide, onSave, number, setNumber, title, setTitle, saving }: any) => (
    <Modal show={show} onHide={onHide} centered contentClassName="bg-surface border-primary border-opacity-25 shadow-lg">
        <Modal.Header closeButton className="border-color">
            <Modal.Title className="fw-black x-small uppercase text-primary">Vincular Expediente Administrativo</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
            <Form>
                <Form.Group className="mb-3">
                    <Form.Label className="x-small fw-bold text-muted uppercase">Número de Expediente / GDE</Form.Label>
                    <Form.Control 
                        placeholder="EX-2026-..." 
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        className="bg-surface text-main border-color fw-bold"
                    />
                </Form.Group>
                <Form.Group>
                    <Form.Label className="x-small fw-bold text-muted uppercase">Referencia / Título (Opcional)</Form.Label>
                    <Form.Control 
                        placeholder="ej: Acta de Instalación Sala 4" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-surface text-main border-color"
                    />
                </Form.Group>
            </Form>
        </Modal.Body>
        <Modal.Footer className="border-color">
            <Button variant="outline-primary" size="sm" className="fw-bold" onClick={onHide}>CANCELAR</Button>
            <Button variant="primary" size="sm" className="fw-bold px-4" onClick={onSave} disabled={saving || !number}>
                {saving ? <Spinner size="sm" /> : 'VINCULAR'}
            </Button>
        </Modal.Footer>
    </Modal>
);

export default AssetDetailPage;