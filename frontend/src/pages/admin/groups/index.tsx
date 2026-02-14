import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { Container, Row, Col, Card, Button, Spinner, Badge, Modal, Form } from 'react-bootstrap';
import { Users, Plus, Edit3, Trash2, FolderTree, Info } from 'lucide-react';
import api from '../../../lib/api';
import { TreeExplorer } from '../../../components/common/TreeExplorer';

export default function GroupsManagement() {
 const [treeData, setTreeData] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedGroup, setSelectedGroup] = useState<any>(null);
 const [showModal, setShowModal] = useState(false);
 const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
 const [newGroup, setNewGroup] = useState({ name: '', description: '', parent_id: '' });

 const fetchTree = async () => {
  setLoading(true);
  try {
   const res = await api.get('/groups/tree');
   setTreeData(res.data);
  } catch (err) {
   console.error('Error fetching group tree:', err);
  } finally {
   setLoading(false);
  }
 };

 useEffect(() => {
  fetchTree();
 }, []);

 const handleOpenModal = (group: any = null) => {
  if (group) {
   setEditingGroupId(group.id);
   setNewGroup({
    name: group.name,
    description: group.description || '',
    parent_id: group.parent_id || ''
   });
  } else {
   setEditingGroupId(null);
   setNewGroup({ name: '', description: '', parent_id: '' });
  }
  setShowModal(true);
 };

 const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
   if (editingGroupId) {
    await api.put(`/groups/${editingGroupId}`, newGroup);
   } else {
    await api.post('/groups', {
     ...newGroup,
     parent_id: selectedGroup?.id || null
    });
   }
   setShowModal(false);
   setNewGroup({ name: '', description: '', parent_id: '' });
   fetchTree();
   // Si editamos el seleccionado, recargar sus datos
   if (selectedGroup && editingGroupId === selectedGroup.id) {
     const res = await api.get('/groups/tree'); // O un endpoint de get group simple
     // Aquí idealmente refrescaríamos el selectedGroup desde el árbol nuevo
   }
  } catch (err: any) {
   alert(err.response?.data?.detail || 'Error al procesar grupo');
  }
 };

 const handleDeleteGroup = async (group: any) => {
  if (!confirm(`¿Está seguro de que desea eliminar el grupo "${group.name}"? Se perderá la jerarquía asociada.`)) return;
  try {
   await api.delete(`/groups/${group.id}`);
   setSelectedGroup(null);
   fetchTree();
  } catch (err: any) {
   alert(err.response?.data?.detail || 'Error al eliminar grupo');
  }
 };

 return (
  <Layout title="Gestión Jerárquica de Grupos">
   <Container fluid className="py-4">
    <div className="d-flex justify-content-between align-items-center mb-4">
     <div>
      <h4 className="fw-black m-0 uppercase tracking-tighter d-flex align-items-center text-main">
       <FolderTree className="me-2 text-primary" size={24} /> ESTRUCTURA ORGANIZACIONAL
      </h4>
      <small className="text-muted fw-bold uppercase x-small">Define la jerarquía de mando y visibilidad</small>
     </div>
     <Button variant="primary" size="sm" className="fw-bold d-flex align-items-center gap-2" onClick={() => handleOpenModal()}>
       <Plus size={16} /> NUEVO GRUPO RAÍZ
     </Button>
    </div>

    <Row>
     <Col lg={4}>
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden mb-4 bg-card">
       <div className="bg-primary bg-opacity-10 p-3 border-bottom border-color">
        <span className="x-small fw-black text-primary uppercase tracking-widest">Árbol de Grupos</span>
       </div>
       <Card.Body className="p-2 bg-card" style={{ minHeight: '400px' }}>
        {loading ? (
         <div className="text-center py-5"><Spinner size="sm" variant="primary" /></div>
        ) : (
         <TreeExplorer data={treeData} type="groups" onSelect={(node) => setSelectedGroup(node)} />
        )}
       </Card.Body>
      </Card>
     </Col>

     <Col lg={8}>
      {selectedGroup ? (
       <Card className="border-0 shadow-sm rounded-xl overflow-hidden border-color bg-card">
        <Card.Body className="p-4">
         <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
           <Badge bg="primary" className="mb-2 x-small uppercase">GRUPO SELECCIONADO</Badge>
           <h2 className="fw-black m-0 tracking-tighter uppercase text-main">{selectedGroup.name}</h2>
           <p className="text-muted mt-2">{selectedGroup.description || 'Sin descripción'}</p>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-primary" size="sm" onClick={() => handleOpenModal(selectedGroup)}><Edit3 size={14} /></Button>
            <Button variant="outline-danger" size="sm" onClick={() => handleDeleteGroup(selectedGroup)}><Trash2 size={14} /></Button>
          </div>
         </div>

         <hr className="border-color my-4" />

         <Row className="g-4">
          <Col md={6}>
            <div className="p-3 rounded border border-color bg-surface">
             <h6 className="x-small fw-black text-muted uppercase mb-3">Subgrupos Directos</h6>
             {selectedGroup.children?.length > 0 ? (
              selectedGroup.children.map((child: any) => (
               <div key={child.id} className="d-flex align-items-center gap-2 mb-2 p-2 bg-card rounded border border-color shadow-sm">
                 <Users size={12} className="text-primary" />
                 <span className="small fw-bold text-main">{child.name}</span>
               </div>
              ))
             ) : (
              <div className="text-muted x-small italic">No hay subgrupos</div>
             )}
             <Button variant="link" className="p-0 mt-3 x-small text-primary fw-bold text-decoration-none" onClick={() => handleOpenModal({ parent_id: selectedGroup.id })}>
               + AGREGAR SUBGRUPO
             </Button>
            </div>
          </Col>
          <Col md={6}>
            <div className="p-3 rounded border border-color bg-surface h-100">
             <h6 className="x-small fw-black text-muted uppercase mb-3">Estadísticas Operativas</h6>
             <div className="d-flex align-items-center gap-3 mb-3">
               <div className="text-center">
                <h4 className="fw-black m-0 text-main">{selectedGroup.stats?.tickets_total ?? 0}</h4>
                <div className="x-small text-muted fw-bold">TICKETS</div>
               </div>
               <div className="text-center ps-3 border-start border-color">
                <h4 className={`fw-black m-0 ${selectedGroup.stats?.sla_ok_pct < 80 ? 'text-danger' : 'text-success'}`}>
                  {selectedGroup.stats?.sla_ok_pct ?? 100}%
                </h4>
                <div className="x-small text-muted fw-bold">SLA OK</div>
               </div>
             </div>
            </div>
          </Col>
         </Row>
        </Card.Body>
       </Card>
      ) : (
       <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted border border-color rounded-xl bg-surface py-5 shadow-inner">
        <Info size={48} className="mb-3 opacity-20" />
        <span className="fw-bold uppercase tracking-widest">Selecciona un grupo para gestionar</span>
       </div>
      )}
     </Col>
    </Row>
   </Container>

   {/* Modal Crear / Editar */}
   <Modal show={showModal} onHide={() => setShowModal(false)} centered contentClassName="bg-card border-color">
    <Modal.Header closeButton className="border-color">
     <Modal.Title className="x-small fw-black uppercase text-primary">
      {editingGroupId ? 'Editar Grupo' : (selectedGroup ? `Añadir Subgrupo a ${selectedGroup.name}` : 'Nuevo Grupo Raíz')}
     </Modal.Title>
    </Modal.Header>
    <Modal.Body className="p-4 bg-card">
     <Form onSubmit={handleSave}>
      <Form.Group className="mb-3" controlId="group-name">
       <Form.Label className="x-small fw-bold text-muted uppercase">Nombre del Grupo *</Form.Label>
       <Form.Control 
        id="group-name"
        name="name"
        className="bg-surface text-main border-color shadow-none" 
        required
        value={newGroup.name}
        onChange={e => setNewGroup({...newGroup, name: e.target.value})}
       />
      </Form.Group>
      <Form.Group className="mb-3" controlId="group-description">
       <Form.Label className="x-small fw-bold text-muted uppercase">Descripción</Form.Label>
       <Form.Control 
        id="group-description"
        name="description"
        as="textarea" rows={3}
        className="bg-surface text-main border-color shadow-none"
        value={newGroup.description}
        onChange={e => setNewGroup({...newGroup, description: e.target.value})}
       />
      </Form.Group>
      <div className="d-flex justify-content-end gap-2 mt-4">
        <Button variant="outline-primary" size="sm" onClick={() => setShowModal(false)}>CANCELAR</Button>
        <Button variant="primary" size="sm" type="submit" className="fw-bold px-4">
          {editingGroupId ? 'ACTUALIZAR' : 'CREAR'}
        </Button>
      </div>
     </Form>
    </Modal.Body>
   </Modal>

   <style jsx>{`
    .rounded-xl { border-radius: 1.5rem; }
    .x-small { font-size: 10px; }
    .fw-black { font-weight: 900; }
    .tracking-tighter { letter-spacing: -0.05em; }
   `}</style>
  </Layout>
 );
}
