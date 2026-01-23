import React, { useState, useEffect } from 'react';
import { Navbar, Container, Nav, Button, NavDropdown } from 'react-bootstrap';
import Link from 'next/link';
import NotificationBell from './NotificationBell';
import { useTranslation } from 'react-i18next';
import { Globe, Settings, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AppNavbar() {
  const { t, i18n } = useTranslation();
  const { logout, isSuperuser } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const changeLanguage = (lng: string) => {
    if (i18n && i18n.changeLanguage) {
      i18n.changeLanguage(lng);
    }
  };

  const currentLang = (i18n.language || 'es').toUpperCase();

  if (!mounted) return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="shadow-sm">
      <Container fluid>
        <Navbar.Brand className="fw-bold text-primary">TICKETERA SOC</Navbar.Brand>
      </Container>
    </Navbar>
  );

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top" className="shadow-sm">
      <Container fluid>
        <Link href="/" passHref legacyBehavior>
          <Navbar.Brand className="fw-bold text-primary">TICKETERA SOC</Navbar.Brand>
        </Link>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Link href="/" passHref legacyBehavior><Nav.Link>{t('dashboard')}</Nav.Link></Link>
            <Link href="/tickets" passHref legacyBehavior><Nav.Link>{t('tickets')}</Nav.Link></Link>
            <Link href="/endpoints" passHref legacyBehavior><Nav.Link>{t('endpoints')}</Nav.Link></Link>
            <Link href="/reports" passHref legacyBehavior><Nav.Link>{t('audit_logs')}</Nav.Link></Link>
            
            {isSuperuser && (
              <NavDropdown title={t('admin_panel') || 'Admin'} id="admin-nav-dropdown" className="fw-bold text-info">
                <Link href="/admin" passHref legacyBehavior><NavDropdown.Item>General Settings</NavDropdown.Item></Link>
                <Link href="/admin/plugins" passHref legacyBehavior>
                  <NavDropdown.Item className="d-flex align-items-center">
                    <Cpu size={14} className="me-2" /> {t('plugins')}
                  </NavDropdown.Item>
                </Link>
                <NavDropdown.Divider />
                <Link href="/admin/sla" passHref legacyBehavior><NavDropdown.Item>SLA Policies</NavDropdown.Item></Link>
              </NavDropdown>
            )}
          </Nav>
          
          <Nav className="ms-auto align-items-center">
            <NavDropdown title={<><Globe size={18} className="me-1"/> {currentLang}</>} id="lang-dropdown" align="end">
              <NavDropdown.Item onClick={() => changeLanguage('es')}>Español</NavDropdown.Item>
              <NavDropdown.Item onClick={() => changeLanguage('en')}>English</NavDropdown.Item>
              <NavDropdown.Item onClick={() => changeLanguage('fr')}>Français</NavDropdown.Item>
              <NavDropdown.Item onClick={() => changeLanguage('it')}>Italiano</NavDropdown.Item>
            </NavDropdown>

            <NotificationBell />
            
            <NavDropdown title={<Settings size={18} />} id="user-dropdown" align="end">
              <Link href="/profile" passHref legacyBehavior><NavDropdown.Item>{t('profile')}</NavDropdown.Item></Link>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={logout} className="text-danger">{t('logout')}</NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}