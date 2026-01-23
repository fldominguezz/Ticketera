import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppNavbar from '../../../components/AppNavbar';
import { Container, Card, Form, Button, Row, Col, Table, Badge } from 'react-bootstrap';
import { Plus, Trash, Save, Layout, Settings, Eye } from 'lucide-react';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'textarea';
  required: boolean;
  options?: string[]; // Para selects
}

export default function FormBuilderPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
      fetchGroups(token);
    }
  }, [router]);

  const fetchGroups = async (token: string) => {
    const res = await fetch('/api/v1/groups/', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setGroups(await res.json());
  };

  const addField = () => {
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'New Field',
      type: 'text',
      required: false
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields?.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    if (!name || !selectedGroup) {
      alert('Please provide a name and select a group.');
      return;
    }

    setSaving(true);
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch('/api/v1/forms/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description,
          group_id: selectedGroup,
          schema: { fields },
          automation_rules: {} // For now empty
        })
      });

      if (res.ok) {
        alert('Form created successfully!');
        router.push('/admin/forms');
      } else {
        const err = await res.json();
        alert('Error: ' + JSON.stringify(err.detail));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Head><title>Form Builder - Ticketera</title></Head>
      <AppNavbar />
      
      <Container className="mt-4 mb-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="fw-bold mb-0">Visual Form Builder</h1>
            <p className="text-muted">Design a custom form for your group</p>
          </div>
          <Button variant="success" size="lg" onClick={handleSave} disabled={saving}>
            <Save size={20} className="me-2" /> {saving ? 'Saving...' : 'Save Form'}
          </Button>
        </div>

        <Row>
          <Col lg={4}>
            <Card className="shadow-sm mb-4">
              <Card.Header className="bg-white py-3 fw-bold">
                <Settings size={18} className="me-2 text-primary" /> General Settings
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Form Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="e.g., Laptop Repair Request" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Description</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={2} 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Owning Group</Form.Label>
                  <Form.Select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
                    <option value="">Select a group...</option>
                    {groups?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Card.Body>
            </Card>

            <Card className="shadow-sm border-primary">
              <Card.Body>
                <h6 className="fw-bold mb-3 d-flex align-items-center">
                  <Layout size={18} className="me-2 text-primary" /> Preview Information
                </h6>
                <p className="small text-muted mb-0">
                  Total Fields: {fields.length}
                </p>
                <hr />
                <div className="d-grid">
                  <Button variant="outline-primary" onClick={() => console.log(fields)}>
                    <Eye size={16} className="me-2" /> Inspect Schema (Console)
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={8}>
            <Card className="shadow-sm">
              <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Form Structure</h5>
                <Button variant="primary" size="sm" onClick={addField}>
                  <Plus size={16} className="me-1" /> Add Field
                </Button>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="ps-4">Field Label</th>
                      <th>Type</th>
                      <th className="text-center">Req?</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.length > 0 ? fields?.map((field) => (
                      <tr key={field.id} className="align-middle">
                        <td className="ps-4" style={{ width: '40%' }}>
                          <Form.Control 
                            size="sm" 
                            type="text" 
                            value={field.label} 
                            onChange={e => updateField(field.id, { label: e.target.value })} 
                          />
                        </td>
                        <td style={{ width: '30%' }}>
                          <Form.Select 
                            size="sm" 
                            value={field.type} 
                            onChange={e => updateField(field.id, { type: e.target.value as any })}
                          >
                            <option value="text">Short Text</option>
                            <option value="textarea">Long Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="select">Dropdown</option>
                          </Form.Select>
                        </td>
                        <td className="text-center">
                          <Form.Check 
                            type="checkbox" 
                            checked={field.required} 
                            onChange={e => updateField(field.id, { required: e.target.checked })} 
                          />
                        </td>
                        <td className="text-center">
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => removeField(field.id)}
                            className="border-0"
                          >
                            <Trash size={16} />
                          </Button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="text-center py-5 text-muted">
                          <Layout size={40} className="mb-3 opacity-25" />
                          <p>No fields added yet. Click "Add Field" to start building your form.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}
