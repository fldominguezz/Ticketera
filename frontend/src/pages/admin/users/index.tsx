import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, Table, Button, Badge, Card, Modal, Form, Row, Col, Spinner } from 'react-bootstrap';
import { UserPlus, Edit, Trash2, Shield, User as UserIcon, Mail, Lock } from 'lucide-react';
import Layout from '../../../components/Layout';
import { useTheme } from '../../../context/ThemeContext';

export default function AdminUsersPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', first_name: '', last_name: '',
    is_superuser: false, group_id: '', role_ids: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const [uRes, gRes, rRes] = await Promise.all([
        fetch('/api/v1/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/groups', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/iam/roles', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setUsers(await uRes.json());
      setGroups(await gRes.json());
      setRoles(await rRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSecurityAction = async (action: string) => {
    if (!editingUserId) return;
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/v1/admin/users/${editingUserId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (action === 'reset-password' && data.new_password) {
        setGeneratedPassword(data.new_password);
      } else {
        alert(data.detail || "Acción completada con éxito");
        setShowModal(false);
        fetchData();
      }
    } catch (e) { alert("Error al ejecutar acción de seguridad"); }
  };

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setEditingUserId(user.id);
      setFormData({
        username: user.username, email: user.email, password: '',
        first_name: user.first_name || '', last_name: user.last_name || '',
        is_superuser: user.is_superuser || false, group_id: user.group_id || '',
        role_ids: Array.isArray(user.roles) ? user.roles.map((r: any) => r.id) : []
      });
    } else {
      setEditingUserId(null);
      setFormData({ username: '', email: '', password: '', first_name: '', last_name: '', is_superuser: false, group_id: '', role_ids: [] });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called!');
    const token = localStorage.getItem('access_token');
    const method = editingUserId ? 'PUT' : 'POST';
    const url = editingUserId ? `/api/v1/admin/users/${editingUserId}` : '/api/v1/admin/users';
    
    const payload: any = { ...formData };
    if (editingUserId && !payload.password) delete payload.password;

    try {
      const res = await fetch(url, {
        method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const errorData = await res.json();
        const errorMessage = errorData.detail || errorData.message || `Error: ${res.status} ${res.statusText}`;
        alert(`Error al guardar usuario: ${errorMessage}`);
      }
    } catch (e) {
      console.error(e);
      alert(`Error de red o inesperado: ${e.message || e}`);
    }
  };

  const toggleRole = (id: string) => {
    setFormData(prev => ({
      ...prev,
      role_ids: prev.role_ids.includes(id) ? prev.role_ids.filter(rid => rid !== id) : [...prev.role_ids, id]
    }));
  };

  return (
    <Layout title="Gestión de Cuentas">
      <Container fluid className="px-0">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-black text-uppercase m-0">Usuarios del Sistema</h2>
            <p className="text-muted small mb-0">Administre el acceso del personal y analistas del SOC.</p>
          </div>
          <Button variant="primary" onClick={() => handleOpenModal()} className="shadow-sm fw-bold">
            <UserPlus size={18} className="me-2" /> NUEVO USUARIO
          </Button>
        </div>

        <Card className="border-0 shadow-sm overflow-hidden">
          <Table hover responsive variant={isDark ? 'dark' : undefined} className="align-middle mb-0">
            <thead className={isDark ? 'bg-black' : 'bg-light'}>
              <tr className="small text-uppercase text-muted opacity-75">
                <th className="ps-4 py-3">Identidad</th>
                <th>Usuario</th>
                <th>Roles / Nivel</th>
                <th>Área / Grupo</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td className="ps-4 py-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="avatar bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{width:32, height:32}}>
                        <UserIcon size={16} />
                      </div>
                      <div>
                        <div className="fw-bold">{u.first_name} {u.last_name}</div>
                        <div className="x-small text-muted">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><code className="small">@{u.username}</code></td>
                  <td>
                    <div className="d-flex flex-wrap gap-1">
                        {u.is_superuser && <Badge bg="danger" className="bg-opacity-10 text-danger border border-danger border-opacity-25 x-small fw-black">SUPERADMIN</Badge>}
                        {u.roles?.map((r: any) => (
                            <Badge key={r.id} bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-25 x-small fw-bold">{r.name}</Badge>
                        ))}
                        {(!u.is_superuser && (!u.roles || u.roles.length === 0)) && <span className="text-muted small italic opacity-50">Sin rol</span>}
                    </div>
                  </td>
                  <td className="small">{u.group_name || '-'}</td>
                  <td className="text-end pe-4">
                    <Button variant={isDark ? "dark" : "light"} size="sm" onClick={() => handleOpenModal(u)} className="border border-opacity-10"><Edit size={14} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </Container>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title className="h6 fw-bold">PERFIL DE USUARIO</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="g-3 mb-4">
              <Col md={6}><Form.Label className="x-small fw-bold text-muted">NOMBRE</Form.Label><Form.Control size="sm" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></Col>
              <Col md={6}><Form.Label className="x-small fw-bold text-muted">APELLIDO</Form.Label><Form.Control size="sm" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} /></Col>
              <Col md={6}><Form.Label className="x-small fw-bold text-muted">USERNAME</Form.Label><Form.Control size="sm" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></Col>
              <Col md={6}><Form.Label className="x-small fw-bold text-muted">EMAIL</Form.Label><Form.Control size="sm" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></Col>
              <Col md={6}><Form.Label className="x-small fw-bold text-muted">PASSWORD</Form.Label><Form.Control size="sm" type="password" placeholder={editingUserId ? "Dejar en blanco..." : "Clave temporal"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></Col>
              <Col md={6}><Form.Label className="x-small fw-bold text-muted">GRUPO</Form.Label><Form.Select size="sm" value={formData.group_id} onChange={e => setFormData({...formData, group_id: e.target.value})}><option value="">Seleccionar...</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</Form.Select></Col>
            </Row>

            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 x-small uppercase opacity-75"><Lock size={14} /> Asignación de Roles</h6>
            <div className="border rounded p-3 mb-4 bg-light bg-opacity-10">
                <Row className="g-2">
                    {roles.map(role => (
                        <Col md={6} key={role.id}>
                            <Form.Check 
                                type="checkbox" id={`role-${role.id}`} label={<span className="small">{role.name}</span>}
                                checked={formData.role_ids.includes(role.id)}
                                onChange={() => toggleRole(role.id)}
                            />
                        </Col>
                    ))}
                </Row>
            </div>

            <Form.Check 
              type="switch" label={<span className="fw-bold text-danger small">OTORGAR PERMISOS DE SUPERADMINISTRADOR</span>}
              checked={formData.is_superuser} onChange={e => setFormData({...formData, is_superuser: e.target.checked})} 
            />

            {editingUserId && (
                <div className="mt-4 pt-4 border-top">
                    <h6 className="fw-bold mb-3 x-small uppercase text-danger"><Shield size={14} /> Acciones de Seguridad Críticas</h6>
                    <div className="d-flex flex-wrap gap-2">
                        <Button variant="outline-danger" size="sm" className="fw-bold x-small" onClick={() => handleSecurityAction('reset-password')}>RESET PASSWORD (NUEVA CLAVE)</Button>
                        <Button variant="outline-warning" size="sm" className="fw-bold x-small" onClick={() => handleSecurityAction('force-password-change')}>FORZAR CAMBIO CLAVE</Button>
                        <Button variant="outline-secondary" size="sm" className="fw-bold x-small" onClick={() => handleSecurityAction('reset-2fa')}>RESETEAR 2FA LOGIN</Button>
                        <Button variant="outline-dark" size="sm" className="fw-bold x-small" onClick={() => handleSecurityAction('disable-2fa')}>DESACTIVAR 2FA</Button>
                    </div>
                </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="primary" className="w-100 fw-bold" onClick={handleSubmit}>GUARDAR USUARIO</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para mostrar contraseña generada */}
      <Modal show={!!generatedPassword} onHide={() => setGeneratedPassword(null)} centered>
        <Modal.Header closeButton className="bg-danger text-white"><Modal.Title className="h6 fw-bold">NUEVA CONTRASEÑA GENERADA</Modal.Title></Modal.Header>
        <Modal.Body className="text-center py-4">
            <p className="text-muted small">Copie esta clave y entréguela al usuario. Se le obligará a cambiarla al iniciar sesión.</p>
            <div className="bg-light p-3 rounded border font-monospace h4 fw-bold mb-0 text-dark select-all">
                {generatedPassword}
            </div>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setGeneratedPassword(null)}>CERRAR</Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
}