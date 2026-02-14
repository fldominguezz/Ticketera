import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useTheme } from '../../context/ThemeContext';
import { 
 Key, Plus, Edit2, Trash2, Shield, Search, Filter, CheckCircle2, XCircle
} from 'lucide-react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Spinner, Badge, Alert, InputGroup } from 'react-bootstrap';
import api from '../../lib/api';

interface Permission {
 id: string;
 key: string;
 name: string;
 description: string;
 module: string;
 scope_type: string;
 is_active: boolean;
}

const SCOPE_TYPES = [
 { value: 'none', label: 'Ninguno (Acción Global)' },
 { value: 'own', label: 'Propio (Creador/Asignado)' },
 { value: 'group', label: 'Grupo (Jerárquico)' },
 { value: 'global', label: 'Global (Todo el sistema)' },
];

export default function PermissionsRegistryPage() {
 const { theme } = useTheme();
 const isDark = theme === 'dark' || theme === 'soc';
 
 const [permissions, setPermissions] = useState<Permission[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 
 const [showModal, setShowModal] = useState(false);
 const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
 const [formData, setFormData] = useState({
  key: '',
  name: '',
  description: '',
  module: 'custom',
  scope_type: 'none',
  is_active: true
 });
 
 const [saving, setSaving] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 const [moduleFilter, setModuleFilter] = useState('all');

 useEffect(() => {
  fetchPermissions();
 }, []);

 const fetchPermissions = async () => {
  setLoading(true);
  try {
   const res = await api.get('/permissions');
   setPermissions(res.data);
  } catch (err) {
   setError('Error al cargar el registro de permisos.');
  } finally {
   setLoading(false);
  }
 };

 const handleOpenModal = (perm: Permission | null = null) => {
  if (perm) {
   setEditingPermission(perm);
   setFormData({
    key: perm.key,
    name: perm.name,
    description: perm.description || '',
    module: perm.module || 'custom',
    scope_type: perm.scope_type || 'none',
    is_active: perm.is_active
   });
  } else {
   setEditingPermission(null);
   setFormData({
    key: '',
    name: '',
    description: '',
    module: 'custom',
    scope_type: 'none',
    is_active: true
   });
  }
  setShowModal(true);
 };

 const handleSave = async () => {
  setSaving(true);
  try {
   if (editingPermission) {
    await api.put(`/permissions/${editingPermission.id}`, formData);
   } else {
    await api.post('/permissions', formData);
   }
   setShowModal(false);
   fetchPermissions();
  } catch (err: any) {
   alert(err.response?.data?.detail || 'Error al guardar permiso');
  } finally {
   setSaving(false);
  }
 };

 const handleDelete = async (id: string) => {
  if (!window.confirm('¿Eliminar este permiso? Esto puede afectar a los roles que lo utilizan.')) return;
  try {
   await api.delete(`/permissions/${id}`);
   fetchPermissions();
  } catch (err) {
   alert('Error al eliminar');
  }
 };

 const modules = Array.from(new Set(permissions.map(p => p.module))).filter(Boolean);

 const filteredPermissions = permissions.filter(p => {
  const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             p.key.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesModule = moduleFilter === 'all' || p.module === moduleFilter;
  return matchesSearch && matchesModule;
 });

 return (
  <Layout title="Registro de Capacidades">
   <Container fluid className="py-4">
    <div className="d-flex justify-content-between align-items-center mb-4">
     <div>
      <h4 className="fw-black m-0 uppercase tracking-tighter d-flex align-items-center">
       <Key className="me-2 text-primary" size={24} /> REGISTRO DE PERMISOS
      </h4>
      <small className="text-muted fw-bold uppercase x-small tracking-widest">Diccionario Global de Capacidades del Sistema</small>
     </div>
     <Button variant="primary" onClick={() => handleOpenModal()} className="shadow-sm fw-black x-small px-4 tracking-widest">
      <Plus size={16} className="me-2" /> AGREGAR CAPACIDAD
     </Button>
    </div>

    <Card className="border-0 shadow-2xl rounded-xl mb-4 border border-opacity-5">
     <Card.Body className="p-3">
      <Row className="g-3">
       <Col md={8}>
        <InputGroup className="border rounded-lg overflow-hidden">
         <InputGroup.Text className="bg-transparent border-0 text-muted ps-3">
          <Search size={18} />
         </InputGroup.Text>
         <Form.Control 
          className="bg-transparent border-0 shadow-none py-2" 
          placeholder="Buscar por key o nombre..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
         />
        </InputGroup>
       </Col>
       <Col md={4}>
        <Form.Select 
         className="shadow-none py-2 rounded-lg"
         value={moduleFilter}
         onChange={e => setModuleFilter(e.target.value)}
        >
         <option value="all">Todos los Módulos</option>
         {modules.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
        </Form.Select>
       </Col>
      </Row>
     </Card.Body>
    </Card>

    <Card className="border-0 shadow-2xl rounded-xl overflow-hidden border border-opacity-5">
     <Table hover responsive className="align-middle mb-0">
      <thead>
       <tr className="x-small text-muted uppercase tracking-widest border-bottom ">
        <th className="ps-4 py-3">MÓDULO</th>
        <th>KEY (SISTEMA)</th>
        <th>NOMBRE (DESCRIPTIVO)</th>
        <th className="text-center">SCOPE</th>
        <th className="text-center">ESTADO</th>
        <th className="text-end pe-4">ACCIONES</th>
       </tr>
      </thead>
      <tbody>
       {loading ? (
        <tr><td colSpan={6} className="text-center py-5"><Spinner animation="border" variant="primary" size="sm" /></td></tr>
       ) : filteredPermissions.map(perm => (
        <tr key={perm.id} className="border-bottom">
         <td className="ps-4 py-3">
          <Badge bg="info" className="bg-opacity-10 text-info x-small border border-info uppercase">
           {perm.module || 'CUSTOM'}
          </Badge>
         </td>
         <td><code className="text-primary small">{perm.key}</code></td>
         <td className="small fw-bold">{perm.name}</td>
         <td className="text-center">
          <Badge bg="secondary" className="bg-opacity-10 text-muted x-small border  uppercase">
           {perm.scope_type || 'NONE'}
          </Badge>
         </td>
         <td className="text-center">
          {perm.is_active ? 
           <CheckCircle2 size={16} className="text-success" /> : 
           <XCircle size={16} className="text-danger" />
          }
         </td>
         <td className="text-end pe-4">
          <Button variant="link" size="sm" onClick={() => handleOpenModal(perm)} className="text-primary me-2 p-0">
           <Edit2 size={16} />
          </Button>
          <Button variant="link" size="sm" onClick={() => handleDelete(perm.id)} className="text-danger p-0">
           <Trash2 size={16} />
          </Button>
         </td>
        </tr>
       ))}
      </tbody>
     </Table>
    </Card>
   </Container>

   <Modal show={showModal} onHide={() => setShowModal(false)} centered>
    <Modal.Header closeButton className="">
     <Modal.Title className="x-small fw-black uppercase tracking-widest">
      {editingPermission ? 'Editar Permiso' : 'Nuevo Permiso'}
     </Modal.Title>
    </Modal.Header>
    <Modal.Body className="p-4">
     <Form>
      <Form.Group className="mb-3">
       <Form.Label className="x-small fw-black text-muted uppercase">Key del Permiso</Form.Label>
       <Form.Control 
        className="" 
        placeholder="ej: assets:create" 
        value={formData.key}
        onChange={e => setFormData({...formData, key: e.target.value})}
        disabled={!!editingPermission}
       />
      </Form.Group>
      <Form.Group className="mb-3">
       <Form.Label className="x-small fw-black text-muted uppercase">Nombre Amigable</Form.Label>
       <Form.Control 
        className="" 
        placeholder="ej: Crear Activos" 
        value={formData.name}
        onChange={e => setFormData({...formData, name: e.target.value})}
       />
      </Form.Group>
      <Row>
       <Col md={6}>
        <Form.Group className="mb-3">
         <Form.Label className="x-small fw-black text-muted uppercase">Módulo</Form.Label>
         <Form.Control 
          className="" 
          value={formData.module}
          onChange={e => setFormData({...formData, module: e.target.value})}
         />
        </Form.Group>
       </Col>
       <Col md={6}>
        <Form.Group className="mb-3">
         <Form.Label className="x-small fw-black text-muted uppercase">Alcance (Scope)</Form.Label>
         <Form.Select 
          className="shadow-none"
          value={formData.scope_type}
          onChange={e => setFormData({...formData, scope_type: e.target.value})}
         >
          {SCOPE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
         </Form.Select>
        </Form.Group>
       </Col>
      </Row>
      <Form.Group className="mb-3">
       <Form.Label className="x-small fw-black text-muted uppercase">Descripción</Form.Label>
       <Form.Control 
        as="textarea" rows={2}
        className="" 
        value={formData.description}
        onChange={e => setFormData({...formData, description: e.target.value})}
       />
      </Form.Group>
      <Form.Check 
       type="switch"
       label="Permiso Activo"
       checked={formData.is_active}
       onChange={e => setFormData({...formData, is_active: e.target.checked})}
       className="x-small fw-bold text-muted uppercase"
      />
     </Form>
    </Modal.Body>
    <Modal.Footer className="">
     <Button variant="primary" onClick={handleSave} disabled={saving} className="fw-black w-100 uppercase x-small tracking-widest py-2">
      {saving ? <Spinner animation="border" size="sm" /> : 'Guardar en Diccionario'}
     </Button>
    </Modal.Footer>
   </Modal>

   <style jsx>{`
    .rounded-xl { border-radius: 1rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .fw-black { font-weight: 900; }
    .x-small { font-size: 11px; }
    .tracking-tighter { letter-spacing: -0.05em; }
   `}</style>
  </Layout>
 );
}
