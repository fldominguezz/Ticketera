import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Container, Button, Dropdown } from 'react-bootstrap';
import { 
 LayoutDashboard, Ticket, ShieldAlert, Database, 
 BarChart3, Settings, LogOut, User, Menu, X, Sun, Moon, FileSearch, FileText,
 Shield, Activity, BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserAvatar } from './UserAvatar';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';
import Footer from './layout/Footer';

interface LayoutProps {
 children: React.ReactNode;
 title?: string;
}

export default function Layout({ children, title = 'TICKETERA SOC' }: LayoutProps) {
 const [sidebarOpen, setSidebarOpen] = useState(false);
 const router = useRouter();
 const { user, logout, isSuperuser, loading } = useAuth();
 const { theme, toggleTheme } = useTheme();
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
  setMounted(true);

  // Verificación de Seguridad Obligatoria (Onboarding)
  if (user && !loading) {
    const needsPasswordChange = !!user.force_password_change;
    const needs2FAEnrollment = !!((user.enroll_2fa_mandatory || user.reset_2fa_next_login) && !user.is_2fa_enabled);
    
    if ((needsPasswordChange || needs2FAEnrollment) && router.pathname !== '/security/onboarding') {
      router.replace('/security/onboarding');
    }
  }
 }, [user, loading, router.pathname]);

 if (!mounted) return null;
 
 // Safe extraction of roles and permissions
 const roles = user?.roles || [];
 const hiddenNavItems = roles.reduce((acc: string[], r: any) => {
  const roleItems = r.role?.hidden_nav_items || r.hidden_nav_items || [];
  return [...acc, ...roleItems];
 }, []) || [];

 // Map of nav IDs to required permissions (CAPABILITIES)
 // Supports single string or array of strings (OR logic)
 const permissionMap: Record<string, string | string[]> = {
  'tickets': ['ticket:read:own', 'ticket:read:group', 'ticket:read:global'],
  'siem-alerts': ['siem:view', 'siem:manage'],
  'inventory': ['assets:read:group', 'assets:read:global', 'assets:read:all'],
  'daily-report': ['partes:read:group', 'partes:read:global'],
  'forensics': ['forensics:eml:scan', 'forensics:eml'],
  'audit': 'audit:read',
  'settings': 'admin:access',
  'monitoring': 'admin:access'
 };

 const userPermissions = new Set(
  roles.flatMap((r: any) => {
    const perms = r.role?.permissions || r.permissions || [];
    return perms.map((p: any) => p.key || p.name);
  }) || []
 );

 const navItems = [
  { id: 'dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { id: 'tickets', name: 'Tickets', path: '/tickets', icon: Ticket },
  { id: 'siem-alerts', name: 'Eventos SIEM', path: '/soc/events', icon: ShieldAlert },
  { id: 'inventory', name: 'Inventario de Activos', path: '/inventory', icon: Database },
  { id: 'forensics', name: 'Análisis de EML', path: '/forensics/eml', icon: FileSearch },
  { id: 'daily-report', name: 'Parte Informativo', path: '/reports/daily', icon: FileText },
  { id: 'wiki', name: 'Documentación Wiki', path: 'external:wiki', icon: BookOpen },
  { id: 'audit', name: 'Auditoría Global', path: '/audit', icon: Shield },
 ];

 const adminItems = [
  { id: 'settings', name: 'Configuración', path: '/admin', icon: Settings },
  { id: 'monitoring', name: 'Monitoreo Grafana', path: 'external:grafana', icon: Activity },
 ];

 // Helper function to filter navigation items
 const filterNavItems = (items: typeof navItems) => {
  return items.filter(item => {
    // 1. Check manual hide (from roles)
    if (hiddenNavItems.includes(item.id)) return false;
    
    // 2. Check permission requirement
    const requiredPerm = permissionMap[item.id];
    
    if (requiredPerm) {
      // Superuser bypass
      if (user?.is_superuser) return true;

      // Logic: OR (if user has ANY of the required perms)
      if (Array.isArray(requiredPerm)) {
        const hasAny = requiredPerm.some(p => userPermissions.has(p));
        if (!hasAny) return false;
      } else {
        if (!userPermissions.has(requiredPerm)) return false;
      }
    }
    
    return true;
  });
 };

 const visibleNavItems = filterNavItems(navItems);
 const visibleAdminItems = filterNavItems(adminItems);
 const hasAdminAccess = user?.is_superuser || userPermissions.has('admin:access');

 // Determinar si estamos en modo "Bloqueo de Seguridad"
 const isSecurityOnboarding = !!(user && (user.force_password_change || user.reset_2fa_next_login) && !user.is_2fa_enabled);

 const handleNavClick = (path: string) => {
  if (path === 'external:grafana') {
   const host = window.location.hostname;
   window.open(`http://${host}:3002`, '_blank');
  } else if (path === 'external:wiki') {
   // Priorizamos el email real del usuario, si no existe usamos el username
   const email = user?.email || (user?.username ? `${user.username}@example.com` : '');
   const password = typeof window !== 'undefined' ? sessionStorage.getItem('temp_pc') : '';
   
   if (email && password) {
    // Redirigimos al login con las credenciales en el hash (#)
    const wikiUrl = `https://10.1.9.240:3005/login#e=${encodeURIComponent(email)}&p=${encodeURIComponent(password)}`;
    window.open(wikiUrl, '_blank');
   } else {
    window.open('https://10.1.9.240:3005/login', '_blank');
   }
  } else {
   router.push(path);
  }
 };

 const NavItem = ({ item, isActive }: { item: typeof navItems[0], isActive: boolean }) => (
  <div 
   key={item.path} 
   role="button"
   tabIndex={0}
   aria-current={isActive ? 'page' : undefined}
   className={`nav-item-container px-3 py-2 d-flex align-items-center gap-3 transition-all ${isActive ? 'active-nav' : ''}`} 
   onClick={() => handleNavClick(item.path)}
   onKeyDown={(e) => e.key === 'Enter' && handleNavClick(item.path)}
  >
   <div className="nav-icon-wrapper d-flex align-items-center justify-content-center" style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
   </div>
   {sidebarOpen && <span className={`nav-text ${isActive ? 'fw-bold text-primary' : 'text-muted'}`} style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}>{item.name}</span>}
  </div>
 );

 return (
  <div className="app-shell d-flex">
   <Head>
    <title>{title} | Ticketera SOC</title>
   </Head>

   <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
    <div className="sidebar-header d-flex align-items-center px-3 border-bottom " style={{ height: 64 }}>
     <ShieldAlert size={24} className="me-2 text-primary" />
     {sidebarOpen && <span className="fw-bold text-uppercase letter-spacing-1">TICKETERA <small className="text-primary">SOC</small></span>}
    </div>
    
    <div className="py-3 flex-grow-1 overflow-auto custom-scrollbar">
     {!isSecurityOnboarding && (
      <>
       <div className="nav-group mb-4">
        {sidebarOpen && <div className="nav-label px-4 x-small fw-bold text-muted mb-2 text-uppercase opacity-50 letter-spacing-1">Operaciones</div>}
        {visibleNavItems.map((item) => (
         <NavItem key={item.path} item={item} isActive={router.pathname === item.path} />
        ))}
       </div>

       {hasAdminAccess && (
        <div className="nav-group">
         {sidebarOpen && <div className="nav-label px-4 x-small fw-bold text-muted mb-2 text-uppercase opacity-50 letter-spacing-1">Administración</div>}
         {visibleAdminItems.map((item) => (
          <NavItem key={item.path} item={item} isActive={router.pathname.startsWith(item.path)} />
         ))}
        </div>
       )}
      </>
     )}
    </div>

    <div className="mt-auto p-3 border-top ">
     <div className="nav-item-container text-danger d-flex align-items-center gap-3 py-2 px-3 rounded transition-all opacity-75 hover-opacity-100" style={{ cursor: 'pointer' }} onClick={logout}>
      <LogOut size={20} />
      {sidebarOpen && <span className="fw-bold">Cerrar Sesión</span>}
     </div>
    </div>
   </aside>

   <main className={`main-content flex-grow-1 ${sidebarOpen ? 'shifted' : 'collapsed'}`} data-build-version="V4-THEME-FIX">
    <header className="topbar d-flex align-items-center justify-content-between px-4">
     <div className="d-flex align-items-center gap-3">
      <Button variant="link" className="p-0 text-muted-foreground hover-text-foreground" onClick={() => setSidebarOpen(!sidebarOpen)}>
       {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </Button>
      <h6 className="m-0 text-uppercase fw-bold opacity-75 d-none d-lg-block text-foreground">{title}</h6>
      <GlobalSearch />
     </div>
     <div className="d-flex align-items-center gap-3">
      <Button 
       variant="link" 
       className="p-2 hover-bg-muted rounded-circle d-flex align-items-center justify-content-center transition-all shadow-sm border border-border" 
       onClick={(e) => {
        e.preventDefault();
        toggleTheme();
       }}
       style={{ width: '38px', height: '38px', position: 'relative', zIndex: 1100, color: 'var(--text-muted-foreground)' }}
       title={`Tema actual: ${theme}`}
      >
       {theme === 'dark' && <Sun size={18} className="text-primary" />}
       {theme === 'light' && <Moon size={18} className="text-primary" />}
       {theme === 'soc' && <Shield size={18} className="text-primary" />}
       {theme === 'high-contrast' && <Activity size={18} className="text-primary" />}
      </Button>
      {!isSecurityOnboarding && <NotificationBell />}
      <Dropdown align="end">
       <Dropdown.Toggle as="div" className="d-flex align-items-center gap-2 cursor-pointer p-1">
        <UserAvatar user={user} size={32} fontSize="12px" />
       </Dropdown.Toggle>
       <Dropdown.Menu className="shadow-lg border-border bg-card">
        <Dropdown.Item onClick={() => router.push('/profile')} className="text-foreground hover-bg-muted">Mi Perfil</Dropdown.Item>
        <Dropdown.Divider className="border-border" />
        <Dropdown.Item onClick={logout} className="text-danger hover-bg-muted">Salir</Dropdown.Item>
       </Dropdown.Menu>
      </Dropdown>
     </div>
    </header>
    <div className="p-4 flex-grow-1 bg-background">{children}</div>
    <Footer />
   </main>

   <style jsx>{`
    .sidebar {
     position: fixed; left: 0; top: 0; bottom: 0;
     z-index: 1000; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
     display: flex; flex-direction: column;
     background-color: var(--bg-card);
     border-right: 1px solid var(--border-border);
    }
    .sidebar.open { width: 260px; }
    .sidebar.closed { width: 70px; }

    .topbar {
     height: 64px; position: sticky; top: 0; z-index: 900;
     background-color: color-mix(in srgb, var(--bg-card), transparent 10%);
     backdrop-filter: blur(12px);
     border-bottom: 1px solid var(--border-border);
    }

    .main-content {
     transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
     min-height: 100vh;
     background-color: var(--bg-background) !important;
     color: var(--text-foreground) !important;
    }
    .main-content.shifted { margin-left: 260px; }
    .main-content.collapsed { margin-left: 70px; }

    .nav-item-container {
     cursor: pointer;
     user-select: none;
     position: relative;
     transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
     margin: 4px 12px;
     padding: 10px 16px !important;
     border-radius: 12px;
     color: var(--text-muted-foreground);
    }

    .nav-item-container:hover {
     background-color: var(--bg-muted);
     color: var(--primary);
     transform: translateX(4px);
    }

    .active-nav {
     background-color: var(--primary-muted) !important;
     color: var(--primary) !important;
    }

    .active-nav::before {
     content: "";
     position: absolute;
     left: -12px;
     top: 25%;
     height: 50%;
     width: 4px;
     background-color: var(--primary);
     border-radius: 0 4px 4px 0;
     box-shadow: 0 0 10px var(--primary);
    }

    .nav-text {
      color: inherit;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .hover-text-foreground:hover { color: var(--text-foreground) !important; }
    .letter-spacing-1 { letter-spacing: 1px; }
    .x-small { font-size: 10px; }
    
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 10px; }
   `}</style>
  </div>
 );
}