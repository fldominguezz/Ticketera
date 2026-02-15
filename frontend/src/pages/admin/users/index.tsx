import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, Table, Button, Badge, Card, Modal, Form, Row, Col, Spinner, InputGroup } from 'react-bootstrap';
import { UserPlus, Edit, Trash2, Shield, User as UserIcon, Mail, Lock as LockIcon, Search, Eye, EyeOff, Globe, ShieldCheck } from 'lucide-react';
import Layout from '../../../components/Layout';
import { useTheme } from '../../../context/ThemeContext';
import api from '../../../lib/api';

export default function AdminUsersPage() {
 const router = useRouter();
 const { theme } = useTheme();
 const isDark = theme === 'dark' || theme === 'soc';
 
 const [users, setUsers] = useState<any[]>([]);
 const [roles, setRoles] = useState<any[]>([]);
 const [groups, setGroups] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');
 
 const [showModal, setShowModal] = useState(false);
 const [editingUserId, setEditingUserId] = useState<string | null>(null);
 const [showPass, setShowPass] = useState(false);
 const [saving, setSaving] = useState(false);
 
 const [formData, setFormData] = useState({
  username: '', email: '', password: '', first_name: '', last_name: '',
  is_superuser: false, is_active: true, force_password_change: false, reset_2fa_next_login: false,
  group_id: '', role_ids: [] as string[]
 });

 useEffect(() => {
  fetchData();
 }, []);

 const fetchData = async () => {
  setLoading(true);
  try {
   const [uRes, gRes, rRes] = await Promise.all([
    api.get('/admin/users'),
    api.get('/groups'),
    api.get('/roles')
   ]);
   setUsers(Array.isArray(uRes.data) ? uRes.data : []);
   setGroups(Array.isArray(gRes.data) ? gRes.data : []);
   setRoles(Array.isArray(rRes.data) ? rRes.data : []);
  } catch (e) { console.error(e); }
  finally { setLoading(false); }
 };

 const handleOpenModal = (user: any = null) => {
  if (user) {
   setEditingUserId(user.id);
   setFormData({
    username: user.username, email: user.email, password: '',
    first_name: user.first_name || '', last_name: user.last_name || '',
    is_superuser: user.is_superuser || false,
    is_active: user.is_active ?? true,
    force_password_change: user.force_password_change ?? false,
    reset_2fa_next_login: user.reset_2fa_next_login ?? false,
    group_id: user.group_id || '',
    role_ids: Array.isArray(user.roles) ? user.roles.map((r: any) => r.id) : []
   });
  } else {
   setEditingUserId(null);
   setFormData({ 
    username: '', email: '', password: '', first_name: '', last_name: '', 
    is_superuser: false, is_active: true, force_password_change: false, reset_2fa_next_login: false,
    group_id: '', role_ids: [] 
   });
  }
  setShowModal(true);
 };

 const handleSubmit = async () => {
  if (!formData.username || !formData.email || (!editingUserId && !formData.password)) {
    alert('Complete los campos obligatorios.');
    return;
  }
  setSaving(true);
  try {
   const url = editingUserId ? `/admin/users/${editingUserId}` : '/admin/users';
   const payload = { ...formData };
   if (editingUserId && !payload.password) delete (payload as any).password;

   if (editingUserId) await api.put(url, payload);
   else await api.post(url, payload);
   
   setShowModal(false);
   fetchData();
  } catch (e: any) {
   alert(e.response?.data?.detail || 'Error al procesar usuario');
  } finally { setSaving(false); }
 };

 const handleDeleteUser = async (user: any) => {
  if (!confirm(`¿Está seguro de que desea eliminar permanentemente a ${user.username}? Esta acción lo desactivará del sistema.`)) return;
  try {
    await api.delete(`/admin/users/${user.id}`);
    fetchData();
  } catch (e: any) {
    alert(e.response?.data?.detail || 'Error al eliminar usuario');
  }
 };

 const toggleRole = (id: string) => {
  setFormData(prev => ({
   ...prev,
   role_ids: prev.role_ids.includes(id) ? prev.role_ids.filter(rid => rid !== id) : [...prev.role_ids, id]
  }));
 };

 const filteredUsers = users.filter(u => 
  u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
  u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
  `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
 );

 return (
  <Layout title="Gestión de Identidades">
   <Container fluid className="py-4">
    <div className="d-flex justify-content-between align-items-center mb-4">
     <div>
      <h4 className="fw-black m-0 uppercase tracking-tighter">Cuentas de Usuario</h4>
      <small className="text-muted fw-bold x-small uppercase tracking-widest">Control de analistas y personal del sistema</small>
     </div>
     <Button variant="primary" onClick={() => handleOpenModal()} className="shadow-sm fw-black x-small px-4">
      <UserPlus size={16} className="me-2" /> REGISTRAR NUEVO
     </Button>
    </div>

    <Card className="border-0 shadow-2xl rounded-xl overflow-hidden">
     <div className="p-3 bg-surface-muted border-bottom">
       <Form.Group controlId="user-search">
        <InputGroup style={{ maxWidth: '400px' }}>
         <InputGroup.Text className="bg-transparent border-0 text-muted ps-0"><Search size={18}/></InputGroup.Text>
         <Form.Control 
           id="user-search"
           name="searchTerm"
           className="bg-transparent border-0 shadow-none small" 
           placeholder="Filtrar por nombre, usuario o email..." 
           value={searchTerm}
           onChange={e => setSearchTerm(e.target.value)}
         />
        </InputGroup>
       </Form.Group>
     </div>
     <Table hover responsive className="align-middle mb-0 custom-user-table">
      <thead>
       <tr className="x-small text-muted uppercase tracking-widest border-bottom">
        <th className="ps-4 py-3">IDENTIDAD</th>
        <th>USUARIO</th>
        <th>NIVEL / ROLES</th>
        <th>GRUPO / ÁREA</th>
        <th>ESTADO</th>
        <th className="text-end pe-4">GESTIÓN</th>
       </tr>
      </thead>
      <tbody>
       {loading ? (
        <tr><td colSpan={6} className="text-center py-5"><Spinner animation="border" variant="primary" size="sm" /></td></tr>
       ) : filteredUsers.map(u => (
        <tr key={u.id} className="border-bottom">
         <td className="ps-4 py-3">
          <div className="d-flex align-items-center gap-3">
           <div className="avatar bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{width:32, height:32}}>
            <UserIcon size={16} />
           </div>
           <div>
            <div className="fw-bold small">{u.first_name} {u.last_name}</div>
            <div className="x-small text-muted">{u.email}</div>
           </div>
          </div>
         </td>
         <td><code className="small text-info">@{u.username}</code></td>
         <td>
          <div className="d-flex flex-wrap gap-1">
            {u.is_superuser && <Badge bg="danger" className="bg-opacity-10 text-danger border border-danger x-small fw-black">SUPERADMIN</Badge>}
            {(u.roles || []).map((r: any) => (
              <Badge key={r.id} bg="primary" className="bg-opacity-10 text-primary border border-primary x-small fw-bold">{r.name}</Badge>
            ))}
          </div>
         </td>
         <td className="small text-muted">{u.group?.name || u.group_name || '-'}</td>
         <td>
          <Badge bg={u.is_active ? 'success' : 'secondary'} className="x-small uppercase fw-bold">
            {u.is_active ? 'ACTIVO' : 'INACTIVO'}
          </Badge>
         </td>
         <td className="text-end pe-4">
          <div className="d-flex justify-content-end gap-2">
            <Button variant="link" size="sm" onClick={() => handleOpenModal(u)} className="text-primary hover-opacity-100 p-0"><Edit size={16} /></Button>
            <Button variant="link" size="sm" onClick={() => handleDeleteUser(u)} className="text-danger hover-opacity-100 p-0"><Trash2 size={16} /></Button>
          </div>
         </td>
        </tr>
       ))}
      </tbody>
     </Table>
    </Card>
   </Container>

   <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered contentClassName="shadow-2xl bg-surface border-0">
    <Modal.Header closeButton className="bg-surface-muted border-bottom">
      <Modal.Title className="x-small fw-black uppercase text-primary tracking-widest">
       Ficha de Identidad: {editingUserId ? 'Actualización' : 'Nuevo Registro'}
      </Modal.Title>
    </Modal.Header>
    <Modal.Body className="p-4 custom-scrollbar">
     <Form>
      <h6 className="fw-black mb-3 x-small text-primary uppercase tracking-tighter d-flex align-items-center gap-2"><UserIcon size={14}/> Información Personal</h6>
      <Row className="g-3 mb-4 bg-surface-muted p-3 rounded-lg border">
       <Col md={6}>
        <Form.Group controlId="user-first-name">
         <Form.Label className="x-small fw-black text-muted uppercase">Nombre</Form.Label>
         <Form.Control id="user-first-name" name="first_name" className="shadow-none" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
        </Form.Group>
       </Col>
       <Col md={6}>
        <Form.Group controlId="user-last-name">
         <Form.Label className="x-small fw-black text-muted uppercase">Apellido</Form.Label>
         <Form.Control id="user-last-name" name="last_name" className="shadow-none" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
        </Form.Group>
       </Col>
       <Col md={6}>
        <Form.Group controlId="user-email">
         <Form.Label className="x-small fw-black text-muted uppercase">Email Institucional</Form.Label>
         <Form.Control id="user-email" name="email" className="shadow-none" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </Form.Group>
       </Col>
       <Col md={6}>
        <Form.Group controlId="user-group">
         <Form.Label className="x-small fw-black text-muted uppercase">Área / Grupo</Form.Label>
         <Form.Select id="user-group" name="group_id" className="shadow-none" value={formData.group_id} onChange={e => setFormData({...formData, group_id: e.target.value})}>
          <option value="">Seleccionar...</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
         </Form.Select>
        </Form.Group>
       </Col>
      </Row>

      <h6 className="fw-black mb-3 x-small text-primary uppercase tracking-tighter d-flex align-items-center gap-2"><LockIcon size={14}/> Credenciales y Seguridad</h6>
      <Row className="g-3 mb-4 bg-surface-muted p-3 rounded-lg border">
       <Col md={6}>
        <Form.Group controlId="user-username">
         <Form.Label className="x-small fw-black text-muted uppercase">Username</Form.Label>
         <Form.Control id="user-username" name="username" className="shadow-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
        </Form.Group>
       </Col>
       <Col md={6}>
        <Form.Group controlId="user-password">
         <Form.Label className="x-small fw-black text-muted uppercase">Contraseña {editingUserId && '(opcional)'}</Form.Label>
         <InputGroup>
           <Form.Control id="user-password" name="password" className="shadow-none" type={showPass ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
           <Button variant="outline-secondary" className="" onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff size={14}/> : <Eye size={14}/>}</Button>
         </InputGroup>
        </Form.Group>
       </Col>
       <Col md={4}>
        <Form.Check type="switch" id="active-switch" label={<span className="x-small fw-bold uppercase">Cuenta Activa</span>} checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
       </Col>
       <Col md={4}>
        <Form.Check type="switch" id="force-pass-switch" label={<span className="x-small fw-bold uppercase">Forzar Cambio Clave</span>} checked={formData.force_password_change} onChange={e => setFormData({...formData, force_password_change: e.target.checked})} />
       </Col>
       <Col md={4}>
        <Form.Check type="switch" id="reset-2fa-switch" label={<span className="x-small fw-bold uppercase">Resetear 2FA</span>} checked={formData.reset_2fa_next_login} onChange={e => setFormData({...formData, reset_2fa_next_login: e.target.checked})} />
       </Col>
      </Row>

      <h6 className="fw-black mb-3 x-small text-primary uppercase tracking-tighter d-flex align-items-center gap-2"><Shield size={14}/> Privilegios y Roles</h6>
      <div className="bg-surface-muted p-3 rounded-lg mb-4 border">
        <Row className="g-2 mb-3">
          {roles.map(role => (
            <Col md={6} key={role.id}>
              <div className={`p-2 rounded border cursor-pointer transition-all ${formData.role_ids.includes(role.id) ? 'bg-primary bg-opacity-10 border-primary border-opacity-50' : 'bg-surface '}`} onClick={() => toggleRole(role.id)}>
                <Form.Check type="checkbox" id={`role-${role.id}`} label={<span className="small fw-bold">{role.name}</span>} checked={formData.role_ids.includes(role.id)} onChange={() => {}} />
              </div>
            </Col>
          ))}
        </Row>
        <Form.Check type="switch" id="superuser-switch" label={<span className="fw-bold text-danger small uppercase">Nivel Superadministrador (Acceso Total)</span>} checked={formData.is_superuser} onChange={e => setFormData({...formData, is_superuser: e.target.checked})} />
      </div>
     </Form>
    </Modal.Body>
    <Modal.Footer className="bg-surface-muted">
     <Button variant="primary" className="w-100 py-3 fw-black uppercase x-small tracking-widest shadow-lg" onClick={handleSubmit} disabled={saving}>
      {saving ? <Spinner animation="border" size="sm" /> : 'Confirmar y Guardar Identidad'}
     </Button>
    </Modal.Footer>
   </Modal>

   <style jsx global>{`
    .rounded-xl { border-radius: 1.25rem; }
    .rounded-lg { border-radius: 10px; }
    .fw-black { font-weight: 900; }
    .x-small { font-size: 11px; }
    .tracking-tighter { letter-spacing: -0.05em; }
    .custom-user-table th { border: 0 !important; }
    .hover-opacity-100:hover { opacity: 1 !important; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    [data-theme='dark'] .custom-scrollbar::-webkit-scrollbar-thumb,
    [data-theme='soc'] .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
   `}</style>
  </Layout>
 );
}
