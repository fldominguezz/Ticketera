import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
 Monitor, Shield, Activity,
 RefreshCw, HardDrive, Trash2, Layers, CheckCircle2,
 XCircle, AlertTriangle, UploadCloud, Search, Plus, MapPin, Move, Filter, ChevronLeft, ChevronRight, Hash
} from 'lucide-react';
import { 
 Row, Col, Card, Table, Button, InputGroup, Form, Badge,
 Spinner, Modal, Alert, ListGroup, Offcanvas
} from 'react-bootstrap';
import api from '../../lib/api';
import { getStatusBadge } from '../../lib/ui/badges';

export default function InventoryPage() {
 const { isSuperuser } = useAuth();
 const { theme } = useTheme();
 const isDark = theme === 'dark' || theme === 'soc';
 const router = useRouter();
 
 const [assets, setAssets] = useState<any[]>([]);
 const [loading, setLoading] = useState(false);
 
 // Pagination
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(20);
 const [totalPages, setTotalPages] = useState(1);
 const [totalItems, setTotalItems] = useState(0);

 // Filters
 const [searchTerm, setSearchTerm] = useState('');
 const [statusFilter, setStatusFilter] = useState('all');
 const [showDecommissioned, setShowDecommissioned] = useState(false);
 const [deviceTypeFilter, setDeviceTypeFilter] = useState('');
 const [avProductFilter, setAvProductFilter] = useState('');

 const [showFilters, setShowFilters] = useState(false);

 const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
 const [showStatusModal, setShowStatusModal] = useState(false);
 const [newStatus, setNewStatus] = useState('operative');
 
 // Bulk Move States
 const [showMoveModal, setShowMoveModal] = useState(false);
 const [moveSearch, setMoveSearch] = useState('');
 const [locations, setLocations] = useState<any[]>([]);
 const [selectedLocation, setSelectedLocation] = useState<any>(null);
 const [isMoving, setIsMoving] = useState(false);

 const fetchAssets = async () => {
  setLoading(true);
  try {
   const params: any = { 
    page, 
    size: pageSize,
    show_decommissioned: showDecommissioned,
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    device_type: deviceTypeFilter || undefined,
    av_product: avProductFilter || undefined
   };
   const res = await api.get('/assets', { params });
   setAssets(res.data.items);
   setTotalPages(res.data.pages);
   setTotalItems(res.data.total);
  } catch (err) { console.error(err); } finally { setLoading(false); }
 };

 const fetchLocations = async (q = '') => {
  try {
   const res = await api.get('/locations', { params: { q, size: 100 } });
   // Manejar tanto respuesta paginada como lista simple por compatibilidad
   setLocations(res.data.items || res.data);
  } catch (err) { console.error(err); }
 };

 useEffect(() => {
  const timer = setTimeout(() => {
    fetchAssets();
  }, 300);
  return () => clearTimeout(timer);
 }, [page, pageSize, searchTerm, statusFilter, showDecommissioned, deviceTypeFilter, avProductFilter]);

 const toggleAssetSelection = (id: string) => {
   const newSet = new Set(selectedAssets);
   if (newSet.has(id)) newSet.delete(id);
   else newSet.add(id);
   setSelectedAssets(newSet);
 };

 const handleBulkAction = async (action: 'status' | 'delete' | 'move', value?: string) => {
   if (selectedAssets.size === 0) return;
   const assetIds = Array.from(selectedAssets);
   try {
     if (action === 'delete') {
       if (!confirm(`¿Eliminar ${assetIds.length} equipos?`)) return;
       await api.delete('/assets/bulk-delete', { data: assetIds });
     } else if (action === 'status' && value) {
       await api.post('/assets/bulk-action', { asset_ids: assetIds, status: value });
       setShowStatusModal(false);
     } else if (action === 'move' && selectedLocation) {
       setIsMoving(true);
       await api.post('/assets/bulk-action', { 
         asset_ids: assetIds, 
         location_node_id: selectedLocation.id 
       });
       setShowMoveModal(false);
       setSelectedLocation(null);
       setMoveSearch('');
     }
     setSelectedAssets(new Set());
     fetchAssets();
   } catch (err: any) {
     alert('Error: ' + err.message);
   } finally { setIsMoving(false); }
 };

 const clearFilters = () => {
  setSearchTerm('');
  setStatusFilter('all');
  setShowDecommissioned(false);
  setDeviceTypeFilter('');
  setAvProductFilter('');
  setPage(1);
 };

 return (
  <Layout title="Inventario de Activos">
   <style jsx global>{`
     .inventory-container { max-width: 100vw; overflow-x: hidden; }
     .hover-row:hover { background-color: var(--bg-surface-muted) !important; }
     .sticky-actions { position: sticky; right: 0; background: var(--bg-surface); z-index: 10; }
     .fw-black { font-weight: 900; }
     .x-small { font-size: 11px; }
     .x-tiny { font-size: 9px; }
     .tracking-tighter { letter-spacing: -0.05em; }
     .border-color { border-color: var(--border-subtle) !important; }
   `}</style>

   <div className="inventory-container p-3 p-lg-4">
    <div className="d-flex justify-content-between align-items-center mb-4">
     <div>
      <h2 className="fw-black m-0 uppercase tracking-tighter text-main">INVENTARIO TÉCNICO</h2>
      <small className="text-muted fw-bold uppercase x-small tracking-widest">Control de Hardware, Ubicaciones y Estado de Seguridad</small>
     </div>
     <Button variant="primary" className="fw-black x-small px-4 rounded-pill shadow-sm" onClick={() => router.push('/inventory/install')}>
       <Plus size={16} className="me-2" /> REGISTRAR NUEVOS EQUIPOS
     </Button>
    </div>

    {/* Professional Filter Bar */}
    <Card className="border-0 shadow-sm rounded-4 mb-4 bg-card">
     <Card.Body className="p-3">
      <Row className="g-3 align-items-end">
       <Col lg={4}>
        <Form.Group controlId="asset-search-main">
         <Form.Label className="x-small fw-black text-muted uppercase">Búsqueda Global</Form.Label>
         <InputGroup size="sm" className="bg-surface-muted border-0 rounded-pill px-3 py-1">
          <InputGroup.Text className="bg-transparent border-0 text-muted ps-0"><Search size={16}/></InputGroup.Text>
          <Form.Control 
           id="asset-search-main"
           name="searchTerm"
           placeholder="Hostname, IP, MAC, Serial, Dependencia..." 
           className="bg-transparent border-0 shadow-none x-small fw-bold"
           value={searchTerm}
           onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
          />
          {searchTerm && <Button variant="link" className="p-0 text-muted" onClick={() => setSearchTerm('')}><XCircle size={14}/></Button>}
         </InputGroup>
         <div className="mt-1 ms-2" style={{ fontSize: '9px', opacity: 0.6 }}>
          <Hash size={8} className="me-1 text-primary"/> 
          <span className="fw-bold text-muted uppercase">Tip: Usa </span>
          <code className="text-primary fw-black">#1601</code> 
          <span className="fw-bold text-muted uppercase"> para buscar específicamente por Código de Dependencia.</span>
         </div>
        </Form.Group>
       </Col>
       <Col md={2}>
        <Form.Group controlId="status-filter-main">
         <Form.Label className="x-small fw-black text-muted uppercase">Estado Operativo</Form.Label>
         <Form.Select 
          id="status-filter-main"
          name="statusFilter"
          size="sm" className="bg-surface-muted border-0 rounded-pill x-small fw-bold"
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
         >
          <option value="all">TODOS LOS ESTADOS</option>
          <option value="operative">OPERATIVOS</option>
          <option value="maintenance">MANTENIMIENTO</option>
          <option value="tagging_pending">PEND. ETIQUETAR</option>
         </Form.Select>
        </Form.Group>
       </Col>
       <Col md={3} className="d-flex align-items-center pb-1">
        <Form.Check 
         type="switch"
         id="show-decommissioned-switch"
         label={<span className="x-small fw-bold text-muted uppercase ms-2">Ver equipos de baja</span>}
         checked={showDecommissioned}
         onChange={e => { setShowDecommissioned(e.target.checked); setPage(1); }}
         className="custom-switch-sm"
        />
       </Col>
       <Col md={3} className="d-flex justify-content-end gap-2">
        <Button variant="surface-muted" size="sm" className="rounded-pill x-small fw-black text-muted px-3" onClick={clearFilters}>LIMPIAR FILTROS</Button>
        <Button variant="outline-primary" size="sm" className="rounded-pill p-1 px-3 border-0" title="Más Filtros" onClick={() => setShowFilters(true)}>
         <Filter size={16} />
        </Button>
       </Col>
      </Row>
     </Card.Body>
    </Card>

    {/* OFF-CANVAS ADVANCED FILTERS */}
    <Offcanvas show={showFilters} onHide={() => setShowFilters(false)} placement="end" className="bg-card text-main border-start border-color">
     <Offcanvas.Header closeButton closeVariant={isDark ? 'white' : undefined} className="border-bottom border-color bg-surface-muted">
      <Offcanvas.Title className="x-small fw-black uppercase tracking-widest text-primary">
       <Filter size={18} className="me-2" /> Filtros Avanzados
      </Offcanvas.Title>
     </Offcanvas.Header>
     <Offcanvas.Body className="p-4 bg-card">
      <Form>
       <Form.Group className="mb-4" controlId="adv-filter-type">
        <Form.Label className="x-small fw-black text-muted uppercase mb-2">Tipo de Dispositivo</Form.Label>
        <Form.Select 
         id="adv-filter-type"
         name="deviceTypeFilter"
         className="bg-surface-muted border-0 rounded-pill x-small fw-bold shadow-none"
         value={deviceTypeFilter} onChange={e => { setDeviceTypeFilter(e.target.value); setPage(1); }}
        >
         <option value="">TODOS LOS TIPOS</option>
         <option value="desktop">PC ESCRITORIO</option>
         <option value="notebook">NOTEBOOK</option>
         <option value="server">SERVIDOR</option>
         <option value="mobile">CELULAR</option>
        </Form.Select>
       </Form.Group>

       <Form.Group className="mb-4" controlId="adv-filter-av">
        <Form.Label className="x-small fw-black text-muted uppercase mb-2">Protección de Endpoint</Form.Label>
        <Form.Select 
         id="adv-filter-av"
         name="avProductFilter"
         className="bg-surface-muted border-0 rounded-pill x-small fw-bold shadow-none"
         value={avProductFilter} onChange={e => { setAvProductFilter(e.target.value); setPage(1); }}
        >
         <option value="">TODAS LAS PROTECCIONES</option>
         <option value="ESET CLOUD">ESET CLOUD</option>
         <option value="FortiClient EMS">FORTICLIENT EMS</option>
         <option value="FortiEDR">FORTIEDR</option>
         <option value="Windows Defender">WINDOWS DEFENDER</option>
         <option value="AV FREE">AV FREE</option>
        </Form.Select>
       </Form.Group>

       <div className="mt-5 p-3 rounded-3 bg-primary bg-opacity-5 border border-primary text-center">
         <p className="x-tiny fw-bold text-muted mb-0 uppercase">Los cambios se aplican automáticamente</p>
       </div>
      </Form>
     </Offcanvas.Body>
    </Offcanvas>

    <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-card">
     <Card.Body className="p-0 position-relative">
      {/* Bulk Actions Mini Bar */}
      <div className={`bulk-actions-bar bg-primary transition-all overflow-hidden ${selectedAssets.size > 0 ? 'py-2 px-4' : 'h-0 opacity-0'}`} style={{ maxHeight: selectedAssets.size > 0 ? '60px' : '0' }}>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <span className="x-small fw-black uppercase tracking-widest">{selectedAssets.size} EQUIPOS SELECCIONADOS</span>
            <div className="vr opacity-50"></div>
            <Button variant="link" className="p-0 x-small fw-bold text-decoration-none opacity-75 hover-opacity-100" onClick={() => setSelectedAssets(new Set())}>DESELECCIONAR</Button>
          </div>
          <div className="d-flex gap-2">
            <Button variant="light" size="sm" className="x-small fw-black text-primary rounded-pill px-3" onClick={() => { fetchLocations(); setShowMoveModal(true); }}><Move size={14} className="me-1" /> MOVER</Button>
            <Button variant="light" size="sm" className="x-small fw-black rounded-pill px-3" onClick={() => setShowStatusModal(true)}><RefreshCw size={14} className="me-1" /> ESTADO</Button>
            {isSuperuser && <Button variant="danger" size="sm" className="x-small fw-black border-0 rounded-pill px-3 shadow-sm" onClick={() => handleBulkAction('delete')}><Trash2 size={14} className="me-1" /> ELIMINAR</Button>}
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <Table hover className="align-middle mb-0 border-0">
        <thead>
          <tr className="x-small text-muted uppercase tracking-widest border-bottom border-color bg-surface">
           <th className="ps-4" style={{ width: '50px' }}>
            <Form.Check id="select-all-assets" aria-label="Seleccionar todos" type="checkbox" checked={assets.length > 0 && selectedAssets.size === assets.length} onChange={(e) => { if (e.target.checked) setSelectedAssets(new Set(assets.map(a => a.id))); else setSelectedAssets(new Set()); }} />
           </th>
           <th style={{ width: '25%' }}>IDENTIDAD DEL DISPOSITIVO</th>
           <th>ESTADO</th>
           <th>IP ACTUAL</th>
           <th style={{ width: '20%' }}>DEPENDENCIA / ÁREA</th>
           <th>PROTECCIÓN</th>
           <th className="text-end pe-4 sticky-actions">ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
           <tr><td colSpan={7} className="text-center py-5"><Spinner animation="border" size="sm" variant="primary" /></td></tr>
          ) : assets.length === 0 ? (
           <tr><td colSpan={7} className="text-center py-5 text-muted x-small fw-black uppercase opacity-50">No se encontraron dispositivos registrados</td></tr>
          ) : assets.map(asset => (
           <tr key={asset.id} className={`border-bottom border-color hover-row transition-all ${selectedAssets.has(asset.id) ? 'active-row bg-primary bg-opacity-5' : ''}`}>
            <td className="ps-4">
             <Form.Check id={`select-asset-${asset.id}`} aria-label={`Seleccionar ${asset.hostname}`} type="checkbox" checked={selectedAssets.has(asset.id)} onChange={() => toggleAssetSelection(asset.id)} />
            </td>
            <td className="py-3">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary"><Monitor size={18} /></div>
                <div className="overflow-hidden">
                 <div className="fw-black text-main text-truncate" style={{fontSize: '14px'}}>{asset.hostname || 'SIN NOMBRE'}</div>
                 <div className="x-tiny text-muted font-monospace text-truncate tracking-tighter uppercase">{asset.mac_address || '---'}</div>
                </div>
              </div>
            </td>
            <td>{getStatusBadge(asset.status)}</td>
            <td className="small font-monospace fw-bold text-muted">{asset.ip_address || '---'}</td>
            <td>
             <div className="d-flex align-items-center gap-2">
               <div className="p-1 rounded bg-secondary bg-opacity-10"><MapPin size={12} className="text-muted"/></div>
               <div className="overflow-hidden">
                <div className="small fw-black text-main text-truncate uppercase" style={{fontSize: '11px'}}>{asset.location_name || 'Sin Ubicación'}</div>
                <div className="x-tiny text-primary font-monospace">#{asset.codigo_dependencia || '---'}</div>
               </div>
             </div>
            </td>
            <td>
             <div className="d-flex align-items-center gap-1 x-small fw-bold text-muted">
              <Shield size={12} className={asset.av_product === 'AV FREE' ? 'text-warning' : 'text-success'} />
              {asset.av_product || '---'}
             </div>
            </td>
            <td className="text-end pe-4 sticky-actions">
              <Button variant="link" size="sm" className="p-1 text-primary hover-opacity-100" onClick={() => router.push(`/inventory/${asset.id}`)}>
               <Search size={18} />
              </Button>
            </td>
           </tr>
          ))}
        </tbody>
        </Table>
      </div>
     </Card.Body>
    </Card>

    {/* Pagination Footer */}
    <div className="d-flex justify-content-between align-items-center mt-4 bg-surface p-3 rounded-4 shadow-sm border border-color">
      <div className="d-flex align-items-center gap-3">
        <span className="x-small fw-black text-muted text-uppercase">Mostrar</span>
        <Form.Group controlId="inventory-page-size">
         <Form.Select 
          id="inventory-page-size"
          name="pageSize"
          size="sm" 
          className="rounded-pill border-0 bg-surface-muted px-3 fw-bold" 
          style={{width: '80px'}}
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
         >
           <option value={20}>20</option>
           <option value={50}>50</option>
           <option value={100}>100</option>
         </Form.Select>
        </Form.Group>
        <span className="x-small text-muted fw-bold">Total: {totalItems}</span>
      </div>
      <div className="d-flex gap-2">
        <Button variant="surface-muted" size="sm" className="rounded-pill px-3 x-small fw-black border-color shadow-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
         <ChevronLeft size={14} className="me-1"/> ANTERIOR
        </Button>
        <div className="d-flex align-items-center px-3 bg-primary bg-opacity-10 text-primary rounded-pill x-small fw-black">PÁGINA {page} DE {totalPages}</div>
        <Button variant="surface-muted" size="sm" className="rounded-pill px-3 x-small fw-black border-color shadow-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
         SIGUIENTE <ChevronRight size={14} className="ms-1"/>
        </Button>
      </div>
    </div>
   </div>

   {/* MODAL: MOVER EQUIPOS */}
   <Modal show={showMoveModal} onHide={() => { setShowMoveModal(false); setSelectedLocation(null); setMoveSearch(''); }} centered contentClassName="border-0 shadow-2xl rounded-4">
    <Modal.Header closeButton className="bg-surface-muted border-0 px-4 py-3">
     <Modal.Title className="x-small fw-black uppercase text-primary tracking-widest d-flex align-items-center">
      <Move size={18} className="me-2" /> Mover {selectedAssets.size} Equipos Seleccionados
     </Modal.Title>
    </Modal.Header>
    <Modal.Body className="p-4 bg-card">
     <Form.Group className="mb-4" controlId="bulk-move-search">
      <Form.Label className="x-small fw-black text-muted uppercase">Buscar Dependencia Destino</Form.Label>
      <InputGroup className="bg-surface-muted border-0 rounded-pill px-3 py-1">
       <InputGroup.Text className="bg-transparent border-0 text-muted"><Search size={16}/></InputGroup.Text>
       <Form.Control 
        id="bulk-move-search"
        name="moveSearch"
        placeholder="Nombre o Código [XXXX]..."
        className="bg-transparent border-0 shadow-none x-small fw-bold"
        value={moveSearch}
        onChange={(e) => { setMoveSearch(e.target.value); fetchLocations(e.target.value); }}
       />
      </InputGroup>
     </Form.Group>

     <div className="max-vh-40 overflow-auto custom-scrollbar border border-color rounded-3 mb-4 bg-surface">
      <ListGroup variant="flush">
       {locations.length > 0 ? (
        locations.map(loc => (
         <ListGroup.Item 
          key={loc.id} 
          action 
          onClick={() => setSelectedLocation(loc)}
          className={`bg-transparent border-bottom border-color d-flex justify-content-between align-items-center py-3 px-4 ${selectedLocation?.id === loc.id ? 'bg-primary bg-opacity-10 border-start border-4 border-primary' : ''}`}
         >
          <div className="d-flex align-items-center gap-3">
           <MapPin size={16} className={selectedLocation?.id === loc.id ? 'text-primary' : 'text-muted'} />
           <div className="fw-bold small text-main">{loc.name}</div>
          </div>
          <Badge bg={selectedLocation?.id === loc.id ? 'primary' : 'secondary'} className="bg-opacity-10 text-body font-monospace fw-black">#{loc.dependency_code || '---'}</Badge>
         </ListGroup.Item>
        ))
       ) : (
        <div className="text-center py-4 text-muted x-small uppercase fw-black opacity-50">No se encontraron resultados</div>
       )}
      </ListGroup>
     </div>

     <Alert variant="warning" className="x-small fw-bold border-0 bg-warning bg-opacity-10 text-warning d-flex align-items-center gap-2 rounded-3">
      <AlertTriangle size={16} /> Atención: Se generará un registro histórico por cada equipo movido.
     </Alert>
    </Modal.Body>
    <Modal.Footer className="bg-surface-muted border-0 px-4 py-3">
     <Button variant="link" onClick={() => setShowMoveModal(false)} className="text-muted text-decoration-none x-small fw-black">CANCELAR</Button>
     <Button 
      variant="primary" 
      className="fw-black x-small uppercase px-4 rounded-pill shadow"
      disabled={!selectedLocation || isMoving}
      onClick={() => handleBulkAction('move')}
     >
      {isMoving ? <Spinner size="sm" className="me-2" /> : <Move size={14} className="me-2" />}
      CONFIRMAR MOVIMIENTO
     </Button>
    </Modal.Footer>
   </Modal>

   <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered size="sm" contentClassName="border-0 shadow-2xl rounded-4">
    <Modal.Header closeButton className="bg-surface-muted border-0 px-4 py-2">
     <Modal.Title className="fw-black x-small text-uppercase tracking-widest text-primary">Cambiar Estado</Modal.Title>
    </Modal.Header>
    <Modal.Body className="p-4 bg-card">
      <Form.Group className="mb-4" controlId="bulk-status-select-final">
        <Form.Label className="x-small fw-black text-muted text-uppercase mb-2">Nuevo estado para {selectedAssets.size} equipos</Form.Label>
        <Form.Select id="bulk-status-select-final" name="newStatus" className="bg-surface-muted border-0 rounded-pill x-small fw-bold shadow-none" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
          <option value="operative">OPERATIVO</option>
          <option value="maintenance">MANTENIMIENTO</option>
          <option value="tagging_pending">PENDIENTE ETIQUETAR</option>
          <option value="decommissioned">DADO DE BAJA</option>
        </Form.Select>
      </Form.Group>
      <Button variant="primary" className="w-100 fw-black x-small uppercase rounded-pill py-2 shadow" onClick={() => handleBulkAction('status', newStatus)}>APLICAR CAMBIOS</Button>
    </Modal.Body>
   </Modal>
  </Layout>
 );
}