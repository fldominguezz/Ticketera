import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { 
 Monitor, Network, ShieldCheck, Save, ChevronLeft, UserCheck, Plus, Trash2, Hash, MapPin, Activity, HardDrive
} from 'lucide-react';
import { 
 Container, Row, Col, Card, Form, Button, Badge, Alert, ListGroup, InputGroup, Spinner
} from 'react-bootstrap';

const AssetInstallPage = () => {
 const router = useRouter();
 const { user } = useAuth();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [users, setUsers] = useState<any[]>([]);
 const [locations, setLocations] = useState<any[]>([]);
 const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);

 const [globalData, setGlobalData] = useState({
  responsible_user_id: '',
  tecnico_instalacion_id: '',
  tecnico_carga_id: user?.id || '',
  gde_number: '',
  status: 'tagging_pending',
 });

 useEffect(() => {
  if (user && !globalData.tecnico_carga_id) {
    setGlobalData(prev => ({ ...prev, tecnico_carga_id: user.id }));
  }
 }, [user]);

 const [devices, setDevices] = useState([{
  id: Math.random().toString(36).substr(2, 9),
  hostname: '',
  serial: '',
  mac_address: '',
  ip_address: '',
  dependencia: '',
  codigo_dependencia: '',
  location_id: '',
  device_type: 'desktop',
  os_name: 'Windows 10',
  av_product: 'ESET CLOUD',
  observations: '',
 }]);

 useEffect(() => {
  fetchUsers();
  fetchLocations();
 }, []);

 const fetchUsers = async () => {
  try {
   const token = localStorage.getItem('access_token');
   const res = await fetch('/api/v1/users', { headers: { 'Authorization': `Bearer ${token}` } });
   if (res.ok) {
    const data = await res.json();
    const filtered = data.filter((u: any) => !['fortisiem', 'system'].includes((u.username || '').toLowerCase()));
    setUsers(filtered);
   }
  } catch (err) { console.error(err); }
 };

 const fetchLocations = async () => {
  try {
   const token = localStorage.getItem('access_token');
   const res = await fetch('/api/v1/locations', { headers: { 'Authorization': `Bearer ${token}` } });
   if (res.ok) setLocations(await res.json());
  } catch (err) { console.error(err); }
 };

 const handleDeviceChange = (id: string, e: any) => {
  const { name, value } = e.target;
  setDevices(prev => prev.map(dev => {
   if (dev.id === id) {
    let val = value;
    if (name === 'codigo_dependencia') val = value.replace(/\D/g, '');
    if (name === 'mac_address') {
      val = value.replace(/[^0-9a-fA-F]/g, '').substring(0, 12).match(/.{1,2}/g)?.join(':')?.toUpperCase() || value.toUpperCase();
    }
    return { ...dev, [name]: val };
   }
   return dev;
  }));
 };

 const selectLocation = (deviceId: string, loc: any) => {
  setDevices(prev => prev.map(dev => {
   if (dev.id === deviceId) {
    return { 
     ...dev, dependencia: loc.name, codigo_dependencia: loc.dependency_code || '', location_id: loc.id
    };
   }
   return dev;
  }));
  setActiveSuggestion(null);
 };

 const addDevice = () => {
  setDevices(prev => [...prev, {
   id: Math.random().toString(36).substr(2, 9),
   hostname: '', serial: '', mac_address: '', ip_address: '', dependencia: '',
   codigo_dependencia: '', location_id: '', device_type: 'desktop',
   os_name: 'Windows 10', av_product: 'ESET CLOUD', observations: '',
  }]);
 };

 const removeDevice = (id: string) => {
  if (devices.length > 1) setDevices(prev => prev.filter(dev => dev.id !== id));
 };

 const handleSubmit = async (e: any) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  // Obtener nombres de los técnicos seleccionados para el payload
  const inst = users.find(u => u.id === globalData.tecnico_instalacion_id);
  // El técnico de carga eres TÚ (el usuario logueado)
  const tecnicoCargaNombre = user ? `${user.first_name} ${user.last_name}` : 'Sistema';

  try {
   const token = localStorage.getItem('access_token');
   for (const dev of devices) {
    const payload = {
     asset_data: {
      hostname: dev.hostname,
      serial: dev.serial,
      mac_address: dev.mac_address,
      ip_address: dev.ip_address,
      device_type: dev.device_type,
      os_name: dev.os_name,
      av_product: dev.av_product,
      dependencia: dev.dependencia,
      codigo_dependencia: dev.codigo_dependencia,
      status: globalData.status,
      observations: dev.observations,
      responsible_user_id: globalData.responsible_user_id || null,
      location_node_id: dev.location_id || null
     },
     install_data: {
      gde_number: globalData.gde_number,
      tecnico_instalacion: inst ? `${inst.first_name} ${inst.last_name}` : '',
      tecnico_carga: tecnicoCargaNombre,
      install_details: { os: dev.os_name, av: dev.av_product },
      observations: dev.observations
     }
    };

    const res = await fetch('/api/v1/assets/install', {
     method: 'POST',
     headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
     body: JSON.stringify(payload)
    });

    if (!res.ok) {
     const data = await res.json();
     throw new Error(`Error en equipo ${dev.hostname}: ${data.detail}`);
    }
   }
   router.push('/inventory');
  } catch (err: any) {
   setError(err.message);
  } finally {
   setLoading(false);
  }
 };

 return (
  <Layout title="Nueva Ficha de Instalación">
   <Container className="py-2">
    <div className="mb-4 d-flex align-items-center">
     <Button variant="link" onClick={() => router.back()} className="p-0 me-3 text-body">
      <ChevronLeft size={24} />
     </Button>
     <h4 className="mb-0 fw-black uppercase tracking-tighter">System Asset Deployment</h4>
    </div>

    {error && <Alert variant="danger" dismissible>{error}</Alert>}

    <Form onSubmit={handleSubmit}>
     <Row>
      <Col lg={8}>
       <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-transparent py-3 border-0 d-flex align-items-center">
         <UserCheck className="me-2 text-primary" size={20} />
         <h6 className="mb-0 fw-bold uppercase x-small tracking-widest">Información de Personal y Gestión</h6>
        </Card.Header>
        <Card.Body>
         <Row className="g-3">
          <Col md={6}>
           <Form.Group>
            <Form.Label className="x-small fw-bold text-muted uppercase">Técnico Responsable (Patrimonio) *</Form.Label>
            <Form.Select value={globalData.responsible_user_id} onChange={(e:any) => setGlobalData({...globalData, responsible_user_id: e.target.value})} required className="border-0 shadow-sm fw-bold bg-surface-muted">
             <option value="">Seleccionar...</option>
             {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </Form.Select>
           </Form.Group>
          </Col>
          <Col md={6}>
           <Form.Group>
            <Form.Label className="x-small fw-bold text-muted uppercase">Estado de Entrega</Form.Label>
            <Form.Select value={globalData.status} onChange={(e:any) => setGlobalData({...globalData, status: e.target.value})} className="border-0 shadow-sm fw-bold text-primary bg-surface-muted">
             <option value="tagging_pending">Pendiente a Etiquetar</option>
             <option value="operative">Operativo</option>
             <option value="maintenance">Mantenimiento</option>
            </Form.Select>
           </Form.Group>
          </Col>
          <Col md={6}>
           <Form.Group>
            <Form.Label className="x-small fw-bold text-muted uppercase">Técnico Instalador (Campo) *</Form.Label>
            <Form.Select value={globalData.tecnico_instalacion_id} onChange={(e:any) => setGlobalData({...globalData, tecnico_instalacion_id: e.target.value})} required className="border-0 shadow-sm fw-bold bg-surface-muted">
             <option value="">Seleccionar técnico...</option>
             {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </Form.Select>
           </Form.Group>
          </Col>
          <Col md={12}>
           <Form.Group>
            <Form.Label className="x-small fw-bold text-muted uppercase">Número de GDE / Expediente</Form.Label>
            <Form.Control value={globalData.gde_number} onChange={(e:any) => setGlobalData({...globalData, gde_number: e.target.value})} className="border-0 shadow-sm fw-bold bg-surface-muted" placeholder="EX-202X-..." />
           </Form.Group>
          </Col>
         </Row>
        </Card.Body>
       </Card>

       {devices.map((device, index) => (
        <Card key={device.id} className="border-0 shadow-lg mb-4 border-start border-4 border-primary overflow-visible">
         <Card.Body>
          <div className="d-flex justify-content-between mb-3">
           <Badge bg="primary" className="fw-black">UNIDAD #{index + 1}</Badge>
           {devices.length > 1 && <Button variant="link" className="text-danger p-0" onClick={() => removeDevice(device.id)}><Trash2 size={16}/></Button>}
          </div>

          <Row className="g-3">
           <Col md={4}>
            <Form.Group>
             <Form.Label className="x-small fw-bold text-muted uppercase">Hostname *</Form.Label>
             <Form.Control size="sm" name="hostname" value={device.hostname} onChange={(e) => handleDeviceChange(device.id, e)} required className="fw-bold border-0 bg-surface-muted" />
            </Form.Group>
           </Col>
           <Col md={4}>
            <Form.Group>
             <Form.Label className="x-small fw-bold text-muted uppercase">IP Address *</Form.Label>
             <Form.Control size="sm" name="ip_address" value={device.ip_address} onChange={(e) => handleDeviceChange(device.id, e)} required className="fw-bold border-0 bg-surface-muted font-monospace" placeholder="0.0.0.0" />
            </Form.Group>
           </Col>
           <Col md={4}>
            <Form.Group>
             <Form.Label className="x-small fw-bold text-muted uppercase">MAC Address *</Form.Label>
             <Form.Control size="sm" name="mac_address" value={device.mac_address} onChange={(e) => handleDeviceChange(device.id, e)} required className="fw-bold border-0 bg-surface-muted font-monospace" placeholder="00:00:00:00:00:00" />
            </Form.Group>
           </Col>

           <Col md={8} className="position-relative">
            <Form.Group>
             <Form.Label className="x-small fw-bold text-muted uppercase">Dependencia *</Form.Label>
             <InputGroup size="sm">
              <InputGroup.Text className="bg-surface-muted border-0"><MapPin size={12}/></InputGroup.Text>
              <Form.Control name="dependencia" value={device.dependencia} onChange={(e) => { handleDeviceChange(device.id, e); setActiveSuggestion(device.id + '_name'); }} required className="fw-bold border-0 bg-surface-muted" autoComplete="off" placeholder="Buscar por nombre..." />
             </InputGroup>
             {activeSuggestion === device.id + '_name' && (device.dependencia || '').length > 1 && (
              <ListGroup className="position-absolute w-100 shadow-lg z-3 mt-1">
               {locations.filter(l => (l.name || '').toLowerCase().includes((device.dependencia || '').toLowerCase())).map(l => (
                <ListGroup.Item key={l.id} action onClick={() => selectLocation(device.id, l)} className="d-flex justify-content-between align-items-center x-small py-2 border-0 bg-surface">
                 <span className="fw-bold text-primary">{l.name}</span>
                 <Badge bg="secondary" className="text-body">{l.dependency_code}</Badge>
                </ListGroup.Item>
               ))}
              </ListGroup>
             )}
            </Form.Group>
           </Col>

           <Col md={4} className="position-relative">
            <Form.Group>
             <Form.Label className="x-small fw-bold text-muted uppercase">Código DEP</Form.Label>
             <InputGroup size="sm">
              <InputGroup.Text className="bg-surface-muted border-0"><Hash size={12}/></InputGroup.Text>
              <Form.Control name="codigo_dependencia" value={device.codigo_dependencia} onChange={(e) => { handleDeviceChange(device.id, e); setActiveSuggestion(device.id + '_code'); }} className="fw-black border-0 bg-surface-muted font-monospace text-primary" placeholder="Ej: 1601" />
             </InputGroup>
             {activeSuggestion === device.id + '_code' && device.codigo_dependencia.length >= 2 && (
              <ListGroup className="position-absolute w-100 shadow-lg z-3 mt-1">
               {locations.filter(l => l.dependency_code?.includes(device.codigo_dependencia)).map(l => (
                <ListGroup.Item key={l.id} action onClick={() => selectLocation(device.id, l)} className="d-flex flex-column x-small py-2 border-0 bg-surface">
                 <div className="fw-black text-primary">#{l.dependency_code}</div>
                 <div className="text-muted text-truncate" style={{fontSize: '9px'}}>{l.name}</div>
                </ListGroup.Item>
               ))}
              </ListGroup>
             )}
            </Form.Group>
           </Col>

           <Col md={3}>
            <Form.Group>
             <Form.Label className="x-small fw-bold text-muted uppercase">Tipo Equipo</Form.Label>
             <Form.Select size="sm" name="device_type" value={device.device_type} onChange={(e) => handleDeviceChange(device.id, e)} className="fw-bold border-0 bg-surface-muted">
              <option value="desktop">PC Escritorio</option>
              <option value="notebook">Notebook</option>
              <option value="server">Servidor</option>
              <option value="mobile">Celular</option>
             </Form.Select>
            </Form.Group>
           </Col>
           <Col md={3}>
            <Form.Group>
             <Form.Label className="x-small fw-bold text-muted uppercase">S.O. *</Form.Label>
             <Form.Control size="sm" name="os_name" value={device.os_name} onChange={(e) => handleDeviceChange(device.id, e)} required className="fw-bold border-0 bg-surface-muted" />
            </Form.Group>
           </Col>
           <Col md={3}>
            <Form.Group>
             <Form.Label className="x-small fw-bold text-muted uppercase">Antivirus / EDR</Form.Label>
             <Form.Select size="sm" name="av_product" value={device.av_product} onChange={(e) => handleDeviceChange(device.id, e)} className="fw-bold border-0 bg-surface-muted">
              <option value="ESET CLOUD">ESET Cloud</option>
              <option value="FortiClient EMS">FortiClient EMS</option>
              <option value="Windows Defender">Windows Defender</option>
              <option value="FortiEDR">FortiEDR</option>
              <option value="AV FREE">AV FREE</option>
             </Form.Select>
            </Form.Group>
           </Col>
           <Col md={3}>
            <Form.Group>
             <Form.Label className="x-small fw-bold text-muted uppercase">Nro Serial</Form.Label>
             <Form.Control size="sm" name="serial" value={device.serial} onChange={(e) => handleDeviceChange(device.id, e)} className="fw-bold border-0 bg-surface-muted font-monospace" placeholder="SN-..." />
            </Form.Group>
           </Col>

           <Col md={12}>
            <Form.Group>
             <Form.Label className="x-small fw-bold text-muted uppercase">Observaciones Obligatorias *</Form.Label>
             <Form.Control as="textarea" rows={1} name="observations" value={device.observations} onChange={(e) => handleDeviceChange(device.id, e)} required className="fw-bold border-0 bg-surface-muted" placeholder="Indique detalles de la instalación..." />
            </Form.Group>
           </Col>
          </Row>
         </Card.Body>
        </Card>
       ))}

       <Button variant="outline-primary" onClick={addDevice} className="w-100 py-3 border-dashed fw-bold mb-5">
        <Plus size={20} className="me-2" /> AGREGAR OTRO EQUIPO AL REGISTRO
       </Button>
      </Col>

      <Col lg={4}>
       <Card className="border-0 shadow-lg sticky-top bg-surface" style={{ top: '100px', borderRadius: '16px' }}>
        <Card.Body className="p-4 text-center">
         <Activity className="text-primary mb-3 mx-auto" size={48} />
         <h5 className="fw-black uppercase m-0">Protocolo de Carga</h5>
         <p className="small text-muted mb-4 mt-1">Garantice la integridad de los datos obligatorios antes de confirmar.</p>
         <Button variant="primary" size="lg" type="submit" disabled={loading} className="w-100 fw-black rounded-pill shadow">
          {loading ? <Spinner size="sm" /> : 'DESPLEGAR ACTIVOS'}
         </Button>
        </Card.Body>
       </Card>
      </Col>
     </Row>
    </Form>
   </Container>

   <style jsx>{`
    .fw-black { font-weight: 900; }
    .x-small { font-size: 10px; }
    .border-dashed { border-style: dashed !important; border-width: 2px !important; }
   `}</style>
  </Layout>
 );
};

export default AssetInstallPage;