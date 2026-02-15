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
       const isHardDelete = showDecommissioned;
       const msg = isHardDelete 
         ? `¿ELIMINAR DEFINITIVAMENTE ${assetIds.length} equipos de la base de datos? Esta acción no se puede deshacer.`
         : `¿Dar de baja ${assetIds.length} equipos?`;
         
       if (!confirm(msg)) return;
       
       await api.delete('/assets/bulk-delete', { 
         data: assetIds,
         params: { hard: isHardDelete }
       });
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
   <div className="inventory-container p-3 p-lg-4 bg-background">
    <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
     <div>
      <h4 className="fw-black text-uppercase m-0 d-flex align-items-center gap-2 text-main">
       Gestión de Activos
      </h4>
      <p className="text-muted-foreground small m-0 text-uppercase tracking-widest fw-bold opacity-75">Control de Hardware y Estado de Seguridad</p>
     </div>
     <Button variant="primary" className="fw-black x-small px-4 rounded-pill shadow-sm border-0 py-2" onClick={() => router.push('/inventory/install')}>
       <Plus size={16} className="me-2" /> REGISTRAR NUEVOS EQUIPOS
     </Button>
    </div>

    {/* Professional Filter Bar */}
    <Card className="shadow-sm mb-4">
     <Card.Body className="p-3">
      <Row className="g-3 align-items-end">
       <Col lg={4}>
        <Form.Group controlId="asset-search-main">
         <Form.Label className="x-small fw-black text-muted-foreground uppercase">Búsqueda Global</Form.Label>
         <InputGroup size="sm" className="bg-muted rounded-pill px-3 py-1 overflow-hidden border-0">
          <InputGroup.Text className="bg-transparent border-0 text-muted-foreground ps-0"><Search size={16}/></InputGroup.Text>
          <Form.Control 
           id="asset-search-main"
           name="searchTerm"
           placeholder="Hostname, IP, MAC..." 
           className="bg-transparent border-0 shadow-none x-small fw-bold text-foreground"
           value={searchTerm}
           onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
          />
         </InputGroup>
        </Form.Group>
       </Col>
       <Col md={2}>
        <Form.Group controlId="status-filter-main">
         <Form.Label className="x-small fw-black text-muted-foreground uppercase">Estado</Form.Label>
         <Form.Select 
          id="status-filter-main"
          name="statusFilter"
          size="sm" className="bg-muted border-0 rounded-pill x-small fw-bold text-foreground"
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
         >
          <option value="all">TODOS</option>
          <option value="operative">OPERATIVOS</option>
          <option value="maintenance">MANTENIMIENTO</option>
         </Form.Select>
        </Form.Group>
       </Col>
       <Col md={3} className="d-flex align-items-center pb-1">
        <Form.Check 
         type="switch"
         id="show-decommissioned-switch"
         label={<span className="x-small fw-bold text-muted-foreground uppercase ms-2">Bajas</span>}
         checked={showDecommissioned}
         onChange={e => { setShowDecommissioned(e.target.checked); setPage(1); }}
        />
       </Col>
       <Col md={3} className="d-flex justify-content-end gap-2">
        <Button variant="link" size="sm" className="text-muted-foreground x-small fw-black text-decoration-none" onClick={clearFilters}>LIMPIAR</Button>
        <Button variant="outline-primary" size="sm" className="rounded-pill px-3 border-border text-primary bg-card" onClick={() => setShowFilters(true)}>
         <Filter size={16} />
        </Button>
       </Col>
      </Row>
     </Card.Body>
    </Card>

        {/* Assets Table */}
        <Card className="border-0 shadow-sm overflow-hidden bg-card">
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="align-middle m-0 ticket-table border-0">
                <thead>
                  <tr className="bg-muted">
                    <th className="ps-4 border-0" style={{ width: '50px' }}>
                      <Form.Check 
                        id="select-all-assets" 
                        aria-label="Seleccionar todos" 
                        type="checkbox" 
                        checked={assets.length > 0 && selectedAssets.size === assets.length} 
                        onChange={(e) => { 
                          if (e.target.checked) setSelectedAssets(new Set(assets.map(a => a.id))); 
                          else setSelectedAssets(new Set()); 
                        }} 
                      />
                    </th>
                    <th className="border-0" style={{ width: '30%' }}>DISPOSITIVO / HOSTNAME</th>
                    <th className="border-0">ESTADO</th>
                    <th className="border-0">DIRECCIÓN IP</th>
                    <th className="border-0" style={{ width: '20%' }}>UBICACIÓN ACTUAL</th>
                    <th className="border-0">PROTECCIÓN AV</th>
                    <th className="pe-4 text-end border-0">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="border-0">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 bg-card">
                        <Spinner animation="border" size="sm" variant="primary" />
                      </td>
                    </tr>
                  ) : assets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted-foreground x-small fw-black uppercase opacity-50 bg-card">
                        No hay registros que coincidan
                      </td>
                    </tr>
                  ) : assets.map(asset => (
                    <tr 
                      key={asset.id} 
                      className={`ticket-row ${selectedAssets.has(asset.id) ? 'bg-primary-muted' : ''}`}
                    >
                      <td className="ps-4">
                        <Form.Check 
                          id={`select-asset-${asset.id}`} 
                          aria-label={`Seleccionar ${asset.hostname}`} 
                          type="checkbox" 
                          checked={selectedAssets.has(asset.id)} 
                          onChange={() => toggleAssetSelection(asset.id)} 
                        />
                      </td>
                      <td className="py-3" onClick={() => router.push(`/inventory/${asset.id}`)}>
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 rounded-3 bg-primary-muted text-primary"><Monitor size={18} /></div>
                          <div className="overflow-hidden">
                            <div className="ticket-title text-primary">{asset.hostname || 'SIN NOMBRE'}</div>
                            <div className="ticket-group font-monospace opacity-75">{asset.mac_address || '---'}</div>
                          </div>
                        </div>
                      </td>
                      <td>{getStatusBadge(asset.status)}</td>
                      <td>
                        <div className="date font-monospace fw-bold">{asset.ip_address || '---'}</div>
                      </td>
                      <td>
                        <div className="ticket-title" style={{fontSize: '0.8rem'}}>{asset.location_name || 'Sin Ubicación'}</div>
                        <div className="ticket-group text-primary">#{asset.codigo_dependencia || '---'}</div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2 x-small fw-bold text-muted-foreground">
                          <Shield size={14} className={asset.av_product === 'AV FREE' ? 'text-warning' : 'text-success'} />
                          <span className="text-main">{asset.av_product || '---'}</span>
                        </div>
                      </td>
                      <td className="text-end pe-4">
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-1 text-primary hover-bg-muted rounded-circle" 
                          onClick={(e) => { e.stopPropagation(); router.push(`/inventory/${asset.id}`); }}
                        >
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

        {/* Action Bar for selected assets */}
        {selectedAssets.size > 0 && (
          <div className="sticky-bottom bg-card border-top border-primary border-3 shadow-lg p-3 d-flex justify-content-between align-items-center animate-slide-up" style={{zIndex: 1000}}>
            <div className="d-flex align-items-center gap-3">
              <Badge bg="primary" className="rounded-pill px-3 py-2">{selectedAssets.size} SELECCIONADOS</Badge>
              <span className="text-muted small fw-bold uppercase">Acciones masivas disponibles:</span>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-primary" size="sm" className="rounded-pill fw-bold" onClick={() => setShowMoveModal(true)}>
                <Move size={14} className="me-2" /> MOVER
              </Button>
              <Button variant="outline-primary" size="sm" className="rounded-pill fw-bold" onClick={() => setShowStatusModal(true)}>
                <RefreshCw size={14} className="me-2" /> CAMBIAR ESTADO
              </Button>
              {isSuperuser && (
                <Button variant="outline-danger" size="sm" className="rounded-pill fw-bold" onClick={() => handleBulkAction('delete')}>
                  <Trash2 size={14} className="me-2" /> ELIMINAR
                </Button>
              )}
            </div>
          </div>
        )}

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