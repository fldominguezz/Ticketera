import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { Table, Button, Badge, Modal, Form, Row, Col } from 'react-bootstrap';
import { Clock, Plus, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';

const SLAAdmin = () => {
  const [policies, setPolicies] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // fetchPolicies();
    setPolicies([
      { id: '1', name: 'Críticos SOC', priority: 'critical', response: 15, resolution: 60, active: true },
      { id: '2', name: 'Instalaciones Estándar', priority: 'medium', response: 120, resolution: 480, active: true },
    ]);
  }, []);

  return (
    <Layout title="Políticas de SLA (v1.2.6)">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fw-bold">Acuerdos de Nivel de Servicio (SLA)</h1>
          <p className="text-muted">Configure los tiempos objetivo para respuesta y resolución por prioridad.</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus size={18} className="me-2" /> Nueva Política
        </Button>
      </div>

      <Table responsive hover className="align-middle shadow-sm rounded">
        <thead className="table-dark">
          <tr>
            <th>Nombre de Política</th>
            <th>Prioridad</th>
            <th>T. Respuesta</th>
            <th>T. Resolución</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {policies.map(p => (
            <tr key={p.id}>
              <td className="fw-bold">{p.name}</td>
              <td>
                <Badge bg={p.priority === 'critical' ? 'danger' : 'warning'}>
                  {(p.priority || 'medium').toUpperCase()}
                </Badge>
              </td>
              <td>{p.response} min</td>
              <td>{p.resolution} min</td>
              <td>
                <Badge bg={p.active ? 'success' : 'secondary'}>
                  {p.active ? 'Activo' : 'Pausado'}
                </Badge>
              </td>
              <td>
                <Button variant="link" className="text-primary p-0 me-3"><Edit2 size={16}/></Button>
                <Button variant="link" className="text-danger p-0"><Trash2 size={16}/></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Configurar Política de SLA</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="sla-policy-name">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control type="text" name="policy_name" placeholder="Ej: Incidentes de Seguridad" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="sla-policy-priority">
                  <Form.Label>Prioridad Asociada</Form.Label>
                  <Form.Select name="priority">
                    <option>Baja</option>
                    <option>Media</option>
                    <option>Alta</option>
                    <option value="critical">Crítica</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="sla-policy-response">
                  <Form.Label>Meta de Respuesta (minutos)</Form.Label>
                  <Form.Control type="number" name="response_min" defaultValue={15} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="sla-policy-resolution">
                  <Form.Label>Meta de Resolución (minutos)</Form.Label>
                  <Form.Control type="number" name="resolution_min" defaultValue={60} />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="primary">Crear Política</Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default SLAAdmin;