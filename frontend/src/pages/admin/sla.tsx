import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { Container, Table, Button, Card, Form, Modal, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { Plus, Edit, Save, ArrowLeft, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/router';
import { useTheme } from '../../context/ThemeContext';

export default function SLAManagementPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '', priority: 'medium', response_time_goal: 60, resolution_time_goal: 480, is_active: true
  });

  useEffect(() => { fetchPolicies(); }, []);

  const fetchPolicies = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/sla', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setPolicies(await res.json());
    } catch (e) { setError('Error loading policies'); }
    finally { setLoading(false); }
  };

  const handleShow = (policy: any = null) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        name: policy.name, priority: policy.priority, 
        response_time_goal: policy.response_time_goal, 
        resolution_time_goal: policy.resolution_time_goal, 
        is_active: policy.is_active
      });
    } else {
      setEditingPolicy(null);
      setFormData({ name: '', priority: 'medium', response_time_goal: 60, resolution_time_goal: 480, is_active: true });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    const method = editingPolicy ? 'PUT' : 'POST';
    const url = editingPolicy ? `/api/v1/sla/${editingPolicy.id}` : '/api/v1/sla';
    try {
      const res = await fetch(url, {
        method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) { setShowModal(false); fetchPolicies(); }
    } catch (e) { setError('Connection error'); }
  };

  return (
    <Layout title="Gestión de SLA">
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center">
            <Button variant="link" className="text-muted p-0 me-3" onClick={() => router.push('/admin')}><ArrowLeft size={24} /></Button>
            <h2 className="fw-bold mb-0 text-body">Políticas de SLA</h2>
          </div>
          <Button variant="primary" onClick={() => handleShow()} className="shadow-sm fw-bold"><Plus size={18} className="me-2" /> NUEVA META</Button>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <Card className="border-0 shadow-sm overflow-hidden">
          <Table hover responsive variant={isDark ? 'dark' : undefined} className="mb-0 align-middle">
            <thead className={isDark ? 'bg-black' : 'bg-light'}>
              <tr className="small text-uppercase text-muted opacity-75">
                <th className="ps-4 py-3">Nombre</th>
                <th>Prioridad</th>
                <th>Respuesta</th>
                <th>Resolución</th>
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
                  <td><Badge bg={p.priority === 'critical' ? 'danger' : 'info'}>{p.priority?.toUpperCase()}</Badge></td>
                  <td><Clock size={14} className="me-1" /> {p.response_time_goal}m</td>
                  <td><Clock size={14} className="me-1" /> {p.resolution_time_goal}m</td>
                  <td>{p.is_active ? <CheckCircle size={18} className="text-success" /> : <AlertCircle size={18} className="text-muted" />}</td>
                  <td className="text-end pe-4"><Button variant={isDark ? "dark" : "light"} size="sm" onClick={() => handleShow(p)} className="border border-opacity-10"><Edit size={14} /></Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </Container>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton><Modal.Title className="h6 fw-bold text-uppercase">{editingPolicy ? 'Editar SLA' : 'Nuevo SLA'}</Modal.Title></Modal.Header>
        <Form onSubmit={handleSubmit}><Modal.Body>
            <Form.Group className="mb-3"><Form.Label className="x-small fw-bold text-muted">NOMBRE</Form.Label><Form.Control required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></Form.Group>
            <Row><Col md={6}><Form.Group className="mb-3"><Form.Label className="x-small fw-bold text-muted">PRIORIDAD</Form.Label><Form.Select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}><option value="low">BAJA</option><option value="medium">MEDIA</option><option value="high">ALTA</option><option value="critical">CRÍTICA</option></Form.Select></Form.Group></Col><Col md={6}><Form.Group className="mb-3"><Form.Label className="x-small fw-bold text-muted">RESPUESTA (MIN)</Form.Label><Form.Control type="number" value={formData.response_time_goal} onChange={e => setFormData({...formData, response_time_goal: parseInt(e.target.value)})} /></Form.Group></Col></Row>
            <Form.Check type="switch" label="Política Activa" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
          </Modal.Body><Modal.Footer className="border-0">
            <Button variant="link" onClick={() => setShowModal(false)} className="text-muted text-decoration-none">Cancelar</Button>
            <Button variant="primary" type="submit" className="fw-bold px-4">GUARDAR</Button>
          </Modal.Footer></Form>
      </Modal>
    </Layout>
  );
}