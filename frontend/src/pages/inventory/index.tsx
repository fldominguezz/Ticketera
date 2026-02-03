import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { 
  Monitor, Shield, Activity,
  RefreshCw, HardDrive, Trash2, Layers, CheckCircle2,
  XCircle, AlertTriangle, UploadCloud, Search, Plus, MapPin, Move
} from 'lucide-react';
import { 
  Row, Col, Card, Table, Button, InputGroup, Form, Badge,
  Spinner, Modal, Alert, ListGroup
} from 'react-bootstrap';
import api from '../../lib/api';
import { getStatusBadge } from '../../lib/ui/badges';

export default function InventoryPage() {
  const { isSuperuser } = useAuth();
  const router = useRouter();
  
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDecommissioned, setShowDecommissioned] = useState(false);
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [depFilter, setDepFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');

  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('operative');
  
  // Bulk Move States
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveSearch, setMoveSearch] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isMoving, setIsMoving] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importData, setImportData] = useState<any[] | null>(null);
  const [importSummary, setImportSummary] = useState<any | null>(null);
  const [importSource, setImportSource] = useState<string>('auto');

  const fetchAssets = async (search: string = '') => {
    setLoading(true);
    try {
      const params: any = { show_decommissioned: showDecommissioned };
      if (search) params.search = search;
      const res = await api.get('/assets', { params });
      setAssets(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchLocations = async (q = '') => {
    try {
      const res = await api.get('/locations', { params: { q } });
      setLocations(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => { fetchAssets(debouncedSearch); }, [showDecommissioned, debouncedSearch]);

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
          fetchAssets(debouncedSearch);
      } catch (err: any) {
          alert("Error: " + err.message);
      } finally { setIsMoving(false); }
  };

  const filteredAssets = assets.filter(asset => {
    if (stateFilter !== 'all' && asset.status !== stateFilter) return false;
    const depName = asset.location?.name || '';
    const depCode = asset.location?.dependency_code || '';
    if (depFilter && !depName.toLowerCase().includes(depFilter.toLowerCase())) return false;
    if (codeFilter && !depCode.includes(codeFilter)) return false;
    return true;
  });

  return (
    <Layout title="Inventario de Activos">
      <style jsx global>{`
          .inventory-container { max-width: 100vw; overflow-x: hidden; }
          .hover-row:hover { background-color: rgba(var(--bs-primary-rgb), 0.03); }
          .sticky-actions { position: sticky; right: 0; background: var(--card-bg); box-shadow: -5px 0 10px rgba(0,0,0,0.05); z-index: 10; }
          .table-fixed-layout { table-layout: fixed; min-width: 1000px; }
          .max-width-400 { max-width: 400px; }
          .transition-all { transition: all 0.2s ease; }
          .z-max { z-index: 2000 !important; }
      `}</style>

      <div className="inventory-container p-3 p-lg-4">
        <Card className="border-0 shadow-sm mb-4 overflow-visible">
            <Card.Body className="py-2 px-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center flex-grow-1 position-relative" style={{ maxWidth: '500px' }}>
                    <InputGroup className="border rounded-pill px-3 py-1 bg-light">
                        <InputGroup.Text className="bg-transparent border-0"><Search size={18} className="text-muted" /></InputGroup.Text>
                        <Form.Control className="bg-transparent border-0 shadow-none x-small fw-bold" placeholder="Hostname, IP o MAC..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        {searchTerm && <Button variant="link" className="p-0 text-muted" onClick={() => setSearchTerm('')}><XCircle size={16} /></Button>}
                    </InputGroup>
                </div>
                <Button variant="primary" size="sm" className="fw-bold shadow-sm px-3" onClick={() => router.push('/inventory/install')}><Plus size={16} className="me-1" /> NUEVO EQUIPO</Button>
            </Card.Body>
        </Card>

        <Row className="g-4">
          <Col lg={12}>
            <Card className="border-0 shadow-sm h-100 overflow-hidden">
              <Card.Header className="py-3 bg-transparent border-bottom d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                    <div className="bg-primary bg-opacity-10 p-2 rounded"><Activity size={18} className="text-primary" /></div>
                    <div>
                        <h6 className="m-0 fw-bold text-uppercase">INVENTARIO GLOBAL</h6>
                        <div className="x-small text-muted fw-bold">{filteredAssets.length} dispositivos</div>
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <Form.Select size="sm" className="x-small fw-bold" style={{ width: '140px' }} value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                        <option value="all">TODOS</option>
                        <option value="operative">OPERATIVOS</option>
                        <option value="maintenance">MANTENIMIENTO</option>
                        <option value="tagging_pending">PEND. ETIQUETAR</option>
                    </Form.Select>
                    <Button variant="outline-primary" size="sm" className="fw-bold" onClick={() => setShowImportModal(true)}><Layers size={16} className="me-1" /> IMPORTAR</Button>
                </div>
              </Card.Header>
              
              <Card.Body className="p-0 position-relative">
                <div className={`bulk-actions-bar bg-primary text-white transition-all overflow-hidden ${selectedAssets.size > 0 ? 'py-2 px-3' : 'h-0 opacity-0'}`} style={{ maxHeight: selectedAssets.size > 0 ? '60px' : '0' }}>
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                            <span className="x-small fw-bold">{selectedAssets.size} EQUIPOS SELECCIONADOS</span>
                            <div className="vr opacity-50"></div>
                            <Button variant="link" className="text-white p-0 x-small fw-bold text-decoration-none" onClick={() => setSelectedAssets(new Set())}>DESELECCIONAR</Button>
                        </div>
                        <div className="d-flex gap-2">
                            <Button variant="light" size="sm" className="x-small fw-bold text-primary" onClick={() => { fetchLocations(); setShowMoveModal(true); }}><Move size={14} className="me-1" /> MOVER A...</Button>
                            <Button variant="light" size="sm" className="x-small fw-bold" onClick={() => setShowStatusModal(true)}><RefreshCw size={14} className="me-1" /> ESTADO</Button>
                            {isSuperuser && <Button variant="danger" size="sm" className="x-small fw-bold border-0" onClick={() => handleBulkAction('delete')}><Trash2 size={14} className="me-1" /> ELIMINAR</Button>}
                        </div>
                    </div>
                </div>

                <div className="table-responsive custom-scrollbar bg-surface">
                    <Table hover className="align-middle mb-0 border-0 table-fixed-layout">
                    <thead>
                        <tr className="x-small text-muted uppercase opacity-75 border-bottom border-color bg-surface-muted">
                        <th className="ps-4" style={{ width: '50px' }}><Form.Check type="checkbox" checked={filteredAssets.length > 0 && Array.from(selectedAssets).length === filteredAssets.length} onChange={(e) => { if (e.target.checked) setSelectedAssets(new Set(filteredAssets.map(a => a.id))); else setSelectedAssets(new Set()); }} /></th>
                        <th style={{ width: '20%' }}>Endpoint / MAC</th>
                        <th style={{ width: '120px' }}>Estado</th>
                        <th style={{ width: '150px' }}>IP Actual</th>
                        <th style={{ width: '20%' }}>Dependencia</th>
                        <th style={{ width: '100px' }}>Código</th>
                        <th className="hide-tablet">Protección</th>
                        <th className="text-center sticky-actions" style={{ width: '100px' }}>Acciones</th>
                        </tr>
                        <tr className="bg-surface border-bottom border-color">
                            <td></td><td></td><td></td><td></td>
                            <td className="py-1"><Form.Control size="sm" placeholder="Filtrar dep..." className="x-small fw-bold border-0 bg-surface-muted text-main" value={depFilter} onChange={e => setDepFilter(e.target.value)} /></td>
                            <td className="py-1"><Form.Control size="sm" placeholder="Num..." className="x-small fw-bold border-0 bg-surface-muted text-main" value={codeFilter} onChange={e => setCodeFilter(e.target.value)} /></td>
                            <td></td><td></td>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                        <tr><td colSpan={8} className="text-center py-5"><Spinner animation="border" size="sm" variant="primary" /></td></tr>
                        ) : filteredAssets.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-5 text-muted x-small fw-bold uppercase">NO HAY EQUIPOS</td></tr>
                        ) : filteredAssets.map(asset => (
                        <tr key={asset?.id} className={`border-bottom border-color hover-row ${selectedAssets.has(asset?.id) ? 'active-row' : ''}`}>
                            <td className="ps-4"><Form.Check type="checkbox" checked={selectedAssets.has(asset?.id)} onChange={() => toggleAssetSelection(asset?.id)} /></td>
                            <td className="py-3">
                                <div className="d-flex align-items-center gap-3 overflow-hidden">
                                    <div className="p-2 rounded bg-primary bg-opacity-10 text-primary flex-shrink-0"><Monitor size={16} /></div>
                                    <div className="text-truncate"><div className="fw-bold text-primary text-truncate">{asset?.hostname || 'SIN NOMBRE'}</div><div className="x-small text-muted font-monospace text-truncate">{asset?.mac_address || '---'}</div></div>
                                </div>
                            </td>
                            <td>{getStatusBadge(asset?.status)}</td>
                            <td className="small font-monospace text-main">{asset?.ip_address || '---'}</td>
                            <td className="small fw-bold text-uppercase text-truncate text-main">{asset?.location_name || asset?.location?.name || '---'}</td>
                            <td className="small font-monospace text-main">{asset?.codigo_dependencia || asset?.location?.dependency_code || '---'}</td>
                            <td className="hide-tablet"><div className="d-flex align-items-center gap-1 small text-truncate text-muted"><Shield size={12} className="text-info" /> {asset?.av_product || 'Ninguno'}</div></td>
                            <td className="text-center sticky-actions border-start border-color bg-surface">
                                <Button variant="link" size="sm" className="p-0 text-primary" onClick={() => router.push(`/inventory/${asset?.id}`)}><Search size={16} /></Button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* MODAL: MOVER EQUIPOS */}
      <Modal show={showMoveModal} onHide={() => { setShowMoveModal(false); setSelectedLocation(null); setMoveSearch(''); }} centered contentClassName="bg-dark text-white border-primary border-opacity-25 shadow-2xl">
        <Modal.Header closeButton closeVariant="white" className="border-white border-opacity-10">
          <Modal.Title className="x-small fw-black uppercase text-primary tracking-widest d-flex align-items-center">
            <Move size={18} className="me-2" /> Mover {selectedAssets.size} Equipos Seleccionados
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form.Group className="mb-4">
            <Form.Label className="x-small fw-bold text-muted uppercase">Buscar Dependencia Destino</Form.Label>
            <InputGroup className="bg-black border border-white border-opacity-10 rounded-lg">
              <InputGroup.Text className="bg-transparent border-0 text-muted"><Search size={16}/></InputGroup.Text>
              <Form.Control 
                placeholder="Nombre o Código de Dependencia..."
                className="bg-transparent border-0 text-white shadow-none x-small fw-bold"
                value={moveSearch}
                onChange={(e) => { setMoveSearch(e.target.value); fetchLocations(e.target.value); }}
              />
            </InputGroup>
          </Form.Group>

          <div className="max-vh-40 overflow-auto custom-scrollbar border border-white border-opacity-5 rounded-lg mb-4 bg-black bg-opacity-20">
            <ListGroup variant="flush">
              {locations.length > 0 ? (
                locations.map(loc => (
                  <ListGroup.Item 
                    key={loc.id} 
                    action 
                    onClick={() => setSelectedLocation(loc)}
                    className={`bg-transparent text-white border-white border-opacity-5 d-flex justify-content-between align-items-center py-3 ${selectedLocation?.id === loc.id ? 'bg-primary bg-opacity-20 border-start border-4 border-primary' : ''}`}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <MapPin size={16} className={selectedLocation?.id === loc.id ? 'text-primary' : 'text-muted'} />
                      <div className="fw-bold small">{loc.name}</div>
                    </div>
                    <Badge bg={selectedLocation?.id === loc.id ? 'primary' : 'dark'} className="font-monospace fw-black">#{loc.dependency_code || '---'}</Badge>
                  </ListGroup.Item>
                ))
              ) : (
                <div className="text-center py-4 text-muted x-small uppercase">No se encontraron resultados</div>
              )}
            </ListGroup>
          </div>

          <Alert variant="warning" className="x-small fw-bold border-0 bg-warning bg-opacity-10 text-warning d-flex align-items-center gap-2">
            <AlertTriangle size={16} /> Atención: Se generará un registro histórico por cada equipo movido.
          </Alert>
        </Modal.Body>
        <Modal.Footer className="border-white border-opacity-10">
          <Button variant="link" onClick={() => setShowMoveModal(false)} className="text-muted text-decoration-none x-small fw-bold">CANCELAR</Button>
          <Button 
            variant="primary" 
            className="fw-black x-small uppercase px-4"
            disabled={!selectedLocation || isMoving}
            onClick={() => handleBulkAction('move')}
          >
            {isMoving ? <Spinner size="sm" className="me-2" /> : <Move size={14} className="me-2" />}
            CONFIRMAR MOVIMIENTO
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered size="sm" contentClassName="bg-dark text-white border-white border-opacity-10">
        <Modal.Header closeButton closeVariant="white" className="border-0 pb-0"><Modal.Title className="fw-bold small text-uppercase">Cambiar Estado</Modal.Title></Modal.Header>
        <Modal.Body className="p-4">
            <Form.Group className="mb-4">
                <Form.Label className="x-small fw-bold text-muted text-uppercase">Nuevo estado para {selectedAssets.size} equipos</Form.Label>
                <Form.Select className="bg-dark text-white border-white border-opacity-10 x-small fw-bold shadow-none" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="operative">OPERATIVO</option>
                    <option value="maintenance">MANTENIMIENTO</option>
                    <option value="tagging_pending">PENDIENTE ETIQUETAR</option>
                    <option value="decommissioned">DADO DE BAJA</option>
                </Form.Select>
            </Form.Group>
            <Button variant="primary" className="w-100 fw-black x-small uppercase" onClick={() => handleBulkAction('status', newStatus)}>APLICAR CAMBIOS</Button>
        </Modal.Body>
      </Modal>

      <Modal show={showImportModal} onHide={() => { setShowImportModal(false); setImportData(null); setImportPreview(null); setImportSummary(null); setImportSource('auto'); }} size="lg" centered contentClassName="bg-dark text-white">
        <Modal.Header closeButton closeVariant="white" className="border-0 pb-0"><Modal.Title className="fw-bold text-uppercase small">Importar Activos</Modal.Title></Modal.Header>
        <Modal.Body className="pt-3">
            {!importData && !importSummary && (
                <>
                    <div className="mb-4">
                        <Form.Label className="x-small fw-bold text-muted text-uppercase">1. Seleccionar Origen</Form.Label>
                        <div className="d-flex gap-2">
                            <Button variant={importSource === 'auto' ? 'primary' : 'outline-secondary'} size="sm" className="fw-bold x-small" onClick={() => setImportSource('auto')}>DETECCIÓN AUTO</Button>
                            <Button variant={importSource === 'eset' ? 'primary' : 'outline-secondary'} size="sm" className="fw-bold x-small" onClick={() => setImportSource('eset')}>ESET CLOUD</Button>
                            <Button variant={importSource === 'fortiems' ? 'primary' : 'outline-secondary'} size="sm" className="fw-bold x-small" onClick={() => setImportSource('fortiems')}>FORTICLIENT EMS</Button>
                        </div>
                    </div>
                    <Form.Label className="x-small fw-bold text-muted text-uppercase">2. Cargar Archivo</Form.Label>
                    <div className="text-center py-5 border border-dashed border-white border-opacity-10 rounded-xl bg-black bg-opacity-20 cursor-pointer" onClick={() => document.getElementById('csv-upload')?.click()}>
                        <UploadCloud size={48} className="text-primary mb-3 opacity-50" />
                        <h6 className="fw-bold">Selecciona tu archivo CSV o TSV</h6>
                        <input type="file" id="csv-upload" className="d-none" accept=".csv,.tsv,.txt" onChange={() => {}} />
                    </div>
                </>
            )}
        </Modal.Body>
      </Modal>
    </Layout>
  );
}