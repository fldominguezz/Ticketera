import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppNavbar from '../../../components/AppNavbar';
import { Container, Table, Button, Card, Modal, Form, Row, Col } from 'react-bootstrap';
import { Users, Plus, Edit, Trash2, FolderTree, Info } from 'lucide-react';

export default function AdminGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    parent_group_id: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    } else {
      fetchGroups(token);
    }
  }, [router]);

  const fetchGroups = async (token: string) => {
    try {
      const res = await fetch('/api/v1/groups/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setGroups(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreateGroup = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch('/api/v1/groups/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newGroup)
      });
      if (res.ok) {
        setShowModal(false);
        fetchGroups(token!);
        setNewGroup({ name: '', description: '', parent_group_id: '' });
      } else {
        const err = await res.json();
        alert("Error: " + JSON.stringify(err.detail));
      }
    } catch (e) { console.error(e); }
  };

  return (
    <>
      <Head><title>Manage Groups - Ticketera</title></Head>
      <AppNavbar />
      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="fw-bold mb-0">Organizational Structure</h1>
            <p className="text-muted">Define departments, areas and access hierarchies</p>
          </div>
          <Button variant="primary" onClick={() => setShowModal(true)} className="d-flex align-items-center px-4 py-2">
            <Plus size={18} className="me-2" /> New Group
          </Button>
        </div>

        <Row>
          <Col lg={8}>
            <Card className="shadow-sm border-0">
              <Card.Body className="p-0">
                <Table responsive hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="ps-4">Group Name</th>
                      <th>Parent ID</th>
                      <th>Description</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.length > 0 ? groups?.map((g: any) => (
                      <tr key={g.id} className="align-middle">
                        <td className="ps-4 py-3 fw-bold">
                          <Users size={16} className="me-2 text-primary" />
                          {g.name}
                        </td>
                        <td><code className="small text-muted">{g.parent_group_id?.substring(0, 8) || 'Root'}</code></td>
                        <td className="small text-muted">{g.description}</td>
                        <td className="text-center">
                          <Button variant="outline-secondary" size="sm" className="me-2 border-0"><Edit size={16} /></Button>
                          <Button variant="outline-danger" size="sm" className="border-0"><Trash2 size={16} /></Button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="text-center py-5 text-muted">No groups found.</td></tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={4}>
            <Card className="shadow-sm border-0 bg-primary text-white h-100">
              <Card.Body className="d-flex flex-column justify-content-center p-4">
                <FolderTree size={48} className="mb-3 opacity-50" />
                <h5 className="fw-bold">Hierarchical Logic</h5>
                <p className="small mb-4 opacity-75">
                  The organizational structure defines data visibility. Users in parent groups can see information from all their child groups, while sub-areas are isolated from each other.
                </p>
                <div className="bg-white bg-opacity-10 p-3 rounded-3">
                  <div className="d-flex align-items-start small">
                    <Info size={16} className="me-2 mt-1" />
                    <div>
                      <strong>Tip:</strong> Transferring a ticket between groups will automatically audit the change and notify the new area managers.
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton className="border-0">
            <Modal.Title className="fw-bold">Add New Group</Modal.Title>
          </Modal.Header>
          <Modal.Body className="pt-0">
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Group Name</Form.Label>
                <Form.Control type="text" placeholder="e.g. Área SOC" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Parent Group (Optional)</Form.Label>
                <Form.Select value={newGroup.parent_group_id} onChange={e => setNewGroup({...newGroup, parent_group_id: e.target.value})}>
                  <option value="">No Parent (Top Level)</option>
                  {groups?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold">Description</Form.Label>
                <Form.Control as="textarea" rows={3} value={newGroup.description} onChange={e => setNewGroup({...newGroup, description: e.target.value})} />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="light" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateGroup} className="fw-bold px-4">Create Group</Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
}
