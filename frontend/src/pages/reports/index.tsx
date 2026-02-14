import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Container, Table, Badge, Card, Spinner, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Shield, Clock, User, BarChart2 } from 'lucide-react';

export default function ReportsPage() {
 const { t } = useTranslation();
 const router = useRouter();
 const [mounted, setMounted] = useState(false);
 const [logs, setLogs] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
  setMounted(true);
  fetchLogs();
 }, []);

 const fetchLogs = async () => {
  try {
   const token = localStorage.getItem('access_token');
   const res = await fetch('/api/v1/audit', {
    headers: { 'Authorization': `Bearer ${token}` }
   });
   const data = await res.json();
   setLogs(Array.isArray(data) ? data : []);
  } catch (e) { console.error(e); }
  finally { setLoading(false); }
 };

 if (!mounted) return null;

 return (
  <Layout title={t('audit_logs') || 'Auditoría'}>
   <Container fluid className="px-0">
    <div className="d-flex justify-content-between align-items-center mb-4">
     <h2 className="fw-bold mb-0">Registro de Auditoría Inmutable</h2>
     <Button variant="primary" className="d-flex align-items-center shadow-sm" onClick={() => router.push('/reports/dashboard')}>
      <BarChart2 size={18} className="me-2" /> 
      <span>Ver Dashboard de KPIs</span>
     </Button>
    </div>
    <Card className="border-0 shadow-sm">
     <Card.Body className="p-0">
      <Table hover responsive className="mb-0 align-middle">
       <thead className="text-muted small text-uppercase">
        <tr>
         <th className="ps-4 py-3">Fecha</th>
         <th>Usuario</th>
         <th>Acción</th>
         <th>Módulo</th>
         <th className="pe-4">IP</th>
        </tr>
       </thead>
       <tbody>
        {loading ? (
         <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" size="sm" /></td></tr>
        ) : logs.length === 0 ? (
         <tr><td colSpan={5} className="text-center py-5 text-muted">No hay registros recientes.</td></tr>
        ) : (
         logs.map((log: any) => (
          <tr key={log.id}>
           <td className="ps-4 small"><Clock size={14} className="me-2" /> {new Date(log.created_at).toLocaleString()}</td>
           <td className="fw-bold small"><User size={14} className="me-2" /> {log.username || 'System'}</td>
           <td><Badge bg="info" className="fw-normal">{log.action}</Badge></td>
           <td className="small text-muted">{log.module}</td>
           <td className="pe-4 font-monospace small">{log.ip_address}</td>
          </tr>
         ))
        )}
       </tbody>
      </Table>
     </Card.Body>
    </Card>
   </Container>
  </Layout>
 );
}
