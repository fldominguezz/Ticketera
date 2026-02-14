import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Spinner, Badge, Alert, Button } from 'react-bootstrap';
import { 
 ShieldAlert, Clock, CheckCircle2, AlertCircle, HardDrive, 
 BarChart3, Activity, Server, Folder, Layers, RefreshCw, User
} from 'lucide-react';
import Layout from '../components/Layout';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'next/router';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import api from '../lib/api';

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
 const [aiInsight, setAiInsight] = useState<string | null>(null);
 const [loadingInsight, setLoadingInsight] = useState(false);
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

 const fetchAiInsight = async (currentStats: any) => {
  if (!currentStats) return;
  setLoadingInsight(true);
  try {
    const res = await api.post('/dashboard/ai-insights', currentStats);
    setAiInsight(res.data.insight);
  } catch (e) {
    console.error('Failed to fetch AI insights', e);
  } finally {
    setLoadingInsight(false);
  }
 };

 useEffect(() => {
  setMounted(true);
  const fetchStats = async () => {
   try {
    const token = localStorage.getItem('access_token');
    const res = await fetch('/api/v1/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setStats(data);
      fetchAiInsight(data);
    }
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

 const AIInsightWidget = () => (
  <Card className="border-0 shadow-lg  mb-4 overflow-hidden position-relative">
    <div className="position-absolute top-0 end-0 p-3 opacity-10">
      <Activity size={120} />
    </div>
    <Card.Body className="p-4 position-relative z-1">
      <div className="d-flex align-items-center gap-3 mb-3">
        <div className="bg-primary p-2 rounded-circle shadow-sm">
          <ShieldAlert size={20} className="" />
        </div>
        <div>
          <h6 className="m-0 fw-black uppercase tracking-widest text-primary">IA Strategic Insights</h6>
          <small className="text-muted x-small fw-bold">Análisis predictivo de la infraestructura</small>
        </div>
      </div>
      {loadingInsight ? (
        <div className="py-2 d-flex align-items-center gap-2">
          <Spinner animation="grow" size="sm" variant="primary" />
          <span className="x-small fw-bold text-muted uppercase">Analizando tendencias en tiempo real...</span>
        </div>
      ) : (
        <div className="bg-black bg-opacity-25 p-3 rounded border border-secondary border-opacity-25">
          <p className="small m-0 font-monospace text-success italic" style={{ whiteSpace: 'pre-wrap' }}>
            {aiInsight || 'Iniciando motores de análisis...'}
          </p>
        </div>
      )}
    </Card.Body>
  </Card>
 );

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
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
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
            className="d-flex justify-content-between align-items-center mb-3 p-3 bg-success bg-opacity-10 rounded interactive-item border border-success "
            onClick={() => navigateTo('/soc/events?status=resolved')}
            role="button"
          >
            <span className={`small fw-bold ${isSoc ? 'text-success' : 'text-success'} text-uppercase`}>Remediadas</span>
            <span className="h4 m-0 fw-bold text-success">{stats.siem.remediated}</span>
          </div>
          <div 
            className="d-flex justify-content-between align-items-center mb-3 p-3 bg-warning bg-opacity-10 rounded interactive-item border border-warning "
            onClick={() => navigateTo('/soc/events?status=in_progress')}
            role="button"
          >
            <span className={`small fw-bold ${isSoc ? 'text-warning' : 'text-warning'} text-uppercase`}>En Proceso</span>
            <span className="h4 m-0 fw-bold text-warning">{stats.siem.in_process}</span>
          </div>
          <div 
            className="d-flex justify-content-between align-items-center p-3 bg-danger bg-opacity-10 rounded interactive-item border border-danger "
            onClick={() => navigateTo('/soc/events?status=pending')}
            role="button"
          >
            <span className={`small fw-bold ${isSoc ? 'text-danger' : 'text-danger'} text-uppercase`}>Abiertas</span>
            <span className="h4 m-0 fw-bold text-danger">{stats.siem.open}</span>
          </div>
        </Card>
      </Col>

      {/* NEW: Top Analistas */}
      <Col lg={4}>
        <Card className="p-4 border-0 shadow-sm h-100">
          <h6 className="fw-bold mb-4 text-uppercase d-flex align-items-center gap-2">
            <User size={16} className="text-info" /> Top Analistas
          </h6>
          <div className="flex-grow-1">
            {stats.top_analysts && stats.top_analysts.length > 0 ? (
              stats.top_analysts.map((analyst: any, idx: number) => (
                <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-surface rounded border border-color ">
                  <div className="d-flex align-items-center gap-2">
                    <div className="avatar-xs" style={{ background: COLORS[idx % COLORS.length], color: '#fff', width: '24px', height: '24px', fontSize: '10px' }}>
                      {analyst.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="small fw-bold">{analyst.name}</span>
                  </div>
                  <Badge bg="info" className="bg-opacity-10 text-info border border-info ">
                    {analyst.count} Tickets
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted small italic">Sin asignaciones activas.</div>
            )}
          </div>
        </Card>
      </Col>

      {/* NEW: Equipos con más incidencias */}
      <Col lg={4}>
        <Card className="p-4 border-0 shadow-sm h-100">
          <h6 className="fw-bold mb-4 text-uppercase d-flex align-items-center gap-2">
            <HardDrive size={16} className="text-warning" /> Equipos Críticos
          </h6>
          <div className="flex-grow-1">
            {stats.assets?.top_affected && stats.assets.top_affected.length > 0 ? (
              stats.assets.top_affected.map((asset: any, idx: number) => (
                <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-surface rounded border border-color ">
                  <span className="small fw-bold font-monospace">{asset.name}</span>
                  <Badge bg="warning" className="bg-opacity-10 text-warning border border-warning ">
                    {asset.count} Incidencias
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted small italic">Sin datos de incidencias por equipo.</div>
            )}
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
      <Col lg={12} className="d-flex justify-content-between align-items-center">
        <h6 className="fw-bold text-uppercase text-muted m-0 small d-flex align-items-center gap-2">
          <Server size={14} /> Inventario de Equipos
        </h6>
        <Badge bg="dark" className="text-success border border-success border-opacity-25 py-2 px-3">
          <RefreshCw size={12} className="me-2" /> {stats.assets.maintenance_cycles} CICLOS DE MANTENIMIENTO TOTALES
        </Badge>
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
              {(stats.assets!.by_location || []).map((loc) => (
                <tr key={`loc-${loc.name}`} className="border-bottom ">
                  <td className="ps-4 fw-bold text-primary">{loc.name}</td>
                  <td className="text-end pe-4">
                    <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary ">
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
   <div className="d-flex justify-content-between align-items-center mb-4">
     <div>
      <Badge bg="primary" className="mb-2">{stats.role || 'Usuario'}</Badge>
      <p className="text-muted small m-0">Bienvenido al panel de control centralizado.</p>
     </div>
     <Button 
      variant="outline-primary" 
      size="sm" 
      onClick={() => fetchAiInsight(stats)} 
      className="fw-black x-small uppercase d-flex align-items-center gap-2"
      disabled={loadingInsight}
     >
       <RefreshCw size={12} className={loadingInsight ? 'animate-spin' : ''} /> Refrescar Análisis
     </Button>
   </div>

   <AIInsightWidget />
   <TicketWidgets />
   <SiemWidgets />
   <AssetWidgets />

   <style jsx>{`
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .animate-spin { animation: spin 1s linear infinite; }
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