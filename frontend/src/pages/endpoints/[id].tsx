import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container, Row, Col, Card, Badge, ListGroup, Table, Button } from 'react-bootstrap';
import { Monitor, Shield, Activity, FileText, ChevronLeft, Clock } from 'lucide-react';
import Link from 'next/link';

export default function Endpoint360Page() {
 const router = useRouter();
 const { id } = router.query;
 const [endpoint, setEndpoint] = useState<any>(null);
 const [tickets, setTickets] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
  if (id) {
   const token = localStorage.getItem('access_token');
   fetchData(token!, id as string);
  }
 }, [id]);

 const fetchData = async (token: string, epId: string) => {
  try {
   const res = await fetch(`/api/v1/endpoints/${epId}`, { headers: { 'Authorization': `Bearer ${token}` } });
   if (res.ok) setEndpoint(await res.json());
   
   const tRes = await fetch(`/api/v1/tickets?endpoint_id=${epId}`, { headers: { 'Authorization': `Bearer ${token}` } });
   if (tRes.ok) setTickets(await tRes.json());
  } catch (e) { console.error(e); }
  finally { setLoading(false); }
 };

 if (!endpoint) return null;

 return (
  <>
   <Head><title>Endpoint 360 - {endpoint.hostname}</title></Head>
   
   <Container className="mt-4 mb-5">
    <Link href="/endpoints" passHref>
     <Button variant="link" className="p-0 text-decoration-none mb-4 d-flex align-items-center">
      <ChevronLeft size={18} /> Back to Inventory
     </Button>
    </Link>

    <div className="d-flex justify-content-between align-items-center mb-4">
     <div className="d-flex align-items-center">
      <div className="bg-primary p-3 rounded-3 me-3">
       <Monitor size={32} />
      </div>
      <div>
       <h1 className="fw-bold mb-0">{endpoint.hostname}</h1>
       <p className="text-muted mb-0">Endpoint 360 Degree Visibility</p>
      </div>
     </div>
     <Badge bg="success" className="px-3 py-2">PROTECTED</Badge>
    </div>

    <Row className="g-4">
     <Col lg={4}>
      <Card className="shadow-sm border-0 mb-4">
       <Card.Header className="bg-white py-3 fw-bold">Network & Identity</Card.Header>
       <Card.Body>
        <Table responsive className="small mb-0">
         <tbody>
          <tr><td className="text-muted">IP Address</td><td className="text-end fw-bold">{endpoint.ip_address}</td></tr>
          <tr><td className="text-muted">MAC Address</td><td className="text-end fw-bold">{endpoint.mac_address}</td></tr>
          <tr><td className="text-muted">Product</td><td className="text-end fw-bold">{endpoint.product}</td></tr>
          <tr><td className="text-muted">Group</td><td className="text-end fw-bold">{endpoint.group_id.substring(0,8)}</td></tr>
         </tbody>
        </Table>
       </Card.Body>
      </Card>

      <Card className="shadow-sm border-0 border-start border-primary border-4">
       <Card.Body className="p-4">
        <h6 className="fw-bold d-flex align-items-center">
         <Shield size={18} className="me-2 text-primary" /> Protection Status
        </h6>
        <p className="small text-muted mb-0 mt-2">
         Antivirus agent is active and reporting to SOC. Last heartbeat received 10 minutes ago.
        </p>
       </Card.Body>
      </Card>
     </Col>

     <Col lg={8}>
      <Card className="shadow-sm border-0 mb-4">
       <Card.Header className="bg-white py-3">
        <h5 className="mb-0 fw-bold d-flex align-items-center">
         <Activity size={18} className="me-2 text-danger" /> Related Tickets
        </h5>
       </Card.Header>
       <Card.Body className="p-0">
        <Table responsive hover className="mb-0 small">
         <thead className="">
          <tr>
           <th className="ps-4">Ticket</th>
           <th>Status</th>
           <th>Created</th>
           <th className="text-end pe-4">Action</th>
          </tr>
         </thead>
         <tbody>
          {tickets.length > 0 ? tickets?.map((ticket: any) => (
           <tr key={ticket.id} className="align-middle">
            <td className="ps-4 py-3 fw-bold">{ticket.title}</td>
            <td><Badge bg="secondary">{ticket.status}</Badge></td>
            <td className="text-muted">{new Date(ticket.created_at).toLocaleDateString()}</td>
            <td className="text-end pe-4">
             <Link href={`/tickets/${ticket.id}`} passHref><Button variant="outline-primary" size="sm">View</Button></Link>
            </td>
           </tr>
          )) : (
           <tr><td colSpan={4} className="text-center py-4 text-muted">No security incidents reported for this endpoint.</td></tr>
          )}
         </tbody>
        </Table>
       </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
       <Card.Header className="bg-white py-3">
        <h5 className="mb-0 fw-bold d-flex align-items-center">
         <Clock size={18} className="me-2 text-info" /> Operation History
        </h5>
       </Card.Header>
       <Card.Body className="p-0">
        <ListGroup variant="flush">
         <ListGroup.Item className="p-4 border-0 border-bottom">
          <div className="d-flex justify-content-between mb-1">
           <span className="fw-bold small">Installation Form Submitted</span>
           <span className="text-muted small">2026-01-20</span>
          </div>
          <div className="small text-muted">Initial AV installation performed by admin user.</div>
         </ListGroup.Item>
        </ListGroup>
       </Card.Body>
      </Card>
     </Col>
    </Row>
   </Container>
  </>
 );
}
