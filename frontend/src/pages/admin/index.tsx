import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { Container, Row, Col, Card, Button, Badge, Spinner } from 'react-bootstrap';
import { 
  Users, FolderTree, FileText, Settings, ArrowRight, RefreshCw, 
  Clock, GitBranch, ShieldCheck, Tag, Lock, Server
} from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { isSuperuser, loading } = useAuth();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!isSuperuser) {
    return (
      <Layout title="Acceso Denegado">
        <Container className="text-center py-5">
          <ShieldCheck size={64} className="text-danger mb-4" />
          <h2 className="fw-bold">Acceso Restringido</h2>
          <p className="text-muted">No tiene permisos suficientes para acceder al panel de administración.</p>
          <Button variant="primary" onClick={() => window.location.href = '/'}>Volver al Dashboard</Button>
        </Container>
      </Layout>
    );
  }

  const adminModules = [
    { 
      title: 'Cuentas de Usuario', 
      desc: 'Gestione usuarios, contraseñas y accesos', 
      icon: <Users size={24} />, 
      link: '/admin/users', 
      color: 'primary' 
    },
    { 
      title: 'Roles y Permisos', 
      desc: 'Defina perfiles y matriz RBAC granulares', 
      icon: <Lock size={24} />, 
      link: '/admin/roles', 
      color: 'success' 
    },
    { 
      title: 'Estructura Org.', 
      desc: 'Defina grupos, jerarquías y departamentos', 
      icon: <FolderTree size={24} />, 
      link: '/admin/groups', 
      color: 'info' 
    },
    { 
      title: 'Tipos de Ticket', 
      desc: 'Gestione categorías, iconos y colores de flujo', 
      icon: <Tag size={24} />, 
      link: '/admin/ticket-types', 
      color: 'warning' 
    },
    { 
      title: 'Formularios Dinámicos', 
      desc: 'Diseñe fichas de recolección de datos', 
      icon: <FileText size={24} />, 
      link: '/admin/forms', 
      color: 'primary' 
    },
    { 
      title: 'Políticas SLA', 
      desc: 'Defina metas de respuesta y resolución', 
      icon: <Clock size={24} />, 
      link: '/admin/sla', 
      color: 'danger' 
    },
    { 
      title: 'Flujos de Trabajo', 
      desc: 'Defina estados y transiciones automáticas', 
      icon: <GitBranch size={24} />, 
      link: '/admin/workflow', 
      color: 'secondary' 
    },
    { 
      title: 'Política de Seguridad', 
      desc: 'Refuerzo de contraseñas, 2FA y sesiones', 
      icon: <ShieldCheck size={24} />, 
      link: '/admin/security', 
      color: 'success' 
    },
    { 
      title: 'Actualizaciones', 
      desc: 'Versión del núcleo, parches y logs del sistema', 
      icon: <RefreshCw size={24} />, 
      link: '/admin/updates', 
      color: 'info' 
    },
  ];

  return (
    <Layout title="Panel de Administración">
      <Container fluid className="px-0">
        <div className="mb-5">
          <h2 className="fw-black text-uppercase m-0">Administración del Sistema</h2>
          <p className="text-muted fw-medium">Configure los ajustes principales del sistema y gestione las políticas de seguridad.</p>
        </div>

        <Row className="g-4">
          {adminModules.map((m, idx) => (
            <Col key={idx} md={6} lg={4}>
              <Link href={m.link} style={{ textDecoration: 'none' }}>
                <Card className="h-100 shadow-sm border-0 border-top border-4 border-primary hover-lift transition-all">
                  <Card.Body className="p-4 d-flex flex-column">
                    <div className={`bg-${m.color} bg-opacity-10 text-${m.color} p-3 rounded mb-3 d-inline-flex align-items-center justify-content-center shadow-sm`} style={{ width: 'fit-content' }}>
                      {m.icon}
                    </div>
                    <h5 className="fw-bold mb-2">{m.title}</h5>
                    <p className="text-muted small mb-4 flex-grow-1">{m.desc}</p>
                    <div className={`text-${m.color} x-small fw-bold d-flex align-items-center mt-auto text-uppercase letter-spacing-1`}>
                      Gestionar módulo <ArrowRight size={14} className="ms-2" />
                    </div>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>

        <Card className="mt-5 border-0 shadow-sm bg-primary bg-opacity-10">
          <Card.Body className="p-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div className="d-flex align-items-center text-primary">
              <Server size={32} className="me-3 opacity-75" />
              <div>
                <h6 className="mb-0 fw-black text-uppercase">Seguridad de la Plataforma v1.3.5_STABLE</h6>
                <p className="small mb-0 opacity-75 fw-medium">Cumplimiento de auditoría inmutable y cifrado de extremo a extremo activo.</p>
              </div>
            </div>
            <div className="d-flex gap-2">
                <Badge bg="success" className="px-3 py-2 fw-bold shadow-sm">CORE EN LÍNEA</Badge>
                <Badge bg="primary" className="px-3 py-2 fw-bold shadow-sm">SSL ACTIVO</Badge>
            </div>
          </Card.Body>
        </Card>
      </Container>

      <style jsx>{`
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 1rem 3rem rgba(0,0,0,0.1) !important;
        }
        .fw-black { font-weight: 900; }
        .letter-spacing-1 { letter-spacing: 1px; }
        .x-small { font-size: 11px; }
      `}</style>
    </Layout>
  );
}