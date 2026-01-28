import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Container, Button, Dropdown } from 'react-bootstrap';
import { 
  LayoutDashboard, Ticket, ShieldAlert, Database, 
  BarChart3, Settings, LogOut, User, Menu, X, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title = 'Enterprise SOC' }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { user, logout, isSuperuser, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!loading && user) {
      const isSecurityOnboarding = router.pathname === '/security/onboarding';
      const needsPasswordChange = user.force_password_change;
      const needs2FAEnrollment = (user.enroll_2fa_mandatory || user.reset_2fa_next_login) && !user.is_2fa_enabled;

      if ((needsPasswordChange || needs2FAEnrollment) && !isSecurityOnboarding) {
        router.push('/security/onboarding');
      }
    }
  }, [user, loading, router.pathname]);

  if (loading) return null; // Or a full screen spinner
  const hiddenNavItems = user?.group?.hidden_nav_items || [];

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { id: 'tickets', name: 'Incident Cases', path: '/tickets', icon: Ticket },
    { id: 'siem-alerts', name: 'SIEM Events', path: '/soc/events', icon: ShieldAlert },
    { id: 'inventory', name: 'Asset Inventory', path: '/inventory', icon: Database },
    { id: 'compliance', name: 'Compliance', path: '/reports', icon: BarChart3 },
  ];

  const adminItems = [
    { id: 'settings', name: 'Configuración', path: '/admin', icon: Settings },
  ];

  // Helper function to filter navigation items
  const filterNavItems = (items: typeof navItems) => {
    return items.filter(item => !hiddenNavItems.includes(item.id));
  };

  const visibleNavItems = filterNavItems(navItems);
  const visibleAdminItems = filterNavItems(adminItems);

  const NavItem = ({ item, isActive }: { item: typeof navItems[0], isActive: boolean }) => (
    <div 
      key={item.path} 
      role="button"
      tabIndex={0}
      aria-current={isActive ? 'page' : undefined}
      className={`nav-item-container px-3 py-2 d-flex align-items-center gap-3 transition-all ${isActive ? 'active-nav' : ''}`} 
      onClick={() => router.push(item.path)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(item.path)}
    >
      <div className={`nav-icon-wrapper d-flex align-items-center justify-content-center ${isActive ? 'text-primary' : 'text-muted'}`}>
        <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
      </div>
      {sidebarOpen && <span className={`nav-text ${isActive ? 'fw-bold text-primary' : 'text-muted'}`}>{item.name}</span>}
    </div>
  );

  return (
    <div className="app-shell d-flex">
      <Head>
        <title>{title} | Ticketera SOC</title>
      </Head>

      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header d-flex align-items-center px-3 border-bottom border-opacity-10" style={{ height: 64 }}>
          <ShieldAlert size={24} color="#0d6efd" className="me-2" />
          {sidebarOpen && <span className="fw-bold text-uppercase letter-spacing-1">Ticketera <small className="text-primary">SOC</small></span>}
        </div>
        
        <div className="py-3 flex-grow-1 overflow-auto custom-scrollbar">
          <div className="nav-group mb-4">
            {sidebarOpen && <div className="nav-label px-4 x-small fw-bold text-muted mb-2 text-uppercase opacity-50 letter-spacing-1">Operaciones</div>}
            {visibleNavItems.map((item) => (
              <NavItem key={item.path} item={item} isActive={router.pathname === item.path} />
            ))}
          </div>

          {isSuperuser && (
            <div className="nav-group">
              {sidebarOpen && <div className="nav-label px-4 x-small fw-bold text-muted mb-2 text-uppercase opacity-50 letter-spacing-1">Administración</div>}
              {visibleAdminItems.map((item) => (
                <NavItem key={item.path} item={item} isActive={router.pathname.startsWith(item.path)} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto p-3 border-top border-opacity-10">
          <div className="nav-item-container text-danger d-flex align-items-center gap-3 py-2 px-3 rounded transition-all opacity-75 hover-opacity-100" style={{ cursor: 'pointer' }} onClick={logout}>
            <LogOut size={20} />
            {sidebarOpen && <span className="fw-bold">Cerrar Sesión</span>}
          </div>
        </div>
      </aside>

      <main className={`main-content flex-grow-1 ${sidebarOpen ? 'shifted' : 'collapsed'}`}>
        <header className="topbar d-flex align-items-center justify-content-between px-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="link" className="p-0 text-muted" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <h6 className="m-0 text-uppercase fw-bold opacity-75">{title}</h6>
          </div>
          <div className="d-flex align-items-center gap-3">
            <Button variant="link" className="text-muted p-1" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <NotificationBell />
            <Dropdown align="end">
              <Dropdown.Toggle as="div" className="d-flex align-items-center gap-2 cursor-pointer">
                <div className="avatar bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{width: 32, height: 32}}>
                  <User size={18} />
                </div>
              </Dropdown.Toggle>
              <Dropdown.Menu className="shadow border-0">
                <Dropdown.Item onClick={() => router.push('/profile')}>Mi Perfil</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={logout} className="text-danger">Salir</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </header>
        <div className="p-4">{children}</div>
      </main>

      <style jsx>{`
        .sidebar {
          position: fixed; left: 0; top: 0; bottom: 0;
          z-index: 1000; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex; flex-direction: column;
          background-color: var(--sidebar-bg);
          border-right: 1px solid var(--border-color);
        }
        .sidebar.open { width: 260px; }
        .sidebar.closed { width: 70px; }

        .topbar {
          height: 64px; position: sticky; top: 0; z-index: 900;
          background-color: var(--topbar-bg);
          border-bottom: 1px solid var(--border-color);
          backdrop-filter: blur(8px);
        }

        .main-content {
          transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 100vh;
          background-color: var(--body-bg);
        }
        .main-content.shifted { margin-left: 260px; }
        .main-content.collapsed { margin-left: 70px; }

        .nav-item-container {
          cursor: pointer;
          user-select: none;
          position: relative;
          transition: all 0.2s ease;
          margin: 0 8px;
          border-radius: 8px;
        }

        .nav-item-container:hover {
          background-color: rgba(13, 110, 253, 0.08);
        }

        .nav-item-container:hover .nav-icon-wrapper,
        .nav-item-container:hover .nav-text {
          color: #0d6efd !important;
        }

        .active-nav {
          background-color: rgba(13, 110, 253, 0.12) !important;
        }

        .active-nav::before {
          content: "";
          position: absolute;
          left: -8px;
          top: 20%;
          height: 60%;
          width: 4px;
          background-color: #0d6efd;
          border-radius: 0 4px 4px 0;
        }

        .nav-item-container:focus-visible {
          outline: 2px solid #0d6efd;
          outline-offset: -2px;
        }

        .letter-spacing-1 { letter-spacing: 1px; }
        .x-small { font-size: 10px; }
        .hover-opacity-100:hover { opacity: 1 !important; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }
      `}</style>
    </div>
  );
}