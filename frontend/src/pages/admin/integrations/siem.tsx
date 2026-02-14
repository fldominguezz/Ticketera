import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { Card, Row, Col, Badge, Button, Form, Alert, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { Zap, Shield, Key, Activity, CheckCircle, AlertCircle, Terminal, Save, RefreshCw } from 'lucide-react';
import api from '../../../lib/api';

const SIEMIntegration = () => {
  const [status, setStatus] = useState<any>({});
  const [config, setConfig] = useState<any>({
    siem_user_id: '',
    default_group_id: '',
    api_username: '',
    api_password: '',
    allowed_ips: '',
    is_active: true
  });
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, configRes, usersRes, groupsRes, typesRes] = await Promise.all([
        api.get('/integrations/status').catch(e => ({ data: {} })),
        api.get('/integrations/siem/config').catch(e => ({ data: {} })),
        api.get('/users').catch(e => ({ data: [] })),
        api.get('/groups').catch(e => ({ data: [] })),
        api.get('/ticket-types').catch(e => ({ data: [] }))
      ]);
      

      setStatus(statusRes.data || {});
      setConfig(configRes.data?.id ? configRes.data : {
        siem_user_id: '',
        default_group_id: '',
        ticket_type_id: '',
        api_username: '',
        api_password: '',
        allowed_ips: '',
        is_active: true
      });
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
      setTicketTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
    } catch (e) {
      console.error('SIEM: Error crítico en fetchData', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await api.get('/integrations/status');
      setStatus(res.data || {});
    } catch (e) { console.error(e); }
  };

  const handleUserChange = (userId: string) => {
    const selectedUser = users.find(u => u.id === userId);
    setConfig((prev: any) => ({
      ...prev,
      siem_user_id: userId,
      api_username: selectedUser ? selectedUser.email : (prev?.api_username || '')
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/integrations/siem/config', config);
      setConfig(res.data || config);
      setToastMsg('Configuración guardada');
      setShowToast(true);
    } catch (e: any) {
      setToastMsg('Error: ' + (e.response?.data?.detail || e.message));
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/integrations/siem/test');
      setTestResult(res.data);
      if (res.data) fetchData();
    } catch (e: any) {
      setTestResult({ status: 'error', message: e.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Integración FortiSIEM">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <p className="text-muted fw-bold">Sincronizando seguridad...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Integración FortiSIEM">
      <ToastContainer position="top-end" className="p-3">
        <Toast show={showToast} onClose={() => setShowToast(false)} delay={3000} autohide bg="dark">
          <Toast.Body className="fw-bold">{toastMsg}</Toast.Body>
        </Toast>
      </ToastContainer>

      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h1 className="fw-black h3 mb-1 uppercase">INTEGRACIÓN SIEM</h1>
          <p className="text-muted small fw-bold opacity-75 uppercase">Control Layer</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={fetchData} className="fw-bold">REFRESH</Button>
          {status?.status === 'online' ? 
            <Badge bg="success" className="px-3 py-2">ACTIVO</Badge> :
            <Badge bg="warning" className="px-3 py-2 ">WAITING</Badge>
          }
        </div>
      </div>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <Form onSubmit={handleSave}>
                <Form.Group className="mb-3">
                  <Form.Label className="x-small fw-bold text-muted uppercase">Cuenta de Servicio</Form.Label>
                  <Form.Select 
                    value={config?.siem_user_id || ''} 
                    onChange={e => handleUserChange(e.target.value)}
                    required
                    className="border-0 fw-bold py-2"
                  >
                    <option value="">Seleccionar cuenta...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name ? `${u.first_name} ${u.last_name}` : u.username} ({u.email})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Row className="g-3">
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label className="x-small fw-bold text-muted uppercase">Tipo de Ticket por Defecto</Form.Label>
                      <Form.Select 
                        value={config?.ticket_type_id || ''} 
                        onChange={e => setConfig({...config, ticket_type_id: e.target.value})}
                        required
                        className="border-0 fw-bold py-2"
                      >
                        <option value="">Seleccionar tipo...</option>
                        {ticketTypes.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted x-small">Categoría que se aplicará a los incidentes recibidos.</Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="x-small fw-bold text-muted uppercase">Grupo SOC</Form.Label>
                      <Form.Select 
                        value={config?.default_group_id || ''} 
                        onChange={e => setConfig({...config, default_group_id: e.target.value})}
                        required
                        className="border-0 fw-bold py-2"
                      >
                        <option value="">Seleccionar grupo...</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                                    <Form.Group className="mb-3">
                                      <Form.Label className="x-small fw-bold text-muted uppercase">API Username</Form.Label>
                                      <Form.Control 
                                        type="text" 
                                        value={config?.api_username || ''} 
                                        readOnly 
                                        className="bg-opacity-5 border-0 fw-bold" 
                                        autoComplete="off"
                                      />
                                    </Form.Group>
                                  </Col>
                                  <Col md={12}>
                                    <Form.Group className="mb-3">
                                      <Form.Label className="x-small fw-bold text-muted uppercase">API Password</Form.Label>
                                      <Form.Control 
                                        type="password" 
                                        value={config?.api_password || ''} 
                                        onChange={e => setConfig({...config, api_password: e.target.value.trim()})}
                                        className="border-0 py-2" 
                                        required
                                        autoComplete="new-password"
                                      />
                                    </Form.Group>
                                  </Col>                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label className="x-small fw-bold text-muted uppercase">IP Allowlist</Form.Label>
                      <Form.Control 
                        type="text" value={config?.allowed_ips || ''} 
                        onChange={e => setConfig({...config, allowed_ips: e.target.value})}
                        className="border-0" placeholder="10.1.78.10"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex justify-content-between align-items-center mt-4">
                  <Form.Check type="switch" label="Activa" checked={config?.is_active || false} onChange={e => setConfig({...config, is_active: e.target.checked})} />
                  <Button variant="primary" type="submit" disabled={saving} className="fw-black px-4">
                    {saving ? <Spinner size="sm" /> : <Save size={16} className="me-2"/>} SAVE
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm  p-4">
            <h6 className="fw-black mb-3 text-success uppercase small"><Terminal size={18} className="me-2"/> Ingestion Log</h6>
            <div className="font-monospace x-small p-3 bg-black rounded" style={{ height: '100px', overflowY: 'auto', color: '#00ff00' }}>
              <div>Listening on: /api/v1/integrations/fortisiem-incident</div>
              {status?.last_event_time && <div className="text-info mt-1">LAST: {new Date(status.last_event_time).toLocaleString()}</div>}
            </div>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="border-0 shadow-sm p-4 h-100">
            <h6 className="fw-black mb-3 small uppercase text-muted">Quick Guide</h6>
            <div className="x-small fw-bold text-muted">
              <p className="mb-2">1. Crear el Target en el FortiSIEM apuntando a este servidor.</p>
              <p className="mb-2">2. Configurar la URL del Webhook: <code className="text-primary">/api/v1/fortisiem-incident</code></p>
              <p className="mb-2">3. Usar Autenticación Básica con el API Username mostrado a la izquierda.</p>
              <p className="mb-0">4. Asegurarse de que el puerto UDP 514 esté abierto en el firewall si se usa Syslog.</p>
            </div>
            <hr />
            <Button variant="outline-primary" className="w-100 mt-2 fw-black x-small uppercase" onClick={handleTest} disabled={testing}>
              {testing ? <Spinner size="sm" /> : <RefreshCw size={14} className="me-2"/>} EJECUTAR DIAGNÓSTICO DE CONEXIÓN
            </Button>
            {testResult && (
              <Alert variant={testResult.status === 'success' ? 'success' : 'danger'} className="mt-3 x-small fw-bold border-0 bg-opacity-10 py-2">
                {testResult.message}
              </Alert>
            )}
          </Card>
        </Col>
      </Row>
    </Layout>
  );
};

export default SIEMIntegration;
