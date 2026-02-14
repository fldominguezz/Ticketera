import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { Container, Card, Row, Col, Button, Badge, ListGroup, Tabs, Tab, Form, Spinner, Alert, Modal } from 'react-bootstrap';
import { Shield, Monitor, Globe, Clock, User as UserIcon, Mail, AlertTriangle, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/UserAvatar';

export default function ProfilePage() {
 const { t } = useTranslation();
 const { user, refreshUser } = useAuth();
 const router = useRouter();
 const [mounted, setMounted] = useState(false);
 const [loading, setLoading] = useState(false);
 const [uploading, setUploading] = useState(false);
 const [showPasswordModal, setShowModal] = useState(false);
 const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
 const [password, setPassword] = useState('');
 const [changePasswordData, setChangePasswordData] = useState({
  current_password: '',
  new_password: '',
  confirm_password: ''
 });
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const fileInputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
  setMounted(true);
 }, []);

 const handleChangePassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  if (changePasswordData.new_password !== changePasswordData.confirm_password) {
    setError('Las contraseñas no coinciden');
    return;
  }

  setLoading(true);
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch('/api/v1/users/me/change-password', {
    method: 'POST',
    headers: { 
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      current_password: changePasswordData.current_password,
      new_password: changePasswordData.new_password
    })
   });
   
   if (res.ok) {
    setSuccess('Contraseña actualizada correctamente. Sincronizada con Wiki.');
    setChangePasswordData({ current_password: '', new_password: '', confirm_password: '' });
    sessionStorage.setItem('temp_pc', changePasswordData.new_password);
    setTimeout(() => {
      setShowChangePasswordModal(false);
      setSuccess('');
    }, 2000);
   } else {
    const data = await res.json();
    
    let errorMsg = 'Error al cambiar la contraseña';
    
    if (data.detail) {
      if (Array.isArray(data.detail)) {
        // Si es una lista de errores de validación
        errorMsg = data.detail.map((err: any) => {
          const field = err.loc ? err.loc[err.loc.length - 1] : 'error';
          return `${field}: ${err.msg}`;
        }).join(', ');
      } else if (typeof data.detail === 'string') {
        errorMsg = data.detail;
      } else {
        // Si es un objeto pero no sabemos la forma, lo convertimos a string
        errorMsg = JSON.stringify(data.detail);
      }
    }
    
    setError(String(errorMsg));
   }
  } catch (e) { setError('Error de conexión'); }
  finally { setLoading(false); }
 };

 const handleAvatarClick = () => {
  fileInputRef.current?.click();
 };

 const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setUploading(true);
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch('/api/v1/users/me/avatar', {
    method: 'POST',
    headers: { 
     'Authorization': `Bearer ${token}`
    },
    body: formData
   });
   if (res.ok) {
    await refreshUser();
   } else {
    alert('Error al subir la imagen');
   }
  } catch (e) { console.error(e); }
  finally { setUploading(false); }
 };

 const handleRemoveAvatar = async () => {
  if (!confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) return;
  
  setLoading(true);
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch('/api/v1/users/me/avatar', {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
   });
   if (res.ok) {
    await refreshUser();
   }
  } catch (e) { console.error(e); }
  finally { setLoading(false); }
 };

 const handleDisable2FA = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch('/api/v1/users/me/2fa/disable', {
    method: 'POST',
    headers: { 
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
   });
   if (res.ok) {
    setShowModal(false);
    setPassword('');
    await refreshUser();
   } else {
    const data = await res.json();
    setError(data.detail || 'Contraseña incorrecta');
   }
  } catch (e) { setError('Error de conexión'); }
  finally { setLoading(false); }
 };

 if (!mounted) return null;

 return (
  <Layout title={t('profile') || 'Mi Perfil'}>
   <Container fluid className="px-0">
    <Row className="g-4">
     <Col lg={4}>
      <Card className="border-0 shadow-sm text-center p-4">
       <Card.Body>
        <div 
         className="position-relative mx-auto mb-3 cursor-pointer profile-avatar-container" 
         style={{ width: '100px', height: '100px' }}
         onClick={handleAvatarClick}
        >
         <UserAvatar 
          user={user} 
          size={100} 
          fontSize="40px" 
          className={uploading ? 'opacity-50' : ''}
         />
         {uploading && (
          <div className="position-absolute top-50 left-50 translate-middle">
           <Spinner animation="border" size="sm" variant="light" />
          </div>
         )}
         <div className="avatar-edit-overlay rounded-circle d-flex align-items-center justify-content-center">
          <Camera size={24} className="" />
         </div>
         <input 
          type="file" 
          ref={fileInputRef} 
          className="d-none" 
          accept="image/*" 
          onChange={handleFileChange}
         />
        </div>
        <h4 className="fw-bold mb-1">{user?.first_name} {user?.last_name}</h4>
        <p className="text-muted small">{user?.email}</p>
        
        {user?.avatar_url && (
         <Button 
          variant="link" 
          size="sm" 
          className="text-danger x-small fw-bold text-decoration-none p-0 mb-3"
          onClick={handleRemoveAvatar}
         >
          Eliminar Foto
         </Button>
        )}

        <div className="d-block">
         <Badge bg="primary" className="px-3 py-2 rounded-pill">
          {user?.is_superuser ? 'Administrador' : 'Técnico'}
         </Badge>
        </div>
        <hr />
        <div className="text-start small">
         <div className="mb-2 d-flex align-items-center"><Mail size={14} className="me-2 text-muted" /> {user?.email}</div>
         <div className="mb-2 d-flex align-items-center"><Globe size={14} className="me-2 text-muted" /> Idioma: {user?.preferred_language || 'Español'}</div>
         <div className="mb-0 d-flex align-items-center"><Clock size={14} className="me-2 text-muted" /> Miembro desde: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</div>
        </div>
       </Card.Body>
      </Card>
     </Col>
     <Col lg={8}>
      <Card className="border-0 shadow-sm">
       <Card.Body className="p-0">
        <Tabs defaultActiveKey="general" className="px-4 pt-3 custom-tabs">
         <Tab eventKey="general" title="General" className="p-4">
          <Form>
           <Row className="g-3">
            <Col md={6}>
             <Form.Group controlId="profile-first-name">
              <Form.Label className="small fw-bold">Nombre</Form.Label>
              <Form.Control name="first_name" defaultValue={user?.first_name} />
             </Form.Group>
            </Col>
            <Col md={6}>
             <Form.Group controlId="profile-last-name">
              <Form.Label className="small fw-bold">Apellido</Form.Label>
              <Form.Control name="last_name" defaultValue={user?.last_name} />
             </Form.Group>
            </Col>
            <Col md={12}>
             <Form.Group controlId="profile-email">
              <Form.Label className="small fw-bold">Email</Form.Label>
              <Form.Control name="email" type="email" defaultValue={user?.email} />
             </Form.Group>
            </Col>
           </Row>
           <Button variant="primary" className="mt-4 px-4 shadow-sm" disabled={loading}>
            {loading ? 'Guardando...' : 'Actualizar Perfil'}
           </Button>
          </Form>
         </Tab>
         <Tab eventKey="security" title="Seguridad" className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
           <div>
            <h6 className="fw-bold mb-1">Estado de Seguridad</h6>
            <p className="text-muted small mb-0">La política de seguridad requiere Autenticación de Dos Factores (2FA) obligatoria.</p>
           </div>
           {user?.is_2fa_enabled ? (
            <Badge bg="success">Protegido con 2FA</Badge>
           ) : (
            <Badge bg="warning" text="dark">Configuración Pendiente</Badge>
           )}
          </div>
          
          <div className="border rounded p-3 mb-4 bg-surface-muted bg-opacity-10">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="fw-bold mb-1">Contraseña de acceso</h6>
                <p className="text-muted small mb-0">Cambia tu contraseña de la Ticketera y sincronízala con la Wiki.</p>
              </div>
              <Button variant="outline-primary" size="sm" onClick={() => {
                setError('');
                setSuccess('');
                setShowChangePasswordModal(true);
              }}>
                Cambiar Contraseña
              </Button>
            </div>
          </div>

          <Alert variant="info" className="small py-2 border-0 shadow-none">
           <Shield size={14} className="me-2" />
           El Segundo Factor de Autenticación es administrado por la política global de seguridad.
          </Alert>
         </Tab>
        </Tabs>
       </Card.Body>
      </Card>
     </Col>
    </Row>
   </Container>

   {/* Modal: Cambiar Contraseña */}
   <Modal show={showChangePasswordModal} onHide={() => setShowChangePasswordModal(false)} centered>
    <Modal.Header closeButton className="border-0">
     <Modal.Title className="h5 fw-bold">Cambiar Contraseña</Modal.Title>
    </Modal.Header>
    <Form onSubmit={handleChangePassword}>
     <Modal.Body>
      {error && <Alert variant="danger" className="small py-2">{error}</Alert>}
      {success && <Alert variant="success" className="small py-2">{success}</Alert>}
      
      <Form.Group className="mb-3" controlId="current-password">
       <Form.Label className="small fw-bold">Contraseña Actual</Form.Label>
       <Form.Control 
        type="password" 
        required 
        value={changePasswordData.current_password}
        onChange={e => setChangePasswordData({...changePasswordData, current_password: e.target.value})}
       />
      </Form.Group>

      <hr />

      <Form.Group className="mb-3" controlId="new-password">
       <Form.Label className="small fw-bold">Nueva Contraseña</Form.Label>
       <Form.Control 
        type="password" 
        required 
        value={changePasswordData.new_password}
        onChange={e => setChangePasswordData({...changePasswordData, new_password: e.target.value})}
       />
      </Form.Group>

      <Form.Group className="mb-0" controlId="confirm-password">
       <Form.Label className="small fw-bold">Confirmar Nueva Contraseña</Form.Label>
       <Form.Control 
        type="password" 
        required 
        value={changePasswordData.confirm_password}
        onChange={e => setChangePasswordData({...changePasswordData, confirm_password: e.target.value})}
       />
      </Form.Group>
     </Modal.Body>
     <Modal.Footer className="border-0">
      <Button variant="light" onClick={() => setShowChangePasswordModal(false)}>Cancelar</Button>
      <Button variant="primary" type="submit" disabled={loading}>
       {loading ? <Spinner animation="border" size="sm" /> : 'Actualizar Contraseña'}
      </Button>
     </Modal.Footer>
    </Form>
   </Modal>

   <Modal show={showPasswordModal} onHide={() => setShowModal(false)} centered>
    <Modal.Header closeButton className="border-0">
     <Modal.Title className="h5 fw-bold text-danger">Desactivar 2FA</Modal.Title>
    </Modal.Header>
    <Form onSubmit={handleDisable2FA}>
     <Modal.Body>
      <p className="small text-muted">Por seguridad, confirma tu contraseña para desactivar el segundo factor de autenticación.</p>
      {error && <Alert variant="danger" className="small py-2">{error}</Alert>}
      <Form.Group controlId="disable-2fa-password">
       <Form.Label className="small fw-bold">Contraseña Actual</Form.Label>
       <Form.Control 
        id="disable-2fa-password"
        name="password"
        type="password" 
        required 
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoFocus
       />
      </Form.Group>
     </Modal.Body>
     <Modal.Footer className="border-0">
      <Button variant="light" onClick={() => setShowModal(false)}>Cancelar</Button>
      <Button variant="danger" type="submit" disabled={loading}>
       {loading ? <Spinner animation="border" size="sm" /> : 'Confirmar Desactivación'}
      </Button>
     </Modal.Footer>
    </Form>
   </Modal>

   <style jsx global>{`
    .custom-tabs .nav-link {
     border: none;
     color: #6c757d;
     font-weight: 500;
     padding: 1rem 1.5rem;
    }
    .custom-tabs .nav-link.active {
     color: var(--bs-primary);
     border-bottom: 2px solid var(--bs-primary);
     background: transparent;
    }
    .profile-avatar-container {
     transition: transform 0.2s;
    }
    .profile-avatar-container:hover {
     transform: scale(1.05);
    }
    .avatar-edit-overlay {
     position: absolute;
     top: 0;
     left: 0;
     width: 100%;
     height: 100%;
     background: rgba(0,0,0,0.4);
     opacity: 0;
     transition: opacity 0.2s;
    }
    .profile-avatar-container:hover .avatar-edit-overlay {
     opacity: 1;
    }
    .cursor-pointer { cursor: pointer; }
    .object-fit-cover { object-fit: cover; }
   `}</style>
  </Layout>
 );
}
