import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Folder, ChevronRight, ChevronDown, Plus, MoreVertical, Search,
  Monitor, Shield, Activity, FolderPlus,
  RefreshCw, HardDrive, Edit2, Trash2, Move, Layers, CheckCircle2,
  XCircle, AlertTriangle, FileText, UploadCloud
} from 'lucide-react';
import { 
  Row, Col, Card, Table, Button, InputGroup, Form, Badge,
  Dropdown, Spinner, Container, Modal, ListGroup, Alert
} from 'react-bootstrap';
import api from '../../lib/api';
import { getStatusBadge } from '../../lib/ui/badges';
import FolderModal from '../../components/inventory/FolderModal';

interface LocationNode {
  id: string;
  name: string;
  path: string;
  parent_id: string | null;
  total_assets: number;
  direct_assets: number;
}

export default function InventoryPage() {
  const { theme } = useTheme();
  const { isSuperuser, user: currentUser } = useAuth();
  const isDark = theme === 'dark';
  const router = useRouter();
  
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showDecommissioned, setShowDecommissioned] = useState(false);
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{assets: any[], locations: any[]} | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('operative');
  
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importData, setImportData] = useState<any[] | null>(null);
  const [importSummary, setImportSummary] = useState<any | null>(null);
  const [importSource, setImportSource] = useState<string>('auto');
  const getBreadcrumbs = () => {
      if (!selectedLocation) return [{ id: null, name: 'TODO EL INVENTARIO' }];
      const crumbs = [];
      let current = locations.find(l => l.id === selectedLocation);
      while (current) {
          crumbs.unshift({ id: current.id, name: current.name });
          current = locations.find(l => l.id === current?.parent_id);
      }
      crumbs.unshift({ id: null, name: 'INVENTARIO' });
      return crumbs;
  };

  const fetchLocations = async () => {
    setLocLoading(true);
    try {
      const res = await api.get('/locations');
      setLocations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLocLoading(false);
    }
  };

  const fetchAssets = async (locationId: string | null, search: string = '') => {
    setLoading(true);
    try {
      const params: any = { show_decommissioned: showDecommissioned };
      if (locationId) params.location_node_id = locationId;
      if (search) params.search = search;
      const res = await api.get('/assets', { params });
      setAssets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLocations(); }, []);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (searchTerm.length >= 2) {
          performSearch(searchTerm);
      } else {
          setSearchResults(null);
          setShowSearchDropdown(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const performSearch = async (term: string) => {
      try {
          const res = await api.get('/assets/search', { params: { search: term } });
          setSearchResults(res.data);
          setShowSearchDropdown(true);
      } catch (err) {
          console.error(err);
      }
  };

  const toggleAssetSelection = (id: string) => {
      const newSet = new Set(selectedAssets);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedAssets(newSet);
  };

  const handleBulkAction = async (action: 'move' | 'status' | 'delete', value?: string) => {
      if (selectedAssets.size === 0) return;
      
      const assetIds = Array.from(selectedAssets);
      
      try {
          if (action === 'delete') {
              if (!confirm(`¿Eliminar ${assetIds.length} equipos?`)) return;
              await api.delete('/assets/bulk-delete', { data: assetIds });
          } else if (action === 'move' && value) {
              await api.post('/assets/bulk-action', { 
                  asset_ids: assetIds, 
                  location_node_id: value 
              });
              setShowMoveModal(false);
          } else if (action === 'status' && value) {
              await api.post('/assets/bulk-action', { 
                  asset_ids: assetIds, 
                  status: value 
              });
              setShowStatusModal(false);
          }
          
          setSelectedAssets(new Set());
          fetchAssets(selectedLocation, debouncedSearch);
          fetchLocations();
      } catch (err: any) {
          alert("Error: " + err.message);
      }
  };

  useEffect(() => { 
    fetchAssets(selectedLocation, debouncedSearch); 
  }, [selectedLocation, showDecommissioned, debouncedSearch]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        const uint8 = new Uint8Array(buffer);
        let encoding = 'utf-8';
        if (uint8[0] === 0xFF && uint8[1] === 0xFE) encoding = 'utf-16le';
        else if (uint8[0] === 0xFE && uint8[1] === 0xFF) encoding = 'utf-16be';
        
        const text = new TextDecoder(encoding).decode(buffer);
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return alert("Archivo inválido");

        const firstLine = lines[0];
        const delimiter = firstLine.indexOf(';') !== -1 ? ';' : ',';

        const parseLine = (line: string) => {
            const row = [];
            let inQuotes = false, cell = '';
            for (let i = 0; i < line.length; i++) {
                if (line[i] === '"') inQuotes = !inQuotes;
                else if (line[i] === delimiter && !inQuotes) { row.push(cell.trim()); cell = ''; }
                else cell += line[i];
            }
            row.push(cell.trim());
            return row;
        };

        const rawHeaders = parseLine(lines[0]);
        const cleanHeaders = rawHeaders.map(h => h.toLowerCase().replace(/["']/g, '').trim());
        
        const data = lines.slice(1).map(line => {
            const values = parseLine(line);
            const obj: any = {};
            cleanHeaders.forEach((h, i) => {
                if (h) obj[h] = values[i] || "";
            });
            return obj;
        });

        setImportPreview(data.slice(0, 10));
        setImportData(data);
        setImportSummary(null);
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    const dataToImport = importData;
    if (!dataToImport) return;
    setImportLoading(true);
    try {
        const res = await api.post(`/assets/import?source=${importSource}`, dataToImport);
        setImportSummary(res.data);
        setImportData(null);
        setImportPreview(null);
        fetchLocations();
        fetchAssets(selectedLocation);
    } catch (err) {
        alert("Error procesando importación");
    } finally {
        setImportLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    if (stateFilter === 'all') return true;
    if (stateFilter === 'no_folder') return !asset.location_node_id;
    return asset.status === stateFilter;
  });

  const handleDeleteFolder = async (node: any) => {
    if (!confirm(`¿Borrar carpeta "${node.name}"? Esto afectará la visualización.`)) return;
    try {
      await api.delete(`/locations/${node.id}`);
      fetchLocations();
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      if (editingNode) {
        // Simple rename: replace the last part of the path
        const pathParts = editingNode.path.split(' / ');
        pathParts[pathParts.length - 1] = newFolderName.trim();
        const newPath = pathParts.join(' / ');
        
        await api.put(`/locations/${editingNode.id}`, { 
          name: newFolderName.trim(), 
          path: newPath 
        });
      } else {
        const parent = locations.find(l => l.id === selectedLocation);
        const path = parent ? `${parent.path} / ${newFolderName.trim()}` : newFolderName.trim();
        await api.post('/locations', { 
          name: newFolderName.trim(), 
          parent_id: selectedLocation, 
          path: path 
        });
      }
      setShowFolderModal(false);
      setEditingNode(null);
      setNewFolderName('');
      fetchLocations();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const renderTree = (parentId: string | null = null, level = 0) => {
    let nodes = locations.filter(l => l.parent_id === parentId);
    
    if (folderSearch) {
        const searchLower = folderSearch.toLowerCase();
        const matchesSearch = (node: LocationNode): boolean => {
            if (node.name.toLowerCase().includes(searchLower)) return true;
            const children = locations.filter(l => l.parent_id === node.id);
            return children.some(c => matchesSearch(c));
        };
        nodes = nodes.filter(n => matchesSearch(n));
    }

    return (
      <div className={`${level > 0 ? 'ms-2 border-start ps-2' : ''}`} style={{ borderColor: 'rgba(var(--bs-primary-rgb), 0.2)' }}>
        {nodes.map(node => {
          const isExpanded = expanded[node.id] || (folderSearch !== "" && locations.some(l => l.parent_id === node.id));
          const hasChildren = locations.some(l => l.parent_id === node.id);

          return (
            <div key={node.id} className="mb-1">
              <div 
                className={`d-flex align-items-center py-2 px-2 rounded cursor-pointer transition-all ${selectedLocation === node.id ? 'bg-primary text-white shadow-sm' : 'hover-bg'}`} 
                onClick={() => setSelectedLocation(node.id)}
              >
                <div onClick={(e) => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [node.id]: !prev[node.id] })); }} className={`me-1 ${hasChildren ? 'opacity-100' : 'opacity-0'}`} style={{ width: '16px' }}>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                <Folder size={14} className={`me-2 ${selectedLocation === node.id ? 'text-white' : 'text-warning'}`} />
                <span className={`x-small fw-bold text-truncate flex-grow-1 text-uppercase ${folderSearch && node.name.toLowerCase().includes(folderSearch.toLowerCase()) ? 'text-decoration-underline' : ''}`}>{node.name}</span>
                <Badge bg={selectedLocation === node.id ? "light" : "primary"} text={selectedLocation === node.id ? "dark" : "white"} className="mx-2" style={{ fontSize: '9px' }}>{node.total_assets || 0}</Badge>
                <Dropdown onClick={(e) => e.stopPropagation()} align="end">
                  <Dropdown.Toggle as="div" className="p-1 opacity-50 cursor-pointer"><MoreVertical size={12} /></Dropdown.Toggle>
                  <Dropdown.Menu className="shadow-lg border-0 small">
                    <Dropdown.Item onClick={() => { setEditingNode(node); setNewFolderName(node.name); setShowFolderModal(true); }}><Edit2 size={12} className="me-2" /> Renombrar</Dropdown.Item>
                    <Dropdown.Item className="text-danger" onClick={() => handleDeleteFolder(node)}><Trash2 size={12} className="me-2" /> Eliminar</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
              {isExpanded && renderTree(node.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Layout title="Inventario de Activos">
      <style jsx global>{`
          .inventory-container { max-width: 100vw; overflow-x: hidden; }
          .hover-row:hover { background-color: rgba(var(--bs-primary-rgb), 0.03); }
          .sticky-actions { 
              position: sticky; 
              right: 0; 
              background: var(--card-bg); 
              box-shadow: -5px 0 10px rgba(0,0,0,0.05);
              z-index: 10;
          }
          .table-fixed-layout { table-layout: fixed; min-width: 1000px; }
          .breadcrumb-item + .breadcrumb-item::before { content: ">"; color: var(--text-muted); font-size: 10px; }
          .z-index-1000 { z-index: 1000; }
          .max-width-400 { max-width: 400px; }
          .transition-all { transition: all 0.2s ease; }
          @media (max-width: 1366px) {
              .hide-tablet { display: none; }
          }
      `}</style>

      <div className="inventory-container p-3 p-lg-4">
        {/* Header Superior - Búsqueda & Breadcrumbs */}
        <Card className="border-0 shadow-sm mb-4 overflow-visible">
            <Card.Body className="py-2 px-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center flex-grow-1 position-relative" style={{ maxWidth: '500px' }}>
                    <InputGroup className="border rounded-pill px-3 py-1 bg-light">
                        <InputGroup.Text className="bg-transparent border-0"><Search size={18} className="text-muted" /></InputGroup.Text>
                        <Form.Control 
                            className="bg-transparent border-0 shadow-none x-small fw-bold" 
                            placeholder="Buscar por Hostname, IP o MAC..." 
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setShowSearchDropdown(true); }}
                            onFocus={() => (searchTerm.length >= 2 || searchResults) && setShowSearchDropdown(true)}
                        />
                        {searchTerm && (
                          <Button variant="link" className="p-0 text-muted" onClick={() => { setSearchTerm(''); setSearchResults(null); setShowSearchDropdown(false); }}><XCircle size={16} /></Button>
                        )}
                    </InputGroup>

                    {showSearchDropdown && searchResults && (
                        <Card className="position-absolute w-100 shadow-lg border-0 z-index-1000 mt-2 overflow-hidden" style={{ top: '100%' }}>
                            <div className="p-2 border-bottom bg-light d-flex justify-content-between align-items-center">
                                <span className="x-small fw-bold text-muted text-uppercase">Resultados de búsqueda</span>
                                <Button variant="link" size="sm" className="p-0 text-muted x-small text-decoration-none" onClick={() => setShowSearchDropdown(false)}>CERRAR</Button>
                            </div>
                            <div className="custom-scrollbar" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {searchResults.locations.length > 0 && (
                                    <>
                                        <div className="p-2 bg-light bg-opacity-50 x-small fw-bold border-bottom text-muted">📁 UBICACIONES</div>
                                        {searchResults.locations.map(loc => (
                                            <div key={loc.id} className="p-2 border-bottom hover-bg cursor-pointer d-flex align-items-center gap-2" onClick={() => { setSelectedLocation(loc.id); setShowSearchDropdown(false); setSearchTerm(''); }}>
                                                <Folder size={14} className="text-warning flex-shrink-0" />
                                                <div className="flex-grow-1 overflow-hidden">
                                                    <div className="fw-bold text-primary small text-truncate">{loc.name}</div>
                                                    <div className="x-small text-muted text-truncate font-monospace opacity-75">{loc.path}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                                {searchResults.assets.length > 0 && (
                                    <>
                                        <div className="p-2 bg-light bg-opacity-50 x-small fw-bold border-bottom text-muted">💻 EQUIPOS</div>
                                        {searchResults.assets.map(asset => (
                                            <div key={asset.id} className="p-2 border-bottom hover-bg cursor-pointer d-flex align-items-center gap-2" onClick={() => { router.push(`/inventory/${asset.id}`); setShowSearchDropdown(false); }}>
                                                <Monitor size={14} className="text-primary flex-shrink-0" />
                                                <div className="flex-grow-1 overflow-hidden">
                                                    <div className="fw-bold text-primary small text-truncate">{asset.hostname}</div>
                                                    <div className="x-small text-muted text-truncate font-monospace">{asset.ip} | {asset.mac}</div>
                                                </div>
                                                <div className="ms-auto flex-shrink-0">
                                                    {getStatusBadge(asset.status)}
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                                {searchResults.assets.length === 0 && searchResults.locations.length === 0 && (
                                    <div className="p-4 text-center text-muted x-small fw-bold">NO SE ENCONTRARON COINCIDENCIAS</div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                <div className="d-flex align-items-center gap-3">
                    <nav aria-label="breadcrumb" className="hide-tablet">
                        <ol className="breadcrumb m-0 x-small fw-bold">
                            {getBreadcrumbs().map((crumb, idx) => (
                                <li key={idx} className={`breadcrumb-item ${idx === getBreadcrumbs().length - 1 ? 'active color-primary' : ''}`}>
                                    <span className="cursor-pointer hover-underline" onClick={() => setSelectedLocation(crumb.id)}>{crumb.name}</span>
                                </li>
                            ))}
                        </ol>
                    </nav>
                    <div className="vr hide-tablet"></div>
                    <Button variant="primary" size="sm" className="fw-bold shadow-sm px-3" onClick={() => router.push('/inventory/install')}><Plus size={16} className="me-1" /> NUEVO EQUIPO</Button>
                </div>
            </Card.Body>
        </Card>

        <Row className="g-4">
          <Col lg={3}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="py-3 bg-transparent border-bottom-0 pb-0">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="fw-bold small text-uppercase letter-spacing-1">Ubicaciones</span>
                    <Button variant="link" size="sm" className="p-0" onClick={() => { setEditingNode(null); setNewFolderName(''); setShowFolderModal(true); }}><FolderPlus size={18} /></Button>
                </div>
                <InputGroup size="sm" className="mb-2 bg-light rounded-pill border-0 px-2">
                    <InputGroup.Text className="bg-transparent border-0 text-muted"><Search size={14} /></InputGroup.Text>
                    <Form.Control 
                        placeholder="Filtrar carpetas..." 
                        className="bg-transparent border-0 shadow-none x-small fw-bold" 
                        value={folderSearch}
                        onChange={e => setFolderSearch(e.target.value)}
                    />
                </InputGroup>
              </Card.Header>
              <Card.Body className="p-2 custom-scrollbar" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className={`d-flex align-items-center py-2 px-2 mb-2 rounded cursor-pointer transition-all ${!selectedLocation ? 'bg-primary text-white shadow-sm' : 'hover-bg'}`} onClick={() => setSelectedLocation(null)}>
                  <HardDrive size={16} className="me-2" />
                  <span className="small fw-bold text-uppercase">VISTA GLOBAL</span>
                </div>
                {locLoading ? <div className="text-center py-4"><Spinner animation="border" size="sm" /></div> : renderTree()}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={9}>
            <Card className="border-0 shadow-sm h-100 overflow-hidden">
              <Card.Header className="py-3 bg-transparent border-bottom d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                    <div className="bg-primary bg-opacity-10 p-2 rounded"><Activity size={18} className="text-primary" /></div>
                    <div>
                        <h6 className="m-0 fw-bold text-uppercase">{selectedLocation ? locations.find(l => l.id === selectedLocation)?.name : 'VISTA GLOBAL'}</h6>
                        <div className="x-small text-muted fw-bold">{filteredAssets.length} dispositivos en esta vista</div>
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <Form.Select size="sm" className="x-small fw-bold" style={{ width: '140px' }} value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                        <option value="all">TODOS LOS ESTADOS</option>
                        <option value="operative">OPERATIVOS</option>
                        <option value="maintenance">MANTENIMIENTO</option>
                        <option value="tagging_pending">PEND. ETIQUETAR</option>
                    </Form.Select>
                    <Button variant="outline-primary" size="sm" className="fw-bold" onClick={() => setShowImportModal(true)}><Layers size={16} className="me-1" /> IMPORTAR</Button>
                </div>
              </Card.Header>
              
              <Card.Body className="p-0 position-relative">
                {/* Barra de Acciones Masivas - Mejorada para no solapar */}
                <div className={`bulk-actions-bar bg-primary text-white transition-all overflow-hidden ${selectedAssets.size > 0 ? 'py-2 px-3' : 'h-0 opacity-0'}`} style={{ maxHeight: selectedAssets.size > 0 ? '60px' : '0' }}>
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                            <span className="x-small fw-bold">{selectedAssets.size} EQUIPOS SELECCIONADOS</span>
                            <div className="vr opacity-50"></div>
                            <Button variant="link" className="text-white p-0 x-small fw-bold text-decoration-none" onClick={() => setSelectedAssets(new Set())}>DESELECCIONAR</Button>
                        </div>
                        <div className="d-flex gap-2">
                            <Button variant="light" size="sm" className="x-small fw-bold" onClick={() => setShowMoveModal(true)}><Move size={14} className="me-1" /> MOVER A...</Button>
                            <Button variant="light" size="sm" className="x-small fw-bold" onClick={() => setShowStatusModal(true)}><RefreshCw size={14} className="me-1" /> CAMBIAR ESTADO</Button>
                            {isSuperuser && (
                                <Button variant="danger" size="sm" className="x-small fw-bold border-0" onClick={() => handleBulkAction('delete')}><Trash2 size={14} className="me-1" /> ELIMINAR</Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="table-responsive custom-scrollbar">
                    <Table hover className="align-middle mb-0 border-0 table-fixed-layout">
                    <thead className="bg-light">
                        <tr className="x-small text-uppercase opacity-75">
                        <th className="ps-4" style={{ width: '50px' }}>
                            <Form.Check 
                                type="checkbox"
                                checked={filteredAssets.length > 0 && Array.from(selectedAssets).length === filteredAssets.length}
                                onChange={(e) => {
                                    if (e.target.checked) setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
                                    else setSelectedAssets(new Set());
                                }}
                            />
                        </th>
                        <th style={{ width: '30%' }}>Endpoint / MAC</th>
                        <th style={{ width: '150px' }}>Estado</th>
                        <th style={{ width: '150px' }}>IP Actual</th>
                        <th className="hide-tablet">Protección</th>
                        <th className="text-center sticky-actions" style={{ width: '100px' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                        <tr><td colSpan={6} className="text-center py-5"><Spinner animation="border" size="sm" /></td></tr>
                        ) : filteredAssets.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-5 text-muted x-small fw-bold">NO SE ENCONTRARON DISPOSITIVOS</td></tr>
                        ) : filteredAssets.map(asset => (
                        <tr key={asset.id} className={`border-bottom hover-row ${selectedAssets.has(asset.id) ? 'bg-primary bg-opacity-5' : ''}`}>
                            <td className="ps-4">
                                <Form.Check 
                                    type="checkbox"
                                    checked={selectedAssets.has(asset.id)}
                                    onChange={() => toggleAssetSelection(asset.id)}
                                />
                            </td>
                            <td className="py-3">
                                <div className="d-flex align-items-center gap-3 overflow-hidden">
                                    <div className={`p-2 rounded bg-opacity-10 flex-shrink-0 ${asset.status === 'operative' ? 'bg-success text-success' : 'bg-warning text-warning'}`}>{<Monitor size={16} />}</div>
                                    <div className="text-truncate">
                                        <div className="fw-bold text-primary text-truncate">{asset.hostname}</div>
                                        <div className="x-small text-muted font-monospace text-truncate">{asset.mac_address || '---'}</div>
                                    </div>
                                </div>
                            </td>
                            <td>{getStatusBadge(asset.status)}</td>
                            <td className="small font-monospace">{asset.ip_address || '---'}</td>
                            <td className="hide-tablet"><div className="d-flex align-items-center gap-1 small text-truncate"><Shield size={12} className="text-info" /> {asset.av_product || 'Ninguno'}</div></td>
                            <td className="text-center sticky-actions border-start">
                                <Button variant="link" size="sm" className="p-0" onClick={() => router.push(`/inventory/${asset.id}`)}>{<Search size={16} />}</Button>
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

      {/* Modal de Importación Profesional */}
      <Modal show={showImportModal} onHide={() => { setShowImportModal(false); setImportData(null); setImportPreview(null); setImportSummary(null); setImportSource('auto'); }} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0"><Modal.Title className="fw-bold text-uppercase small letter-spacing-1">Importar Activos</Modal.Title></Modal.Header>
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
                    <div className="text-center py-5 border border-dashed rounded bg-light cursor-pointer" onClick={() => document.getElementById('csv-upload')?.click()}>
                        <UploadCloud size={48} className="text-primary mb-3 opacity-50" />
                        <h6 className="fw-bold">Selecciona tu archivo CSV o TSV</h6>
                        <p className="x-small text-muted">Soporta delimitadores automáticos (, o ;) y codificación UTF-16 de ESET</p>
                        <input type="file" id="csv-upload" className="d-none" accept=".csv,.tsv,.txt" onChange={handleFileUpload} />
                    </div>
                </>
            )}

            {importPreview && (
                <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <Alert variant="info" className="x-small py-2 border-0 shadow-none mb-0 d-flex align-items-center flex-grow-1"><AlertTriangle size={16} className="me-2" /> <strong>VISTA PREVIA:</strong> Detectadas {Object.keys(importPreview[0]).length} columnas. Revisa que coincidan.</Alert>
                        <div className="ms-2">
                            <Badge bg="dark" className="text-uppercase x-small px-2 py-1">{importSource === 'auto' ? 'AUTO' : importSource}</Badge>
                        </div>
                    </div>
                    <div className="table-responsive border rounded" style={{ maxHeight: '300px' }}>
                        <Table size="sm" className="mb-0 x-small">
                            <thead className="bg-light sticky-top">
                                <tr>{Object.keys(importPreview[0]).map(h => <th key={h} className="text-truncate">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {importPreview.map((row, i) => (
                                    <tr key={i}>{Object.values(row).map((v: any, j) => <td key={j} className="text-truncate" style={{ maxWidth: '150px' }}>{v}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                    <div className="mt-3 text-end">
                        <Button variant="outline-secondary" size="sm" className="me-2 fw-bold" onClick={() => setImportData(null)}>CANCELAR</Button>
                        <Button variant="primary" size="sm" className="fw-bold px-4" onClick={confirmImport} disabled={importLoading}>
                            {importLoading ? <Spinner animation="border" size="sm" className="me-2" /> : <CheckCircle2 size={16} className="me-2" />}
                            CONFIRMAR IMPORTACIÓN
                        </Button>
                    </div>
                </div>
            )}

            {importSummary && (
                <div className="text-center py-4">
                    <CheckCircle2 size={64} className="text-success mb-3 opacity-75" />
                    <h4 className="fw-bold mb-4 text-uppercase">¡Proceso Completado!</h4>
                    <Row className="g-3 mb-4">
                        <Col xs={4}><Card className="bg-success bg-opacity-10 border-0 p-3"><h3>{importSummary.success_count}</h3><span className="x-small fw-bold">CREADOS</span></Card></Col>
                        <Col xs={4}><Card className="bg-primary bg-opacity-10 border-0 p-3"><h3>{importSummary.updated_count}</h3><span className="x-small fw-bold">ACTUALIZADOS</span></Card></Col>
                        <Col xs={4}><Card className="bg-danger bg-opacity-10 border-0 p-3"><h3>{importSummary.error_count}</h3><span className="x-small fw-bold">ERRORES</span></Card></Col>
                    </Row>
                    {importSummary.errors.length > 0 && (
                        <div className="text-start bg-light p-3 rounded border" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                            <h6 className="x-small fw-bold text-danger mb-2">DETALLE DE ERRORES:</h6>
                            {importSummary.errors.map((e: any, i: number) => (
                                <div key={i} className="x-small mb-1 border-bottom pb-1">
                                    • Fila {String(e.row)}: {String(e.msg)}
                                </div>
                            ))}
                        </div>
                    )}
                    <Button variant="primary" className="mt-4 px-5 fw-bold" onClick={() => setShowImportModal(false)}>CERRAR</Button>
                </div>
            )}
        </Modal.Body>
      </Modal>

      {/* Modal de Mover Activos */}
      <Modal show={showMoveModal} onHide={() => setShowMoveModal(false)} centered scrollable>
        <Modal.Header closeButton className="border-0 pb-0"><Modal.Title className="fw-bold small text-uppercase">Mover {selectedAssets.size} equipos</Modal.Title></Modal.Header>
        <Modal.Body>
            <p className="x-small text-muted mb-3 text-uppercase">Selecciona la carpeta de destino:</p>
            <ListGroup className="x-small fw-bold border-0">
                {locations.filter(l => l.path.includes('/')).sort((a,b) => a.path.localeCompare(b.path)).map(loc => (
                    <ListGroup.Item key={loc.id} action className="border-0 py-2 rounded mb-1 hover-bg" onClick={() => handleBulkAction('move', loc.id)}>
                        <Folder size={14} className="text-warning me-2" /> {loc.path}
                    </ListGroup.Item>
                ))}
            </ListGroup>
        </Modal.Body>
      </Modal>

      {/* Modal de Estado */}
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered size="sm">
        <Modal.Header closeButton className="border-0 pb-0"><Modal.Title className="fw-bold small text-uppercase">Cambiar Estado</Modal.Title></Modal.Header>
        <Modal.Body>
            <Form.Group className="mb-3">
                <Form.Label className="x-small fw-bold text-muted text-uppercase">Nuevo estado para {selectedAssets.size} equipos</Form.Label>
                <Form.Select className="x-small fw-bold" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="operative">OPERATIVO</option>
                    <option value="maintenance">MANTENIMIENTO</option>
                    <option value="tagging_pending">PENDIENTE ETIQUETAR</option>
                    <option value="decommissioned">DADO DE BAJA</option>
                </Form.Select>
            </Form.Group>
            <Button variant="primary" className="w-100 fw-bold x-small" onClick={() => handleBulkAction('status', newStatus)}>APLICAR CAMBIOS</Button>
        </Modal.Body>
      </Modal>

      <FolderModal 
        show={showFolderModal} 
        onHide={() => setShowFolderModal(false)} 
        onSave={handleSaveFolder} 
        editing={!!editingNode} 
        folderName={newFolderName} 
        setFolderName={setNewFolderName} 
      />
    </Layout>
  );
}