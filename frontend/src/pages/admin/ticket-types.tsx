import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { Container, Table, Button, Card, Form, Modal, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { Plus, Edit, Save, ArrowLeft, Tag, Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';

export default function TicketTypesPage() {
  const router = useRouter();
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#0d6efd',
    icon: 'Ticket'
  });

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/ticket-types', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTypes(Array.isArray(data) ? data : []);
      }
    } catch (e) { setError('Error loading ticket types'); }
    finally { setLoading(false); }
  };

  const handleShow = (type: any = null) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        description: type.description || '',
        color: type.color || '#0d6efd',
        icon: type.icon || 'Ticket'
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        description: '',
        color: '#0d6efd',
        icon: 'Ticket'
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('access_token');
    const method = editingType ? 'PUT' : 'POST';
    const url = editingType ? `/api/v1/ticket-types/${editingType.id}` : '/api/v1/ticket-types';

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        fetchTypes();
      } else {
        const data = await res.json();
        setError(data.detail || 'Error saving ticket type');
      }
    } catch (e) { setError('Connection error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este tipo de ticket? Esto puede afectar a tickets existentes.')) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/ticket-types/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTypes();
    } catch (e) { console.error(e); }
  };

  return (
    <Layout title="Tipos de Ticket">
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center">
            <Button variant="link" className="text-dark p-0 me-3" onClick={() => router.push('/admin')}>
              <ArrowLeft size={24} />
            </Button>
            <h2 className="fw-bold mb-0">Categorías de Ticket</h2>
          </div>
          <Button variant="primary" onClick={() => handleShow()} className="shadow-sm">
            <Plus size={18} className="me-2" /> Nuevo Tipo
          </Button>
        </div>

        {error && <Alert variant="danger" className="shadow-sm">{error}</Alert>}

        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <Table hover responsive className="mb-0 align-middle">
              <thead className="bg-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">Nombre</th>
                  <th>Descripción</th>
                  <th>Color</th>
                  <th>Icono</th>
                  <th className="text-end pe-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" size="sm" /></td></tr>
                ) : (Array.isArray(types) ? types : []).map(ticket => (
                  <tr key={ticket.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        <div className="p-2 rounded me-2" style={{ backgroundColor: ticket.color + '22', color: ticket.color }}>
                          <Tag size={16} />
                        </div>
                        <span className="fw-bold">{ticket.name}</span>
                      </div>
                    </td>
                    <td className="small text-muted">{ticket.description || 'Sin descripción'}</td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="me-2 rounded-circle" style={{ width: '12px', height: '12px', backgroundColor: ticket.color }}></div>
                        <code className="x-small">{ticket.color}</code>
                      </div>
                    </td>
                    <td className="small">{ticket.icon}</td>
                    <td className="text-end pe-4">
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShow(ticket)}>
                        <Edit size={14} />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(ticket.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Container>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="h5 fw-bold">{editingType ? 'Editar Categoría' : 'Nueva Categoría'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="ticket-type-name">
              <Form.Label className="small fw-bold">Nombre</Form.Label>
              <Form.Control 
                required
                name="name"
                placeholder="Ej: Incidente de Seguridad, Requerimiento..."
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="ticket-type-description">
              <Form.Label className="small fw-bold">Descripción</Form.Label>
              <Form.Control 
                as="textarea"
                rows={2}
                name="description"
                placeholder="Uso de esta categoría..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="ticket-type-color">
                  <Form.Label className="small fw-bold">Color (Hex)</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control 
                      type="color"
                      name="color_picker"
                      className="p-1"
                      style={{ width: '40px', height: '38px' }}
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                    />
                    <Form.Control 
                      name="color_text"
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                    />
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="ticket-type-icon">
                  <Form.Label className="small fw-bold">Icono (Lucide)</Form.Label>
                  <Form.Control 
                    name="icon"
                    placeholder="Ticket, Shield, Zap..."
                    value={formData.icon}
                    onChange={e => setFormData({...formData, icon: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="light" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" className="shadow-sm">
              <Save size={18} className="me-2" /> Guardar Cambios
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Layout>
  );
}
