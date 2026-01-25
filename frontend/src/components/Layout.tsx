import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Container, Nav, Navbar, Button, Badge, Dropdown } from 'react-bootstrap';
import { 
  LayoutDashboard, 
  Ticket, 
  ShieldAlert, 
  Database, 
  BarChart3, 
  Settings, 
  LogOut, 
  User, 
  Bell,
  Menu,
  X,
  Server,
  Sun,
  Moon,
  Key,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title = 'Enterprise SOC' }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { user, logout, isSuperuser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Incident Cases', path: '/tickets', icon: Ticket },
    { name: 'SIEM Events', path: '/soc/events', icon: ShieldAlert },
    { name: 'Asset Inventory', path: '/inventory', icon: Database },
    { name: 'Compliance', path: '/reports', icon: BarChart3 },
  ];

  const adminItems = [
    { name: 'Configuration', path: '/admin', icon: Settings },
  ];

  return (
    <div className={`app-shell theme-${theme}`}>
      <Head>
        <title>{title} | Ticketera Enterprise</title>
      </Head>

      {/* FIXED SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">
              <ShieldAlert size={24} color="#0d6efd" />
            </div>
            {sidebarOpen && <span className="brand-text">TICKETERA <small>SOC</small></span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            {sidebarOpen && <div className="nav-label">OPERATIONS</div>}
            {navItems.map((item) => (
              <div 
                key={item.path}
                className={`nav-item ${router.pathname === item.path ? 'active' : ''}`}
                onClick={() => router.push(item.path)}
              >
                <item.icon size={20} className="nav-icon" />
                {sidebarOpen && <span>{item.name}</span>}
              </div>
            ))}
          </div>

          {isSuperuser && (
            <div className="nav-group">
              {sidebarOpen && <div className="nav-label">ADMINISTRATION</div>}
              {adminItems.map((item) => (
                <div 
                  key={item.path}
                  className={`nav-item ${router.pathname.startsWith(item.path) ? 'active' : ''}`}
                  onClick={() => router.push(item.path)}
                >
                  <item.icon size={20} className="nav-icon" />
                  {sidebarOpen && <span>{item.name}</span>}
                </div>
              ))}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item logout" onClick={logout}>
            <LogOut size={20} className="nav-icon" />
            {sidebarOpen && <span>Terminate Session</span>}
          </div>
        </div>
      </aside>

      <main className={`main-content ${sidebarOpen ? 'shifted' : ''}`}>
        {/* PERSISTENT TOPBAR */}
        <header className="topbar">
          <div className="topbar-left">
            <Button 
              variant="link" 
              className="toggle-sidebar" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <h5 className="page-title text-uppercase m-0 ms-3">{title}</h5>
          </div>

          <div className="topbar-right">
            <div className="system-status me-4 d-none d-md-flex align-items-center">
              <span className="status-dot online"></span>
              <small className="text-muted fw-bold">CORE_v1.3.5_STABLE</small>
            </div>
            
            <div className="icon-actions me-2 d-flex align-items-center">
              <Button variant="link" className="icon-btn me-2" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
              
              <NotificationBell />
            </div>

            <Dropdown align="end">
              <Dropdown.Toggle as="div" className="user-profile clickable">
                <div className="user-info text-end me-3 d-none d-sm-block">
                  <div className="user-name">{user?.first_name || 'Administrator'}</div>
                  <div className="user-role text-primary">{isSuperuser ? 'Security Lead' : 'Analyst'}</div>
                </div>
                <div className="avatar">
                  <User size={20} />
                </div>
              </Dropdown.Toggle>

              <Dropdown.Menu className="mt-2 shadow border-0">
                <Dropdown.Header>Account Settings</Dropdown.Header>
                <Dropdown.Item onClick={() => router.push('/profile')} className="d-flex align-items-center py-2">
                  <User size={16} className="me-2" /> Profile
                </Dropdown.Item>
                <Dropdown.Item onClick={() => router.push('/profile/security')} className="d-flex align-items-center py-2">
                  <Key size={16} className="me-2" /> Change Password
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={logout} className="d-flex align-items-center py-2 text-danger">
                  <LogOut size={16} className="me-2" /> Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </header>

        <div className="content-wrapper">
          <Container fluid className="p-4">
            {children}
          </Container>
        </div>
      </main>

      <style jsx global>{`
        :root {
          --sidebar-width: 260px;
          --sidebar-closed-width: 70px;
          --topbar-height: 64px;
          --primary-color: #0d6efd;
          --transition-speed: 0.25s;
        }

        .theme-dark {
          --bg-dark: #05070a;
          --bg-card: #0c1016;
          --sidebar-bg: #0a0d12;
          --border-color: rgba(255, 255, 255, 0.08);
          --text-primary: #ffffff;
          --text-muted: #8a8f98;
          --dropdown-bg: #161b22;
        }

        .theme-light {
          --bg-dark: #f0f2f5;
          --bg-card: #ffffff;
          --sidebar-bg: #ffffff;
          --border-color: rgba(0, 0, 0, 0.08);
          --text-primary: #1a1f26;
          --text-muted: #64748b;
          --dropdown-bg: #ffffff;
        }

        body {
          background-color: var(--bg-dark) !important;
          color: var(--text-primary) !important;
          margin: 0;
          overflow-x: hidden;
          font-family: 'Inter', system-ui, sans-serif !important;
          transition: background-color var(--transition-speed), color var(--transition-speed);
        }

        .app-shell {
          display: flex;
          min-height: 100vh;
        }

        /* SIDEBAR STYLES */
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          background: var(--sidebar-bg);
          border-right: 1px solid var(--border-color);
          z-index: 1000;
          transition: width var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1), background var(--transition-speed);
          display: flex;
          flex-direction: column;
        }

        .sidebar.open { width: var(--sidebar-width); }
        .sidebar.closed { width: var(--sidebar-closed-width); }

        .sidebar-header {
          height: var(--topbar-height);
          display: flex;
          align-items: center;
          padding: 0 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 900;
          letter-spacing: -0.5px;
        }

        .brand-text { font-size: 1.1rem; color: var(--text-primary); }
        .brand-text small { color: var(--primary-color); }

        .sidebar-nav {
          flex: 1;
          padding: 20px 0;
          overflow-y: auto;
        }

        .nav-group { margin-bottom: 24px; }
        .nav-label {
          padding: 0 20px 10px;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 1px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 12px 20px;
          cursor: pointer;
          color: var(--text-muted);
          transition: all 0.2s;
          font-size: 14px;
          font-weight: 500;
          gap: 15px;
        }

        .nav-item:hover {
          color: var(--text-primary);
          background: rgba(13, 110, 253, 0.05);
        }

        .nav-item.active {
          color: var(--primary-color);
          background: rgba(13, 110, 253, 0.08);
          font-weight: 700;
          border-right: 3px solid var(--primary-color);
        }

        .nav-icon { min-width: 20px; }

        .sidebar-footer {
          border-top: 1px solid var(--border-color);
          padding: 10px 0;
        }

        .nav-item.logout { color: #ff4d4f; }
        .nav-item.logout:hover { background: rgba(255, 77, 79, 0.05); }

        /* MAIN CONTENT STYLES */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          transition: margin-left var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
        }

        .main-content.shifted { margin-left: var(--sidebar-width); }
        .main-content:not(.shifted) { margin-left: var(--sidebar-closed-width); }

        .topbar {
          height: var(--topbar-height);
          background: var(--bg-card);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 900;
          transition: background var(--transition-speed), border var(--transition-speed);
        }

        .topbar-left { display: flex; align-items: center; }
        .toggle-sidebar { color: var(--text-muted) !important; padding: 0; }
        .page-title { font-weight: 800; font-size: 14px; letter-spacing: 0.5px; color: var(--text-primary); }

        .topbar-right { display: flex; align-items: center; }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
        }
        .status-dot.online { 
          background: #52c41a; 
          box-shadow: 0 0 8px rgba(82, 196, 26, 0.5); 
        }

        .icon-btn {
          color: var(--text-muted) !important;
          padding: 8px !important;
          border-radius: 8px !important;
          transition: all 0.2s !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-btn:hover {
          background: rgba(13, 110, 253, 0.1) !important;
          color: var(--primary-color) !important;
        }

        .user-profile { 
          display: flex; 
          align-items: center; 
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        
        .user-profile:hover {
          background: rgba(0,0,0,0.05);
        }

        .theme-dark .user-profile:hover {
          background: rgba(255,255,255,0.05);
        }

        .user-name { font-size: 13px; font-weight: 700; line-height: 1.2; color: var(--text-primary); }
        .user-role { font-size: 11px; font-weight: 600; text-transform: uppercase; }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--bg-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-color);
          color: var(--text-muted);
        }

        .content-wrapper { flex: 1; }

        /* GLOBAL CARDS & UTILITIES */
        .card {
          background-color: var(--bg-card) !important;
          border: 1px solid var(--border-color) !important;
          color: var(--text-primary) !important;
          transition: background-color var(--transition-speed), border var(--transition-speed);
        }

        .dropdown-menu {
          background-color: var(--dropdown-bg) !important;
          border: 1px solid var(--border-color) !important;
        }

        .dropdown-item {
          color: var(--text-primary) !important;
        }

        .dropdown-item:hover {
          background-color: rgba(13, 110, 253, 0.1) !important;
        }

        .text-muted { color: var(--text-muted) !important; }
        
        .clickable { cursor: pointer; }
      `}</style>
    </div>
  );
}