import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container, Card, Table, Badge, Button } from 'react-bootstrap';
import { Shield, Eye, CheckCircle, AlertTriangle } from 'lucide-react';
import Layout from '../../../components/Layout';

export default function SIEMEventsPage() {
 const router = useRouter();
 const [events, setEvents] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
  const token = localStorage.getItem('access_token');
  if (!token) router.push('/login');
  else fetchEvents(token);
 }, [router]);

 const fetchEvents = async (token: string) => {
  try {
   const res = await fetch('/api/v1/integrations/siem/events', {
    headers: { 'Authorization': `Bearer ${token}` }
   });
   if (res.ok) setEvents(await res.json());
  } catch (e) { console.error(e); }
  finally { setLoading(false); }
 };

 return (
  <Layout title="SIEM Raw Events">
   <Container className="mt-4">
    <div className="mb-4">
     <h1 className="fw-bold mb-0">SIEM Raw Events</h1>
     <p className="text-muted">Real-time ingestion monitor for FortiSIEM events</p>
    </div>

    <Card className="shadow-sm border-0">
     <Card.Body className="p-0">
      <Table responsive hover className="mb-0">
       <thead className="">
        <tr>
         <th className="ps-4">Timestamp</th>
         <th>Type</th>
         <th>Source</th>
         <th>Severity</th>
         <th>Status</th>
         <th className="text-center">Action</th>
        </tr>
       </thead>
       <tbody>
        {events.length > 0 ? events?.map((ev: any) => (
         <tr key={ev.id} className="align-middle small">
          <td className="ps-4 text-muted">{new Date(ev.created_at).toLocaleString()}</td>
          <td className="fw-bold">{ev.event_type}</td>
          <td><code>{ev.source_ip}</code></td>
          <td>
           <Badge bg={ev.severity === 'high' || ev.severity === 'critical' ? 'danger' : 'warning'}>
            {ev.severity.toUpperCase()}
           </Badge>
          </td>
          <td>
           {ev.processed ? (
            <Badge bg="success"><CheckCircle size={10} className="me-1" /> Processed</Badge>
           ) : (
            <Badge bg="secondary">Pending</Badge>
           )}
          </td>
          <td className="text-center">
           <Button variant="outline-primary" size="sm" className="border-0"><Eye size={16} /></Button>
          </td>
         </tr>
        )) : (
         <tr><td colSpan={6} className="text-center py-5 text-muted">No SIEM events ingested yet. Check your webhook configuration.</td></tr>
        )}
       </tbody>
      </Table>
     </Card.Body>
    </Card>
   </Container>
  </Layout>
 );
}
