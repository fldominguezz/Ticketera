import { sanitizeId } from "../../../utils/security";
import { sanitizeParam } from "../../utils/security";
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
    const res = await fetch("/api/v1/" + String(id).replace(/[^a-zA-Z0-9-]/g, "")).replace(/[^a-zA-Z0-9-/]/g, "")}`)}/expedientes`, {
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
   const res = await fetch("/api/v1/" + String(id).replace(/[^a-zA-Z0-9-]/g, "")).replace(/[^a-zA-Z0-9-/]/g, "")}`)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
   });
   if (res.ok) {
    const data = await res.json();
    // El backend devuelve un objeto con { items: [], total: ... }
    if (data && Array.isArray(data.items)) {
      setAssetTickets(data.items);
    } else {
      setAssetTickets(Array.isArray(data) ? data : []);
    }
   }
  } catch (err) { console.error(err); } finally { setLoadingTickets(false); }
 };

 const fetchAssetDetails = async () => {
  try {
   const token = localStorage.getItem('access_token');
   const res = await fetch("/api/v1/" + String(id).replace(/[^a-zA-Z0-9-]/g, "")).replace(/[^a-zA-Z0-9-/]/g, "")}`)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
   });
   if (!res.ok) throw new Error('Equipo no encontrado');
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
      {/* PERSONAL TÉCNICO INVOLUCRADO */}
      <Card className="border-0 shadow-lg mb-4 bg-primary bg-opacity-10" style={{borderRadius: '16px', border: '1px solid rgba(var(--bs-primary-rgb), 0.2)'}}>
       <Card.Body className="p-4">
         <h6 className="fw-black mb-4 uppercase x-small tracking-widest text-primary d-flex align-items-center">
          <UserCheck size={16} className="me-2"/> Personal Técnico
         </h6>
         
         <div className="mb-4">
          <label className="x-small fw-black text-muted uppercase d-block mb-2">Responsable de Patrimonio</label>
          <div className="d-flex align-items-center gap-2 p-2 bg-white rounded shadow-sm">
            <div className="avatar bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{width: 32, height: 32, fontSize: '12px'}}>
             {asset.responsible_user ? `${asset.responsible_user.first_name[0]}${asset.responsible_user.last_name[0]}` : '?'}
            </div>
            <div className="fw-bold ">
             {asset.responsible_user ? `${asset.responsible_user.first_name} ${asset.responsible_user.last_name}` : 'No definido'}
            </div>
          </div>
         </div>

         {asset.install_records && asset.install_records.length > 0 && (
          <div className="mt-2 border-top pt-3 border-primary ">
           <Row className="g-3">
             {(() => {
              const sortedRecords = [...asset.install_records].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              const latestRecord = sortedRecords[0];
              return (
                <>
                 <Col xs={12}>
                  <label className="x-small fw-bold text-muted uppercase d-block mb-1">Último Instalador (Campo)</label>
                  <div className="small fw-black text-main d-flex align-items-center">
                    <div className="p-1 bg-success bg-opacity-10 text-success rounded me-2"><UserCheck size={14}/></div>
                    {latestRecord.tecnico_instalacion || '---'}
                  </div>
                 </Col>
                 <Col xs={12}>
                  <label className="x-small fw-bold text-muted uppercase d-block mb-1">Última Carga de Datos</label>
                  <div className="small fw-black text-main d-flex align-items-center">
                    <div className="p-1 bg-info bg-opacity-10 text-info rounded me-2"><Activity size={14}/></div>
                    {latestRecord.tecnico_carga || '---'}
                  </div>
                 </Col>
                </>
              );
             })()}
           </Row>
          </div>
         )}
       </Card.Body>
      </Card>

      {/* UBICACIÓN Y DEPENDENCIA */}
      <Card className="border-0 shadow-sm mb-4 bg-card overflow-hidden" style={{borderRadius: '16px'}}>
       <div className="bg-surface-muted p-3 border-bottom">
         <h6 className="fw-black m-0 uppercase x-small tracking-widest text-muted d-flex align-items-center">
          <MapPin size={14} className="me-2"/> Asignación Organizativa
         </h6>
       </div>
       <Card.Body className="p-4">
         <div className="mb-3">
          <label className="x-small fw-black text-muted uppercase d-block mb-1">Dependencia Oficial</label>
          <div className="h5 fw-bold text-main mb-0">{asset.location?.name || 'SIN ASIGNAR'}</div>
         </div>
         <div>
          <label className="x-small fw-black text-muted uppercase d-block mb-1">Código DEP</label>
          <div className="fw-black text-primary font-monospace h6">#{asset.location?.dependency_code || '---'}</div>
         </div>
       </Card.Body>
      </Card>

      {/* ESPECIFICACIONES TÉCNICAS */}
      <Card className="border-0 shadow-sm mb-4">
       <Card.Body className="p-4">
        <h6 className="fw-black mb-3 d-flex align-items-center uppercase x-small tracking-widest text-muted">
         <Monitor size={16} className="me-2 text-primary" /> Hardware y Red
        </h6>
        <div className="small border-bottom py-2 d-flex justify-content-between align-items-center">
         <span className="text-muted fw-bold">NRO SERIE</span>
         <span className="fw-black font-monospace">{asset.serial || 'N/A'}</span>
        </div>
        <div className="small border-bottom py-2 d-flex justify-content-between align-items-center">
         <span className="text-muted fw-bold">DIRECCIÓN MAC</span>
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
         <Shield size={16} className="me-2 text-success" /> Software y Seguridad
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
            {([...(asset.install_records || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())).map((r: any, idx: number) => (
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
                 <Col md={4}>
                   <label className="x-small fw-black text-muted uppercase d-block">Instalador</label>
                   <div className="small fw-bold d-flex align-items-center mt-1"><UserCheck size={14} className="me-2 text-success"/> {r.tecnico_instalacion || '---'}</div>
                 </Col>
                 <Col md={4}>
                   <label className="x-small fw-black text-muted uppercase d-block">Carga de Datos</label>
                   <div className="small fw-bold d-flex align-items-center mt-1"><Activity size={14} className="me-2 text-info"/> {r.tecnico_carga || '---'}</div>
                 </Col>
                 <Col md={4}>
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
           {asset.event_logs?.map((log: any, idx: number) => {
            const getEventIcon = (type: string) => {
             switch(type) {
              case 'move': return <MapPin size={12} className="text-warning"/>;
              case 'status_change': return <Activity size={12} className="text-info"/>;
              case 'ticket_created': return <Ticket size={12} className="text-danger"/>;
              case 'expediente_linked': return <FileText size={12} className="text-success"/>;
              case 'install': return <Plus size={12} className="text-primary"/>;
              default: return <div className="dot bg-primary rounded-circle" style={{width:'8px', height:'8px'}}></div>;
             }
            };

            return (
             <div key={log.id || idx} className="timeline-item pb-4 border-start ps-4 position-relative">
              <div className="position-absolute d-flex align-items-center justify-content-center bg-surface border border-color rounded-circle shadow-sm" style={{width:'24px', height:'24px', left:'-12px', top:'0px', zIndex: 2}}>
                {getEventIcon(log.event_type)}
              </div>
              <div className="small fw-black text-muted mb-1">
                {new Date(log.created_at).toLocaleString()}
              </div>
              <div className="bg-surface border border-color p-3 rounded-3 shadow-sm shadow-hover transition-all">
                <div className="fw-bold text-main">{log.description}</div>
                {log.user && (
                 <div className="x-small text-muted mt-2 d-flex align-items-center gap-1 uppercase fw-bold">
                   <UserCheck size={10}/> Operador: {log.user.first_name} {log.user.last_name}
                 </div>
                )}
              </div>
             </div>
            );
           })}
           {(!asset.event_logs || asset.event_logs.length === 0) && (
            <div className="text-center py-5">
              <History size={48} className="text-muted opacity-10 mb-3"/>
              <p className="text-muted small italic">No hay historial de eventos registrado para este equipo.</p>
            </div>
           )}
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
            <thead className="text-muted x-small fw-black uppercase">
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
        <Form.Group className="mb-3" controlId="gde-number">
          <Form.Label className="x-small fw-bold text-muted uppercase">Número de Expediente / GDE</Form.Label>
          <Form.Control 
            id="gde-number"
            name="number"
            placeholder="EX-2026-..." 
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="bg-surface text-main border-color fw-bold"
          />
        </Form.Group>
        <Form.Group controlId="gde-title">
          <Form.Label className="x-small fw-bold text-muted uppercase">Referencia / Título (Opcional)</Form.Label>
          <Form.Control 
            id="gde-title"
            name="title"
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