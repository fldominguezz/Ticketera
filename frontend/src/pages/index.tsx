import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Spinner, Badge, Alert } from 'react-bootstrap';
import { ShieldAlert, Clock, CheckCircle2, AlertCircle, HardDrive, BarChart3, Activity, Server, Folder, Layers } from 'lucide-react';
import Layout from '../components/Layout';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'next/router';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface DashboardStats {
  role: string;
  tickets: { total: number; open: number; in_progress: number; resolved: number; closed: number; };
  siem: { 
      total: number; 
      remediated: number; 
      in_process: number; 
      open: number; 
      categories: { name: string; count: number }[] ;
      affected_devices?: { name: string; count: number }[];
  } | null;
  assets: { 
      operative: number; 
      pending_tagging: number; 
      installing: number; 
      no_folder: number; 
      by_location: { name: string; count: number }[] 
  } | null;
}

const COLORS = ['#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107', '#198754'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const router = useRouter();
  const isDark = theme === 'dark';
  const isSoc = theme === 'soc';

  // Determinar color de los textos en los gráficos según el tema
  const getTickColor = () => {
    if (isSoc) return '#38bdf8'; // Celeste SOC
    if (isDark) return '#adb5bd'; // Gris claro Dark
    return '#495057'; // Gris oscuro Light
  };

  useEffect(() => {
    setMounted(true);
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch('/api/v1/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setStats(await res.json());
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  const navigateTo = (path: string) => {
    router.push(path);
  };

  if (loading) return <Layout title="Cargando..."><Spinner animation="border" /></Layout>;
  if (!stats) return <Layout title="Panel de Control"><Alert variant="danger">Error cargando datos.</Alert></Layout>;

  // --- WIDGETS ---

  const TicketWidgets = () => (
    <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
            <Card 
                className="p-3 border-0 shadow-sm h-100 border-start border-4 border-primary interactive-card"
                onClick={() => navigateTo('/tickets')}
                role="button"
                tabIndex={0}
            >
                <div className="d-flex justify-content-between mb-2">
                    <span className="small fw-bold text-muted text-uppercase">Total de Tickets</span>
                    <Layers size={18} className="text-primary" />
                </div>
                <h2 className="fw-black m-0">{stats.tickets.total}</h2>
            </Card>
        </Col>
        <Col lg={3} md={6}>
            <Card 
                className="p-3 border-0 shadow-sm h-100 border-start border-4 border-warning interactive-card"
                onClick={() => navigateTo('/tickets?status=in_progress')}
                role="button"
                tabIndex={0}
            >
                <div className="d-flex justify-content-between mb-2">
                    <span className="small fw-bold text-muted text-uppercase">En Gestión</span>
                    <Clock size={18} className="text-warning" />
                </div>
                <h2 className="fw-black m-0">{stats.tickets.in_progress}</h2>
            </Card>
        </Col>
        <Col lg={3} md={6}>
            <Card 
                className="p-3 border-0 shadow-sm h-100 border-start border-4 border-success interactive-card"
                onClick={() => navigateTo('/tickets?status=resolved')}
                role="button"
                tabIndex={0}
            >
                <div className="d-flex justify-content-between mb-2">
                    <span className="small fw-bold text-muted text-uppercase">Resueltos / Cerrados</span>
                    <CheckCircle2 size={18} className="text-success" />
                </div>
                <h2 className="fw-black m-0">{stats.tickets.resolved + stats.tickets.closed}</h2>
            </Card>
        </Col>
        <Col lg={3} md={6}>
            <Card 
                className="p-3 border-0 shadow-sm h-100 border-start border-4 border-danger interactive-card"
                onClick={() => navigateTo('/tickets?status=open')}
                role="button"
                tabIndex={0}
            >
                <div className="d-flex justify-content-between mb-2">
                    <span className="small fw-bold text-muted text-uppercase">Pendientes</span>
                    <AlertCircle size={18} className="text-danger" />
                </div>
                <h2 className="fw-black m-0">{stats.tickets.open}</h2>
            </Card>
        </Col>
    </Row>
  );

  const SiemWidgets = () => {
    if (!stats.siem) return null;
    return (
        <Row className="g-4 mb-4">
            <Col lg={8}>
                <Card className="p-4 border-0 shadow-sm h-100">
                    <h6 className="fw-bold mb-4 text-uppercase d-flex align-items-center gap-2">
                    <BarChart3 size={16} className="text-primary" /> Alertas SIEM (Top 5)
                    </h6>
                    <div style={{ width: '100%', height: 300 }}>
                    {mounted && stats.siem.categories && stats.siem.categories.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={stats.siem.categories || []} layout="vertical" margin={{ left: 20, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={150} 
                                fontSize={10} 
                                tick={{ fill: getTickColor() }} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: isDark || isSoc ? '#161b22' : '#ffffff', 
                                    borderColor: 'rgba(128,128,128,0.2)',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }} 
                                itemStyle={{ color: isDark || isSoc ? '#fff' : '#000' }}
                                labelStyle={{ color: isDark || isSoc ? '#38bdf8' : '#0d6efd', fontWeight: 'bold', marginBottom: '4px' }}
                            />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} name="Cantidad de Alertas">
                            {(stats.siem.categories || []).map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            <LabelList dataKey="count" position="right" fill={getTickColor()} fontSize={10} fontWeight="bold" offset={10} />
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="d-flex align-items-center justify-content-center h-100 text-muted small italic">
                            Sin datos de alertas para graficar.
                        </div>
                    )}
                    </div>
                </Card>
            </Col>
            <Col lg={4}>
                <Card className="p-4 border-0 shadow-sm h-100">
                    <h6 className="fw-bold mb-4 text-uppercase d-flex align-items-center gap-2">
                    <ShieldAlert size={16} className="text-danger" /> Dispositivos Afectados (Firewalls)
                    </h6>
                    <div style={{ width: '100%', height: 300 }}>
                    {mounted && stats.siem.affected_devices && stats.siem.affected_devices.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.siem.affected_devices} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={100} 
                                fontSize={10} 
                                tick={{ fill: getTickColor() }} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: isDark || isSoc ? '#161b22' : '#ffffff', 
                                    borderColor: 'rgba(128,128,128,0.2)',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }} 
                                itemStyle={{ color: isDark || isSoc ? '#fff' : '#000' }}
                                labelStyle={{ color: '#ffc107', fontWeight: 'bold', marginBottom: '4px' }}
                            />
                            <Bar dataKey="count" fill="#ffc107" radius={[0, 4, 4, 0]} barSize={15} name="Detecciones">
                                <LabelList dataKey="count" position="right" fill={getTickColor()} fontSize={10} fontWeight="bold" offset={10} />
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="d-flex align-items-center justify-content-center h-100 text-muted small italic">
                            Sin datos de dispositivos.
                        </div>
                    )}
                    </div>
                </Card>
            </Col>
            <Col lg={4}>
                <Card className="p-4 border-0 shadow-sm h-100 bg-primary bg-opacity-10">
                    <h6 className="fw-bold mb-4 text-uppercase d-flex align-items-center gap-2 opacity-75">
                        <ShieldAlert size={16} /> Resumen de Incidentes
                    </h6>
                    <div 
                        className="d-flex justify-content-between align-items-center mb-3 p-3 bg-surface rounded shadow-sm interactive-item"
                        onClick={() => navigateTo('/soc/events?status=all')}
                        role="button"
                    >
                        <span className={`small fw-bold ${isSoc ? 'text-main' : 'text-muted'} text-uppercase`}>Total de Alertas</span>
                        <span className="h4 m-0 fw-bold text-primary">{stats.siem.total}</span>
                    </div>
                    <div 
                        className="d-flex justify-content-between align-items-center mb-3 p-3 bg-success bg-opacity-10 rounded interactive-item border border-success border-opacity-10"
                        onClick={() => navigateTo('/soc/events?status=resolved')}
                        role="button"
                    >
                        <span className={`small fw-bold ${isSoc ? 'text-success' : 'text-success'} text-uppercase`}>Remediadas</span>
                        <span className="h4 m-0 fw-bold text-success">{stats.siem.remediated}</span>
                    </div>
                    <div 
                        className="d-flex justify-content-between align-items-center mb-3 p-3 bg-warning bg-opacity-10 rounded interactive-item border border-warning border-opacity-10"
                        onClick={() => navigateTo('/soc/events?status=in_progress')}
                        role="button"
                    >
                        <span className={`small fw-bold ${isSoc ? 'text-warning' : 'text-warning'} text-uppercase`}>En Proceso</span>
                        <span className="h4 m-0 fw-bold text-warning">{stats.siem.in_process}</span>
                    </div>
                    <div 
                        className="d-flex justify-content-between align-items-center p-3 bg-danger bg-opacity-10 rounded interactive-item border border-danger border-opacity-10"
                        onClick={() => navigateTo('/soc/events?status=pending')}
                        role="button"
                    >
                        <span className={`small fw-bold ${isSoc ? 'text-danger' : 'text-danger'} text-uppercase`}>Abiertas</span>
                        <span className="h4 m-0 fw-bold text-danger">{stats.siem.open}</span>
                    </div>
                </Card>
            </Col>
        </Row>
    );
  };

  const AssetWidgets = () => {
    if (!stats.assets) return null;
    return (
        <Row className="g-4 mb-4">
            <Col lg={12}>
                <h6 className="fw-bold text-uppercase text-muted mb-3 small d-flex align-items-center gap-2">
                    <Server size={14} /> Inventario de Equipos
                </h6>
            </Col>
            <Col md={3}>
                 <Card 
                    className="p-3 border-0 shadow-sm text-center interactive-card"
                    onClick={() => navigateTo('/inventory?state=operative')}
                    role="button"
                >
                    <div className="text-success mb-2"><Activity size={24} /></div>
                    <h3 className="fw-bold m-0">{stats.assets!.operative}</h3>
                    <small className="text-muted fw-bold x-small text-uppercase">Operativos</small>
                 </Card>
            </Col>
            <Col md={3}>
                 <Card 
                    className="p-3 border-0 shadow-sm text-center interactive-card"
                    onClick={() => navigateTo('/inventory?state=tagging_pending')}
                    role="button"
                >
                    <div className="text-warning mb-2"><AlertCircle size={24} /></div>
                    <h3 className="fw-bold m-0">{stats.assets!.pending_tagging}</h3>
                    <small className="text-muted fw-bold x-small text-uppercase">Pendiente Etiquetado</small>
                 </Card>
            </Col>
            <Col md={3}>
                 <Card 
                    className="p-3 border-0 shadow-sm text-center interactive-card"
                    onClick={() => navigateTo('/inventory?state=maintenance')}
                    role="button"
                >
                    <div className="text-info mb-2"><HardDrive size={24} /></div>
                    <h3 className="fw-bold m-0">{stats.assets!.installing}</h3>
                    <small className="text-muted fw-bold x-small text-uppercase">En Mantenimiento</small>
                 </Card>
            </Col>
            <Col md={3}>
                 <Card 
                    className="p-3 border-0 shadow-sm text-center interactive-card"
                    onClick={() => navigateTo('/inventory?state=no_folder')}
                    role="button"
                >
                    <div className="text-danger mb-2"><Folder size={24} /></div>
                    <h3 className="fw-bold m-0">{stats.assets!.no_folder}</h3>
                    <small className="text-muted fw-bold x-small text-uppercase">Sin Carpeta</small>
                 </Card>
            </Col>

            {/* Locations Breakdown */}
            <Col lg={12}>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <Card.Header className="bg-surface-muted border-0 py-3">
                        <h6 className="m-0 fw-bold small text-uppercase">Top Ubicaciones con más activos</h6>
                    </Card.Header>
                    <Table hover responsive className="mb-0 align-middle">
                        <thead>
                            <tr className="bg-surface">
                                <th className="small text-muted border-0 ps-4 py-3 uppercase tracking-widest">Ubicación</th>
                                <th className="small text-muted border-0 text-end pe-4 py-3 uppercase tracking-widest">Cantidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(stats.assets!.by_location || []).map((loc, idx) => (
                                <tr key={idx} className="border-bottom border-opacity-10">
                                    <td className="ps-4 fw-bold text-primary">{loc.name}</td>
                                    <td className="text-end pe-4">
                                        <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-10">
                                            {loc.count}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                             {(!stats.assets!.by_location || stats.assets!.by_location.length === 0) && (
                                <tr><td colSpan={2} className="text-center py-4 text-muted small italic">Sin datos de ubicaciones disponibles.</td></tr>
                            )}
                        </tbody>
                    </Table>
                </Card>
            </Col>
        </Row>
    );
  };

  const getDashboardTitle = () => {
      switch(stats.role) {
          case 'División Seguridad Informática': return 'Vista Global de Seguridad';
          case 'Área SOC': return 'Centro de Operaciones de Seguridad';
          case 'Área Técnica': return 'Gestión de Activos y Soporte';
          default: return 'Panel de Control';
      }
  };

  return (
    <Layout title={getDashboardTitle()}>
      <div className="mb-4">
          <Badge bg="primary" className="mb-2">{stats.role || 'Usuario'}</Badge>
          <p className="text-muted small">Bienvenido al panel de control centralizado.</p>
      </div>

      <TicketWidgets />
      <SiemWidgets />
      <AssetWidgets />

      <style jsx>{`
        .interactive-card {
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .interactive-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
        }
        .interactive-item {
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .interactive-item:hover {
            filter: brightness(1.15);
            transform: translateX(4px);
        }
        .fw-black { font-weight: 900; }
        .x-small { font-size: 10px; }
      `}</style>
    </Layout>
  );
}