import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner, Badge, Row, Col, ProgressBar } from 'react-bootstrap';
import { 
 ShieldAlert, BarChart3, ArrowRight, TrendingUp, 
 Save, X, Edit3, Plus, GripVertical, LayoutGrid, Layout as LayoutIcon, Activity,
 Trash2
} from 'lucide-react';
import { useRouter } from 'next/router';
import RGL, { WidthProvider } from 'react-grid-layout';
const ResponsiveGridLayout = WidthProvider(RGL.Responsive);

interface Widget {
 id: string;
 type: string;
 title: string;
 data_source: string;
 x: number;
 y: number;
 w: number;
 h: number;
 refresh_interval: number;
 filters?: any;
}

interface Props {
 initialLayout: any;
 onSave: (layout: any[]) => Promise<void>;
 stats: any;
}

const renderWidgetContent = (w: Widget, stats: any) => {
  const tickets = stats?.tickets || { total: 0, by_status: {} };
  const byStatus = tickets.by_status || {};
  const openCount = (byStatus['open'] || 0) + (byStatus['new'] || 0);
  const inProgressCount = byStatus['in_progress'] || 0;

  let content = null;

  if (w.data_source === 'tickets_count') {
    content = (
      <Row className="align-items-center">
        <Col xs={4} className="text-center">
          <div className="mb-2 mx-auto"><BarChart3 size={32} className="text-primary" /></div>
          <h2 className="fw-black m-0 text-main">{tickets.total || 0}</h2>
          <span className="text-muted x-small fw-bold">TOTAL</span>
        </Col>
        <Col xs={8}>
          <div className="mb-2">
            <div className="d-flex justify-content-between x-small fw-bold mb-1"><span>ABIERTOS</span><span className="text-danger">{openCount}</span></div>
            <ProgressBar variant="danger" now={(openCount / (tickets.total || 1)) * 100} style={{height: '4px'}} className="bg-surface-muted" />
          </div>
          <div className="mb-0">
            <div className="d-flex justify-content-between x-small fw-bold mb-1"><span>EN CURSO</span><span className="text-warning">{inProgressCount}</span></div>
            <ProgressBar variant="warning" now={(inProgressCount / (tickets.total || 1)) * 100} style={{height: '4px'}} className="bg-surface-muted" />
          </div>
        </Col>
      </Row>
    );
  } else if (w.data_source === 'siem_alerts') {
    const siem = stats?.siem || { total: 0, categories: [] };
    content = (
      <Row className="align-items-center">
        <Col xs={4} className="text-center">
          <div className="mb-2 mx-auto"><ShieldAlert size={32} className="text-danger" /></div>
          <h2 className="fw-black m-0 text-main">{siem.total || 0}</h2>
          <span className="text-muted x-small fw-bold">SIEM</span>
        </Col>
        <Col xs={8}>
          {(siem.categories || []).slice(0, 3).map((cat: any, i: number) => (
            <div key={i} className="mb-2">
              <div className="text-truncate x-small fw-bold mb-1 uppercase text-main">{cat.name}</div>
              <ProgressBar variant="primary" now={(cat.count / (siem.total || 1)) * 100} style={{height: '4px'}} className="bg-surface-muted" />
            </div>
          ))}
          {(!siem.categories || siem.categories.length === 0) && <div className="text-muted x-small italic text-center py-3">Sin alertas</div>}
        </Col>
      </Row>
    );
  } else {
    content = <div className="text-center p-4"><LayoutGrid size={40} className="text-muted opacity-25 mb-2" /><div className="x-small fw-bold text-muted uppercase">Configuración Pendiente</div></div>;
  }

  return content;
};

const DynamicDashboard: React.FC<Props> = ({ initialLayout, onSave, stats }) => {
 const { user } = useAuth();
 const [isEditMode, setIsEditMode] = useState(false);
 const [layout, setLayout] = useState<Widget[]>([]);
 const [mounted, setMounted] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const router = useRouter();

 const canEdit = user?.roles?.some((r: any) => r.role?.permissions?.some((p: any) => p.name === 'dashboard:edit')) || user?.is_superuser;

 useEffect(() => {
  setMounted(true);
  if (!Array.isArray(initialLayout) || initialLayout.length === 0) {
   setLayout([
    { id: 'w1', type: 'kpi', title: 'Tickets Activos', data_source: 'tickets_count', x: 0, y: 0, w: 6, h: 2, refresh_interval: 0 },
    { id: 'w2', type: 'chart_donut', title: 'Seguridad SIEM', data_source: 'siem_alerts', x: 6, y: 0, w: 6, h: 2, refresh_interval: 0 }
   ]);
  } else {
   const sanitized = initialLayout.map((w: any) => ({
    ...w,
    w: w.w || w.size_x || 6,
    h: w.h || w.size_y || 2,
    x: w.x || w.pos_x || 0,
    y: w.y || w.pos_y || 0
   }));
   setLayout(sanitized);
  }
 }, [initialLayout]);


 const handleReset = async () => {
  if (confirm('¿Deseas restaurar el diseño de fábrica del dashboard?')) {
   try {
    const res = await api.post('/dashboard/reset');
    setLayout(res.data.layout);
    window.location.reload();
   } catch (err) {
    console.error('Error resetting dashboard', err);
    alert('Error al resetear dashboard');
   }
  }
 };

 if (!mounted) return null;
 
 if (!stats) return (
  <div className="text-center py-5">
   <Spinner animation="border" variant="primary" />
   <p className="mt-3 text-muted fw-bold small uppercase letter-spacing-2">Sincronizando con la central...</p>
  </div>
 );

 return (
  <div className={`dashboard-neural ${isEditMode ? 'edit-active' : ''}`} style={{ minHeight: '600px' }}>
   <div className="d-flex justify-content-between align-items-center mb-4 p-3 bg-surface rounded-4 border border-color shadow-sm sticky-top" style={{ top: '10px', zIndex: 1000 }}>
    <div>
     <h5 className="fw-black m-0 tracking-tighter uppercase d-flex align-items-center text-main">
      {isEditMode ? <LayoutIcon className="me-2 text-primary" size={20} /> : <TrendingUp className="me-2 text-primary" size={20} />}
      {isEditMode ? 'DISEÑO DE CAPAS' : 'INTELLIGENCE HUB'}
      {!isEditMode && <Badge bg="primary" className="ms-2 x-small">LIVE</Badge>}
     </h5>
     <small className="text-muted small uppercase fw-bold opacity-75">{user?.group_name || 'System'} — Operaciones en tiempo real</small>
    </div>
    <div className="d-flex gap-2">
      <Button variant="outline-secondary" size="sm" className="fw-bold px-2" onClick={handleReset} title="Resetear diseño">
       <Trash2 size={14} />
      </Button>
      {canEdit && (
       !isEditMode ? (
        <Button variant="outline-primary" size="sm" className="fw-bold px-3" onClick={() => setIsEditMode(true)}><Edit3 size={14} className="me-2"/> EDITAR PANEL</Button>
       ) : (
        <>
         <Button variant="outline-success" size="sm" className="fw-bold px-3" onClick={async () => { setIsSaving(true); await onSave(layout); setIsEditMode(false); setIsSaving(false); }} disabled={isSaving}>{isSaving ? <Spinner size="sm" /> : <Save size={14} className="me-2"/>} GUARDAR</Button>
         <Button variant="outline-danger" size="sm" className="fw-bold" onClick={() => setIsEditMode(false)}><X size={14} /></Button>
        </>
       )
      )}
    </div>
   </div>

   <ResponsiveGridLayout
    className="layout"
    layouts={{ 
     lg: layout.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h })),
     md: layout.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h })),
     sm: layout.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h })),
     xs: layout.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h }))
    }}
    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
    rowHeight={120}
    draggableHandle=".widget-drag-handle"
    isDraggable={isEditMode}
    isResizable={isEditMode}
    margin={[20, 20]}
   >
    {layout.map(w => (
     <div key={w.id} className="widget-container">
      <Card className="h-100 shadow-sm widget-card">
       <div className={`p-2 px-3 d-flex justify-content-between align-items-center ${isEditMode ? 'bg-primary ' : 'bg-primary bg-opacity-10'}`}>
        <div className="d-flex align-items-center gap-2">
          {isEditMode && <GripVertical size={14} className="widget-drag-handle cursor-move" />}
          <span className={`x-small fw-black uppercase tracking-widest ${isEditMode ? '' : 'text-primary'}`}>{w.title}</span>
        </div>
        {!isEditMode && <ArrowRight size={12} className="text-primary opacity-50" />}
       </div>
       <Card.Body className="p-4 d-flex flex-column justify-content-center">
        {renderWidgetContent(w, stats)}
       </Card.Body>
       <div className="p-2 bg-surface-muted d-flex justify-content-between align-items-center border-top border-color px-3">
         <div className="d-flex align-items-center"><Activity size={10} className="text-success me-2 animate-pulse" /><span className="x-small text-muted fw-bold uppercase">Source: {w.data_source}</span></div>
         <Badge bg="transparent" className="border border-color text-muted x-small">{w.type}</Badge>
       </div>
      </Card>
     </div>
    ))}
   </ResponsiveGridLayout>

   <style jsx global>{`
    .widget-card { border-radius: 16px; border: 1px solid var(--border-color) !important; transition: all 0.3s ease; }
    .animate-pulse { animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
   `}</style>
  </div>
 );
};

export default DynamicDashboard;
