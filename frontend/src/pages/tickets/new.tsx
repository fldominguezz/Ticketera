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
 const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
 const [showAssetResults, setShowAssetResults] = useState(false);
 const searchRef = useRef<HTMLDivElement>(null);

 // Location search states
 const [locations, setLocations] = useState<any[]>([]);
 const [locationSearch, setLocationSearch] = useState('');
 const [searchingLocations, setSearchingLocations] = useState(false);
 const [selectedLocations, setSelectedLocations] = useState<any[]>([]);
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
  is_global: false,
  asset_id: (asset_id as string) || '',
  location_id: ''
 });

 const PLATFORMS = [
  'GENERAL', 'INTERNO', 'Forti-EMS', 'Forti-EDR', 'ESET CLOUD', 'ESET BIENESTAR', 
  'Forti-SIEM', 'Forti-ANALYZER', 'GDE', 'OTRO'
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
  // Evitar duplicados en la lista local
  if (!selectedAssets.find(a => a.id === asset.id)) {
    setSelectedAssets([...selectedAssets, asset]);
  }
  
  // Si el equipo tiene ubicación y no hay ninguna seleccionada, sugerirla
  if (asset.location_id && !selectedLocations.find(l => l.id === asset.location_id)) {
   setSelectedLocations([...selectedLocations, { id: asset.location_id, name: asset.location_name, path: asset.location_path }]);
  }
  
  setAssetSearch('');
  setShowAssetResults(false);
 };

 const removeSelectedAsset = (assetId: string) => {
  setSelectedAssets(selectedAssets.filter(a => a.id !== assetId));
 };

 const handleSelectLocation = (loc: any) => {
  if (!selectedLocations.find(l => l.id === loc.id)) {
    setSelectedLocations([...selectedLocations, loc]);
  }
  setLocationSearch('');
  setShowLocationResults(false);
 };

 const removeSelectedLocation = (locId: string) => {
  setSelectedLocations(selectedLocations.filter(l => l.id !== locId));
 };

 // Lógica de Adjuntos
 const handleFileUpload = async (files: FileList | null) => {
  if (!files) return;
  const token = localStorage.getItem('access_token');
  
  for (let i = 0; i < files.length; i++) {
   const formData = new FormData();
   formData.append('file', files[i]);
   try {
    const res = await fetch('/api/v1/attachments/upload', {
     method: 'POST',
     headers: { 'Authorization': `Bearer ${token}` },
     body: formData
    });
    if (res.ok) {
     const data = await res.json();
     setAttachmentIds(prev => [...prev, data.id]);
    }
   } catch (e) { console.error('Upload failed', e); }
  }
 };

 const removeAttachment = (id: string) => {
  setAttachmentIds(prev => prev.filter(aid => aid !== id));
 };

 // Capturar pegado de imágenes (CTRL+V)
 useEffect(() => {
  const handlePaste = (e: ClipboardEvent) => {
   const items = e.clipboardData?.items;
   if (items) {
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
     if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      if (file) files.push(file);
     }
    }
    if (files.length > 0) {
     // Convertir FileList-like a lo que espera nuestra función
     const dataTransfer = new DataTransfer();
     files.forEach(f => dataTransfer.items.add(f));
     handleFileUpload(dataTransfer.files);
    }
   }
  };
  window.addEventListener('paste', handlePaste);
  return () => window.removeEventListener('paste', handlePaste);
 }, []);

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
    group_id: (formData.is_private || formData.is_global) ? null : (formData.group_id || null),
    assigned_to_id: formData.assigned_to_id || null,
    asset_id: selectedAssets.length > 0 ? selectedAssets[0].id : null,
    asset_ids: selectedAssets.map(a => a.id),
    location_id: selectedLocations.length > 0 ? selectedLocations[0].id : null,
    location_ids: selectedLocations.map(l => l.id),
    is_private: formData.is_private,
    is_global: formData.is_global,
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
          <Row className="g-3">
           <Col md={6}>
            <Form.Check 
             type="switch"
             id="private-ticket-switch"
             label={
              <div>
               <div className="fw-black x-small uppercase tracking-widest text-main">🔒 Ticket Privado</div>
               <div className="x-small text-muted fw-bold">Solo tú y el destinatario podrán verlo.</div>
              </div>
             }
             checked={formData.is_private}
             disabled={formData.is_global}
             onChange={e => {
              const isPrivate = e.target.checked;
              setFormData({ 
               ...formData, 
               is_private: isPrivate,
               is_global: isPrivate ? false : formData.is_global,
               group_id: (!isPrivate && currentUser?.group_id) ? currentUser.group_id : formData.group_id
              });
             }}
             className="d-flex align-items-center gap-3 custom-switch-lg"
            />
           </Col>
           <Col md={6}>
            <Form.Check 
             type="switch"
             id="global-ticket-switch"
             label={
              <div>
               <div className="fw-black x-small uppercase tracking-widest text-primary">🌍 Ticket Global</div>
               <div className="x-small text-muted fw-bold">Visible para TODOS los grupos de la plataforma.</div>
              </div>
             }
             checked={formData.is_global}
             disabled={formData.is_private}
             onChange={e => {
              const isGlobal = e.target.checked;
              setFormData({ 
               ...formData, 
               is_global: isGlobal,
               is_private: isGlobal ? false : formData.is_private,
               group_id: isGlobal ? '' : (currentUser?.group_id || '')
              });
             }}
             className="d-flex align-items-center gap-3 custom-switch-lg"
            />
           </Col>
          </Row>
         </div>
        </Card.Body>
       </Card>

       {/* Location Linking Section */}
       <Card className="shadow-sm border-0 mb-4 border-start border-4 border-success overflow-visible" style={{ position: 'relative', zIndex: 100 }}>
        <Card.Body className="p-4">
         <h6 className="fw-bold mb-3 text-uppercase text-success small border-bottom pb-2">Vincular Ubicaciones / Dependencias</h6>
         
         <div className="position-relative" ref={locationSearchRef}>
          <Form.Group controlId="location-search">
           <InputGroup className="border rounded-pill px-3 py-1 mb-3">
            <InputGroup.Text className="bg-transparent border-0"><MapPin size={18} className="text-muted" /></InputGroup.Text>
            <Form.Control 
             id="location-search-input"
             name="locationSearch"
             placeholder="Buscar dependencias para agregar..."
             className="bg-transparent border-0 shadow-none"
             value={locationSearch}
             onChange={e => { setLocationSearch(e.target.value); setShowLocationResults(true); }}
             onFocus={() => setShowLocationResults(true)}
            />
           </InputGroup>
          </Form.Group>
          
          {showLocationResults && locationSearch.length >= 2 && (
           <Card className="position-absolute w-100 mt-n2 shadow-lg border-0" style={{ zIndex: 2000 }}>
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

         {/* Lista de Ubicaciones Seleccionadas */}
         <div className="d-flex flex-column gap-2">
          {selectedLocations.map(l => (
            <div key={l.id} className="p-2 bg-surface-muted rounded border d-flex justify-content-between align-items-center animate-fade-in">
             <div className="d-flex align-items-center gap-3">
              <div className="bg-success bg-opacity-10 p-2 rounded">
               <MapPin className="text-success" size={18} />
              </div>
              <div>
               <div className="fw-bold text-success small">{l.name}</div>
               <div className="x-tiny text-muted">{l.path}</div>
              </div>
             </div>
             <Button variant="outline-danger" size="sm" onClick={() => removeSelectedLocation(l.id)} className="rounded-circle p-1 border-0"><X size={14} /></Button>
            </div>
          ))}
          {selectedLocations.length === 0 && (
            <div className="text-center py-3 text-muted opacity-50 x-small fw-bold border rounded border-dashed">
              NINGUNA UBICACIÓN SELECCIONADA
            </div>
          )}
         </div>
        </Card.Body>
       </Card>

       {/* Asset Linking Section */}
       <Card className="shadow-sm border-0 mb-4 border-start border-4 border-primary overflow-visible" style={{ position: 'relative', zIndex: 90 }}>
        <Card.Body className="p-4">
         <h6 className="fw-bold mb-3 text-uppercase text-primary small border-bottom pb-2">Vincular Equipos del Inventario</h6>
         
         <div className="position-relative" ref={searchRef}>
          <Form.Group controlId="asset-search">
           <InputGroup className="border rounded-pill px-3 py-1 mb-3">
            <InputGroup.Text className="bg-transparent border-0"><Search size={18} className="text-muted" /></InputGroup.Text>
            <Form.Control 
             id="asset-search-input"
             name="assetSearch"
             placeholder="Buscar por Hostname, IP o MAC para agregar..."
             className="bg-transparent border-0 shadow-none"
             value={assetSearch}
             onChange={e => { setAssetSearch(e.target.value); setShowAssetResults(true); }}
             onFocus={() => setShowAssetResults(true)}
            />
           </InputGroup>
          </Form.Group>
          
          {showAssetResults && assetSearch.length >= 2 && (
           <Card className="position-absolute w-100 mt-n2 shadow-lg border-0" style={{ zIndex: 2000 }}>
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

         {/* Lista de Activos Seleccionados */}
         <div className="d-flex flex-column gap-2">
          {selectedAssets.map(a => (
            <div key={a.id} className="p-2 bg-surface-muted rounded border d-flex justify-content-between align-items-center animate-fade-in">
             <div className="d-flex align-items-center gap-3">
              <div className="bg-primary bg-opacity-10 p-2 rounded">
               <Monitor className="text-primary" size={18} />
              </div>
              <div>
               <div className="fw-bold text-primary small">{a.hostname}</div>
               <div className="x-tiny text-muted font-monospace">{a.ip_address} | {a.mac_address}</div>
              </div>
             </div>
             <Button variant="outline-danger" size="sm" onClick={() => removeSelectedAsset(a.id)} className="rounded-circle p-1 border-0"><X size={14} /></Button>
            </div>
          ))}
          {selectedAssets.length === 0 && (
            <div className="text-center py-3 text-muted opacity-50 x-small fw-bold border rounded border-dashed">
              NINGÚN EQUIPO SELECCIONADO
            </div>
          )}
         </div>
         <div className="mt-2 x-small text-muted italic">Puedes vincular múltiples equipos. Esto generará una entrada en el historial de cada activo.</div>
        </Card.Body>
       </Card>

       <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="p-4">
         <Form.Group className="mb-4">
          <Form.Label className="small fw-bold text-uppercase text-muted mb-3 d-flex justify-content-between align-items-center">
            <span>Descripción Detallada del Incidente *</span>
            <Badge bg="primary" className="bg-opacity-10 text-primary x-small fw-black">TECNOLOGÍA RICH TEXT</Badge>
          </Form.Label>
          <RichTextEditor 
           value={formData.description}
           onChange={content => setFormData({ ...formData, description: content })}
           placeholder="Detalle aquí toda la información técnica... (Usa @ para mencionar)"
           users={users}
          />
         </Form.Group>

         {/* ZONA DE CARGA DE ARCHIVOS / PEGADO DE IMAGENES */}
         <div className="bg-muted bg-opacity-25 p-4 rounded-4 border border-dashed text-center position-relative mb-2">
            <input 
              type="file" 
              multiple 
              className="position-absolute inset-0 opacity-0 cursor-pointer w-100 h-100" 
              style={{ zIndex: 5 }}
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <div className="py-2">
              <div className="mb-2 text-primary opacity-75"><Monitor size={32} className="mx-auto" /></div>
              <h6 className="fw-black x-small uppercase tracking-widest text-main m-0">Evidencia Técnica y Adjuntos</h6>
              <p className="x-tiny text-muted fw-bold mt-1 mb-0">ARRASTRA ARCHIVOS O PEGA CAPTURAS (CTRL+V)</p>
            </div>
         </div>

         {/* Lista de archivos cargados */}
         {attachmentIds.length > 0 && (
           <div className="mt-3 d-flex flex-wrap gap-2">
             {attachmentIds.map(id => (
               <Badge key={id} bg="primary" className="p-2 px-3 rounded-pill fw-bold d-flex align-items-center gap-2">
                 <FileText size={14} /> ARCHIVO LISTO <X size={14} className="cursor-pointer" onClick={() => removeAttachment(id)} />
               </Badge>
             ))}
           </div>
         )}
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
