import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Container, Row, Col, Card, Button, Form, Spinner, Modal, InputGroup } from 'react-bootstrap';
import { Book, Plus, Folder, ChevronRight, Edit3, Trash2, Shield, Globe } from 'lucide-react';
import { useRouter } from 'next/router';
import api from '../../lib/api';

export default function WikiIndexPage() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_private: false,
    owner_group_id: ''
  });

  useEffect(() => {
    fetchSpaces();
    fetchGroups();
  }, []);

  const fetchSpaces = async () => {
    try {
      const res = await api.get('/wiki/spaces');
      setSpaces(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch (e) { console.error(e); }
  };

  const handleOpenModal = (space: any = null) => {
    if (space) {
      setEditingSpace(space);
      setFormData({
        name: space.name,
        description: space.description || '',
        is_private: space.is_private,
        owner_group_id: space.owner_group_id || ''
      });
    } else {
      setEditingSpace(null);
      setFormData({ name: '', description: '', is_private: false, owner_group_id: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        owner_group_id: formData.owner_group_id || null
      };

      if (editingSpace) {
        await api.put(`/wiki/spaces/${editingSpace.id}`, payload);
      } else {
        await api.post('/wiki/spaces', payload);
      }
      setShowModal(false);
      fetchSpaces();
    } catch (e) { alert("Error al guardar la librería"); }
  };

  const handleDelete = async (space: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Borrar permanentemente la librería "${space.name}" y todos sus procedimientos?`)) return;
    try {
      await api.delete(`/wiki/spaces/${space.id}`);
      fetchSpaces();
    } catch (e) { alert("Error al eliminar"); }
  };

  return (
    <Layout title="Base de Conocimiento">
      <Container fluid className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-black m-0 uppercase tracking-tighter text-primary d-flex align-items-center gap-2">
              <Book className="text-primary" size={24} /> Wiki Corporativa
            </h4>
            <small className="text-muted fw-bold uppercase tracking-widest">Gestión de Librerías y Procedimientos</small>
          </div>
          <Button variant="primary" onClick={() => handleOpenModal()} className="fw-black x-small px-4 rounded-pill shadow-sm">
            <Plus size={16} className="me-2" /> NUEVA LIBRERÍA
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary"/></div>
        ) : (
          <Row className="g-4">
            {spaces.map(space => (
              <Col key={space.id} md={4} lg={3}>
                <Card 
                  className="border-subtle shadow-sm h-100 hover-scale cursor-pointer bg-surface overflow-hidden"
                  onClick={() => router.push(`/wiki/${space.id}`)}
                >
                  <Card.Body className="p-4 d-flex flex-column align-items-center text-center position-relative">
                    <div className="position-absolute top-0 end-0 p-2 d-flex gap-1">
                       <Button variant="link" size="sm" className="p-1 text-muted hover-text-primary" onClick={(e) => { e.stopPropagation(); handleOpenModal(space); }}><Edit3 size={14}/></Button>
                       <Button variant="link" size="sm" className="p-1 text-muted hover-text-danger" onClick={(e) => handleDelete(space, e)}><Trash2 size={14}/></Button>
                    </div>

                    <div className={`p-3 rounded-circle ${space.is_private ? 'bg-warning' : 'bg-primary'} bg-opacity-10 text-primary mb-3`}>
                      {space.is_private ? <Shield size={32} className="text-warning" /> : <Folder size={32} />}
                    </div>
                    <h6 className="fw-black text-uppercase text-primary m-0 mb-2">{space.name}</h6>
                    <p className="small text-muted mb-0 line-clamp-2">{space.description}</p>
                  </Card.Body>
                  <Card.Footer className="bg-surface-raised border-0 py-2 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-1 x-tiny fw-bold uppercase text-tertiary">
                      {space.is_private ? <><Shield size={10}/> PRIVADO</> : <><Globe size={10}/> PÚBLICO</>}
                    </div>
                    <ChevronRight size={14} className="text-tertiary" />
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* MODAL DE GESTIÓN */}
        <Modal show={showModal} onHide={() => setShowModal(false)} centered contentClassName="border-0 shadow-lg rounded-4 overflow-hidden">
          <Modal.Header closeButton className="border-0 bg-surface-raised px-4 pt-4">
            <Modal.Title className="fw-black text-primary text-uppercase small tracking-widest">{editingSpace ? 'Editar Librería' : 'Nueva Librería'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4 bg-surface">
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="x-small fw-black uppercase text-label">Nombre de la Librería</Form.Label>
                <Form.Control 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Procedimientos SOC"
                  className="rounded-3 border-subtle bg-surface-raised text-primary fw-bold"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="x-small fw-black uppercase text-label">Descripción</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={2}
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Descripción breve de los contenidos..."
                  className="rounded-3 border-subtle bg-surface-raised text-primary small"
                />
              </Form.Group>
              <hr className="border-subtle opacity-50" />
              <Form.Group className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Form.Label className="x-small fw-black uppercase text-label m-0">Privacidad y Visibilidad</Form.Label>
                  <Form.Check 
                    type="switch"
                    id="private-switch"
                    label={formData.is_private ? "PRIVADO" : "PÚBLICO"}
                    checked={formData.is_private}
                    onChange={e => setFormData({...formData, is_private: e.target.checked})}
                    className="fw-bold x-small text-muted"
                  />
                </div>
                <p className="x-tiny text-tertiary mb-3 italic">Si es privado, solo los miembros del grupo seleccionado podrán ver esta librería.</p>
                
                <Form.Label className="x-small fw-black uppercase text-label">Grupo Propietario / Responsable</Form.Label>
                <Form.Select 
                  value={formData.owner_group_id}
                  onChange={e => setFormData({...formData, owner_group_id: e.target.value})}
                  className="rounded-3 border-subtle bg-surface-raised text-primary small"
                >
                  <option value="">Seleccionar Grupo (Opcional)...</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer className="border-0 p-3 bg-surface-raised d-flex justify-content-end gap-2">
            <Button variant="link" onClick={() => setShowModal(false)} className="text-muted fw-bold text-decoration-none x-small uppercase">Cancelar</Button>
            <Button variant="primary" onClick={handleSubmit} className="px-4 rounded-pill fw-black x-small shadow-sm">
              {editingSpace ? 'GUARDAR CAMBIOS' : 'CREAR LIBRERÍA'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>

      <style jsx global>{`
        .hover-scale { transition: transform 0.2s; }
        .hover-scale:hover { transform: translateY(-5px); }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .x-tiny { font-size: 9px; }
      `}</style>
    </Layout>
  );
}
