import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useTheme } from '../../context/ThemeContext';
import { 
 Shield, Plus, Edit2, Trash2, Lock as LockIcon, CheckSquare, Square, 
 LayoutDashboard, Info, AlertTriangle, EyeOff, CheckCircle2, ChevronRight,
 Database, ShieldAlert, FileText, Settings, Key
} from 'lucide-react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Spinner, Badge, Alert, Nav, Tab } from 'react-bootstrap';
import api from '../../lib/api';

interface Permission {
 id: string;
 key: string;
 name: string;
 description: string;
 module: string;
}

interface Role {
 id: string;
 name: string;
 description: string;
 permissions: Permission[];
 hidden_nav_items: string[];
}

const NAV_ITEMS = [
 { id: 'dashboard', name: 'Dashboard' },
 { id: 'tickets', name: 'Incident Cases' },
 { id: 'siem-alerts', name: 'SIEM Events' },
 { id: 'inventory', name: 'Asset Inventory' },
 { id: 'daily-report', name: 'Parte Informativo' },
 { id: 'forensics', name: 'EML Analytics' },
 { id: 'compliance', name: 'Compliance' },
 { id: 'audit', name: 'Auditoría Global' },
 { id: 'settings', name: 'Configuración Admin' },
];

export default function RolesPermissionsPage() {
 const [roles, setRoles] = useState<Role[]>([]);
 const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
 const [loading, setLoading] = useState(true);
 const [showModal, setShowModal] = useState(false);
 const [editingRole, setEditingRole] = useState<Role | null>(null);
 
 const [roleName, setRoleName] = useState('');
 const [roleDesc, setRoleDesc] = useState('');
 const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
 const [hiddenNavItems, setHiddenNavItems] = useState<string[]>([]);
 const [saving, setSaving] = useState(false);

 useEffect(() => { fetchData(); }, []);

 const fetchData = async () => {
  setLoading(true);
  try {
   const [rolesRes, permsRes] = await Promise.all([
    api.get('/roles'),
    api.get('/permissions')
   ]);
   setRoles(rolesRes.data);
   setAllPermissions(permsRes.data);
  } catch (err) { console.error(err); }
  finally { setLoading(false); }
 };

 const handleOpenModal = (role: Role | null = null) => {
  if (role) {
   setEditingRole(role);
   setRoleName(role.name);
   setRoleDesc(role.description);
   setSelectedPerms(role.permissions.map(p => p.id));
   setHiddenNavItems(role.hidden_nav_items || []);
  } else {
   setEditingRole(null);
   setRoleName('');
   setRoleDesc('');
   setSelectedPerms([]);
   setHiddenNavItems([]);
  }
  setShowModal(true);
 };

 const handleSave = async () => {
  setSaving(true);
  try {
   const payload = { name: roleName, description: roleDesc, permission_ids: selectedPerms, hidden_nav_items: hiddenNavItems };
   if (editingRole) await api.put(`/roles/${editingRole.id}`, payload);
   else await api.post('/roles', payload);
   setShowModal(false);
   fetchData();
  } catch (err) { alert('Error al guardar'); }
  finally { setSaving(false); }
 };

 const confirmDelete = async () => {
  if (!editingRole) return;
  if (!window.confirm(`¿Estás seguro de eliminar el rol "${editingRole.name}"? Los usuarios perderán sus accesos.`)) return;
  
  setSaving(true);
  try {
   await api.delete(`/roles/${editingRole.id}`);
   setShowModal(false);
   fetchData();
  } catch (err) { alert('Error al eliminar rol'); }
  finally { setSaving(false); }
 };

 const groupedPermissions = allPermissions.reduce((acc: any, perm) => {
  const mod = (perm.module || 'OTROS').toUpperCase();
  if (!acc[mod]) acc[mod] = [];
  acc[mod].push(perm);
  return acc;
 }, {});

 const categories = Object.keys(groupedPermissions).sort();

 return (
  <Layout title="Matriz de Roles">
   <Container fluid className="py-4">
    <div className="d-flex justify-content-between align-items-center mb-4">
     <h4 className="fw-black m-0 uppercase tracking-tighter">CONFIGURACIÓN DE ROLES</h4>
     <Button variant="primary" onClick={() => handleOpenModal()} className="fw-black px-4 shadow-sm">
      <Plus size={16} className="me-2" /> NUEVO ROL
     </Button>
    </div>

    <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
     <Table hover responsive className="align-middle mb-0">
      <thead>
       <tr className="x-small text-muted uppercase tracking-widest bg-surface-muted">
        <th className="ps-4 py-3">ROL</th>
        <th>DESCRIPCIÓN</th>
        <th className="text-center">CAPACIDADES</th>
        <th className="text-end pe-4">GESTIÓN</th>
       </tr>
      </thead>
      <tbody>
       {roles.map(role => (
        <tr key={role.id} className="border-bottom">
         <td className="ps-4 py-3 fw-bold text-primary">{role.name}</td>
         <td className="small text-muted">{role.description}</td>
         <td className="text-center"><Badge bg="primary" className="bg-opacity-10 text-primary">{role.permissions.length} PERMISOS</Badge></td>
         <td className="text-end pe-4">
          <Button variant="link" size="sm" onClick={() => handleOpenModal(role)} className="text-primary me-2"><Edit2 size={16}/></Button>
         </td>
        </tr>
       ))}
      </tbody>
     </Table>
    </Card>
   </Container>

   <Modal show={showModal} onHide={() => setShowModal(false)} size="xl" centered scrollable contentClassName="border-primary border-opacity-25">
    <Modal.Header closeButton className="bg-surface-muted">
      <Modal.Title className="small fw-black uppercase text-primary tracking-widest">
       EDITOR DE ROL: {roleName || 'NUEVO'}
      </Modal.Title>
    </Modal.Header>
    <Modal.Body className="p-0">
     <Tab.Container id="role-editor-tabs" defaultActiveKey={categories[0]}>
      <Row className="g-0" style={{ minHeight: '600px' }}>
       <Col md={3} className="bg-surface-muted border-end p-3 d-flex flex-column">
        <div className="flex-grow-1">
         <div className="mb-4">
          <h6 className="x-small fw-black text-muted uppercase mb-2">IDENTIDAD</h6>
          <Form.Group controlId="role-name" className="mb-2">
           <Form.Control id="role-name" name="roleName" size="sm" className="shadow-none" value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="Nombre" />
          </Form.Group>
          <Form.Group controlId="role-description" className="mb-3">
           <Form.Control id="role-description" name="roleDesc" size="sm" as="textarea" rows={2} className="shadow-none" value={roleDesc} onChange={e => setRoleDesc(e.target.value)} placeholder="Descripción" />
          </Form.Group>
          
          <h6 className="x-small fw-black text-muted uppercase mb-2">RESTRICCIONES UI</h6>
          <div className="bg-surface p-2 rounded border mb-3" style={{ maxHeight: '150px', overflowY: 'auto' }}>
           {NAV_ITEMS.map(item => (
            <div key={item.id} className="d-flex align-items-center gap-2 mb-1 cursor-pointer" onClick={() => setHiddenNavItems(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])}>
             {hiddenNavItems.includes(item.id) ? <EyeOff size={12} className="text-danger" /> : <CheckCircle2 size={12} className="text-success opacity-50" />}
             <span className="x-small" style={{ color: hiddenNavItems.includes(item.id) ? '#ff4d4d' : 'var(--text-muted)' }}>{item.name}</span>
            </div>
           ))}
          </div>
         </div>

         <Form.Label className="x-small fw-black text-muted uppercase mb-2">MÓDULOS TÉCNICOS</Form.Label>
         <Nav variant="pills" className="flex-column gap-1">
          {categories.map(cat => (
           <Nav.Item key={cat}>
            <Nav.Link eventKey={cat} className="x-small fw-bold py-2 px-3 border ">
             {cat}
            </Nav.Link>
           </Nav.Item>
          ))}
         </Nav>
        </div>

        {editingRole && (
         <div className="mt-4 pt-3 border-top">
          <Button variant="outline-danger" size="sm" className="w-100 fw-bold x-small uppercase d-flex align-items-center justify-content-center gap-2 shadow-none" onClick={confirmDelete}>
           <Trash2 size={14} /> Eliminar este Rol
          </Button>
         </div>
        )}
       </Col>

       <Col md={9} className="p-4 bg-card">
        <Tab.Content>
         {categories.map(cat => (
          <Tab.Pane key={cat} eventKey={cat}>
           <div className="d-flex align-items-center gap-3 mb-4">
            <div className="bg-primary p-2 rounded shadow-sm"><Key size={20} className=""/></div>
            <div>
             <h5 className="fw-black m-0 tracking-tighter">{cat}</h5>
             <small className="text-muted uppercase x-small">Gestionar capacidades específicas del módulo</small>
            </div>
           </div>

           <Row className="g-3">
            {groupedPermissions[cat].map((perm: any) => {
             const isSelected = selectedPerms.includes(perm.id);
             return (
              <Col md={6} lg={4} key={perm.id}>
               <div 
                className={`capability-box p-3 rounded border transition-all h-100 ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedPerms(prev => prev.includes(perm.id) ? prev.filter(id => id !== perm.id) : [...prev, perm.id])}
               >
                <div className="d-flex align-items-start gap-2">
                 {isSelected ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="opacity-25" />}
                 <div className="overflow-hidden">
                  <div className="fw-bold x-small uppercase text-truncate mb-1">{perm.name}</div>
                  <div className="text-muted lh-sm" style={{ fontSize: '10px' }}>{perm.description}</div>
                  <code className="text-primary d-block mt-2" style={{ fontSize: '8px', opacity: 0.5 }}>{perm.key}</code>
                 </div>
                </div>
               </div>
              </Col>
             );
            })}
           </Row>
          </Tab.Pane>
         ))}
        </Tab.Content>
       </Col>
      </Row>
     </Tab.Container>
    </Modal.Body>
    <Modal.Footer className="bg-surface-muted">
     <Button variant="primary" onClick={handleSave} disabled={saving || !roleName} className="fw-black w-100 py-3 uppercase x-small tracking-widest shadow-lg">
      {saving ? <Spinner animation="border" size="sm" /> : 'Sincronizar Privilegios en el Sistema'}
     </Button>
    </Modal.Footer>
   </Modal>

   <style jsx global>{`
    .rounded-xl { border-radius: 1rem; }
    .fw-black { font-weight: 900; }
    .x-small { font-size: 11px; }
    .capability-box { 
     background: var(--bg-surface); 
     border-color: var(--border-subtle); 
     cursor: pointer;
    }
    .capability-box:hover { background: var(--bg-surface-muted); }
    .capability-box.active { 
     background: var(--primary-muted); 
     border-color: var(--primary); 
    }
    #role-editor-tabs .nav-link {
     color: var(--text-muted);
     border: 1px solid transparent;
     text-align: left;
     transition: all 0.2s;
    }
    #role-editor-tabs .nav-link.active {
     background: var(--primary-muted) !important;
     color: var(--primary) !important;
     border-color: var(--primary) !important;
    }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    [data-theme='dark'] .custom-scrollbar::-webkit-scrollbar-thumb,
    [data-theme='soc'] .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
   `}</style>
  </Layout>
 );
}