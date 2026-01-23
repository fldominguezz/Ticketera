import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppNavbar from '../components/AppNavbar';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { AlertTriangle, CheckCircle, Activity, Users, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    } else {
      fetchData(token);
    }
  }, []);

  const fetchData = async (token: string) => {
    try {
      const res = await fetch('/api/v1/tickets/stats', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (res.ok) {
        setStats(await res.json());
      } else if (res.status === 401) {
        localStorage.removeItem('access_token');
        router.push('/login');
      }
    } catch (e) { 
      console.error("Dashboard fetch error", e); 
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="text-center">
        <Spinner animation="border" variant="primary" className="mb-3" />
        <div className="text-muted small text-uppercase fw-bold">Initializing SOC Command Center...</div>
      </div>
    </div>
  );

  const isSOC = (user?.group_id && user.group_id.includes('SOC')) || user?.is_superuser;
  const isTech = (user?.group_id && user.group_id.includes('Técnica')) || user?.is_superuser;

  const kpis = [
    { label: t('kpi_open'), val: stats?.status?.open || 0, color: 'success', icon: <Activity size={20}/> },
    { label: t('kpi_overdue'), val: stats?.overdue || 0, color: 'danger', icon: <AlertTriangle size={20}/> },
    { label: t('kpi_resolved'), val: stats?.status?.resolved || 0, color: 'primary', icon: <CheckCircle size={20}/> },
    { label: t('kpi_active_endpoints'), val: '---', color: 'info', icon: <Users size={20}/> },
  ];

  if (!mounted) return null;

  return (
    <>
      <Head><title>Dashboard - Ticketera</title></Head>
      <AppNavbar />
      <Container className="mt-4 mb-5">
        <Row className="g-3 mb-4">
          {kpis.map((k, i) => (
            <Col key={i} md={3} xs={6}>
              <Card className="shadow-sm border-0 border-top border-4 h-100" style={{borderColor: `var(--bs-${k.color})`}}>
                <Card.Body className="d-flex align-items-center p-3 p-md-4">
                  <div className={`bg-${k.color} bg-opacity-10 text-${k.color} p-2 p-md-3 rounded-circle me-2 me-md-3 d-none d-sm-flex`}>{k.icon}</div>
                  <div>
                    <div className="h4 h3-md mb-0 fw-bold">{k.val}</div>
                    <div className="text-muted text-uppercase fw-bold" style={{fontSize: '0.65rem'}}>{k.label}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        <Row className="g-4">
          <Col lg={8}>
            {isSOC && (
              <Card className="shadow-sm border-0 mb-4 bg-danger bg-opacity-10 border-start border-4 border-danger">
                <Card.Body className="p-4">
                  <h6 className="fw-bold text-danger mb-1">{t('soc_alert_title')}</h6>
                  <p className="small mb-0 text-dark">{t('soc_alert_msg', { count: stats?.priority?.critical || 0 })}</p>
                </Card.Body>
              </Card>
            )}
            
            {isTech && (
              <Card className="shadow-sm border-0 mb-4 bg-info bg-opacity-10 border-start border-4 border-info">
                <Card.Body className="p-4">
                  <h6 className="fw-bold text-info mb-1">{t('tech_pending_title')}</h6>
                  <p className="small mb-0 text-dark">{t('tech_pending_msg')}</p>
                </Card.Body>
              </Card>
            )}
            
            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-white py-3 border-bottom-0"><h5 className="fw-bold mb-0">{t('quick_actions')}</h5></Card.Header>
              <Card.Body className="p-4 pt-0">
                <Row className="g-3">
                  <Col md={6}>
                    <Link href="/tickets/kanban" passHref style={{ textDecoration: 'none' }}>
                      <div className="p-4 border rounded-3 hover-bg-light transition-all cursor-pointer h-100">
                        <Activity className="text-primary mb-3" size={32} />
                        <h6 className="fw-bold text-dark">{t('go_kanban')}</h6>
                        <p className="text-muted small mb-0">{t('go_kanban_desc')}</p>
                      </div>
                    </Link>
                  </Col>
                  <Col md={6}>
                    <Link href="/tickets" passHref style={{ textDecoration: 'none' }}>
                      <div className="p-4 border rounded-3 hover-bg-light transition-all cursor-pointer h-100">
                        <FileText className="text-success mb-3" size={32} />
                        <h6 className="fw-bold text-dark">{t('view_list')}</h6>
                        <p className="text-muted small mb-0">{t('view_list_desc')}</p>
                      </div>
                    </Link>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Header className="bg-white py-3 border-bottom-0"><h5 className="fw-bold mb-0">{t('recent_activity')}</h5></Card.Header>
              <Card.Body className="p-4 pt-0">
                <div className="text-center py-5 text-muted">
                  <Activity size={48} className="opacity-25 mb-3" />
                  <p className="small">{t('recent_activity_desc')}</p>
                </div>
              </Card.Body>
              <Card.Footer className="bg-white border-0 pb-4 text-center">
                <Link href="/admin/audit" passHref legacyBehavior>
                  <Button variant="link" className="text-decoration-none small fw-bold">
                    {t('view_audit_trail')} <ArrowRight size={14} className="ms-1" />
                  </Button>
                </Link>
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}