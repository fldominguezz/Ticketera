import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppNavbar from '../../components/AppNavbar';
import { Container, Card, Form, Button, Row, Col, Table } from 'react-bootstrap';
import { Plus, Trash, Monitor } from 'lucide-react';

export default function FormsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [installationForm, setInstallationForm] = useState({
      division: '',
      observations: '',
      devices: [{ hostname: '', ip: '', mac: '', product: 'ESET', observations: '' }]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) router.push('/login');
    else setIsAuthenticated(true);
  }, [router]);

  const addDevice = () => {
      setInstallationForm({
          ...installationForm,
          devices: [...installationForm.devices, { hostname: '', ip: '', mac: '', product: 'ESET', observations: '' }]
      });
  };

  const removeDevice = (index: number) => {
      const newDevices = [...installationForm.devices];
      newDevices.splice(index, 1);
      setInstallationForm({ ...installationForm, devices: newDevices });
  };

  const updateDevice = (index: number, field: string, value: string) => {
      const newDevices = [...installationForm.devices];
      (newDevices[index] as any)[field] = value;
      setInstallationForm({ ...installationForm, devices: newDevices });
  };

  const handleSubmit = async (e: any) => {
      e.preventDefault();
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      try {
          // In a real flow, we first fetch or ensure the "Installation Form" ID exists in DB
          // For this 'productive' speed, we will use a direct endpoint or logic
          const res = await fetch('/api/v1/forms/multi-install/submit', { // Special endpoint or handle by name
              method: 'POST',
              headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(installationForm)
          });
          
          if (res.ok) {
              alert("Form submitted successfully! Tickets and Endpoints created.");
              router.push('/tickets');
          } else {
              alert("Submission failed. Ensure backend has the 'multi-install' template seeded.");
          }
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Head><title>Forms - Ticketera</title></Head>
      <AppNavbar />
      <Container className="mt-4 pb-5">
        <h1 className="mb-4 text-primary">Multi-Device Installation Form</h1>
        
        <Form onSubmit={handleSubmit}>
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-dark text-white">General Information</Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Division / Location</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    value={installationForm.division}
                                    onChange={e => setInstallationForm({...installationForm, division: e.target.value})}
                                    placeholder="e.g. Planta 1 - SOC"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>General Observations</Form.Label>
                                <Form.Control 
                                    as="textarea" 
                                    rows={1}
                                    value={installationForm.observations}
                                    onChange={e => setInstallationForm({...installationForm, observations: e.target.value})}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <h3 className="mb-3 d-flex align-items-center">
                <Monitor className="me-2" /> Devices to Install
            </h3>

            {installationForm.devices?.map((device, index) => (
                <Card key={index} className="mb-3 border-left-primary shadow-sm">
                    <Card.Body>
                        <div className="d-flex justify-content-between">
                            <h5>Device #{index + 1}</h5>
                            {installationForm.devices.length > 1 && (
                                <Button variant="outline-danger" size="sm" onClick={() => removeDevice(index)}>
                                    <Trash size={16} />
                                </Button>
                            )}
                        </div>
                        <Row className="mt-2">
                            <Col md={3}>
                                <Form.Group className="mb-2">
                                    <Form.Label>Hostname</Form.Label>
                                    <Form.Control 
                                        size="sm" 
                                        value={device.hostname}
                                        onChange={e => updateDevice(index, 'hostname', e.target.value)}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group className="mb-2">
                                    <Form.Label>IP Address</Form.Label>
                                    <Form.Control 
                                        size="sm" 
                                        value={device.ip}
                                        onChange={e => updateDevice(index, 'ip', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group className="mb-2">
                                    <Form.Label>Product</Form.Label>
                                    <Form.Select 
                                        size="sm"
                                        value={device.product}
                                        onChange={e => updateDevice(index, 'product', e.target.value)}
                                    >
                                        <option value="ESET">ESET</option>
                                        <option value="FortiEDR">FortiEDR</option>
                                        <option value="AV Free">AV Free</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-2">
                                    <Form.Label>MAC / Notes</Form.Label>
                                    <Form.Control 
                                        size="sm" 
                                        value={device.observations}
                                        onChange={e => updateDevice(index, 'observations', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            ))}

            <div className="d-grid gap-2 d-md-flex justify-content-md-start mb-4">
                <Button variant="outline-primary" onClick={addDevice}>
                    <Plus size={18} className="me-1" /> Add Another Device
                </Button>
            </div>

            <hr />
            
            <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                <Button variant="success" size="lg" type="submit" disabled={loading}>
                    {loading ? 'Processing...' : 'Submit Installation Form'}
                </Button>
            </div>
        </Form>
      </Container>
    </>
  );
}
