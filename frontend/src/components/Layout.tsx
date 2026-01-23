import React, { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  Ticket, 
  Monitor, 
  ClipboardList, 
  Settings, 
  LogOut, 
  User,
  ShieldCheck,
  Activity
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title = 'Ticketera' }) => {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { name: 'Endpoints', icon: Monitor, href: '/endpoints' },
    { name: 'Tickets', icon: Ticket, href: '/tickets' },
    { name: 'Formularios', icon: ClipboardList, href: '/forms' },
    { name: 'Auditoría', icon: ShieldCheck, href: '/audit' },
    { name: 'Administración', icon: Settings, href: '/admin' },
  ];

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Head>
        <title>{title}</title>
      </Head>

      {/* Sidebar */}
      <div className="bg-dark text-white shadow-sm" style={{ width: '250px', position: 'fixed', height: '100vh', zIndex: 1000 }}>
        <div className="p-4 d-flex align-items-center">
          <Activity className="me-2 text-primary" size={28} />
          <h4 className="mb-0 fw-bold">Ticketera</h4>
        </div>
        
        <nav className="mt-2">
          {navItems?.map((item) => (
            <Link key={item.name} href={item.href} style={{ textDecoration: 'none' }}>
              <div className={`px-4 py-3 d-flex align-items-center transition-all ${
                router.pathname === item.href ? 'bg-primary text-white' : 'text-light opacity-75 hover-opacity-100'
              }`}>
                <item.icon className="me-3" size={20} />
                <span>{item.name}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="position-absolute bottom-0 w-100 p-4 border-top border-secondary">
          <div className="d-flex align-items-center mb-3">
            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '32px', height: '32px' }}>
              <User size={18} />
            </div>
            <span className="small text-truncate">Técnico SOC</span>
          </div>
          <button 
            onClick={handleLogout}
            className="btn btn-outline-light btn-sm w-100 d-flex align-items-center justify-content-center"
          >
            <LogOut size={16} className="me-2" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: '250px', width: 'calc(100% - 250px)' }}>
        <header className="bg-white border-bottom py-3 px-4 sticky-top">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">{title}</h5>
            <div className="d-flex align-items-center">
              <span className="badge bg-light text-dark border me-3">SOC</span>
              <div className="bg-light p-2 rounded-circle border">
                <User size={20} />
              </div>
            </div>
          </div>
        </header>

        <main className="p-4">
          {children}
        </main>
      </div>

      <style jsx global>{`
        .transition-all {
          transition: all 0.2s ease-in-out;
        }
        .hover-opacity-100:hover {
          opacity: 1 !important;
          background-color: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
};

export default Layout;
