import { useEffect, useState } from 'react';
import Head from 'next/head';

import { Container, Table, Button, Badge, Modal, Form, Spinner, Card } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Plus, Monitor } from 'lucide-react';

export default function EndpointsPage() {
 const { t } = useTranslation();
 const [endpoints, setEndpoints] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [showModal, setShowModal] = useState(false);

 useEffect(() => {
  fetchEndpoints();
 }, []);

 const fetchEndpoints = async () => {
  try {
   const token = localStorage.getItem('access_token');
   const res = await fetch('/api/v1/endpoints', { headers: { 'Authorization': `Bearer ${token}` } });
   if (res.ok) {
    const data = await res.json();
    setEndpoints(Array.isArray(data) ? data : []);
   }
  } catch (e) { console.error(e); }
  finally { setLoading(false); }
 };

 return (
  <>
   <Head><title>{t('endpoints')} - Ticketera</title></Head>
   
   <Container className="mt-4">
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h1 className="fw-bold mb-0">{t('endpoints')}</h1>
      <Button variant="primary" onClick={() => setShowModal(true)} className="d-flex align-items-center shadow-sm">
       <Plus size={18} className="me-2" /> {t('add_endpoint')}
      </Button>
    </div>

    <Card className="shadow-sm border-0">
     <Table striped hover responsive className="mb-0 align-middle">
      <thead className="table-dark">
       <tr>
        <th className="ps-4">{t('hostname')}</th>
        <th>{t('ip_address')}</th>
        <th>{t('product')}</th>
        <th>{t('status')}</th>
        <th>{t('group')}</th>
        <th className="text-end pe-4">{t('actions')}</th>
       </tr>
      </thead>
      <tbody>
       {loading ? (
        <tr><td colSpan={6} className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
       ) : endpoints.length > 0 ? endpoints?.map((e: any) => (
        <tr key={e.id}>
         <td className="ps-4 fw-bold text-primary"><Monitor size={14} className="me-2 text-muted"/>{e.hostname}</td>
         <td className="font-monospace" style={{fontSize: '0.85rem'}}>{e.ip_address}</td>
         <td><Badge bg="light" text="dark" className="border">{e.product}</Badge></td>
         <td><Badge bg={e.status === 'active' ? 'success' : 'danger'} className="text-uppercase">{e.status}</Badge></td>
         <td className="small text-muted">{e.group_id?.substring(0, 8)}</td>
         <td className="text-end pe-4"><Button variant="outline-primary" size="sm" className="fw-bold">{t('view')}</Button></td>
        </tr>
       )) : (
         <tr><td colSpan={6} className="text-center py-5 text-muted">No data found</td></tr>
       )}
      </tbody>
     </Table>
    </Card>
   </Container>
  </>
 );
}
