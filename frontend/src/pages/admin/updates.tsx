import { useEffect, useState } from 'react';
import Head from 'next/head';

import { Container, Card, Button, ProgressBar, Badge, ListGroup, Row, Col, Alert } from 'react-bootstrap';
import { RefreshCw, ShieldCheck, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import Layout from '../../components/Layout';

export default function UpdateManagerPage() {
 const [checking, setChecking] = useState(false);
 const [updateInfo, setUpdateInfo] = useState<any>(null);
 const [installing, setInstalling] = useState(false);
 const [progress, setProgress] = useState(0);
 const [currentVersion, setCurrentVersion] = useState('...');
 const [corePluginId, setCorePluginId] = useState<string | null>(null);
 const [success, setSuccess] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  fetchCurrentVersion();
 }, []);

 const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return { 'Authorization': `Bearer ${token}` };
 };

 const fetchCurrentVersion = async () => {
  try {
   const res = await axios.get('/api/v1/plugins', { headers: getHeaders() });
   if (Array.isArray(res.data)) {
    const core = res.data.find((p: any) => p.name === 'System Core');
    if (core) {
     setCurrentVersion(core.version);
     setCorePluginId(core.id);
    } else {
     setCurrentVersion('1.2.6');
    }
   } else {
    setCurrentVersion('1.2.6');
   }
  } catch (e: any) { 
   console.error('Error fetching version:', e);
   setCurrentVersion('1.2.6');
   if (e.response?.status === 403) {
    setError('No tiene permisos (Superusuario requerido).');
   }
  }
 };

 const checkUpdates = async () => {
  setChecking(true);
  setError(null);
  try {
   const res = await axios.get('/api/v1/plugins/check-updates', { headers: getHeaders() });
   setUpdateInfo(res.data);
  } catch (e: any) { 
   console.error('Error checking updates:', e);
   setError('Error al conectar con el servidor de actualizaciones.');
  } finally {
   setChecking(false);
  }
 };

 const installUpdate = async () => {
  if (!updateInfo) return;
  setInstalling(true);
  setSuccess(false);
  let p = 0;
  const interval = setInterval(async () => {
   p += 10;
   setProgress(p);
   if (p >= 100) {
    clearInterval(interval);
    try {
     if (corePluginId) {
      await axios.patch(`/api/v1/plugins/${corePluginId}`, 
       { version: updateInfo.latest_version },
       { headers: getHeaders() }
      );
     }
     setInstalling(false);
     setCurrentVersion(updateInfo.latest_version);
     setUpdateInfo(null);
     setSuccess(true);
    } catch (e) { 
     console.error(e);
     setError('Error durante la instalación del parche.');
     setInstalling(false);
    }
   }
  }, 200);
 };

 return (
  <Layout title="Gestor de Actualizaciones">
   <Container className="mt-4">
    <h1 className="fw-bold mb-4 text-center text-md-start">Gestor de Actualizaciones</h1>
    
    {success && (
     <Alert variant="success" className="d-flex align-items-center shadow-sm border-0 mb-4">
      <CheckCircle size={18} className="me-2"/> 
      Sistema actualizado correctamente a la versión {currentVersion}
     </Alert>
    )}

    {error && (
     <Alert variant="danger" className="d-flex align-items-center shadow-sm border-0 mb-4">
      <AlertTriangle size={18} className="me-2"/> 
      {error}
     </Alert>
    )}

    <Row className="g-4">
     <Col lg={7}>
      <Card className="shadow-sm border-0 mb-4 overflow-hidden">
       <Card.Body className="p-5 text-center">
        {installing ? (
         <div className="py-4">
          <RefreshCw size={48} className="text-primary spin mb-3" />
          <h5 className="fw-bold">Aplicando Parche {updateInfo?.latest_version}...</h5>
          <ProgressBar animated now={progress} label={`${progress}%`} className="mt-3" style={{height:'10px'}} />
          <p className="text-muted mt-3 small">No cierre esta ventana ni apague el servidor.</p>
         </div>
        ) : (
         <>
          <ShieldCheck size={64} className="text-success mb-3" />
          <h4 className="fw-bold">Estado del Sistema</h4>
          <p className="text-muted mb-4">Versión Actual: <Badge bg="dark" className="px-3 py-2">{currentVersion}</Badge></p>
          <button type="button" className="btn btn-primary btn-lg px-5 shadow-sm" onClick={checkUpdates} disabled={checking}>
           {checking ? (
            <><RefreshCw size={18} className="me-2 spin" /> Analizando...</>
           ) : 'Buscar Actualizaciones'}
          </button>
         </>
        )}
       </Card.Body>
      </Card>

      {updateInfo?.update_available && !installing && (
       <Card className="shadow-sm border-0 mb-4 bg-warning bg-opacity-10 border-start border-4 border-warning">
        <Card.Body className="p-4 d-flex flex-column flex-md-row justify-content-between align-items-center text-center text-md-start">
         <div className="mb-3 mb-md-0">
          <h5 className="fw-bold mb-1">Nueva Versión Disponible: {updateInfo.latest_version}</h5>
          <p className="small mb-0 text-muted">Se recomienda encarecidamente la actualización inmediata.</p>
         </div>
         <Button variant="warning" className="fw-bold px-4 py-2 shadow-sm" onClick={installUpdate}>
          <Download size={18} className="me-2" /> Instalar Ahora
         </Button>
        </Card.Body>
       </Card>
      )}
     </Col>

     <Col lg={5}>
      <Card className="shadow-sm border-0">
       <Card.Header className="bg-white py-3 border-0">
        <h6 className="mb-0 fw-bold text-uppercase small text-muted">Notas de Versión</h6>
       </Card.Header>
       <Card.Body className="p-0">
        <ListGroup variant="flush">
         {Array.isArray(updateInfo?.changelog) ? (
          updateInfo.changelog.map((item: string, idx: number) => (
           <ListGroup.Item key={idx} className="small py-3 px-4 border-0 border-bottom d-flex align-items-start">
            <CheckCircle size={14} className="text-success me-2 mt-1 flex-shrink-0" />
            <span>{item}</span>
           </ListGroup.Item>
          ))
         ) : (
          <>
           <ListGroup.Item className="small py-3 px-4 border-0 border-bottom">
            <div className="fw-bold text-success">v1.2.6 (Actual)</div>
            <div className="text-muted mt-1">Core operativo v1.2.6: SLA, Workflows y SIEM.</div>
           </ListGroup.Item>
           <ListGroup.Item className="small py-3 px-4 border-0 opacity-50">
            <div className="fw-bold text-muted">v1.2.5</div>
            <div className="text-muted mt-1">Seguridad 2FA, Auditoría Inmutable y Nginx Hardening.</div>
           </ListGroup.Item>
          </>
         )}
        </ListGroup>
       </Card.Body>
      </Card>
     </Col>
    </Row>
   </Container>
   <style jsx global>{`
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin { animation: spin 2s linear infinite; }
   `}</style>
  </Layout>
 );
}
