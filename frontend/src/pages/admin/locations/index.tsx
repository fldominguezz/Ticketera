import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { Container, Row, Col, Card, Button, Table, Badge, Form, InputGroup, Modal, Spinner } from 'react-bootstrap';
import { MapPin, Search, Plus, Edit, Trash2, Hash } from 'lucide-react';
import api from '../../../lib/api';

export default function LocationsManagement() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', dependency_code: '', address: '', description: ''
  });

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/locations', { params: { q: searchTerm } });
      setLocations(res.data);
    } catch (err) {
      console.error("Error fetching locations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLocations();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

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
      alert(err.response?.data?.detail || "Error al procesar ubicación");
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
      alert(err.response?.data?.detail || "Error al eliminar ubicación");
    }
  };

  return (
    <Layout title="Directorio de Dependencias">
      <Container fluid className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-black text-white m-0 uppercase tracking-tighter d-flex align-items-center">
              <MapPin className="me-2 text-primary" size={24} /> DIRECTORIO DE DEPENDENCIAS
            </h4>
            <small className="text-muted fw-bold uppercase x-small">Unidades independientes y códigos de dependencia</small>
          </div>
          <Button variant="primary" size="sm" className="fw-bold d-flex align-items-center gap-2" onClick={() => handleOpenModal()}>
             <Plus size={16} /> AÑADIR DEPENDENCIA
          </Button>
        </div>

        <Card className="bg-dark border-0 shadow-lg rounded-xl overflow-hidden mb-4 border border-white border-opacity-5">
          <Card.Body className="p-4">
            <Row className="mb-4">
              <Col md={6}>
                <InputGroup className="bg-black rounded-lg border border-white border-opacity-10">
                  <InputGroup.Text className="bg-transparent border-0 text-muted">
                    <Search size={18} />
                  </InputGroup.Text>
                  <Form.Control 
                    placeholder="Buscar por nombre o código [XXXX]..." 
                    className="bg-transparent border-0 text-white shadow-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Col>
            </Row>

            <Table responsive variant="dark" className="align-middle custom-table">
              <thead>
                <tr className="x-small text-muted uppercase tracking-widest border-bottom border-white border-opacity-10">
                  <th className="pb-3">CÓDIGO</th>
                  <th className="pb-3">NOMBRE DE LA DEPENDENCIA</th>
                  <th className="pb-3">DETALLES / DIRECCIÓN</th>
                  <th className="pb-3 text-center">EQUIPOS</th>
                  <th className="pb-3 text-end">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id} className="border-bottom border-white border-opacity-5">
                    <td className="py-3">
                      <Badge bg="primary" className="bg-opacity-10 text-primary fw-black p-2">
                        {loc.dependency_code || 'N/A'}
                      </Badge>
                    </td>
                    <td>
                      <div className="fw-bold">{loc.name}</div>
                    </td>
                    <td>
                      <small className="text-muted">{loc.address || 'Sin dirección registrada'}</small>
                    </td>
                    <td className="text-center">
                       <Badge bg="secondary" className="bg-opacity-25 text-muted x-small">0 EQ</Badge>
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1">
                        <Button variant="link" className="p-1 text-primary opacity-75 hover-opacity-100" onClick={() => handleOpenModal(loc)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="link" className="p-1 text-danger opacity-75 hover-opacity-100" onClick={() => handleDelete(loc)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {!loading && locations.length === 0 && (
              <div className="text-center py-5 text-muted uppercase x-small fw-bold">
                No se encontraron dependencias registradas
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* Modal Crear / Editar */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered contentClassName="bg-dark text-white border-primary border-opacity-25 shadow-2xl">
        <Modal.Header closeButton closeVariant="white" className="border-white border-opacity-10 bg-black bg-opacity-20">
          <Modal.Title className="x-small fw-black uppercase text-primary tracking-widest">
            {editingLocationId ? 'Editar Dependencia' : 'Nueva Dependencia'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="x-small fw-bold text-muted uppercase">Nombre de la Dependencia *</Form.Label>
              <Form.Control 
                className="bg-dark text-white border-white border-opacity-10 shadow-none" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="x-small fw-bold text-muted uppercase">Código de Dependencia</Form.Label>
              <Form.Control 
                className="bg-dark text-white border-white border-opacity-10 shadow-none" 
                placeholder="Ej: 1234"
                value={formData.dependency_code}
                onChange={e => setFormData({...formData, dependency_code: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="x-small fw-bold text-muted uppercase">Dirección Física</Form.Label>
              <Form.Control 
                className="bg-dark text-white border-white border-opacity-10 shadow-none" 
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="x-small fw-bold text-muted uppercase">Descripción / Observaciones</Form.Label>
              <Form.Control 
                as="textarea" rows={3}
                className="bg-dark text-white border-white border-opacity-10 shadow-none" 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2 mt-4">
               <Button variant="outline-primary" size="sm" onClick={() => setShowModal(false)}>CANCELAR</Button>
               <Button variant="primary" size="sm" type="submit" className="fw-bold px-4" disabled={saving}>
                 {saving ? <Spinner animation="border" size="sm" /> : (editingLocationId ? 'ACTUALIZAR' : 'CREAR')}
               </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <style jsx global>{`
        .rounded-xl { border-radius: 1.5rem; }
        .x-small { font-size: 10px; }
        .fw-black { font-weight: 900; }
        .tracking-tighter { letter-spacing: -0.05em; }
        .custom-table thead th { border-top: 0; }
        .hover-opacity-100:hover { opacity: 1 !important; }
      `}</style>
    </Layout>
  );
}