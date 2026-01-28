import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useTheme } from '../../context/ThemeContext';
import { Shield, Plus, Edit2, Trash2, Lock, CheckSquare, Square } from 'lucide-react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Spinner, Badge, Alert } from 'react-bootstrap';

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export default function RolesPermissionsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/v1/iam/roles', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/iam/permissions', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (rolesRes.ok && permsRes.ok) {
        const rolesData = await rolesRes.json();
        const permsData = await permsRes.json();
        setRoles(Array.isArray(rolesData) ? rolesData : []);
        setAllPermissions(Array.isArray(permsData) ? permsData : []);
      } else {
        setError('Error al cargar datos de seguridad.');
      }
    } catch (err) {
      setError('Fallo de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role: Role | null = null) => {
    if (role) {
      setEditingRole(role);
      setRoleName(role.name || '');
      setRoleDesc(role.description || '');
      setSelectedPerms(Array.isArray(role.permissions) ? role.permissions.map(p => p.id) : []);
    } else {
      setEditingRole(null);
      setRoleName('');
      setRoleDesc('');
      setSelectedPerms([]);
    }
    setShowModal(true);
  };

  const togglePermission = (id: string) => {
    setSelectedPerms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!roleName) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const method = editingRole ? 'PUT' : 'POST';
      const url = editingRole ? `/api/v1/iam/roles/${editingRole.id}` : '/api/v1/iam/roles';
      
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleName,
          description: roleDesc,
          permission_ids: selectedPerms
        })
      });
      
      if (res.ok) {
        setShowModal(false);
        fetchData();
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <Layout title="Seguridad: Roles">
      <Container fluid className="px-0">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold m-0 text-body">Roles y Permisos</h2>
            <p className="text-muted small mb-0">Control de acceso basado en roles (RBAC).</p>
          </div>
          <Button variant="primary" onClick={() => handleOpenModal()} className="shadow-sm fw-bold">
            <Plus size={18} className="me-2" /> NUEVO ROL
          </Button>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <Card className="border-0 shadow-sm overflow-hidden">
          <Table hover responsive variant={isDark ? 'dark' : undefined} className="align-middle mb-0">
            <thead className={isDark ? 'bg-black' : 'bg-light'}>
              <tr className="small text-uppercase opacity-50">
                <th className="ps-4 py-3">Rol</th>
                <th>Descripción</th>
                <th className="text-center">Permisos</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
              ) : roles.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-5 text-muted italic">No hay roles.</td></tr>
              ) : roles.map(role => (
                <tr key={role.id}>
                  <td className="ps-4 py-3">
                    <div className="fw-bold">{role.name}</div>
                  </td>
                  <td className="small text-muted">{role.description || '-'}</td>
                  <td className="text-center">
                    <Badge bg="primary" className="bg-opacity-10 text-primary px-3">
                      {(role.permissions || []).length} activos
                    </Badge>
                  </td>
                  <td className="text-end pe-4">
                    <Button variant={isDark ? "dark" : "light"} size="sm" onClick={() => handleOpenModal(role)} className="border border-opacity-10">
                      <Edit2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </Container>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered scrollable>
        <Modal.Header closeButton><Modal.Title className="h6 fw-bold">CONFIGURACIÓN DE ROL</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="x-small fw-bold text-muted uppercase">Nombre</Form.Label>
              <Form.Control value={roleName} onChange={e => setRoleName(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="x-small fw-bold text-muted uppercase">Descripción</Form.Label>
              <Form.Control as="textarea" rows={2} value={roleDesc} onChange={e => setRoleDesc(e.target.value)} />
            </Form.Group>
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 small uppercase opacity-75"><Lock size={14} /> Matriz de Permisos</h6>
            <div className="border rounded p-3 bg-light bg-opacity-10">
              <Row className="g-2">
                {allPermissions.map(perm => {
                  const isSelected = selectedPerms.includes(perm.id);
                  return (
                    <Col md={6} key={perm.id || perm.name}>
                      <div 
                        className="d-flex align-items-center gap-2 p-1 cursor-pointer" 
                        onClick={() => perm.id && togglePermission(perm.id)}
                        style={{ minHeight: '30px' }}
                      >
                        {isSelected ? (
                          <CheckSquare size={18} className="text-primary flex-shrink-0" />
                        ) : (
                          <Square size={18} className="opacity-25 flex-shrink-0" />
                        )}
                        <span className="small fw-medium">{perm.name}</span>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="primary" onClick={handleSave} disabled={saving} className="fw-bold w-100">
            {saving ? <Spinner animation="border" size="sm" /> : 'GUARDAR CAMBIOS'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
}