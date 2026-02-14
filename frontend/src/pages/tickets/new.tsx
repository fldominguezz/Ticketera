import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Container, Card, Form, Button, Row, Col, Spinner, Alert, ListGroup, Badge, InputGroup } from 'react-bootstrap';
import { Save, ArrowLeft, AlertCircle, Monitor, Search, X, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import RichTextEditor from '../../components/common/RichTextEditor';

export default function NewTicketPage() {
 const { t } = useTranslation();
 const router = useRouter();
 const { asset_id } = router.query;
 const { user: currentUser, isSuperuser } = useAuth();

 const [loading, setLoading] = useState(false);
 const [fetching, setFetching] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [ticketTypes, setTicketTypes] = useState<any[]>([]);
 const [groups, setGroups] = useState<any[]>([]);
 const [users, setUsers] = useState<any[]>([]);
 const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
 
 // Asset search states
 const [assets, setAssets] = useState<any[]>([]);
 const [assetSearch, setAssetSearch] = useState('');
 const [searchingAssets, setSearchingAssets] = useState(false);
 const [selectedAsset, setSelectedAsset] = useState<any>(null);
 const [showAssetResults, setShowAssetResults] = useState(false);
 const searchRef = useRef<HTMLDivElement>(null);

 // Location search states
 const [locations, setLocations] = useState<any[]>([]);
 const [locationSearch, setLocationSearch] = useState('');
 const [searchingLocations, setSearchingLocations] = useState(false);
 const [selectedLocation, setSelectedLocation] = useState<any>(null);
 const [showLocationResults, setShowLocationResults] = useState(false);
 const locationSearchRef = useRef<HTMLDivElement>(null);

 const [formData, setFormData] = useState({
  title: '',
  description: '',
  ticket_type_id: '',
  group_id: '',
  assigned_to_id: '',
  priority: 'medium',
  platform: 'INTERNO',
  is_private: false,
  asset_id: (asset_id as string) || '',
  location_id: ''
 });

 const PLATFORMS = [
  'Forti-EMS', 'ESET CLOUD', 'ESET BIENESTAR', 
  'Forti-SIEM', 'Forti-ANALYZER', 'GDE', 'INTERNO'
 ];

 useEffect(() => {
  fetchMetadata();
  // Handle click outside for asset and location search results
  const handleClickOutside = (event: MouseEvent) => {
   if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
    setShowAssetResults(false);
   }
   if (locationSearchRef.current && !locationSearchRef.current.contains(event.target as Node)) {
    setShowLocationResults(false);
   }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 useEffect(() => {
  if (asset_id && assets.length > 0) {
   const found = assets.find(a => a.id === asset_id);
   if (found) {
    setSelectedAsset(found);
    setFormData(prev => ({ ...prev, asset_id: asset_id as string }));
   }
  }
 }, [asset_id, assets]);

 const fetchMetadata = async () => {
  try {
   const token = localStorage.getItem('access_token');
   if (!token) {
    router.push('/login');
    return;
   }

   const [typesRes, groupsRes, usersRes] = await Promise.all([
    fetch('/api/v1/ticket-types', { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch('/api/v1/groups', { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch('/api/v1/users', { headers: { 'Authorization': `Bearer ${token}` } })
   ]);

   if (typesRes.ok && groupsRes.ok && usersRes.ok) {
    const typesData = await typesRes.json();
    const groupsData = await groupsRes.json();
    const usersData = await usersRes.json();
    
    setUsers(Array.isArray(usersData) ? usersData : []);
    
    const filteredTypes = Array.isArray(typesData) 
     ? typesData.filter((t: any) => t.name !== 'FortiSIEM')
     : [];
    setTicketTypes(filteredTypes);
    
    // --- LÓGICA DE JERARQUÍA DE GRUPOS ---
    let filteredGroups = Array.isArray(groupsData) ? groupsData : [];
    const userGroupId = currentUser?.group_id;

    if (userGroupId && !isSuperuser) {
     const myGroup = filteredGroups.find((g: any) => g.id === userGroupId);
     const getDescendants = (parentId: string): any[] => {
      const children = filteredGroups.filter((g: any) => g.parent_id === parentId);
      return children.reduce((acc, child) => [...acc, child, ...getDescendants(child.id)], [] as any[]);
     };
     const descendants = getDescendants(userGroupId);
     filteredGroups = myGroup ? [myGroup, ...descendants] : descendants;
    }
    
    setGroups(filteredGroups);
    
    if (filteredTypes.length > 0) setFormData(prev => ({ ...prev, ticket_type_id: filteredTypes[0].id }));
    if (filteredGroups.length > 0) {
     const defaultGroup = filteredGroups.find((g: any) => g.id === userGroupId) || filteredGroups[0];
     setFormData(prev => ({ ...prev, group_id: defaultGroup.id }));
    }
   }
  } catch (e) {
   console.error(e);
  } finally {
   setFetching(false);
  }
 };

 // Búsqueda dinámica de activos
 const searchRemoteAssets = async (query: string) => {
  if (query.length < 2) return;
  setSearchingAssets(true);
  try {
   const res = await api.get('/assets/search', { params: { search: query } });
   setAssets(res.data.assets || []);
  } catch (err) {
   console.error('Error searching assets:', err);
  } finally {
   setSearchingAssets(false);
  }
 };

 // Búsqueda dinámica de ubicaciones
 const searchRemoteLocations = async (query: string) => {
  if (query.length < 2) return;
  setSearchingLocations(true);
  try {
   const res = await api.get('/locations', { params: { q: query, size: 20 } });
   // La API devuelve un objeto paginado { items: [], total: ... }
   const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
   setLocations(items);
  } catch (err) {
   console.error('Error searching locations:', err);
   setLocations([]);
  } finally {
   setSearchingLocations(false);
  }
 };

 useEffect(() => {
  if (assetSearch.length >= 2) {
   const timer = setTimeout(() => searchRemoteAssets(assetSearch), 400);
   return () => clearTimeout(timer);
  } else {
   setAssets([]);
  }
 }, [assetSearch]);

 useEffect(() => {
  if (locationSearch.length >= 2) {
   const timer = setTimeout(() => searchRemoteLocations(locationSearch), 400);
   return () => clearTimeout(timer);
  } else {
   setLocations([]);
  }
 }, [locationSearch]);

 const handleSelectAsset = (asset: any) => {
  setSelectedAsset(asset);
  setFormData({ ...formData, asset_id: asset.id, location_id: asset.location_id || formData.location_id });
  
  // Si el activo tiene una ubicación, intentar seleccionarla visualmente
  if (asset.location_id) {
   setSelectedLocation({ id: asset.location_id, name: asset.location_name, path: asset.location_path });
  }
  
  setAssetSearch('');
  setShowAssetResults(false);
 };

 const clearSelectedAsset = () => {
  setSelectedAsset(null);
  setFormData({ ...formData, asset_id: '' });
 };

 const handleSelectLocation = (loc: any) => {
  setSelectedLocation(loc);
  setFormData({ ...formData, location_id: loc.id });
  setLocationSearch('');
  setShowLocationResults(false);
 };

 const clearSelectedLocation = () => {
  setSelectedLocation(null);
  setFormData({ ...formData, location_id: '' });
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
   const token = localStorage.getItem('access_token');
   const payload = {
    title: formData.title,
    description: formData.description,
    priority: formData.priority,
    platform: formData.platform,
    ticket_type_id: formData.ticket_type_id || null,
    group_id: formData.is_private ? null : (formData.group_id || null),
    assigned_to_id: formData.assigned_to_id || null,
    asset_id: formData.asset_id || null,
    location_id: formData.location_id || null,
    is_private: formData.is_private,
    parent_ticket_id: null,
    attachment_ids: attachmentIds
   };

   const res = await fetch('/api/v1/tickets', {
    method: 'POST',
    headers: {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
   });

   if (res.ok) {
    const data = await res.json();
    router.push(`/tickets/${data.id}`);
   } else {
    const errData = await res.json();
    setError(typeof errData.detail === 'string' ? errData.detail : 'Failed to create ticket');
   }
  } catch (e) {
   setError('Connection error');
  } finally {
   setLoading(false);
  }
 };

 if (fetching) return <Layout title="Nuevo Ticket"><div className="text-center py-5"><Spinner animation="border" variant="primary" /></div></Layout>;

 return (
  <Layout title={t('new_ticket') || 'Nuevo Ticket'}>
   <Container className="py-2">
    <div className="mb-4 d-flex align-items-center">
     <Button variant="link" className="p-0 me-3 text-body" onClick={() => router.back()}><ArrowLeft size={24} /></Button>
     <h2 className="fw-black mb-0">CREAR NUEVO TICKET</h2>
    </div>

    {error && <Alert variant="danger" className="py-2 border-0 shadow-sm mb-4">{error}</Alert>}

    <Row className="justify-content-center">
     <Col lg={8}>
      <Form onSubmit={handleSubmit}>
       <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="p-4">
         <h6 className="fw-bold mb-4 text-uppercase text-muted small border-bottom pb-2">Información Básica</h6>
         
         <Form.Group className="mb-3" controlId="ticket-title">
          <Form.Label className="small fw-bold">Asunto / Título *</Form.Label>
          <Form.Control 
           id="ticket-title"
           name="title"
           required
           placeholder="Breve descripción del problema..."
           value={formData.title}
           onChange={e => setFormData({ ...formData, title: e.target.value })}
          />
         </Form.Group>

         <Row className="g-3 mb-3">
          <Col md={6}>
           <Form.Group controlId="ticket-platform">
            <Form.Label className="small fw-bold">Plataforma / Origen *</Form.Label>
            <Form.Select 
             id="ticket-platform"
             name="platform"
             required
             value={formData.platform}
             onChange={e => setFormData({ ...formData, platform: e.target.value })}
            >
             {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </Form.Select>
           </Form.Group>
          </Col>
          <Col md={6}>
           <Form.Group controlId="ticket-type">
            <Form.Label className="small fw-bold">Tipo de Ticket *</Form.Label>
            <Form.Select 
             id="ticket-type"
             name="ticket_type_id"
             required
             value={formData.ticket_type_id}
             onChange={e => setFormData({ ...formData, ticket_type_id: e.target.value })}
            >
             <option value="">Seleccionar...</option>
             {ticketTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Form.Select>
           </Form.Group>
          </Col>
         </Row>

         <Row className="g-3 mb-3">
          <Col md={6}>
           <Form.Group controlId="ticket-priority">
            <Form.Label className="small fw-bold">Prioridad *</Form.Label>
            <Form.Select 
             id="ticket-priority"
             name="priority"
             required
             value={formData.priority}
             onChange={e => setFormData({ ...formData, priority: e.target.value })}
            >
             <option value="low">Baja</option>
             <option value="medium">Media</option>
             <option value="high">Alta</option>
             <option value="critical">Crítica</option>
            </Form.Select>
           </Form.Group>
          </Col>
          <Col md={6}>
           {formData.is_private ? (
            <Form.Group controlId="ticket-assigned-user">
             <Form.Label className="small fw-bold text-primary">👤 Asignar a Usuario (Privado) *</Form.Label>
             <Form.Select 
              id="ticket-assigned-to-id"
              name="assigned_to_id"
              required
              value={formData.assigned_to_id}
              onChange={e => setFormData({ ...formData, assigned_to_id: e.target.value })}
             >
              <option value="">Seleccionar destinatario...</option>
              {users.filter(u => u.id !== currentUser?.id).map((u: any) => (
               <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.username})</option>
              ))}
             </Form.Select>
            </Form.Group>
           ) : (
            <Form.Group controlId="ticket-group">
             <Form.Label className="small fw-bold">Grupo Responsable *</Form.Label>
             <Form.Select 
              id="ticket-group-id"
              name="group_id"
              required
              value={formData.group_id}
              onChange={e => setFormData({ ...formData, group_id: e.target.value })}
             >
              <option value="">Seleccionar grupo...</option>
              {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
             </Form.Select>
            </Form.Group>
           )}
          </Col>
         </Row>

         <div className="mt-4 p-3 rounded-3 bg-opacity-10 border border-color bg-warning">
          <Form.Check 
           type="switch"
           id="private-ticket-switch"
           label={
            <div>
             <div className="fw-black x-small uppercase tracking-widest text-main">🔒 Ticket Privado</div>
             <div className="x-small text-muted fw-bold">Solo tú y la persona asignada podrán visualizar este ticket. El resto del grupo no tendrá acceso.</div>
            </div>
           }
           checked={formData.is_private}
           onChange={e => {
            const isPrivate = e.target.checked;
            setFormData({ 
             ...formData, 
             is_private: isPrivate,
             // Si vuelve a ser público, restaurar su grupo por defecto
             group_id: (!isPrivate && currentUser?.group_id) ? currentUser.group_id : formData.group_id
            });
           }}
           className="d-flex align-items-center gap-3 custom-switch-lg"
          />
         </div>
        </Card.Body>
       </Card>

       {/* Location Linking Section */}
       <Card className="shadow-sm border-0 mb-4 border-start border-4 border-success">
        <Card.Body className="p-4">
         <h6 className="fw-bold mb-3 text-uppercase text-success small border-bottom pb-2">Vincular Ubicación / Dependencia</h6>
         
         {!selectedLocation ? (
          <div className="position-relative" ref={locationSearchRef}>
           <Form.Group controlId="location-search">
            <InputGroup className="border rounded-pill px-3 py-1">
             <InputGroup.Text className="bg-transparent border-0"><MapPin size={18} className="text-muted" /></InputGroup.Text>
             <Form.Control 
              id="location-search-input"
              name="locationSearch"
              placeholder="Buscar dependencia o ubicación..."
              className="bg-transparent border-0 shadow-none"
              value={locationSearch}
              onChange={e => { setLocationSearch(e.target.value); setShowLocationResults(true); }}
              onFocus={() => setShowLocationResults(true)}
             />
            </InputGroup>
           </Form.Group>
           
           {showLocationResults && locationSearch.length >= 2 && (
            <Card className="position-absolute w-100 mt-2 shadow-lg border-0 z-3">
             <ListGroup variant="flush">
              {locations.length > 0 ? (
               locations.map(l => (
                <ListGroup.Item 
                 key={l.id} 
                 action 
                 className="py-2"
                 onClick={() => handleSelectLocation(l)}
                >
                 <div className="fw-bold small text-success">{l.name}</div>
                 <div className="x-small text-muted">{l.path}</div>
                </ListGroup.Item>
               ))
              ) : (
               <ListGroup.Item className="text-center py-3 text-muted small">No se encontraron ubicaciones</ListGroup.Item>
              )}
             </ListGroup>
            </Card>
           )}
          </div>
         ) : (
          <div className="p-3 bg-surface-muted rounded border d-flex justify-content-between align-items-center">
           <div className="d-flex align-items-center gap-3">
            <div className="bg-success bg-opacity-10 p-2 rounded">
             <MapPin className="text-success" size={20} />
            </div>
            <div>
             <div className="fw-bold text-success">{selectedLocation.name}</div>
             <div className="small text-muted">{selectedLocation.path}</div>
            </div>
           </div>
           <Button variant="outline-danger" size="sm" onClick={clearSelectedLocation} className="rounded-circle p-1"><X size={16} /></Button>
          </div>
         )}
        </Card.Body>
       </Card>

       {/* Asset Linking Section */}
       <Card className="shadow-sm border-0 mb-4 border-start border-4 border-primary">
        <Card.Body className="p-4">
         <h6 className="fw-bold mb-3 text-uppercase text-primary small border-bottom pb-2">Vincular Equipo del Inventario</h6>
         
         {!selectedAsset ? (
          <div className="position-relative" ref={searchRef}>
           <Form.Group controlId="asset-search">
            <InputGroup className="border rounded-pill px-3 py-1">
             <InputGroup.Text className="bg-transparent border-0"><Search size={18} className="text-muted" /></InputGroup.Text>
             <Form.Control 
              id="asset-search-input"
              name="assetSearch"
              placeholder="Buscar por Hostname, IP o MAC..."
              className="bg-transparent border-0 shadow-none"
              value={assetSearch}
              onChange={e => { setAssetSearch(e.target.value); setShowAssetResults(true); }}
              onFocus={() => setShowAssetResults(true)}
             />
            </InputGroup>
           </Form.Group>
           
           {showAssetResults && assetSearch.length >= 2 && (
            <Card className="position-absolute w-100 mt-2 shadow-lg border-0 z-3">
             <ListGroup variant="flush">
              {assets.length > 0 ? (
               assets.map(a => (
                <ListGroup.Item 
                 key={a.id} 
                 action 
                 className="d-flex justify-content-between align-items-center py-2"
                 onClick={() => handleSelectAsset(a)}
                >
                 <div>
                  <div className="fw-bold small text-primary">{a.hostname}</div>
                  <div className="x-small text-muted font-monospace">{a.ip_address} | {a.mac_address}</div>
                 </div>
                 <Badge bg="secondary" className="bg-opacity-10 text-body font-monospace x-small">{a.location_name || 'Sin Ubicación'}</Badge>
                </ListGroup.Item>
               ))
              ) : (
               <ListGroup.Item className="text-center py-3 text-muted small">No se encontraron equipos</ListGroup.Item>
              )}
             </ListGroup>
            </Card>
           )}
          </div>
         ) : (
          <div className="p-3 bg-surface-muted rounded border d-flex justify-content-between align-items-center">
           <div className="d-flex align-items-center gap-3">
            <div className="bg-primary bg-opacity-10 p-2 rounded">
             <Monitor className="text-primary" size={20} />
            </div>
            <div>
             <div className="fw-bold text-primary">{selectedAsset.hostname}</div>
             <div className="small text-muted font-monospace">
              <span className="badge bg-primary bg-opacity-10 text-primary border border-primary me-2">{selectedAsset.ip_address}</span>
              <MapPin size={12} className="me-1" /> {selectedAsset.location_name || 'Ubicación Desconocida'}
             </div>
            </div>
           </div>
           <Button variant="outline-danger" size="sm" onClick={clearSelectedAsset} className="rounded-circle p-1"><X size={16} /></Button>
          </div>
         )}
         <div className="mt-2 x-small text-muted italic">Vincular un equipo permite realizar el seguimiento técnico en el historial del activo.</div>
        </Card.Body>
       </Card>

       <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="p-4">
         <Form.Group>
          <Form.Label className="small fw-bold text-uppercase text-muted mb-3">Descripción Detallada del Incidente *</Form.Label>
          <RichTextEditor 
           value={formData.description}
           onChange={content => setFormData({ ...formData, description: content })}
           placeholder="Detalle aquí toda la información técnica... (Usa @ para mencionar)"
           users={users}
          />
         </Form.Group>
        </Card.Body>
       </Card>

       <div className="d-grid mb-5">
        <Button variant="primary" type="submit" size="lg" disabled={loading} className="fw-bold py-3 shadow">
         {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <Save size={20} className="me-2" />}
         GUARDAR Y CREAR TICKET
        </Button>
       </div>
      </Form>
     </Col>
    </Row>
   </Container>
   <style jsx>{`
    .fw-black { font-weight: 900; }
    .x-small { font-size: 10px; }
    .z-3 { z-index: 1050; }
    .custom-switch-lg .form-check-input { width: 3em; height: 1.5em; cursor: pointer; }
   `}</style>
  </Layout>
 );
}
