import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Container, Table, Button, Card, Modal, Form, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { Users, Plus, Edit, Trash2, FolderTree, Info } from 'lucide-react';
import Layout from '../../../components/Layout';

// Define a constant for all possible navigation items that can be hidden
const NAV_ITEMS = [
  { id: 'siem-alerts', name: 'Alertas SIEM' },
  { id: 'tickets', name: 'Tickets' },
  { id: 'inventory', name: 'Inventario' },
  { id: 'users', name: 'Usuarios' },
  { id: 'roles', name: 'Roles' },
  { id: 'groups', name: 'Grupos' },
  { id: 'settings', name: 'Configuración General' },
  // Add other navigation items as needed
];

export default function AdminGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    parent_id: '',
    hidden_nav_items: [] as string[] // Initialize as empty array of strings
  });

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch('/api/v1/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching groups:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleOpenModal = (group: any = null) => {
    if (group) {
      setEditingGroupId(group.id);
      setNewGroup({
        name: group.name,
        description: group.description || '',
        parent_id: group.parent_id || '',
        hidden_nav_items: group.hidden_nav_items || [] // Load existing hidden items
      });
    } else {
      setEditingGroupId(null);
      setNewGroup({ name: '', description: '', parent_id: '', hidden_nav_items: [] });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('access_token');
    const method = editingGroupId ? 'PUT' : 'POST';
    const url = editingGroupId ? `/api/v1/groups/${editingGroupId}` : '/api/v1/groups';

    const payload = { 
      ...newGroup,
      parent_id: newGroup.parent_id === '' ? null : newGroup.parent_id 
    };

    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        fetchGroups();
        setEditingGroupId(null);
        setNewGroup({ name: '', description: '', parent_id: '', hidden_nav_items: [] });
      }
    } catch (e) { console.error(e); }
  };

  const handleNavItemChange = (itemId: string) => {
    setNewGroup(prevGroup => {
      const currentHidden = prevGroup.hidden_nav_items;
      if (currentHidden.includes(itemId)) {
        return { ...prevGroup, hidden_nav_items: currentHidden.filter(id => id !== itemId) };
      } else {
        return { ...prevGroup, hidden_nav_items: [...currentHidden, itemId] };
      }
    });
  };

  return (
    <Layout title="Administración de Grupos">
      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="fw-bold mb-0">Estructura Organizacional</h1>
            <p className="text-muted">Gestione departamentos y jerarquías de acceso</p>
          </div>
          <Button variant="primary" onClick={() => handleOpenModal()} className="d-flex align-items-center px-4 py-2">
            <Plus size={18} className="me-2" /> Nuevo Grupo
          </Button>
        </div>

        <Row className="g-4">
          <Col lg={8}>
            <Card className="shadow-sm border-0">
              <Card.Body className="p-0">
                <Table responsive hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="ps-4">Nombre del Grupo</th>
                      <th>Grupo Padre</th>
                      <th>Descripción</th>
                      <th>Nav Ocultos</th> {/* Added column for hidden nav items */}
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" size="sm" /></td></tr>
                    ) : groups.length > 0 ? (
                      groups.map((g: any) => (
                        <tr key={g.id} className="align-middle">
                          <td className="ps-4 py-3 fw-bold">
                            <Users size={16} className="me-2 text-primary" />
                            {g.name}
                          </td>
                          <td>
                            {g.parent_name ? (
                              <Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-20 fw-medium">
                                {g.parent_name}
                              </Badge>
                            ) : (
                              <span className="text-muted small">Raíz</span>
                            )}
                          </td>
                          <td className="small text-muted">{g.description}</td>
                          <td>
                            {g.hidden_nav_items && g.hidden_nav_items.length > 0 ? (
                                g.hidden_nav_items.map((item: string) => (
                                    <Badge key={item} bg="secondary" className="me-1">{NAV_ITEMS.find(n => n.id === item)?.name || item}</Badge>
                                ))
                            ) : (
                                <span className="text-muted small">Ninguno</span>
                            )}
                          </td>
                          <td className="text-center">
                            <Button variant="outline-secondary" size="sm" className="me-2 border-0" onClick={() => handleOpenModal(g)}>
                              <Edit size={16} />
                            </Button>
                            <Button variant="outline-danger" size="sm" className="border-0">
                              <Trash2 size={16} />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="text-center py-5 text-muted">No se encontraron grupos.</td></tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={4}>
            <Card className="shadow-sm border-0 bg-primary text-white h-100">
              <Card.Body className="d-flex flex-column justify-content-center p-4">
                <FolderTree size={48} className="mb-3 opacity-50" />
                <h5 className="fw-bold">Lógica Jerárquica</h5>
                <p className="small mb-4 opacity-75">
                  La estructura define la visibilidad. Grupos superiores ven datos de sus hijos.
                </p>
                <div className="bg-white bg-opacity-10 p-3 rounded-3">
                  <div className="d-flex align-items-start small">
                    <Info size={16} className="me-2 mt-1" />
                    <div>
                      <strong>Tip:</strong> Los grupos superiores heredan la visibilidad de los activos.
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
          <Modal.Header closeButton className="border-0">
            <Modal.Title className="fw-bold text-dark">{editingGroupId ? 'Editar Grupo' : 'Añadir Nuevo Grupo'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="pt-0">
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Nombre del Grupo</Form.Label>
                <Form.Control 
                  type="text" 
                  value={newGroup.name} 
                  onChange={e => setNewGroup({...newGroup, name: e.target.value})} 
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Grupo Padre (Opcional)</Form.Label>
                <Form.Select 
                  value={newGroup.parent_id} 
                  onChange={e => setNewGroup({...newGroup, parent_id: e.target.value})}
                >
                  <option value="">Sin Padre (Nivel Superior)</option>
                  {groups.filter(g => g.id !== editingGroupId).map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Descripción</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3} 
                  value={newGroup.description} 
                  onChange={e => setNewGroup({...newGroup, description: e.target.value})} 
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Ocultar Elementos de Navegación</Form.Label>
                <div>
                  {NAV_ITEMS.map(item => (
                    <Form.Check
                      key={item.id}
                      type="checkbox"
                      id={`nav-item-${item.id}`}
                      label={item.name}
                      checked={newGroup.hidden_nav_items.includes(item.id)}
                      onChange={() => handleNavItemChange(item.id)}
                    />
                  ))}
                </div>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="light" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSubmit} className="fw-bold px-4">
              {editingGroupId ? 'Guardar Cambios' : 'Crear Grupo'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
}