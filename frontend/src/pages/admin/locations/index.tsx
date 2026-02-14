import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { Container, Row, Col, Card, Table, Badge, Button, Form, InputGroup, Spinner, Modal } from 'react-bootstrap';
import { MapPin, Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../lib/api';

export default function LocationsManagement() {
 const [locations, setLocations] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');
 
 // Paginación
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(20);
 const [totalPages, setTotalPages] = useState(1);
 const [totalItems, setTotalItems] = useState(0);

 const [showModal, setShowModal] = useState(false);
 const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
 const [saving, setSaving] = useState(false);
 const [formData, setFormData] = useState({
  name: '', dependency_code: '', address: '', description: ''
 });

 const fetchLocations = async () => {
  setLoading(true);
  try {
   const res = await api.get('/locations', { 
    params: { 
     q: searchTerm || undefined,
     page: page,
     size: pageSize
    } 
   });
   
   // Manejo robusto de la respuesta paginada
   if (res.data && res.data.items) {
    setLocations(res.data.items);
    setTotalItems(res.data.total || 0);
    setTotalPages(res.data.pages || 1);
   } else if (Array.isArray(res.data)) {
    setLocations(res.data);
    setTotalItems(res.data.length);
    setTotalPages(1);
   }
  } catch (err) {
   console.error('Error fetching locations:', err);
  } finally {
   setLoading(false);
  }
 };

 useEffect(() => {
  const delayDebounceFn = setTimeout(() => {
   fetchLocations();
  }, 300);
  return () => clearTimeout(delayDebounceFn);
 }, [searchTerm, page, pageSize]);

 const handleOpenModal = (loc: any = null) => {
  if (loc) {
   setEditingLocationId(loc.id);
   setFormData({
    name: loc.name,
    dependency_code: loc.dependency_code || '',
    address: loc.address || '',
    description: loc.description || ''
   });
  } else {
   setEditingLocationId(null);
   setFormData({ name: '', dependency_code: '', address: '', description: '' });
  }
  setShowModal(true);
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);
  try {
   if (editingLocationId) {
    await api.put(`/locations/${editingLocationId}`, formData);
   } else {
    await api.post('/locations', formData);
   }
   setShowModal(false);
   fetchLocations();
  } catch (err: any) {
   alert(err.response?.data?.detail || 'Error al procesar ubicación');
  } finally {
   setSaving(false);
  }
 };

 const handleDelete = async (loc: any) => {
  if (!confirm(`¿Está seguro de que desea eliminar la ubicación "${loc.name}"?`)) return;
  try {
   await api.delete(`/locations/${loc.id}`);
   fetchLocations();
  } catch (err: any) {
   alert(err.response?.data?.detail || 'Error al eliminar ubicación');
  }
 };

 return (
  <Layout title="Directorio de Dependencias">
   <Container fluid className="py-3 px-lg-4">
    <div className="d-flex justify-content-between align-items-center mb-4">
     <div>
      <h5 className="fw-black m-0 uppercase tracking-tighter text-main">DIRECTORIO DE DEPENDENCIAS</h5>
      <div className="text-muted x-small fw-bold uppercase opacity-50">Gestión de Unidades y Códigos de Dependencia</div>
     </div>
     <Button variant="primary" size="sm" className="fw-black x-small px-4 rounded-pill shadow-sm d-flex align-items-center gap-2" onClick={() => handleOpenModal()}>
       <Plus size={14} /> AÑADIR DEPENDENCIA
     </Button>
    </div>

    <Card className="border-subtle shadow-sm rounded-4 overflow-hidden bg-card">
     <Card.Body className="p-0">
      {/* Header de búsqueda */}
      <div className="p-3 bg-surface border-bottom border-subtle">
        <Row className="g-2 align-items-center">
         <Col md={4}>
          <Form.Group controlId="location-search">
           <InputGroup size="sm" className="rounded-pill border border-subtle overflow-hidden bg-surface-muted px-2">
            <InputGroup.Text className="bg-transparent border-0 text-muted"><Search size={14} /></InputGroup.Text>
            <Form.Control 
             id="location-search"
             name="searchTerm"
             placeholder="Buscar por nombre o código..." 
             className="bg-transparent border-0 shadow-none x-small fw-bold text-main"
             value={searchTerm}
             onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
           </InputGroup>
          </Form.Group>
         </Col>
        </Row>
      </div>

      <div className="table-responsive">
       <Table hover className="align-middle m-0 compact-table">
        <thead>
         <tr className="small text-muted uppercase tracking-widest border-bottom border-subtle bg-surface">
          <th className="ps-4 py-3" style={{width: '120px'}}>CÓDIGO</th>
          <th className="py-3">NOMBRE DE LA DEPENDENCIA</th>
          <th className="py-3">DETALLES / DIRECCIÓN</th>
          <th className="py-3 text-center" style={{width: '120px'}}>EQUIPOS</th>
          <th className="pe-4 py-3 text-end" style={{width: '120px'}}>ACCIONES</th>
         </tr>
        </thead>
        <tbody>
         {loading ? (
          <tr>
           <td colSpan={5} className="text-center py-5">
            <Spinner animation="border" variant="primary" size="sm" />
           </td>
          </tr>
         ) : locations.map((loc) => (
          <tr key={loc.id} className="border-bottom border-subtle transition-all" style={{ height: '60px' }}>
           <td className="ps-4 py-2">
            <Badge bg="primary" className="bg-opacity-10 text-primary fw-black border border-primary border-opacity-25" style={{ fontSize: '10px', padding: '6px 10px' }}>
             {loc.dependency_code || 'N/A'}
            </Badge>
           </td>
           <td className="py-2">
            <div className="fw-bold text-main" style={{ fontSize: '13px' }}>{loc.name}</div>
           </td>
           <td className="py-2">
            <div className="x-small text-muted fw-bold opacity-75">{loc.address || 'SIN DIRECCIÓN REGISTRADA'}</div>
           </td>
           <td className="py-2 text-center">
             <Badge 
              bg={loc.total_assets > 0 ? 'success' : 'secondary'} 
              className={`bg-opacity-10 ${loc.total_assets > 0 ? 'text-success' : 'text-muted'} border border-opacity-25 x-small fw-black`} 
              style={{ fontSize: '10px' }}
             >
              {loc.total_assets || 0} EQ
             </Badge>
           </td>
           <td className="pe-4 py-2 text-end">
            <div className="d-flex justify-content-end gap-1">
             <Button variant="link" className="p-1 text-primary opacity-50 hover-opacity-100" onClick={() => handleOpenModal(loc)}>
              <Edit size={15} />
             </Button>
             <Button variant="link" className="p-1 text-danger opacity-50 hover-opacity-100" onClick={() => handleDelete(loc)}>
              <Trash2 size={15} />
             </Button>
            </div>
           </td>
          </tr>
         ))}
         {!loading && locations.length === 0 && (
          <tr><td colSpan={5} className="text-center py-5 text-muted small fw-bold opacity-50 uppercase">No se encontraron dependencias</td></tr>
         )}
        </tbody>
       </Table>
      </div>
     </Card.Body>
    </Card>

    {/* Footer de Paginación */}
    <div className="d-flex justify-content-between align-items-center mt-4 bg-surface p-3 rounded-4 shadow-sm border border-subtle">
      <div className="d-flex align-items-center gap-3">
        <span className="x-small fw-black text-muted text-uppercase">Mostrar</span>
        <Form.Group controlId="page-size-selector">
         <Form.Select 
          id="page-size-selector"
          name="pageSize"
          size="sm" 
          className="rounded-pill border-0 bg-surface-muted px-3 fw-bold text-main" 
          style={{width: '85px', fontSize: '11px'}}
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
         >
           <option value={20}>20</option>
           <option value={50}>50</option>
           <option value={100}>100</option>
         </Form.Select>
        </Form.Group>
        <span className="x-small text-muted fw-bold">TOTAL: {totalItems} REGISTROS</span>
      </div>
      <div className="d-flex gap-2">
        <Button 
         variant="outline-secondary" 
         size="sm" 
         className="rounded-pill px-3 x-small fw-black border-subtle shadow-sm" 
         disabled={page === 1} 
         onClick={() => setPage(p => p - 1)}
        >
         ANTERIOR
        </Button>
        <div className="d-flex align-items-center px-3 bg-primary bg-opacity-10 text-primary rounded-pill x-small fw-black border border-primary border-opacity-25">
         PÁGINA {page} DE {totalPages}
        </div>
        <Button 
         variant="outline-secondary" 
         size="sm" 
         className="rounded-pill px-3 x-small fw-black border-subtle shadow-sm" 
         disabled={page === totalPages || totalPages === 0} 
         onClick={() => setPage(p => p + 1)}
        >
         SIGUIENTE
        </Button>
      </div>
    </div>
   </Container>

   {/* Modal - Estilo Adaptativo */}
   <Modal show={showModal} onHide={() => setShowModal(false)} centered contentClassName="bg-card border-subtle shadow-2xl rounded-4">
    <Modal.Header closeButton className="border-bottom border-subtle pb-3">
     <Modal.Title className="x-small fw-black uppercase text-primary tracking-widest">
      {editingLocationId ? 'EDITAR DEPENDENCIA' : 'NUEVA DEPENDENCIA'}
     </Modal.Title>
    </Modal.Header>
    <Modal.Body className="p-4">
     <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
       <Form.Label className="x-small fw-bold text-muted uppercase">Nombre de la Dependencia *</Form.Label>
       <Form.Control 
        className="bg-surface-muted text-main border-subtle shadow-none x-small fw-bold py-2 px-3 rounded-3" 
        required
        value={formData.name}
        onChange={e => setFormData({...formData, name: e.target.value})}
       />
      </Form.Group>
      <Form.Group className="mb-3">
       <Form.Label className="x-small fw-bold text-muted uppercase">Código de Dependencia</Form.Label>
       <Form.Control 
        className="bg-surface-muted text-main border-subtle shadow-none x-small fw-bold py-2 px-3 rounded-3" 
        placeholder="Ej: 1234"
        value={formData.dependency_code}
        onChange={e => setFormData({...formData, dependency_code: e.target.value})}
       />
      </Form.Group>
      <Form.Group className="mb-3">
       <Form.Label className="x-small fw-bold text-muted uppercase">Dirección Física</Form.Label>
       <Form.Control 
        className="bg-surface-muted text-main border-subtle shadow-none x-small fw-bold py-2 px-3 rounded-3" 
        value={formData.address}
        onChange={e => setFormData({...formData, address: e.target.value})}
       />
      </Form.Group>
      <Form.Group className="mb-3">
       <Form.Label className="x-small fw-bold text-muted uppercase">Descripción / Observaciones</Form.Label>
       <Form.Control 
        as="textarea" rows={3}
        className="bg-surface-muted text-main border-subtle shadow-none x-small fw-bold py-2 px-3 rounded-3" 
        value={formData.description}
        onChange={e => setFormData({...formData, description: e.target.value})}
       />
      </Form.Group>
      <div className="d-flex justify-content-end gap-2 mt-4">
        <Button variant="outline-secondary" size="sm" className="x-small fw-black px-4 rounded-pill border-subtle" onClick={() => setShowModal(false)}>CANCELAR</Button>
        <Button variant="primary" size="sm" type="submit" className="fw-black x-small px-4 rounded-pill shadow-sm" disabled={saving}>
         {saving ? <Spinner animation="border" size="sm" /> : (editingLocationId ? 'GUARDAR CAMBIOS' : 'CREAR')}
        </Button>
      </div>
     </Form>
    </Modal.Body>
   </Modal>

   <style jsx global>{`
    .x-small { font-size: 10px; }
    .fw-black { font-weight: 900; }
    .tracking-tighter { letter-spacing: -0.05em; }
    .compact-table tbody tr:hover { background-color: var(--bg-surface-muted) !important; }
    .bg-card { background-color: var(--bg-card) !important; }
    .bg-surface { background-color: var(--bg-surface) !important; }
    .bg-surface-muted { background-color: var(--bg-surface-muted) !important; }
    .text-main { color: var(--text-main) !important; }
    .border-subtle { border-color: var(--border-subtle) !important; }
    .hover-opacity-100:hover { opacity: 1 !important; }
   `}</style>
  </Layout>
 );
}