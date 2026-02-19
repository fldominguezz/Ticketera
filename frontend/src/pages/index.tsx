import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Spinner, Badge, Alert, Button } from 'react-bootstrap';
import { 
 ShieldAlert, Clock, CheckCircle2, AlertCircle, HardDrive, 
 BarChart3, Activity, Server, Folder, Layers, RefreshCw, User, Trash2
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
   decommissioned: number; 
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
        <div className="bg-surface-muted p-3 rounded border border-subtle">
          <p className="small m-0 font-monospace text-main italic" style={{ whiteSpace: 'pre-wrap' }}>
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
  if (!stats?.siem) return null;
  
  const categoriesData = (stats.siem.categories || []);
  const devicesData = (stats.siem.affected_devices || []);

  return (
    <Row className="g-4 mb-4">
      <Col lg={8}>
        <Card className="p-4 border-0 shadow-sm h-100 bg-card">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h6 className="fw-black text-uppercase m-0 small tracking-widest text-primary d-flex align-items-center gap-2">
              <BarChart3 size={18} /> Top Alertas SIEM
            </h6>
            <Badge bg="primary" className="bg-opacity-10 text-primary px-3 py-1 fw-black x-small">{categoriesData.length} REGLAS ACTIVAS</Badge>
          </div>
          
          <div className="flex-grow-1">
            {categoriesData.length > 0 ? (
              <div className="table-responsive">
                <Table borderless size="sm" className="m-0">
                  <tbody>
                    {categoriesData.map((c: any, i: number) => (
                      <tr key={i} className="border-bottom border-subtle interactive-item" onClick={() => navigateTo(`/soc/events?search=${encodeURIComponent(c.name)}&status=all`)}>
                        <td className="py-3 px-0">
                          <div className="fw-black text-main small uppercase tracking-tighter">{c.name}</div>
                          <div className="progress mt-2" style={{ height: '6px', backgroundColor: 'var(--bg-muted)' }}>
                            <div 
                              className="progress-bar rounded-pill" 
                              role="progressbar" 
                              style={{ width: `${(c.count / stats.siem.total) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                            ></div>
                          </div>
                        </td>
                        <td className="text-end py-3 px-0 align-middle">
                          <span className="h5 fw-black m-0 text-primary">{c.count}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="py-5 text-center text-muted small italic opacity-50 uppercase fw-bold">Sin alertas para categorizar</div>
            )}
          </div>
        </Card>
      </Col>

      <Col lg={4}>
        <Card className="p-4 border-0 shadow-sm h-100 bg-card">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h6 className="fw-black text-uppercase m-0 small tracking-widest text-danger d-flex align-items-center gap-2">
              <ShieldAlert size={18} /> Fuego en Red
            </h6>
          </div>
          <div className="flex-grow-1">
            {devicesData.length > 0 ? (
              devicesData.map((d: any, i: number) => (
                <div key={i} className="mb-3 p-3 bg-muted bg-opacity-50 rounded-3 border-start border-4 border-danger d-flex justify-content-between align-items-center interactive-item" onClick={() => navigateTo(`/soc/events?search=${encodeURIComponent(d.name)}&status=all`)}>
                  <div>
                    <div className="fw-black text-main small font-monospace">{d.name}</div>
                    <div className="x-tiny text-muted uppercase fw-bold tracking-wider">Dispositivo FortiGate</div>
                  </div>
                  <div className="text-end">
                    <div className="h4 fw-black m-0 text-danger">{d.count}</div>
                    <div className="x-tiny text-muted uppercase">Detecciones</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-5 text-center text-muted small italic opacity-50 uppercase fw-bold border rounded border-dashed">
                Perímetro Limpio
              </div>
            )}
          </div>
        </Card>
      </Col>
      <Col lg={4}>
        <Card className="p-4 border-0 shadow-sm h-100 bg-muted bg-opacity-50">
          <h6 className="fw-black text-uppercase mb-4 small tracking-widest text-main opacity-75 d-flex align-items-center gap-2">
            <ShieldAlert size={18} /> Resumen de Incidentes
          </h6>
          <div 
            className="d-flex justify-content-between align-items-center mb-3 p-3 bg-card rounded shadow-sm border-start border-4 border-primary interactive-item"
            onClick={() => navigateTo('/soc/events?status=all')}
            role="button"
          >
            <span className="small fw-bold text-muted text-uppercase tracking-wider">Total Recibidas</span>
            <span className="h4 m-0 fw-black text-primary">{stats.siem.total}</span>
          </div>
          <div 
            className="d-flex justify-content-between align-items-center mb-3 p-3 bg-card rounded shadow-sm border-start border-4 border-success interactive-item"
            onClick={() => navigateTo('/soc/events?status=resolved')}
            role="button"
          >
            <span className="small fw-bold text-muted text-uppercase tracking-wider">Remediadas</span>
            <span className="h4 m-0 fw-black text-success">{stats.siem.remediated}</span>
          </div>
          <div 
            className="d-flex justify-content-between align-items-center mb-3 p-3 bg-card rounded shadow-sm border-start border-4 border-warning interactive-item"
            onClick={() => navigateTo('/soc/events?status=in_progress')}
            role="button"
          >
            <span className="small fw-bold text-muted text-uppercase tracking-wider">En Proceso</span>
            <span className="h4 m-0 fw-black text-warning">{stats.siem.in_process}</span>
          </div>
          <div 
            className="d-flex justify-content-between align-items-center p-3 bg-card rounded shadow-sm border-start border-4 border-danger interactive-item"
            onClick={() => navigateTo('/soc/events?status=pending')}
            role="button"
          >
            <span className="small fw-bold text-muted text-uppercase tracking-wider">Abiertas / Críticas</span>
            <span className="h4 m-0 fw-black text-danger">{stats.siem.open}</span>
          </div>
        </Card>
      </Col>

      {/* NEW: Top Analistas */}
      <Col lg={4}>
        <Card className="p-4 border-0 shadow-sm h-100 bg-card">
          <h6 className="fw-black text-uppercase mb-4 small tracking-widest text-info d-flex align-items-center gap-2">
            <User size={18} /> Top Analistas Activos
          </h6>
          <div className="flex-grow-1">
            {stats.top_analysts && stats.top_analysts.length > 0 ? (
              stats.top_analysts.map((analyst: any, idx: number) => (
                <div key={idx} className="mb-3 p-3 bg-muted bg-opacity-50 rounded border border-color interactive-item" onClick={() => navigateTo(`/tickets?assignee=${encodeURIComponent(analyst.name)}`)}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <div className="avatar-xs" style={{ background: COLORS[idx % COLORS.length], color: '#fff', width: '28px', height: '28px', fontSize: '12px', fontWeight: '900', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="w-100 text-center">{analyst.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="small fw-black text-main">{analyst.name}</span>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <Badge bg="transparent" className="text-info border border-info px-2 py-1 x-small fw-black flex-fill">
                      {analyst.active} ASIGNADAS
                    </Badge>
                    <Badge bg="transparent" className="text-success border border-success px-2 py-1 x-small fw-black flex-fill">
                      {analyst.resolved} RESUELTAS
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-5 text-muted small italic opacity-50 uppercase fw-bold tracking-wider">
                Sin alertas asignadas
              </div>
            )}
          </div>
        </Card>
      </Col>

      {/* NEW: Equipos con más incidencias */}
      <Col lg={4}>
        <Card className="p-4 border-0 shadow-sm h-100 bg-card">
          <h6 className="fw-black text-uppercase mb-4 small tracking-widest text-warning d-flex align-items-center gap-2">
            <HardDrive size={18} /> Dispositivos Críticos
          </h6>
          <div className="flex-grow-1">
            {stats.assets?.top_affected && stats.assets.top_affected.length > 0 ? (
              stats.assets.top_affected.map((asset: any, idx: number) => (
                <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-muted bg-opacity-50 rounded border border-color interactive-item" onClick={() => navigateTo(`/soc/events?search=${encodeURIComponent(asset.name)}&status=all`)}>
                  <span className="small fw-black font-monospace text-main uppercase">{asset.name}</span>
                  <Badge bg="transparent" className="text-warning border border-warning px-2 py-1 x-small fw-black">
                    {asset.count} EVENTOS
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-5 text-muted small italic opacity-50 uppercase fw-bold tracking-wider">
                Sin incidentes por equipo
              </div>
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
          onClick={() => navigateTo('/inventory?show_decommissioned=true')}
          role="button"
        >
          <div className="text-danger mb-2"><Trash2 size={24} /></div>
          <h3 className="fw-bold m-0">{stats.assets!.decommissioned}</h3>
          <small className="text-muted fw-bold x-small text-uppercase">En Baja</small>
         </Card>
      </Col>

      {/* Locations Breakdown */}
      <Col lg={12}>
        <Card className="shadow-sm overflow-hidden">
          <Card.Header className="py-3 bg-muted border-0">
            <h6 className="m-0 fw-black small text-uppercase tracking-wider text-muted-foreground">Top Ubicaciones con más activos</h6>
          </Card.Header>
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th className="ps-4">Ubicación</th>
                  <th className="text-end pe-4">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {(stats.assets!.by_location || []).map((loc) => (
                  <tr key={`loc-${loc.name}`}>
                    <td className="ps-4 fw-bold text-foreground">{loc.name}</td>
                    <td className="text-end pe-4">
                      <Badge bg="transparent" className="text-primary border border-primary fw-black x-small">
                        {loc.count}
                      </Badge>
                    </td>
                  </tr>
                ))}
                 {(!stats.assets!.by_location || stats.assets!.by_location.length === 0) && (
                  <tr><td colSpan={2} className="text-center py-4 text-muted-foreground small italic">Sin datos de ubicaciones disponibles.</td></tr>
                )}
              </tbody>
            </Table>
          </div>
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
   <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
     <div>
      <h4 className="fw-black text-uppercase m-0 d-flex align-items-center gap-2 text-main">
        <Activity className="text-primary" size={24}/> {getDashboardTitle()}
      </h4>
      <p className="text-muted-foreground small m-0 text-uppercase tracking-widest fw-bold opacity-75">
        Gestión Centralizada • {stats.role || 'Operador'}
      </p>
     </div>
     <Button 
      variant="outline-primary" 
      size="sm" 
      onClick={() => fetchAiInsight(stats)} 
      className="fw-black x-small uppercase d-flex align-items-center gap-2 rounded-pill px-3 py-2 border-0 bg-muted text-primary"
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