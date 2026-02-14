import { useEffect, useState } from 'react';
import { Container, Table, Card, Badge, Form, Row, Col, Spinner } from 'react-bootstrap';
import { Shield, Search, Clock, User as UserIcon, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';

export default function AuditLogsPage() {
 const { t } = useTranslation();
 const { theme } = useTheme();
 const isDark = theme === 'dark' || theme === 'soc';
 const [logs, setLogs] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');

 useEffect(() => {
  fetchLogs();
 }, []);

 const fetchLogs = async () => {
  try {
   const res = await api.get('/audit');
   setLogs(Array.isArray(res.data) ? res.data : []);
  } catch (e) { console.error(e); }
  finally { setLoading(false); }
 };

 const getEventBadge = (type: string) => {
  const l = type.toLowerCase();
  if (l.includes('create')) return <Badge bg="success" className="px-2 py-1 x-small fw-black uppercase">{type}</Badge>;
  if (l.includes('fail') || l.includes('delete') || l.includes('breach')) return <Badge bg="danger" className="px-2 py-1 x-small fw-black uppercase">{type}</Badge>;
  if (l.includes('update') || l.includes('reassigned')) return <Badge bg="warning" className="px-2 py-1 x-small fw-black uppercase ">{type}</Badge>;
  return <Badge bg="primary" className="px-2 py-1 x-small fw-black uppercase">{type}</Badge>;
 };

 const filteredLogs = logs.filter(l => 
  l.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
  (l.user?.username || '').toLowerCase().includes(searchTerm.toLowerCase())
 );

 return (
  <Layout title="Transparencia y Auditoría">
   <Container fluid className="py-4">
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
     <div>
      <h4 className="fw-black text-main m-0 uppercase tracking-tighter d-flex align-items-center">
       <Shield className="me-2 text-primary" size={24} /> REGISTRO DE TRANSPARENCIA
      </h4>
      <small className="text-muted fw-bold uppercase x-small">Historial inmutable de acciones para la seguridad de todos</small>
     </div>
     <div className="bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill small fw-bold d-flex align-items-center shadow-sm border border-primary border-opacity-25">
      <Activity size={16} className="me-2 animate-pulse" /> Monitoreo de Integridad Activo
     </div>
    </div>

    <Card className="border-0 shadow-sm rounded-xl overflow-hidden mb-4">
     <Card.Body className="p-4">
      <Row className="mb-4">
       <Col md={6}>
        <div className="input-group bg-surface rounded-lg border border-color px-2">
         <span className="input-group-text bg-transparent border-0"><Search size={18} className="text-muted" /></span>
         <Form.Control 
          className="bg-transparent border-0 text-main shadow-none" 
          placeholder="Buscar por evento o usuario..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
         />
        </div>
       </Col>
      </Row>

      <div className="table-responsive">
       <Table className="align-middle custom-audit-table">
        <thead>
         <tr className="x-small text-muted uppercase tracking-widest border-bottom border-color">
          <th className="pb-3">FECHA Y HORA</th>
          <th className="pb-3">EVENTO</th>
          <th className="pb-3">USUARIO</th>
          <th className="pb-3">ORIGEN</th>
          <th className="pb-3">DETALLES TÉCNICOS</th>
         </tr>
        </thead>
        <tbody>
         {loading ? (
          <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
         ) : filteredLogs.length > 0 ? filteredLogs.map((log: any) => (
          <tr key={log.id} className="border-bottom border-color">
           <td className="py-3">
            <div className="d-flex align-items-center text-muted small fw-bold">
             <Clock size={12} className="me-2 text-primary opacity-50" />
             {new Date(log.created_at).toLocaleString()}
            </div>
           </td>
           <td>{getEventBadge(log.event_type)}</td>
           <td>
            <div className="d-flex align-items-center gap-2">
              <div className="avatar-xs">{log.username?.charAt(0).toUpperCase() || 'S'}</div>
              <span className="small fw-black text-main">{log.username || 'SISTEMA'}</span>
            </div>
           </td>
           <td><code className="x-small text-info opacity-75">{log.ip_address || 'INTERNO'}</code></td>
           <td>
            {log.diff ? (
             <div className="diff-viewer p-2 rounded border border-secondary border-opacity-25 shadow-sm">
              <h6 className="x-small fw-black text-warning uppercase mb-2 border-bottom border-secondary border-opacity-25 pb-1">Cambios Detectados</h6>
              {Object.entries(log.diff).map(([key, change]: any) => (
               <div key={key} className="mb-2 last-mb-0">
                <div className="fw-bold text-info x-small uppercase" style={{ fontSize: '8px' }}>{key}</div>
                <div className="d-flex align-items-center gap-2 mt-1">
                 <div className="text-danger bg-danger bg-opacity-10 px-1 rounded flex-grow-1 x-small text-truncate" style={{ fontSize: '9px', textDecoration: 'line-through' }}>
                  {String(change.before || 'NULO')}
                 </div>
                 <span className="text-muted">→</span>
                 <div className="text-success bg-success bg-opacity-10 px-1 rounded flex-grow-1 x-small text-truncate" style={{ fontSize: '9px' }}>
                  {String(change.after || 'NULO')}
                 </div>
                </div>
               </div>
              ))}
             </div>
            ) : (
             <div className="details-box p-2 rounded bg-surface border border-color">
               <pre className="m-0 x-small text-muted" style={{whiteSpace: 'pre-wrap', color: 'inherit'}}>
                {JSON.stringify(log.details, null, 2)}
               </pre>
             </div>
            )}
           </td>
          </tr>
         )) : (
          <tr><td colSpan={5} className="text-center py-5 text-muted fw-bold uppercase x-small tracking-widest">No se encontraron registros de auditoría</td></tr>
         )}
        </tbody>
       </Table>
      </div>
     </Card.Body>
    </Card>
   </Container>

   <style jsx global>{`
    .fw-black { font-weight: 900; }
    .x-small { font-size: 10px; }
    .avatar-xs { width: 20px; height: 20px; background: var(--primary-muted); color: var(--primary); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; }
    .custom-audit-table th { border: 0 !important; }
    .details-box { max-width: 400px; max-height: 80px; overflow-y: auto; }
    .details-box::-webkit-scrollbar { width: 3px; }
    .details-box::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 10px; }
    .animate-pulse { animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
   `}</style>
  </Layout>
 );
}
