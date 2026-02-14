import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { Container, Table, Button, Card, Form, Modal, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { Plus, Edit, Save, ArrowLeft, Tag, Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';
import { useTheme } from '../../context/ThemeContext';

export default function TicketTypesPage() {
 const router = useRouter();
 const { theme } = useTheme();
 const isDark = theme === 'dark';
 const [types, setTypes] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [showModal, setShowModal] = useState(false);
 const [editingType, setEditingType] = useState<any>(null);
 const [error, setError] = useState('');
 
 const [formData, setFormData] = useState({ name: '', description: '', color: '#0d6efd', icon: 'Ticket' });

 useEffect(() => { fetchTypes(); }, []);

 const fetchTypes = async () => {
  try {
   const token = localStorage.getItem('access_token');
   const res = await fetch('/api/v1/ticket-types', { headers: { 'Authorization': `Bearer ${token}` } });
   if (res.ok) setTypes(await res.json());
  } catch (e) { setError('Error loading ticket types'); }
  finally { setLoading(false); }
 };

 const handleShow = (type: any = null) => {
  if (type) {
   setEditingType(type);
   setFormData({ name: type.name, description: type.description || '', color: type.color || '#0d6efd', icon: type.icon || 'Ticket' });
  } else {
   setEditingType(null);
   setFormData({ name: '', description: '', color: '#0d6efd', icon: 'Ticket' });
  }
  setShowModal(true);
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const token = localStorage.getItem('access_token');
  const method = editingType ? 'PUT' : 'POST';
  const url = editingType ? `/api/v1/ticket-types/${editingType.id}` : '/api/v1/ticket-types';
  try {
   const res = await fetch(url, {
    method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
   });
   if (res.ok) { setShowModal(false); fetchTypes(); }
  } catch (e) { setError('Connection error'); }
 };

 return (
  <Layout title="Tipos de Ticket">
   <Container>
    <div className="d-flex justify-content-between align-items-center mb-4">
     <div className="d-flex align-items-center">
      <Button variant="link" className="text-muted p-0 me-3" onClick={() => router.push('/admin')}><ArrowLeft size={24} /></Button>
      <h2 className="fw-bold mb-0 text-body">Categorías de Ticket</h2>
     </div>
     <Button variant="primary" onClick={() => handleShow()} className="shadow-sm fw-bold"><Plus size={18} className="me-2" /> NUEVO TIPO</Button>
    </div>

    <Card className="border-0 shadow-sm overflow-hidden">
     <Table hover responsive variant={isDark ? 'dark' : undefined} className="mb-0 align-middle">
      <thead className={isDark ? 'bg-black' : ''}>
       <tr className="small text-uppercase text-muted opacity-75">
        <th className="ps-4 py-3">Nombre</th>
        <th>Descripción</th>
        <th>Color</th>
        <th className="text-end pe-4">Acciones</th>
       </tr>
      </thead>
      <tbody>
       {loading ? (
        <tr><td colSpan={4} className="text-center py-5"><Spinner animation="border" size="sm" /></td></tr>
       ) : types.map(ticket => (
        <tr key={ticket.id}>
         <td className="ps-4">
          <div className="d-flex align-items-center">
           <div className="p-2 rounded me-2" style={{ backgroundColor: ticket.color + '22', color: ticket.color }}><Tag size={16} /></div>
           <span className="fw-bold">{ticket.name}</span>
          </div>
         </td>
         <td className="small text-muted">{ticket.description || 'Sin descripción'}</td>
         <td><div className="d-flex align-items-center"><div className="me-2 rounded-circle" style={{ width: '12px', height: '12px', backgroundColor: ticket.color }}></div><code className="x-small opacity-75">{ticket.color}</code></div></td>
         <td className="text-end pe-4">
          <Button variant={isDark ? 'dark' : 'light'} size="sm" className="me-2 border " onClick={() => handleShow(ticket)}><Edit size={14} /></Button>
         </td>
        </tr>
       ))}
      </tbody>
     </Table>
    </Card>
   </Container>

   <Modal show={showModal} onHide={() => setShowModal(false)} centered>
    <Modal.Header closeButton><Modal.Title className="h6 fw-bold">CATEGORÍA</Modal.Title></Modal.Header>
    <Form onSubmit={handleSubmit}><Modal.Body>
      <Form.Group className="mb-3" controlId="type-name">
       <Form.Label className="x-small fw-bold text-muted">NOMBRE</Form.Label>
       <Form.Control id="type-name" name="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
      </Form.Group>
      <Form.Group className="mb-3" controlId="type-description">
       <Form.Label className="x-small fw-bold text-muted">DESCRIPCIÓN</Form.Label>
       <Form.Control id="type-description" name="description" as="textarea" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
      </Form.Group>
      <Row>
       <Col md={6}>
        <Form.Group className="mb-3" controlId="type-color">
         <Form.Label className="x-small fw-bold text-muted">COLOR</Form.Label>
         <Form.Control id="type-color" name="color" type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
        </Form.Group>
       </Col>
      </Row>
     </Modal.Body><Modal.Footer className="border-0">
      <Button variant="link" onClick={() => setShowModal(false)} className="text-muted text-decoration-none">Cancelar</Button>
      <Button variant="primary" type="submit" className="fw-bold">GUARDAR</Button>
     </Modal.Footer></Form>
   </Modal>
  </Layout>
 );
}