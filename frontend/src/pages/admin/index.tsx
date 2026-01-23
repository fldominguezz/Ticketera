import { useEffect, useState } from 'react';
import Head from 'next/head';
import AppNavbar from '../../components/AppNavbar';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Users, FolderTree, FileText, Settings, ArrowRight, Zap, RefreshCw, Clock, GitBranch, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { isSuperuser, loading } = useAuth();

  if (loading || !isSuperuser) return null;

  const adminModules = [
    { title: t('mod_users_title'), desc: t('mod_users_desc'), icon: <Users size={32} />, link: '/admin/users', color: 'primary' },
    { title: t('mod_org_title'), desc: t('mod_org_desc'), icon: <FolderTree size={32} />, link: '/admin/groups', color: 'success' },
    { title: t('mod_forms_title'), desc: t('mod_forms_desc'), icon: <FileText size={32} />, link: '/admin/forms', color: 'info' },
    { title: t('mod_sla_title'), desc: t('mod_sla_desc'), icon: <Clock size={32} />, link: '/admin/sla', color: 'primary' },
    { title: t('mod_workflow_title'), desc: t('mod_workflow_desc'), icon: <GitBranch size={32} />, link: '/admin/workflow', color: 'success' },
    { title: t('mod_siem_title'), desc: t('mod_siem_desc'), icon: <Zap size={32} />, link: '/admin/integrations/events', color: 'warning' },
    { title: t('mod_security_title'), desc: t('mod_security_desc'), icon: <ShieldCheck size={32} />, link: '/admin/security', color: 'danger' },
    { title: t('mod_updates_title'), desc: t('mod_updates_desc'), icon: <RefreshCw size={32} />, link: '/admin/updates', color: 'dark' },
  ];

  return (
    <>
      <Head><title>{t('admin_panel')} - Ticketera</title></Head>
      <AppNavbar />
      <Container className="mt-4">
        <div className="mb-5">
          <h1 className="fw-bold mb-0">{t('admin_system_title')}</h1>
          <p className="text-muted">{t('admin_system_desc')}</p>
        </div>

        <Row className="g-4">
          {adminModules?.map((m, idx) => (
            <Col key={idx} md={6} lg={3}>
              <Link href={m.link} passHref style={{ textDecoration: 'none' }}>
                <Card className="h-100 shadow-sm border-0 hover-lift cursor-pointer transition-all">
                  <Card.Body className="p-4">
                    <div className={`bg-${m.color} bg-opacity-10 text-${m.color} p-3 rounded-3 mb-3 d-inline-block`}>
                      {m.icon}
                    </div>
                    <h5 className="fw-bold text-dark">{m.title}</h5>
                    <p className="text-muted small mb-3">{m.desc}</p>
                    <div className={`text-${m.color} small fw-bold d-flex align-items-center`}>
                      {t('enter_module')} <ArrowRight size={14} className="ms-1" />
                    </div>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>

        <Card className="mt-5 border-0 shadow-sm bg-light">
          <Card.Body className="p-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div className="d-flex align-items-center">
              <Settings size={24} className="text-muted me-3" />
              <div>
                <h6 className="mb-0 fw-bold">{t('advanced_settings')}</h6>
                <p className="small text-muted mb-0">{t('advanced_settings_desc')}</p>
              </div>
            </div>
            <Button variant="outline-secondary" size="sm" disabled>Coming Soon</Button>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}