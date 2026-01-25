import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import LocationSelector from '../../components/inventory/LocationSelector';
import { 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  MoreVertical, 
  Search,
  Monitor,
  Shield,
  Activity,
  ArrowRightLeft,
  Filter,
  FolderPlus,
  CheckSquare,
  Square,
  Trash2,
  Download,
  GripVertical
} from 'lucide-react';
import { 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  InputGroup, 
  Form, 
  Badge,
  Dropdown,
  Spinner,
  Container,
  Offcanvas,
  Modal,
  Alert
} from 'react-bootstrap';

interface LocationNode {
  id: string;
  name: string;
  path: string;
  parent_id: string | null;
}

const InventoryPage = () => {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showMobileFolders, setShowMobileFolders] = useState(false);
  
  // Selección
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  
  // Modales
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveDestination, setMoveDestination] = useState<LocationNode | null>(null);
  const [moving, setMoving] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationNode | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<{id: string, name: string} | null>(null);

  // Drag & Drop State
  const [draggedAssetId, setDraggedAssetId] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (router.query.location_id) {
      setSelectedLocation(router.query.location_id as string);
      // Opcional: Expandir los padres de este nodo
    }
  }, [router.query.location_id]);

  useEffect(() => {
    fetchAssets(selectedLocation || undefined);
    setSelectedAssets([]);
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/locations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchAssets = async (locId?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      let url = '/api/v1/assets';
      if (locId) url += `?location_node_id=${locId}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const exportToCSV = () => {
    if (assets.length === 0) return;
    const headers = ["Hostname", "IP Address", "MAC Address", "Status", "Protection", "OS"];
    const rows = assets.map(a => [
      a.hostname, 
      a.ip_address, 
      a.mac_address, 
      a.status, 
      a.av_product || "None", 
      a.os_name || "Unknown"
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_${selectedLocation || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkMove = async (asset_ids: string[], destId: string) => {
    setMoving(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/assets/bulk-move', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          asset_ids: asset_ids,
          new_location_id: destId
        })
      });
      if (res.ok) {
        setShowMoveModal(false);
        setSelectedAssets([]);
        setMoveDestination(null);
        fetchAssets(selectedLocation || undefined);
      }
    } catch (err) { console.error(err); }
    finally { setMoving(false); }
  };

  const handleBulkDelete = async (asset_ids: string[]) => {
    if (!confirm(`¿Está seguro de que desea dar de baja ${asset_ids.length} equipos?`)) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/assets/bulk-delete', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(asset_ids)
      });
      if (res.ok) {
        setSelectedAssets([]);
        fetchAssets(selectedLocation || undefined);
      }
    } catch (err) { console.error(err); }
  };

  const handleSingleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de que desea dar de baja este equipo?")) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/assets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAssets(selectedLocation || undefined);
      }
    } catch (err) { console.error(err); }
  };

  // Drag handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedAssetId(id);
    e.dataTransfer.setData("assetId", id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = async (e: React.DragEvent, destLocationId: string) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData("assetId");
    if (assetId && assetId !== "") {
      await handleBulkMove([assetId], destLocationId);
    }
    setDraggedAssetId(null);
  };

  const toggleSelectAsset = (id: string) => {
    setSelectedAssets(prev => 
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedAssets.length === assets.length) setSelectedAssets([]);
    else setSelectedAssets(assets.map(a => a.id));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    try {
      const token = localStorage.getItem('access_token');
      const method = editingLocation ? 'PUT' : 'POST';
      const url = editingLocation ? `/api/v1/locations/${editingLocation.id}` : '/api/v1/locations';
      
      const payload: any = { name: newFolderName };
      if (!editingLocation) {
        payload.parent_id = selectedLocation;
        payload.path = selectedLocation ? `${locations.find(l => l.id === selectedLocation)?.path}/${newFolderName}` : newFolderName;
      }

      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewFolderName('');
        setEditingLocation(null);
        setShowFolderModal(false);
        fetchLocations();
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteFolder = (id: string, name: string) => {
    setDeletingLocation({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDeleteFolder = async () => {
    if (!deletingLocation) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/locations/${deletingLocation.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (selectedLocation === deletingLocation.id) setSelectedLocation(null);
        setShowDeleteModal(false);
        setDeletingLocation(null);
        fetchLocations();
      } else {
        const data = await res.json();
        alert(data.detail || "Error al eliminar la carpeta. Asegúrese de que esté vacía.");
      }
    } catch (err) { console.error(err); }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTree = (parentId: string | null = null, level = 0) => {
    const nodes = locations.filter(l => l.parent_id === parentId);
    if (nodes.length === 0) return null;

    return (
      <div className={`${level > 0 ? 'ms-3 border-start ps-2' : ''}`}>
        {nodes.map(node => (
          <div key={node.id} className="mb-1">
            <div 
              className={`d-flex align-items-center py-2 px-2 rounded cursor-pointer transition-all ${selectedLocation === node.id ? 'bg-primary text-white shadow-sm' : 'hover-bg-light'} folder-item`}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, node.id)}
              onClick={() => {
                setSelectedLocation(node.id);
                setShowMobileFolders(false);
              }}
            >
              <div onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} className="me-2 opacity-75">
                {expanded[node.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
              <Folder size={16} className={`me-2 ${selectedLocation === node.id ? 'text-white' : 'text-warning'}`} />
              <span className="small fw-medium text-truncate flex-grow-1">{node.name}</span>
              
              <Dropdown onClick={(e) => e.stopPropagation()} align="end">
                <Dropdown.Toggle as="div" className="p-1 opacity-50 hover-opacity-100">
                  <MoreVertical size={12} className={selectedLocation === node.id ? 'text-white' : 'text-dark'} />
                </Dropdown.Toggle>
                <Dropdown.Menu className="shadow border-0 small">
                  <Dropdown.Item onClick={() => {
                    setEditingLocation(node);
                    setNewFolderName(node.name);
                    setShowFolderModal(true);
                  }}>
                    Renombrar
                  </Dropdown.Item>
                  <Dropdown.Item className="text-danger" onClick={() => handleDeleteFolder(node.id, node.name)}>
                    Eliminar
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
            {expanded[node.id] && renderTree(node.id, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  const SidebarContent = () => (
    <div className="p-3 p-lg-0">
      <div 
        className={`d-flex align-items-center py-2 px-2 mb-1 rounded cursor-pointer transition-all ${!selectedLocation ? 'bg-primary text-white shadow-sm' : 'hover-bg-light'}`}
        onClick={() => {
          setSelectedLocation(null);
          setShowMobileFolders(false);
        }}
      >
        <Activity size={16} className={`me-2 ${!selectedLocation ? 'text-white' : 'text-primary'}`} />
        <span className="small fw-bold">Infraestructura (Raíz)</span>
      </div>
      
      <div className="mt-3 mb-2 px-2 d-flex justify-content-between align-items-center">
        <span className="text-uppercase x-small fw-bold text-muted">Explorar Jerarquía</span>
        <Button 
          variant="link" 
          size="sm" 
          className="p-0 text-primary d-flex align-items-center" 
          onClick={(e) => {
            e.stopPropagation();
            setShowFolderModal(true);
          }}
          title="Nueva Carpeta Raíz"
        >
          <FolderPlus size={16} />
        </Button>
      </div>

      <div className="ms-1 border-start ps-1">
        {renderTree()}
      </div>

      <div className="mt-4 pt-3 border-top px-2">
        <Button 
          variant="outline-primary" 
          size="sm" 
          className="w-100 d-flex align-items-center justify-content-center"
          onClick={() => setShowFolderModal(true)}
        >
          <FolderPlus size={14} className="me-2" /> 
          <span className="small">Nueva Subcarpeta</span>
        </Button>
      </div>
    </div>
  );

  return (
    <Layout title="Inventario de Activos">
      <Container fluid className="px-0">
        {selectedAssets.length > 0 && (
          <div className="bg-primary text-white p-2 rounded mb-3 d-flex justify-content-between align-items-center shadow-sm sticky-top" style={{top: '70px', zIndex: 900}}>
            <div className="ps-3 small fw-bold">
              <CheckSquare size={16} className="me-2" /> {selectedAssets.length} equipos seleccionados
            </div>
            <div className="d-flex gap-2">
              <Button variant="light" size="sm" className="fw-bold" onClick={() => setShowMoveModal(true)}>
                <ArrowRightLeft size={14} className="me-1" /> Mover a...
              </Button>
              <Button variant="danger" size="sm" className="fw-bold border-white" onClick={() => handleBulkDelete(selectedAssets)}>
                <Trash2 size={14} className="me-1" /> Dar de baja
              </Button>
              <Button variant="link" size="sm" className="text-white text-decoration-none" onClick={() => setSelectedAssets([])}>Cancelar</Button>
            </div>
          </div>
        )}

        <Row className="g-3">
          <Col lg={3} className="d-none d-lg-block">
            <Card className="border-0 shadow-sm sticky-top" style={{ top: '100px', height: 'calc(100vh - 140px)', overflowY: 'auto' }}>
              <Card.Body className="p-3">
                <SidebarContent />
                <div className="mt-4 p-2 bg-light rounded border border-dashed text-center small text-muted">
                  <ArrowRightLeft size={14} className="mb-1 d-block mx-auto" />
                  Arrastre un equipo a una carpeta para moverlo.
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={9}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white border-bottom py-3">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                  <div className="flex-grow-1" style={{ maxWidth: '400px' }}>
                    <InputGroup size="sm" className="bg-light rounded-pill px-2">
                      <InputGroup.Text className="bg-transparent border-0 text-muted"><Search size={16} /></InputGroup.Text>
                      <Form.Control className="bg-transparent border-0 shadow-none" placeholder="Host, IP, MAC o Serial..." />
                    </InputGroup>
                  </div>
                  <div className="d-flex gap-2">
                    <Button variant="outline-secondary" size="sm" className="d-flex align-items-center" onClick={exportToCSV} disabled={assets.length === 0}>
                      <Download size={16} className="me-md-1" /> <span className="d-none d-md-inline">Exportar</span>
                    </Button>
                    <Button variant="outline-dark" size="sm" className="d-lg-none" onClick={() => setShowMobileFolders(true)}>
                      <Folder size={16} className="me-1" /> Carpetas
                    </Button>
                    <Button variant="primary" size="sm" className="shadow-sm" onClick={() => router.push('/inventory/install')}>
                      <Plus size={16} className="me-1" /> <span className="d-none d-md-inline">Nuevo Activo</span>
                    </Button>
                  </div>
                </div>
                {selectedLocation && (
                  <div className="mt-2 px-2 d-flex align-items-center gap-1 small text-muted overflow-hidden">
                    <Folder size={12} className="flex-shrink-0" />
                    <div className="d-flex flex-wrap align-items-center">
                      <span 
                        className="breadcrumb-item-custom cursor-pointer hover-text-primary"
                        onClick={() => setSelectedLocation(null)}
                      >
                        Raíz
                      </span>
                      {(() => {
                        const currentNode = locations.find(l => l.id === selectedLocation);
                        if (!currentNode) return null;
                        
                        const pathParts = currentNode.path.split('/');
                        let accumulatedPath = "";
                        
                        return pathParts.map((part, index) => {
                          accumulatedPath += (index === 0 ? "" : "/") + part;
                          // Buscar el ID del nodo que coincide con este path acumulado
                          const targetNode = locations.find(l => l.path === accumulatedPath);
                          
                          return (
                            <React.Fragment key={index}>
                              <ChevronRight size={10} className="mx-1 opacity-50" />
                              <span 
                                className={`breadcrumb-item-custom ${index === pathParts.length - 1 ? 'fw-bold text-dark' : 'cursor-pointer hover-text-primary'}`}
                                onClick={() => targetNode && setSelectedLocation(targetNode.id)}
                              >
                                {part}
                              </span>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                    <thead className="bg-light">
                      <tr className="text-muted text-uppercase small">
                        <th className="border-0 ps-4 py-3" style={{width: '40px'}}>
                          <div onClick={toggleSelectAll} className="cursor-pointer">
                            {selectedAssets.length === assets.length && assets.length > 0 ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                          </div>
                        </th>
                        <th className="border-0">Equipo</th>
                        <th className="border-0">Estado</th>
                        <th className="border-0">IP Actual</th>
                        <th className="border-0 d-none d-md-table-cell">Protección</th>
                        <th className="border-0 text-end pe-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} className="text-center py-5"><Spinner animation="border" variant="primary" size="sm" /></td></tr>
                      ) : assets.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-5 text-muted italic">No hay activos en esta carpeta.</td></tr>
                      ) : (
                        assets.map(asset => (
                          <tr 
                            key={asset.id} 
                            className={`${selectedAssets.includes(asset.id) ? 'bg-primary bg-opacity-10' : ''} ${draggedAssetId === asset.id ? 'opacity-50' : ''}`}
                            draggable
                            onDragStart={(e) => onDragStart(e, asset.id)}
                          >
                            <td className="ps-4">
                              <div className="d-flex align-items-center">
                                <GripVertical size={14} className="me-2 text-muted cursor-move d-none d-lg-inline" />
                                <div onClick={() => toggleSelectAsset(asset.id)} className="cursor-pointer">
                                  {selectedAssets.includes(asset.id) ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                                </div>
                              </div>
                            </td>
                            <td className="ps-4 py-3">
                              <div 
                                className="fw-bold text-dark d-flex align-items-center cursor-pointer hover-text-primary"
                                onClick={() => router.push(`/inventory/${asset.id}`)}
                              >
                                <Monitor size={14} className="me-2 text-primary opacity-50" />
                                {asset.hostname}
                              </div>
                              <div className="x-small text-muted font-monospace">{asset.mac_address || 'Sin MAC'}</div>
                            </td>
                            <td>
                              <Badge bg={asset.status === 'operative' ? 'success' : 'secondary'} className="fw-normal" style={{fontSize: '0.65rem'}}>
                                {asset.status === 'operative' ? 'OPERATIVO' : asset.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="font-monospace small">{asset.ip_address}</td>
                            <td className="d-none d-md-table-cell">
                              <Shield size={12} className={`me-1 ${asset.av_product ? 'text-success' : 'text-danger'}`} />
                              <span className="small">{asset.av_product || 'Pendiente'}</span>
                            </td>
                            <td className="text-end pe-4">
                              <Dropdown align="end">
                                <Dropdown.Toggle as="div" className="cursor-pointer"><MoreVertical size={16} /></Dropdown.Toggle>
                                <Dropdown.Menu className="shadow border-0 small">
                                  <Dropdown.Item onClick={() => { setSelectedAssets([asset.id]); setShowMoveModal(true); }}>
                                    <ArrowRightLeft size={14} className="me-2" /> Mover
                                  </Dropdown.Item>
                                  <Dropdown.Item onClick={() => router.push(`/inventory/${asset.id}`)}>
                                    <Activity size={14} className="me-2" /> Ver Detalle / Historial
                                  </Dropdown.Item>
                                  <Dropdown.Divider />
                                  <Dropdown.Item className="text-danger" onClick={() => handleSingleDelete(asset.id)}>Baja Lógica</Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Offcanvas para Carpetas en Móvil */}
      <Offcanvas show={showMobileFolders} onHide={() => setShowMobileFolders(false)} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">Explorador de Ubicaciones</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <SidebarContent />
        </Offcanvas.Body>
      </Offcanvas>

      {/* Modal Mover Activos (Masa) */}
      <Modal show={showMoveModal} onHide={() => setShowMoveModal(false)} centered scrollable>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h6 fw-bold">Mover {selectedAssets.length} activos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted mb-3">Seleccione el destino en el árbol de ubicaciones:</p>
          <div className="p-2 border rounded bg-light mb-3 min-vh-25">
            {moveDestination ? (
              <div className="d-flex align-items-center text-primary fw-bold small">
                <Folder size={14} className="me-2" /> {moveDestination.path}
              </div>
            ) : (
              <span className="small text-danger italic">No se ha seleccionado destino</span>
            )}
          </div>
          <LocationSelector 
            selectedId={moveDestination?.id} 
            onSelect={(node) => setMoveDestination(node)} 
          />
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="light" size="sm" onClick={() => setShowMoveModal(false)}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={() => handleBulkMove(selectedAssets, moveDestination!.id)} disabled={!moveDestination || moving}>
            {moving ? 'Moviendo...' : 'Confirmar Movimiento'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Nueva/Editar Carpeta */}
      <Modal show={showFolderModal} onHide={() => { setShowFolderModal(false); setEditingLocation(null); setNewFolderName(''); }} centered size="sm">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h6 fw-bold">{editingLocation ? 'Renombrar Carpeta' : 'Nueva Subcarpeta'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <Form.Group>
            <Form.Label className="x-small fw-bold text-muted">Nombre de la carpeta</Form.Label>
            <Form.Control 
              autoFocus
              size="sm"
              placeholder="Ej: Piso 1, Sector SOC..."
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
            />
            {!editingLocation && (
              selectedLocation ? (
                <Form.Text className="x-small text-muted">
                  Se creará dentro de: <strong>{locations.find(l => l.id === selectedLocation)?.name}</strong>
                </Form.Text>
              ) : (
                <Form.Text className="x-small text-muted">
                  Se creará como una <strong>Carpeta Raíz</strong>.
                </Form.Text>
              )
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" size="sm" onClick={() => { setShowFolderModal(false); setEditingLocation(null); setNewFolderName(''); }}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={handleCreateFolder}>{editingLocation ? 'Guardar' : 'Crear'}</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h6 fw-bold text-danger">Eliminar Carpeta</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small mb-0">¿Está seguro de eliminar <strong>{deletingLocation?.name}</strong>?</p>
          <p className="x-small text-muted mt-2">Esta acción solo se permite si la carpeta no tiene subcarpetas ni activos vinculados.</p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" size="sm" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={confirmDeleteFolder}>Eliminar</Button>
        </Modal.Footer>
      </Modal>

      <style jsx global>{`
        .cursor-pointer { cursor: pointer; }
        .cursor-move { cursor: move; }
        .hover-bg-light:hover { background-color: #f8f9fa; }
        .folder-item .dropdown { opacity: 0; transition: opacity 0.2s; }
        .folder-item:hover .dropdown { opacity: 1; }
        .x-small { font-size: 0.75rem; }
        .font-monospace { font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }
        .min-vh-25 { min-height: 50px; }
        .border-dashed { border-style: dashed !important; }
        .breadcrumb-item-custom { transition: color 0.2s ease; white-space: nowrap; }
        .breadcrumb-item-custom:hover { color: var(--bs-primary) !important; text-decoration: underline; }
        .hover-text-primary:hover { color: var(--bs-primary) !important; }
      `}</style>
    </Layout>
  );
};

export default InventoryPage;
