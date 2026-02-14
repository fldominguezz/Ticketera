import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Card, Row, Col, Button, Form, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { Settings, Shield, Globe, Palette, Clock, GitBranch, Users, Database, Server, FileText, ShieldAlert, Activity, Save, Lock as LockIcon, Key } from 'lucide-react';
import api from '../../lib/api';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>({
    app_name: 'CyberCase SOC',
    primary_color: '#0d6efd',
    accent_color: '#6c757d',
    login_footer_text: '© 2026 CyberCase Security',
    require_2fa_all_users: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const userPermissions = new Set(
    user?.roles?.flatMap((r: any) => {
      const perms = r.role?.permissions || r.permissions || [];
      return perms.map((p: any) => p.key || p.name);
    }) || []
  );

  const can = (perm: string) => user?.is_superuser || userPermissions.has(perm);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      if (res.data) setSettings(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/settings', settings);
      setShowToast(true);
    } catch (e) { alert('Error al guardar'); }
    finally { setSaving(false); }
  };

  const openGrafana = () => {
    const host = window.location.hostname;
    window.open(`http://${host}:3002`, '_blank');
  };

  const AdminCard = ({ title, desc, icon: Icon, href, color, onClick, perm }: any) => {
    if (perm && !can(perm)) return null;

    const content = (
      <Card className="border-0 shadow-sm h-100 admin-card-hover transition-all">
        <Card.Body className="d-flex align-items-center p-4">
          <div className={`bg-${color} bg-opacity-10 p-3 rounded-3 me-4`}>
            <Icon size={24} className={`text-${color}`}/>
          </div>
          <div>
            <h6 className="fw-bold mb-1 ">{title}</h6>
            <p className="small text-muted mb-0">{desc}</p>
          </div>
        </Card.Body>
      </Card>
    );

    if (onClick) {
      return <Col md={4}><div role="button" onClick={onClick} className="text-decoration-none h-100">{content}</div></Col>;
    }

    return (
      <Col md={4}>
        <Link href={href} className="text-decoration-none">
          {content}
        </Link>
      </Col>
    );
  };

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;

  return (
    <Layout title="Panel de Administración">
      <ToastContainer position="top-end" className="p-3">
        <Toast show={showToast} onClose={() => setShowToast(false)} delay={3000} autohide bg="success">
          <Toast.Body className="fw-bold">Configuración actualizada</Toast.Body>
        </Toast>
      </ToastContainer>

      <div className="mb-5">
        <h1 className="fw-bold h2 mb-1">Administración del Sistema</h1>
        <p className="text-muted">Control centralizado de infraestructura, seguridad y procesos SOC.</p>
      </div>

      <h5 className="fw-bold mb-4 d-flex align-items-center">
        <Server size={20} className="me-2 text-primary"/> Módulos de Gestión
      </h5>
      <Row className="g-4 mb-5">
        <AdminCard title="Usuarios" desc="Gestionar cuentas y accesos" icon={Users} href="/admin/users" color="primary" perm="admin:users:read"/>
        <AdminCard title="Roles" desc="Configurar RBAC y seguridad" icon={Shield} href="/admin/roles" color="danger" perm="admin:roles:read"/>
        <AdminCard title="Diccionario de Permisos" desc="Registro global de capacidades" icon={Key} href="/admin/permissions" color="warning" perm="admin:roles:manage"/>
        <AdminCard title="Seguridad Global" desc="Política de claves y 2FA" icon={LockIcon} href="/admin/security" color="warning" perm="admin:settings:read"/>
        <AdminCard title="Grupos Org." desc="Jerarquía y visibilidad" icon={GitBranch} href="/admin/groups" color="primary" perm="admin:groups:read"/>
        <AdminCard title="Ubicaciones" desc="Carpetas y dependencias" icon={Database} href="/admin/locations" color="success" perm="admin:locations:read"/>
        <AdminCard title="Tipos de Tickets" desc="Categorías y comportamientos" icon={Settings} href="/admin/ticket-types" color="secondary" perm="admin:catalogs:read"/>
        <AdminCard title="Políticas de SLA" desc="Tiempos de respuesta y resolución" icon={Clock} href="/admin/sla" color="warning" perm="admin:settings:read"/>
        <AdminCard title="Workflows" desc="Flujos de estado y transiciones" icon={GitBranch} href="/admin/workflows" color="info" perm="admin:catalogs:read"/>
        <AdminCard title="Plantillas" desc="Constructor de formularios dinámicos" icon={FileText} href="/admin/forms" color="info" perm="admin:catalogs:read"/>
        <AdminCard title="Monitoreo (Grafana)" desc="Métricas de servidor y API en vivo" icon={Activity} onClick={openGrafana} color="primary" perm="admin:settings:read"/>
        <AdminCard title="Estado y Backups" desc="Salud del sistema y respaldos" icon={Database} href="/admin/system" color="success" perm="admin:settings:manage"/>
        <AdminCard title="Auditoría Global" desc="Registro inmutable de acciones" icon={Shield} href="/admin/audit" color="secondary" perm="admin:access"/>
        <AdminCard title="Integración SIEM" desc="Configurar FortiSIEM y Webhooks" icon={ShieldAlert} href="/admin/integrations/siem" color="danger" perm="admin:settings:manage"/>
      </Row>

      <h5 className="fw-bold mb-4 d-flex align-items-center">
        <Palette size={20} className="me-2 text-primary"/> Personalización y Marca (White Label)
      </h5>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Form onSubmit={handleSave}>
            <Row className="g-4">
              <Col md={6}>
                <Form.Group controlId="app-name">
                  <Form.Label className="small fw-bold">Nombre de la Aplicación</Form.Label>
                  <Form.Control 
                    id="app-name"
                    name="app_name"
                    value={settings.app_name} 
                    onChange={e => setSettings({...settings, app_name: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="primary-color">
                  <Form.Label className="small fw-bold">Color Primario</Form.Label>
                  <Form.Control 
                    id="primary-color"
                    name="primary_color"
                    type="color" 
                    value={settings.primary_color} 
                    onChange={e => setSettings({...settings, primary_color: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="require-2fa-global" className="d-flex flex-column h-100 justify-content-end">
                  <Form.Check 
                    id="require-2fa-global"
                    name="require_2fa_all_users"
                    type="switch"
                    label="Obligar 2FA global"
                    checked={settings.require_2fa_all_users}
                    onChange={e => setSettings({...settings, require_2fa_all_users: e.target.checked})}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="login-footer-text">
                  <Form.Label className="small fw-bold">Texto de Pie de Página (Login)</Form.Label>
                  <Form.Control 
                    id="login-footer-text"
                    name="login_footer_text"
                    value={settings.login_footer_text} 
                    onChange={e => setSettings({...settings, login_footer_text: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="mt-4 text-end">
              <Button variant="primary" type="submit" disabled={saving} className="px-4 fw-bold">
                {saving ? <Spinner animation="border" size="sm" className="me-2"/> : <Settings size={18} className="me-2"/>}
                GUARDAR CONFIGURACIÓN GLOBAL
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <h5 className="fw-bold mb-4 mt-5 d-flex align-items-center">
        <Globe size={20} className="me-2 text-primary"/> Configuración de Correo (SMTP - Previsión)
      </h5>
      <Card className="border-0 shadow-sm mb-5">
        <Card.Body className="p-4">
          <p className="small text-muted mb-4">
            Configure el servidor de correo para futuras automatizaciones, alertas de SLA y notificaciones por email.
          </p>
          <Form onSubmit={handleSave}>
            <Row className="g-4">
              <Col md={8}>
                <Form.Group controlId="smtp-host">
                  <Form.Label className="small fw-bold">Servidor SMTP (Host)</Form.Label>
                  <Form.Control 
                    id="smtp-host"
                    name="smtp_host"
                    placeholder="ej: smtp.gmail.com"
                    value={settings.smtp_host || ''} 
                    onChange={e => setSettings({...settings, smtp_host: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="smtp-port">
                  <Form.Label className="small fw-bold">Puerto</Form.Label>
                  <Form.Control 
                    id="smtp-port"
                    name="smtp_port"
                    type="number"
                    placeholder="587"
                    value={settings.smtp_port || ''} 
                    onChange={e => setSettings({...settings, smtp_port: parseInt(e.target.value)})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="smtp-user">
                  <Form.Label className="small fw-bold">Usuario / Email</Form.Label>
                  <Form.Control 
                    id="smtp-user"
                    name="smtp_user"
                    value={settings.smtp_user || ''} 
                    onChange={e => setSettings({...settings, smtp_user: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="smtp-password">
                  <Form.Label className="small fw-bold">Contraseña</Form.Label>
                  <Form.Control 
                    id="smtp-password"
                    name="smtp_password"
                    type="password"
                    value={settings.smtp_password || ''} 
                    onChange={e => setSettings({...settings, smtp_password: e.target.value})}
                  />
                  <Form.Text className="text-muted" style={{ fontSize: '10px' }}>
                    <Shield size={10} className="me-1 text-warning"/> 
                    Si usas 2FA (Gmail/Outlook), usa una <strong>Contraseña de Aplicación</strong>.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="smtp-from-email">
                  <Form.Label className="small fw-bold">Email Remitente (From)</Form.Label>
                  <Form.Control 
                    id="smtp-from-email"
                    name="smtp_from_email"
                    placeholder="no-reply@empresa.com"
                    value={settings.smtp_from_email || ''} 
                    onChange={e => setSettings({...settings, smtp_from_email: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="smtp-use-tls" className="d-flex flex-column h-100 justify-content-end">
                  <Form.Check 
                    id="smtp-use-tls"
                    name="smtp_use_tls"
                    type="switch"
                    label="Usar TLS"
                    checked={settings.smtp_use_tls}
                    onChange={e => setSettings({...settings, smtp_use_tls: e.target.checked})}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="smtp-use-ssl" className="d-flex flex-column h-100 justify-content-end">
                  <Form.Check 
                    id="smtp-use-ssl"
                    name="smtp_use_ssl"
                    type="switch"
                    label="Usar SSL"
                    checked={settings.smtp_use_ssl}
                    onChange={e => setSettings({...settings, smtp_use_ssl: e.target.checked})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="mt-4 text-end">
              <Button variant="outline-primary" type="submit" disabled={saving} className="px-4 fw-bold">
                {saving ? <Spinner animation="border" size="sm" className="me-2"/> : <Save size={18} className="me-2"/>}
                GUARDAR AJUSTES DE CORREO
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Layout>
  );
};

export default AdminDashboard;
