import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { Card, Table, Button, Badge, Modal, Form, Spinner, Row, Col, InputGroup } from 'react-bootstrap';
import { Clock, Plus, Trash2, Edit, Save, AlertCircle, ShieldCheck } from 'lucide-react';
import api from '../../../lib/api';

export default function SLAManagementPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    response_time_goal: 60,
    resolution_time_goal: 240,
    is_active: true
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const res = await api.get('/admin/sla');
      setPolicies(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleEdit = (policy: any) => {
    setSelectedPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description || '',
      priority: policy.priority,
      response_time_goal: policy.response_time_goal,
      resolution_time_goal: policy.resolution_time_goal,
      is_active: policy.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta política de SLA?')) return;
    try {
      await api.delete(`/admin/sla/${(id)}`);
      fetchPolicies();
    } catch (e) { alert('Error al eliminar'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedPolicy) {
        await api.put(`/admin/sla/${selectedPolicy.id}`, formData);
      } else {
        await api.post('/admin/sla', formData);
      }
      setShowModal(false);
      fetchPolicies();
    } catch (e) { alert('Error al guardar la política'); }
    finally { setSaving(false); }
  };

  return (
    <Layout title="Gestión de SLA">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-black text-uppercase m-0">Políticas de SLA</h4>
          <p className="text-muted small m-0 uppercase opacity-50 tracking-widest fw-bold">Service Level Agreement Management</p>
        </div>
        <Button variant="primary" size="sm" className="fw-bold px-4 rounded-pill shadow-sm" onClick={() => { setSelectedPolicy(null); setShowModal(true); }}>
          <Plus size={16} className="me-2" /> NUEVA POLÍTICA
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden bg-surface">
        <Table hover responsive className="m-0 align-middle">
          <thead className="bg-surface-muted border-bottom">
            <tr className="small text-uppercase text-muted fw-black">
              <th className="ps-4">POLÍTICA</th>
              <th>PRIORIDAD</th>
              <th>TIEMPOS (RESP/RESOL)</th>
              <th>ESTADO</th>
              <th className="text-end pe-4">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="small">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" size="sm" /></td></tr>
            ) : policies.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-5 text-muted italic">No hay políticas de SLA configuradas.</td></tr>
            ) : policies.map(p => (
              <tr key={p.id}>
                <td className="ps-4">
                  <div className="fw-bold text-primary">{p.name}</div>
                  <div className="x-small text-muted">{p.description || 'Sin descripción'}</div>
                </td>
                <td><Badge bg={p.priority === 'critical' ? 'danger' : 'warning'} className="uppercase">{p.priority}</Badge></td>
                <td>
                  <div className="fw-bold d-flex gap-2">
                    <Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-25">{p.response_time_goal} min</Badge>
                    <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-25">{p.resolution_time_goal} min</Badge>
                  </div>
                </td>
                <td>{p.is_active ? <Badge bg="success">ACTIVA</Badge> : <Badge bg="secondary">INACTIVA</Badge>}</td>
                <td className="text-end pe-4">
                  <Button variant="link" size="sm" onClick={() => handleEdit(p)} className="p-1 me-2"><Edit size={16}/></Button>
                  <Button variant="link" size="sm" onClick={() => handleDelete(p.id)} className="p-1 text-danger"><Trash2 size={16}/></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h6 fw-black text-uppercase">{selectedPolicy ? 'Editar Política' : 'Nueva Política'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="pt-3">
            <Form.Group className="mb-3">
              <Form.Label className="x-small fw-black uppercase text-muted">Nombre de la Política</Form.Label>
              <Form.Control required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="x-small fw-black uppercase text-muted">Prioridad Aplicable</Form.Label>
              <Form.Select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                <option value="low">BAJA</option>
                <option value="medium">MEDIA</option>
                <option value="high">ALTA</option>
                <option value="critical">CRÍTICA</option>
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="x-small fw-black uppercase text-muted">Tiempo Respuesta (Min)</Form.Label>
                  <Form.Control type="number" required value={formData.response_time_goal} onChange={e => setFormData({...formData, response_time_goal: parseInt(e.target.value)})} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="x-small fw-black uppercase text-muted">Tiempo Resolución (Min)</Form.Label>
                  <Form.Control type="number" required value={formData.resolution_time_goal} onChange={e => setFormData({...formData, resolution_time_goal: parseInt(e.target.value)})} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Check type="switch" label="Política Activa" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="fw-bold small" />
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="link" size="sm" onClick={() => setShowModal(false)} className="text-muted text-decoration-none fw-bold">CANCELAR</Button>
            <Button variant="primary" size="sm" type="submit" disabled={saving} className="fw-bold px-4">
              {saving ? <Spinner animation="border" size="sm" /> : <Save size={16} className="me-2" />} GUARDAR SLA
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Layout>
  );
}
