import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppNavbar from '../../../components/AppNavbar';
import { Container, Card, Table, Button, Badge, Form, Modal, Row, Col } from 'react-bootstrap';
import { Clock, Plus, Trash2, Edit, Save } from 'lucide-react';

export default function AdminSLAPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ name: '', priority: 'medium', response_time_goal: 60, resolution_time_goal: 240 });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) router.push('/login');
    else fetchPolicies(token);
  }, [router]);

  const fetchPolicies = async (token: string) => {
    const res = await fetch('/api/v1/sla/', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setPolicies(await res.json());
  };

  const handleCreate = async () => {
    const token = localStorage.getItem('access_token');
    const res = await fetch('/api/v1/sla/', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(newPolicy)
    });
    if (res.ok) {
      setShowModal(false);
      fetchPolicies(token!);
    }
  };

  return (
    <>
      <Head><title>SLA Configuration - Ticketera</title></Head>
      <AppNavbar />
      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="fw-bold mb-0">SLA Policies</h1>
            <p className="text-muted">Set response and resolution time goals by priority</p>
          </div>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus size={18} className="me-2" /> New Policy
          </Button>
        </div>

        <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">Policy Name</th>
                  <th>Priority</th>
                  <th>Response Goal</th>
                  <th>Resolution Goal</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies?.map((p: any) => (
                  <tr key={p.id} className="align-middle">
                    <td className="ps-4 fw-bold">{p.name}</td>
                    <td><Badge bg="info">{p.priority.toUpperCase()}</Badge></td>
                    <td>{p.response_time_goal} min</td>
                    <td>{p.resolution_time_goal} min</td>
                    <td className="text-center">
                      <Button variant="outline-danger" size="sm" className="border-0"><Trash2 size={16} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>

        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton><Modal.Title>Add SLA Policy</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Policy Name</Form.Label>
                <Form.Control type="text" placeholder="Critical Support" value={newPolicy.name} onChange={e => setNewPolicy({...newPolicy, name: e.target.value})} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Ticket Priority</Form.Label>
                <Form.Select value={newPolicy.priority} onChange={e => setNewPolicy({...newPolicy, priority: e.target.value})}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Form.Select>
              </Form.Group>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold">Resp. Goal (min)</Form.Label>
                    <Form.Control type="number" value={newPolicy.response_time_goal} onChange={e => setNewPolicy({...newPolicy, response_time_goal: parseInt(e.target.value)})} />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold">Resol. Goal (min)</Form.Label>
                    <Form.Control type="number" value={newPolicy.resolution_time_goal} onChange={e => setNewPolicy({...newPolicy, resolution_time_goal: parseInt(e.target.value)})} />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={handleCreate}>Save Policy</Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
}
