import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Container, Row, Col, Card, Button, Table, Badge, Spinner, Form, Modal } from 'react-bootstrap';
import { GitBranch, Plus, ArrowRight, Trash2, Shield, Activity } from 'lucide-react';
import api from '../../lib/api';

export default function AdminWorkflowsPage() {
 const [states, setStates] = useState<any[]>([]);
 const [transitions, setTransitions] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [showModal, setShowModal] = useState(false);
 const [newTransition, setNewTransition] = useState({ from_id: '', to_id: '', name: '' });

 useEffect(() => {
  fetchData();
 }, []);

 const fetchData = async () => {
  setLoading(true);
  try {
   const [statesRes, transRes] = await Promise.all([
    api.get('/admin/workflows/states'),
    api.get('/admin/workflows/transitions')
   ]);
   setStates(statesRes.data);
   setTransitions(transRes.data);
  } catch (err) {
   console.error(err);
  } finally {
   setLoading(false);
  }
 };

 const handleAddTransition = async () => {
  try {
   await api.post('/admin/workflows/transitions', null, { 
    params: newTransition 
   });
   setShowModal(false);
   fetchData();
  } catch (err) {
   alert('Error al crear transición.');
  }
 };

 const handleDeleteTransition = async (id: string) => {
  if (!confirm('¿Eliminar esta regla de flujo?')) return;
  await api.delete(`/admin/workflows/transitions/${id}`);
  fetchData();
 };

 return (
  <Layout title="Gestión de Workflows">
   <Container className="mt-4">
    <div className="d-flex justify-content-between align-items-center mb-4 bg-surface p-3 rounded-4 shadow-sm border border-color">
     <div>
      <h4 className="fw-black m-0 text-main uppercase">Editor de Workflows</h4>
      <small className="text-muted fw-bold">Defina estados y transiciones operativas</small>
     </div>
     <Button variant="primary" size="sm" className="fw-black px-4" onClick={() => setShowModal(true)}>
      <Plus size={16} className="me-2" /> NUEVA REGLA
     </Button>
    </div>

    <Row className="g-4">
     {/* Listado de Estados */}
     <Col lg={4}>
      <Card className="border-0 shadow-sm">
       <Card.Header className="bg-transparent py-3 border-bottom d-flex align-items-center">
        <Activity size={18} className="text-primary me-2" />
        <h6 className="m-0 fw-bold uppercase small">Estados del Sistema</h6>
       </Card.Header>
       <Card.Body className="p-0">
        <Table hover responsive className="mb-0 small align-middle">
         <tbody>
          {states.map(s => (
           <tr key={s.id}>
            <td className="ps-4">
             <Badge style={{ backgroundColor: s.color }} className="px-2 py-1">
              {s.name.toUpperCase()}
             </Badge>
            </td>
            <td className="text-muted font-monospace x-small text-end pe-4">{s.status_key}</td>
           </tr>
          ))}
         </tbody>
        </Table>
       </Card.Body>
      </Card>
     </Col>

     {/* Mapa de Transiciones */}
     <Col lg={8}>
      <Card className="border-0 shadow-sm overflow-hidden">
       <Card.Header className="bg-transparent py-3 border-bottom">
        <h6 className="m-0 fw-bold uppercase small d-flex align-items-center">
         <GitBranch size={18} className="text-success me-2" /> Reglas de Movimiento Permitidas
        </h6>
       </Card.Header>
       <Card.Body className="p-0">
        <Table responsive hover className="mb-0 align-middle">
         <thead className="text-muted x-small uppercase fw-bold">
          <tr>
           <th className="ps-4">Desde Estado</th>
           <th className="text-center">Permite Pasar a</th>
           <th className="text-end pe-4">Acción</th>
          </tr>
         </thead>
         <tbody>
          {loading ? (
           <tr><td colSpan={3} className="text-center py-5"><Spinner animation="border" size="sm" /></td></tr>
          ) : transitions.map(t => {
           const from = states.find(s => s.id === t.from_state_id);
           const to = states.find(s => s.id === t.to_state_id);
           return (
            <tr key={t.id}>
             <td className="ps-4">
              <Badge bg="light" text="dark" className="border px-3">{from?.name}</Badge>
             </td>
             <td className="text-center">
              <ArrowRight size={16} className="text-muted mx-3" />
              <Badge style={{ backgroundColor: to?.color }}>{to?.name}</Badge>
             </td>
             <td className="text-end pe-4">
              <Button variant="link" className="text-danger p-0" onClick={() => handleDeleteTransition(t.id)}>
               <Trash2 size={16} />
              </Button>
             </td>
            </tr>
           );
          })}
         </tbody>
        </Table>
       </Card.Body>
      </Card>
     </Col>
    </Row>

    {/* Modal para Nueva Transición */}
    <Modal show={showModal} onHide={() => setShowModal(false)} centered>
     <Modal.Header closeButton className="border-0 ">
      <Modal.Title className="fw-black uppercase h6">Nueva Regla de Flujo</Modal.Title>
     </Modal.Header>
     <Modal.Body className="p-4">
      <Form.Group className="mb-3">
       <Form.Label className="x-small fw-bold uppercase">Estado de Origen</Form.Label>
       <Form.Select 
        value={newTransition.from_id}
        onChange={e => setNewTransition({...newTransition, from_id: e.target.value})}
        className="border-0 fw-bold"
       >
        <option value="">Seleccionar...</option>
        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
       </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3">
       <Form.Label className="x-small fw-bold uppercase">Estado de Destino</Form.Label>
       <Form.Select 
        value={newTransition.to_id}
        onChange={e => setNewTransition({...newTransition, to_id: e.target.value})}
        className="border-0 fw-bold"
       >
        <option value="">Seleccionar...</option>
        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
       </Form.Select>
      </Form.Group>
      <Form.Group>
       <Form.Label className="x-small fw-bold uppercase">Nombre de la Regla (Opcional)</Form.Label>
       <Form.Control 
        type="text"
        placeholder="Ej: Iniciar Atención"
        value={newTransition.name}
        onChange={e => setNewTransition({...newTransition, name: e.target.value})}
        className="border-0 fw-bold"
       />
      </Form.Group>
     </Modal.Body>
     <Modal.Footer className="border-0 pt-0">
      <Button variant="light" onClick={() => setShowModal(false)} className="fw-bold px-4">CANCELAR</Button>
      <Button variant="primary" onClick={handleAddTransition} className="fw-black px-4 shadow">ACTIVAR REGLA</Button>
     </Modal.Footer>
    </Modal>
   </Container>
   <style jsx>{`
    .fw-black { font-weight: 900; }
    .x-small { font-size: 10px; }
   `}</style>
  </Layout>
 );
}
