import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Table, Button, Badge, Modal, Form } from 'react-bootstrap';
import { Settings, Plus, Play } from 'lucide-react';
import axios from 'axios';

const WorkflowsAdmin = () => {
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        // fetchWorkflows();
        // Mock data for v1.2.6
        setWorkflows([
            { id: '1', name: 'Flujo Incidencias SOC', is_active: true, states: 4 },
            { id: '2', name: 'Flujo Instalaciones', is_active: true, states: 3 },
        ]);
    }, []);

    return (
        <Layout title="Administración de Workflows">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Workflows (v1.2.6)</h1>
                <Button variant="primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} className="me-2" /> Nuevo Workflow
                </Button>
            </div>

            <Table responsive hover className="align-middle">
                <thead className="table-light">
                    <tr>
                        <th>Nombre</th>
                        <th>Estados</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {workflows.map(wf => (
                        <tr key={wf.id}>
                            <td className="fw-bold">{wf.name}</td>
                            <td>{wf.states} pasos</td>
                            <td>
                                <Badge bg={wf.is_active ? 'success' : 'secondary'}>
                                    {wf.is_active ? 'Activo' : 'Inactivo'}
                                </Badge>
                            </td>
                            <td>
                                <Button variant="outline-primary" size="sm" className="me-2">
                                    <Settings size={14} /> Editar
                                </Button>
                                <Button variant="outline-info" size="sm">
                                    <Play size={14} /> Probar
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Diseñador de Workflow</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="text-muted">El editor visual de flujos (vía React Flow) estará disponible en el siguiente parche de la v1.2.6.</p>
                    <Form>
                        <Form.Group className="mb-3" controlId="workflow-name-input">
                            <Form.Label>Nombre del Workflow</Form.Label>
                            <Form.Control type="text" name="wf_name" placeholder="Ej: Atención Incidentes" />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cerrar</Button>
                    <Button variant="primary">Guardar Base</Button>
                </Modal.Footer>
            </Modal>
        </Layout>
    );
};

export default WorkflowsAdmin;
