import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container, Table, Button, Badge, Card, Modal, Form, Row, Col } from 'react-bootstrap';
import { UserPlus, Edit, Trash2, Shield, User as UserIcon, Mail } from 'lucide-react';
import Layout from '../../../components/Layout';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_superuser: false,
    group_id: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    } else {
      fetchUsers(token);
      fetchGroups(token);
    }
  }, [router]);

  const fetchUsers = async (token: string) => {
    try {
      const res = await fetch('/api/v1/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchGroups = async (token: string) => {
    try {
      const res = await fetch('/api/v1/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
  };

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setEditingUserId(user.id);
      setFormData({
        username: user.username,
        email: user.email,
        password: '', // No cargamos el password por seguridad
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        is_superuser: user.is_superuser || false,
        group_id: user.group_id || ''
      });
    } else {
      setEditingUserId(null);
      setFormData({ username: '', email: '', password: '', first_name: '', last_name: '', is_superuser: false, group_id: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('access_token');
    const method = editingUserId ? 'PUT' : 'POST';
    const url = editingUserId ? `/api/v1/admin/users/${editingUserId}` : '/api/v1/admin/users';
    
    // Si estamos editando y el password está vacío, enviamos todo menos el password
    const payload: any = { ...formData };
    if (editingUserId && !payload.password) {
      delete payload.password;
    }

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
        fetchUsers(token!);
      } else {
        const err = await res.json();
        alert("Error: " + JSON.stringify(err.detail));
      }
    } catch (e) { console.error(e); }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchUsers(token!);
    } catch (e) { console.error(e); }
  };

  return (
    <Layout title="Manage Users">
      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="fw-bold mb-0">User Management</h1>
            <p className="text-muted">Manage system users, roles and group assignments</p>
          </div>
          <Button variant="primary" onClick={() => handleOpenModal()} className="d-flex align-items-center px-4 py-2">
            <UserPlus size={18} className="me-2" /> Add New User
          </Button>
        </div>

        <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">User</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Group</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
                                <tbody>
                                  {Array.isArray(users) && users.length > 0 ? users.map((u: any) => (                  <tr key={u.id} className="align-middle">
                    <td className="ps-4 py-3">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                          <UserIcon size={20} />
                        </div>
                        <div>
                          <div className="fw-bold">{u.first_name} {u.last_name}</div>
                          <div className="small text-muted d-flex align-items-center">
                            <Mail size={12} className="me-1" /> {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><code className="small">@{u.username}</code></td>
                    <td>
                      {u.is_superuser ? (
                        <Badge bg="danger" className="d-flex align-items-center w-fit">
                          <Shield size={12} className="me-1" /> Administrator
                        </Badge>
                      ) : (
                        <Badge bg="primary">Staff Member</Badge>
                      )}
                    </td>
                    <td className="small">{u.group_name || 'No group'}</td>
                    <td>
                      <Badge bg={u.is_active ? 'success' : 'secondary'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <Button variant="outline-secondary" size="sm" className="me-2 border-0" onClick={() => handleOpenModal(u)}><Edit size={16} /></Button>
                      <Button variant="outline-danger" size="sm" className="border-0" onClick={() => handleDeactivate(u.id)}><Trash2 size={16} /></Button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="text-center py-5 text-muted">No users found.</td></tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>

        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
          <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold">{editingUserId ? 'Edit User Account' : 'Create New User Account'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="pt-0">
            <p className="text-muted small mb-4">{editingUserId ? 'Update the details for this existing user.' : 'Provide the details to create a new user and assign them to a group.'}</p>
            <Form>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="user-first-name">
                    <Form.Label className="small fw-bold">First Name</Form.Label>
                    <Form.Control type="text" name="first_name" placeholder="John" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="user-last-name">
                    <Form.Label className="small fw-bold">Last Name</Form.Label>
                    <Form.Control type="text" name="last_name" placeholder="Doe" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="user-username">
                    <Form.Label className="small fw-bold">Username</Form.Label>
                    <Form.Control type="text" name="username" placeholder="jdoe" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="user-email">
                    <Form.Label className="small fw-bold">Email</Form.Label>
                    <Form.Control type="email" name="email" placeholder="jdoe@ticketera.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="user-password">
                    <Form.Label className="small fw-bold">{editingUserId ? 'New Password (leave blank to keep current)' : 'Temporary Password'}</Form.Label>
                    <Form.Control type="password" name="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="user-group">
                    <Form.Label className="small fw-bold">Group / Department</Form.Label>
                    <Form.Select name="group_id" value={formData.group_id} onChange={e => setFormData({...formData, group_id: e.target.value})}>
                      <option value="">Select Group...</option>
                      {Array.isArray(groups) && groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Check 
                    type="switch" 
                    id="is-superuser-switch" 
                    label="Grant Super Administrator privileges" 
                    className="fw-bold text-danger"
                    checked={formData.is_superuser}
                    onChange={e => setFormData({...formData, is_superuser: e.target.checked})}
                  />
                  <p className="text-muted small ps-4 ms-2 mt-1">This user will have full access to all system settings and security logs.</p>
                </Col>
              </Row>
            </Form>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="light" onClick={() => setShowModal(false)} className="px-4">Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} className="px-4 fw-bold">{editingUserId ? 'Save Changes' : 'Create User'}</Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
}
