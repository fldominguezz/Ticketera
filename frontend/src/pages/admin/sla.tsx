import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { Container, Table, Button, Card, Form, Modal, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { Plus, Edit, Save, ArrowLeft, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/router';

export default function SLAManagementPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    priority: 'medium',
    response_time_goal: 60,
    resolution_time_goal: 480,
    is_active: true
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/sla', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(Array.isArray(data) ? data : []);
      }
    } catch (e) { setError('Error loading policies'); }
    finally { setLoading(false); }
  };

  const handleShow = (policy: any = null) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        name: policy.name,
        priority: policy.priority,
        response_time_goal: policy.response_time_goal,
        resolution_time_goal: policy.resolution_time_goal,
        is_active: policy.is_active
      });
    } else {
      setEditingPolicy(null);
      setFormData({
        name: '',
        priority: 'medium',
        response_time_goal: 60,
        resolution_time_goal: 480,
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('access_token');
    const method = editingPolicy ? 'PUT' : 'POST';
    const url = editingPolicy ? `/api/v1/sla/${editingPolicy.id}` : '/api/v1/sla';

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        fetchPolicies();
      } else {
        const data = await res.json();
        setError(data.detail || 'Error saving policy');
      }
    } catch (e) { setError('Connection error'); }
  };

  return (
    <Layout title="Gestión de SLA">
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center">
            <Button variant="link" className="text-dark p-0 me-3" onClick={() => router.push('/admin')}>
              <ArrowLeft size={24} />
            </Button>
            <h2 className="fw-bold mb-0">Políticas de ANS (SLA)</h2>
          </div>
          <Button variant="primary" onClick={() => handleShow()} className="shadow-sm">
            <Plus size={18} className="me-2" /> Nueva Política
          </Button>
        </div>

        {error && <Alert variant="danger" className="shadow-sm">{error}</Alert>}

        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <Table hover responsive className="mb-0 align-middle">
              <thead className="bg-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">Nombre</th>
                  <th>Prioridad</th>
                  <th>Meta Respuesta</th>
                  <th>Meta Resolución</th>
                  <th>Estado</th>
                  <th className="text-end pe-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-5"><Spinner animation="border" size="sm" /></td></tr>
                ) : policies.map(p => (
                  <tr key={p.id}>
                    <td className="ps-4 fw-bold">{p.name}</td>
                    <td>
                      <span className={`badge bg-${p.priority === 'critical' ? 'danger' : p.priority === 'high' ? 'warning' : 'info'}`}>
                        {(p.priority || 'medium').toUpperCase()}
                      </span>
                    </td>
                    <td><Clock size={14} className="me-1" /> {p.response_time_goal} min</td>
                    <td><Clock size={14} className="me-1" /> {Math.round(p.resolution_time_goal / 60)} h</td>
                    <td>
                      {p.is_active ? <CheckCircle size={18} className="text-success" /> : <AlertCircle size={18} className="text-muted" />}
                    </td>
                    <td className="text-end pe-4">
                      <Button variant="outline-primary" size="sm" onClick={() => handleShow(p)}>
                        <Edit size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Container>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="h5 fw-bold">{editingPolicy ? 'Editar Política' : 'Nueva Política'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="sla-name">
              <Form.Label className="small fw-bold">Nombre de la Política</Form.Label>
              <Form.Control 
                required
                name="name"
                placeholder="Ej: Oro - Alta Prioridad"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="sla-priority">
              <Form.Label className="small fw-bold">Prioridad Asociada</Form.Label>
              <Form.Select 
                name="priority"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value})}
              >
                <option value="low">BAJA</option>
                <option value="medium">MEDIA</option>
                <option value="high">ALTA</option>
                <option value="critical">CRÍTICA</option>
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="sla-response">
                  <Form.Label className="small fw-bold">Meta Respuesta (min)</Form.Label>
                  <Form.Control 
                    type="number"
                    name="response_time_goal"
                    value={formData.response_time_goal}
                    onChange={e => setFormData({...formData, response_time_goal: parseInt(e.target.value)})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="sla-resolution">
                  <Form.Label className="small fw-bold">Meta Resolución (min)</Form.Label>
                  <Form.Control 
                    type="number"
                    name="resolution_time_goal"
                    value={formData.resolution_time_goal}
                    onChange={e => setFormData({...formData, resolution_time_goal: parseInt(e.target.value)})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Check 
              type="switch"
              id="sla-active-switch"
              name="is_active"
              label="Política Activa"
              checked={formData.is_active}
              onChange={e => setFormData({...formData, is_active: e.target.checked})}
            />
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="light" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" className="shadow-sm">
              <Save size={18} className="me-2" /> Guardar Política
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Layout>
  );
}
