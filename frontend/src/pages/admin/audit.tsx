import { useEffect, useState } from 'react';
import { Container, Table, Card, Badge, Form, Row, Col, Spinner } from 'react-bootstrap';
import { Shield, Search, Clock, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { useTheme } from '../../context/ThemeContext';

export default function AuditLogsPage() {
 const { t } = useTranslation();
 const { theme } = useTheme();
 const isDark = theme === 'dark';
 const [logs, setLogs] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');

 useEffect(() => {
  fetchLogs();
 }, []);

 const fetchLogs = async () => {
  try {
   const token = localStorage.getItem('access_token');
   const res = await fetch('/api/v1/audit', {
    headers: { 'Authorization': `Bearer ${token}` }
   });
   if (res.ok) {
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
   }
  } catch (e) { console.error(e); }
  finally { setLoading(false); }
 };

 const getEventBadge = (type: string) => {
  const l = type.toLowerCase();
  if (l.includes('create')) return <Badge bg="success" className="px-2 py-1">{type}</Badge>;
  if (l.includes('fail') || l.includes('delete')) return <Badge bg="danger" className="px-2 py-1">{type}</Badge>;
  return <Badge bg="secondary" className="px-2 py-1">{type}</Badge>;
 };

 const filteredLogs = (logs || []).filter(l => 
  (l.event_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
  (l.user_id || '').toLowerCase().includes(searchTerm.toLowerCase())
 );

  return (

   <Layout title={t('audit_logs')}>

    <Container fluid className="px-0">

     <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">

      <div>

       <h4 className="fw-black text-uppercase m-0 d-flex align-items-center gap-2 text-main">

        <Shield className="text-primary" size={24}/> Auditoría Global de Sistema

       </h4>

       <p className="text-muted-foreground small m-0 text-uppercase tracking-widest fw-bold opacity-75">

        Registro Inmutable de Acciones y Cumplimiento

       </p>

      </div>

      <div className="bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill small fw-bold d-flex align-items-center shadow-sm border border-success border-opacity-25">

       <Shield size={16} className="me-2" /> MONITORING ACTIVE

      </div>

     </div>

 

     <Card className="shadow-sm border-0 mb-4 overflow-hidden bg-card">

      <Card.Body className="p-3">

       <Row className="g-3">

        <Col md={6}>

         <div className="input-group bg-muted rounded-pill px-3 py-1 overflow-hidden border-0">

          <span className="input-group-text bg-transparent border-0 text-muted"><Search size={16} /></span>

          <Form.Control 

           className="bg-transparent border-0 shadow-none x-small fw-bold" 

           placeholder="Buscar por evento o ID de usuario..." 

           value={searchTerm}

           onChange={(e) => setSearchTerm(e.target.value)}

          />

         </div>

        </Col>

       </Row>

      </Card.Body>

     </Card>

 

     <Card className="shadow-sm border-0 overflow-hidden bg-card">

      <div className="table-responsive">

       <Table hover className="align-middle m-0 ticket-table border-0">

        <thead>

         <tr className="bg-muted">

          <th className="ps-4 border-0">{t('timestamp')}</th>

          <th className="border-0">{t('event')}</th>

          <th className="border-0">OPERADOR / ID</th>

          <th className="border-0">ORIGEN IP</th>

          <th className="pe-4 border-0">DETALLES TÉCNICOS</th>

         </tr>

        </thead>

        <tbody className="border-0">

         {loading ? (

          <tr><td colSpan={5} className="text-center py-5 bg-card"><Spinner animation="border" size="sm" variant="primary" /></td></tr>

         ) : filteredLogs.length > 0 ? filteredLogs?.map((log: any) => (

          <tr key={log.id} className="ticket-row border-bottom border-subtle">

           <td className="ps-4">

            <div className="ticket-date">

             <div className="date fw-bold">{new Date(log.created_at).toLocaleDateString()}</div>

             <div className="time opacity-75 small">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>

            </div>

           </td>

           <td>{getEventBadge(log.event_type)}</td>

           <td className="fw-bold text-primary"><UserIcon size={14} className="me-2 opacity-75" /> {log.user_id?.substring(0,8) || 'SYSTEM'}</td>

           <td className="text-muted font-monospace small">{log.ip_address || '---'}</td>

           <td className="pe-4">

             <div className="bg-muted p-2 rounded small font-monospace text-muted text-truncate" style={{maxWidth:'300px', fontSize: '10px'}}>

               {log.details ? JSON.stringify(log.details) : 'N/A'}

             </div>

           </td>

          </tr>

         )) : (

          <tr><td colSpan={5} className="text-center py-5 text-muted opacity-50 fw-bold uppercase x-small bg-card">{t('no_audit_logs')}</td></tr>

         )}

        </tbody>

       </Table>

      </div>

     </Card>

    </Container>

   </Layout>

  );

 }

 