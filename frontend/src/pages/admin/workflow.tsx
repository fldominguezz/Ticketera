import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container, Card, Table, Button, Badge, Form, Row, Col } from 'react-bootstrap';
import { GitBranch, Plus, Trash2, ArrowRight } from 'lucide-react';
import Layout from '../../components/Layout';

export default function AdminWorkflowPage() {
 const router = useRouter();
 const [transitions, setTransitions] = useState([]);

 useEffect(() => {
  const token = localStorage.getItem('access_token');
  if (!token) router.push('/login');
  // Fetch logic omitted for brevity
 }, [router]);

 const statusOptions = ['open', 'in_progress', 'pending', 'resolved', 'closed'];

 return (
  <Layout title="Workflow Designer">
   <Container className="mt-4">
    <div className="d-flex justify-content-between align-items-center mb-4">
     <div>
      <h1 className="fw-bold mb-0">Workflow Designer</h1>
      <p className="text-muted">Define valid status transitions for the operational lifecycle</p>
     </div>
     <Button variant="primary">
      <Plus size={18} className="me-2" /> New Transition
     </Button>
    </div>

    <Row className="g-4">
     <Col lg={8}>
      <Card className="shadow-sm border-0">
       <Card.Body className="p-0">
        <Table responsive hover className="mb-0">
         <thead className="">
          <tr>
           <th className="ps-4">From Status</th>
           <th className="text-center"><ArrowRight size={14} /></th>
           <th>To Status</th>
           <th className="text-center">Actions</th>
          </tr>
         </thead>
         <tbody>
          <tr className="align-middle">
           <td className="ps-4"><Badge bg="success">OPEN</Badge></td>
           <td className="text-center text-muted"><ArrowRight size={14} /></td>
           <td><Badge bg="primary">IN PROGRESS</Badge></td>
           <td className="text-center">
            <Button variant="outline-danger" size="sm" className="border-0"><Trash2 size={16} /></Button>
           </td>
          </tr>
          <tr className="align-middle">
           <td className="ps-4"><Badge bg="primary">IN PROGRESS</Badge></td>
           <td className="text-center text-muted"><ArrowRight size={14} /></td>
           <td><Badge bg="info">RESOLVED</Badge></td>
           <td className="text-center">
            <Button variant="outline-danger" size="sm" className="border-0"><Trash2 size={16} /></Button>
           </td>
          </tr>
         </tbody>
        </Table>
       </Card.Body>
      </Card>
     </Col>
     
     <Col lg={4}>
      <Card className="shadow-sm border-0 p-4">
       <GitBranch size={48} className="text-primary mb-3 opacity-50" />
       <h5 className="fw-bold">Process Enforcement</h5>
       <p className="small text-muted mb-0">
        Transitions defined here are strictly enforced by the backend. Technicians cannot skip mandatory steps in the investigation process.
       </p>
      </Card>
     </Col>
    </Row>
   </Container>
  </Layout>
 );
}
