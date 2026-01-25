import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import { Container, Row, Col, Card, Button, Badge, Spinner } from 'react-bootstrap';
import { Users, FolderTree, FileText, Settings, ArrowRight, Zap, RefreshCw, Clock, GitBranch, ShieldCheck, Tag } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { isSuperuser, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Si no es admin y ya terminó de cargar, mostrar error o redirigir
  if (!isSuperuser) {
    return (
      <Layout title="Acceso Denegado">
        <Container className="text-center py-5">
          <ShieldCheck size={64} className="text-danger mb-4" />
          <h2 className="fw-bold">Acceso Restringido</h2>
          <p className="text-muted">No tiene permisos suficientes para acceder al panel de administración.</p>
          <Button variant="primary" href="/">Volver al Dashboard</Button>
        </Container>
      </Layout>
    );
  }

  const adminModules = [
    { title: t('mod_users_title') || 'Usuarios', desc: t('mod_users_desc') || 'Gestionar accesos y roles', icon: <Users size={28} />, link: '/admin/users', color: 'primary' },
    { title: t('mod_org_title') || 'Organización', desc: t('mod_org_desc') || 'Estructura de grupos y áreas', icon: <FolderTree size={28} />, link: '/admin/groups', color: 'success' },
    { title: 'Tipos de Ticket', desc: 'Gestionar categorías, iconos y colores', icon: <Tag size={28} />, link: '/admin/ticket-types', color: 'info' },
    { title: t('mod_forms_title') || 'Formularios', desc: t('mod_forms_desc') || 'Diseño de fichas dinámicas', icon: <FileText size={28} />, link: '/admin/forms', color: 'primary' },
    { title: t('mod_sla_title') || 'Políticas SLA', desc: t('mod_sla_desc') || 'Tiempos de respuesta y ANS', icon: <Clock size={28} />, link: '/admin/sla', color: 'warning' },
    { title: t('mod_workflow_title') || 'Workflows', desc: t('mod_workflow_desc') || 'Estados y transiciones de tickets', icon: <GitBranch size={28} />, link: '/admin/workflow', color: 'dark' },
    { title: t('mod_security_title') || 'Seguridad', desc: t('mod_security_desc') || 'Hardening y políticas de acceso', icon: <ShieldCheck size={28} />, link: '/admin/security', color: 'danger' },
    { title: t('mod_updates_title') || 'Actualizaciones', desc: t('mod_updates_desc') || 'Versión del núcleo y plugins', icon: <RefreshCw size={28} />, link: '/admin/updates', color: 'secondary' },
  ];

  return (
    <Layout title={t('admin_panel') || 'Administración del Sistema'}>
      <Container fluid className="px-0">
        <div className="mb-4">
          <h2 className="fw-bold mb-1">{t('admin_system_title') || 'Panel de Control Central'}</h2>
          <p className="text-muted">{t('admin_system_desc') || 'Gestión avanzada de la plataforma Ticketera SOC.'}</p>
        </div>

        <Row className="g-4">
          {adminModules.map((m, idx) => (
            <Col key={idx} md={6} lg={4} xl={3}>
              <Link href={m.link} style={{ textDecoration: 'none' }}>
                <Card className="h-100 shadow-sm border-0 border-top border-4 border-primary hover-lift transition-all">
                  <Card.Body className="p-4">
                    <div className={`bg-${m.color} bg-opacity-10 text-${m.color} p-3 rounded-3 mb-3 d-inline-block shadow-sm`}>
                      {m.icon}
                    </div>
                    <h5 className="fw-bold text-dark mb-2">{m.title}</h5>
                    <p className="text-muted small mb-4" style={{ minHeight: '40px' }}>{m.desc}</p>
                    <div className={`text-${m.color} small fw-bold d-flex align-items-center mt-auto`}>
                      Gestionar módulo <ArrowRight size={14} className="ms-2" />
                    </div>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>

        <Card className="mt-5 border-0 shadow-sm bg-dark text-white">
          <Card.Body className="p-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div className="d-flex align-items-center">
              <ShieldCheck size={24} className="text-success me-3" />
              <div>
                <h6 className="mb-0 fw-bold">Seguridad de la Plataforma v1.2.6</h6>
                <p className="small opacity-75 mb-0">Cumplimiento de auditoría inmutable y cifrado de extremo a extremo activo.</p>
              </div>
            </div>
            <Badge bg="success" className="px-3 py-2">CORE ESTABLE</Badge>
          </Card.Body>
        </Card>
      </Container>

      <style jsx>{`
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
        }
      `}</style>
    </Layout>
  );
}
