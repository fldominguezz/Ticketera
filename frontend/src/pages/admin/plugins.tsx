import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container, Row, Col, Card, Button, Badge, Table, Form } from 'react-bootstrap';
import { Cpu, ExternalLink, Power, Trash2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';

export default function PluginsAdminPage() {
 const { t } = useTranslation();
 const router = useRouter();
 const [plugins, setPlugins] = useState<any[]>([]);
 const [isSuperuser, setIsSuperuser] = useState(false);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
  const token = localStorage.getItem('access_token');
  if (!token) { router.push('/login'); return; }
  fetchData(token);
 }, []);

 const fetchData = async (token: string) => {
  try {
   const [userRes, pluginsRes] = await Promise.all([
    fetch('/api/v1/users/me', { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch('/api/v1/plugins', { headers: { 'Authorization': `Bearer ${token}` } })
   ]);
   if (userRes.ok) {
    const userData = await userRes.json();
    setIsSuperuser(userData.is_superuser);
    if (!userData.is_superuser) router.push('/');
   }
   if (pluginsRes.ok) setPlugins(await pluginsRes.json());
  } catch (e) { console.error(e); }
  finally { setLoading(false); }
 };

 const togglePlugin = async (id: string, currentStatus: boolean) => {
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch(`/api/v1/plugins/${(id)}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: !currentStatus })
   });
   if (res.ok) fetchData(token!);
  } catch (e) { console.error(e); }
 };

 if (loading || !isSuperuser) return null;

 return (
  <Layout title="Plugins Management">
   <Container className="mt-4">
    <div className="d-flex justify-content-between align-items-center mb-4">
     <div>
      <h1 className="fw-bold mb-0">System Plugins</h1>
      <p className="text-muted">Manage external modules and core extensions</p>
     </div>
     <Button variant="primary" disabled className="d-flex align-items-center">
      <Plus size={18} className="me-2" /> Install New Plugin
     </Button>
    </div>

    <Row>
     <Col lg={8}>
      <Card className="shadow-sm border-0">
       <Table responsive hover className="mb-0">
        <thead className="table-light">
         <tr>
          <th>Plugin Name</th>
          <th>Version</th>
          <th>Status</th>
          <th className="text-end">Actions</th>
         </tr>
        </thead>
        <tbody>
         {Array.isArray(plugins) && plugins.length > 0 ? plugins.map(p => (
          <tr key={p.id} className="align-middle">
           <td>
            <div className="fw-bold">{p.name}</div>
            <div className="small text-muted">{p.description}</div>
           </td>
           <td><Badge bg="light" text="dark">{p.version}</Badge></td>
           <td>
            <Badge bg={p.is_active ? 'success' : 'secondary'}>
             {p.is_active ? 'Active' : 'Inactive'}
            </Badge>
           </td>
           <td className="text-end">
            <Button 
             variant={p.is_active ? 'outline-warning' : 'outline-success'} 
             size="sm" 
             className="me-2"
             onClick={() => togglePlugin(p.id, p.is_active)}
            >
             <Power size={14} />
            </Button>
            <Button variant="outline-danger" size="sm" disabled>
             <Trash2 size={14} />
            </Button>
           </td>
          </tr>
         )) : (
          <tr>
           <td colSpan={4} className="text-center py-5 text-muted">
            <Cpu size={48} className="mb-3 opacity-25" />
            <p>{plugins.length === 0 ? 'No external plugins found.' : 'Error loading plugins data.'}</p>
           </td>
          </tr>
         )}
        </tbody>
       </Table>
      </Card>
     </Col>
     
     <Col lg={4}>
      <Card className="shadow-sm border-0 mb-4 bg-primary bg-opacity-10">
       <Card.Body>
        <h6 className="fw-bold">WordPress Integration</h6>
        <p className="small text-muted">Use WordPress as a Headless CMS to customize your frontend themes and landing pages without affecting the SOC logic.</p>
        <Button variant="outline-primary" size="sm" className="w-100" disabled>
         Coming Soon <ExternalLink size={12} className="ms-1" />
        </Button>
       </Card.Body>
      </Card>
     </Col>
    </Row>
   </Container>
  </Layout>
 );
}
