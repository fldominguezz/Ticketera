import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { 
  Monitor, Network, ShieldCheck, Save, ChevronLeft, UserCheck, Plus, Trash2, Hash, MapPin
} from 'lucide-react';
import { 
  Container, Row, Col, Card, Form, Button, Badge, Alert
} from 'react-bootstrap';

const AssetInstallPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  const [globalData, setGlobalData] = useState({
    responsible_user_id: '',
    tecnico_instalacion: '',
    tecnico_carga: '',
    gde_number: '',
    status: 'tagging_pending',
  });

  const [devices, setDevices] = useState([{
    id: Math.random().toString(36).substr(2, 9),
    hostname: '',
    serial: '',
    mac_address: '',
    ip_address: '',
    dependencia: '',
    codigo_dependencia: '',
    device_type: 'desktop',
    os_name: 'Windows 10',
    os_version: '',
    av_product: 'ESET CLOUD',
    observations: '',
  }]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((u: any) => 
          !['fortisiem', 'admin', 'system'].includes(u.username.toLowerCase())
        );
        setUsers(filtered);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const formatMac = (value: string) => {
    let cleaned = value.replace(/[^0-9a-fA-F]/g, '');
    cleaned = cleaned.substring(0, 12);
    let formatted = cleaned.match(/.{1,2}/g)?.join(':') || cleaned;
    return formatted.toUpperCase();
  };

  const formatIp = (value: string) => {
    return value.replace(/[^0-9.]/g, '');
  };

  const handleGlobalChange = (e: any) => {
    const { name, value } = e.target;
    setGlobalData(prev => ({ ...prev, [name]: value }));
  };

  const handleDeviceChange = (id: string, e: any) => {
    const { name, value } = e.target;
    setDevices(prev => prev.map(dev => {
      if (dev.id === id) {
        if (name === 'mac_address') return { ...dev, [name]: formatMac(value) };
        if (name === 'ip_address') return { ...dev, [name]: formatIp(value) };
        if (name === 'codigo_dependencia') return { ...dev, [name]: value.replace(/\D/g, '') };
        return { ...dev, [name]: value };
      }
      return dev;
    }));
  };

  const addDevice = () => {
    setDevices(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      hostname: '',
      serial: '',
      mac_address: '',
      ip_address: '',
      dependencia: '',
      codigo_dependencia: '',
      device_type: 'desktop',
      os_name: 'Windows 10',
      os_version: '',
      av_product: 'ESET CLOUD',
      observations: '',
    }]);
  };

  const removeDevice = (id: string) => {
    if (devices.length > 1) {
      setDevices(prev => prev.filter(dev => dev.id !== id));
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      
      for (const dev of devices) {
        const payload = {
          asset_data: {
            hostname: dev.hostname,
            serial: dev.serial,
            mac_address: dev.mac_address,
            ip_address: dev.ip_address,
            dependencia: dev.dependencia,
            codigo_dependencia: dev.codigo_dependencia,
            device_type: dev.device_type,
            os_name: dev.os_name,
            os_version: dev.os_version,
            av_product: dev.av_product,
            status: globalData.status,
            observations: dev.observations,
            responsible_user_id: globalData.responsible_user_id || null,
            location_node_id: null
          },
          install_data: {
            gde_number: globalData.gde_number,
            tecnico_instalacion: globalData.tecnico_instalacion,
            tecnico_carga: globalData.tecnico_carga,
            observations: dev.observations,
            install_details: {
              os: dev.os_name,
              version: dev.os_version,
              av: dev.av_product
            }
          }
        };

        const res = await fetch('/api/v1/assets/install', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(`Error en equipo ${dev.hostname || '(sin nombre)'}: ${data.detail || 'Error desconocido'}`);
        }
      }

      router.push('/inventory');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Nueva Ficha de Instalación">
      <Container className="py-2">
        <div className="mb-4 d-flex align-items-center">
          <Button variant="link" onClick={() => router.back()} className="p-0 me-3 text-dark">
            <ChevronLeft size={24} />
          </Button>
          <h4 className="mb-0 fw-bold">Registro de Instalación Multi-Equipo</h4>
        </div>

        {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Row>
            <Col lg={8}>
              {/* Información General de la Instalación */}
              <Card className="border-0 shadow-sm mb-4 bg-light">
                <Card.Header className="bg-transparent py-3 border-0 d-flex align-items-center">
                  <UserCheck className="me-2 text-primary" size={20} />
                  <h6 className="mb-0 fw-bold">Información General de la Instalación</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold">Técnico a cargo (Sistema) *</Form.Label>
                        <Form.Select 
                          name="responsible_user_id" 
                          value={globalData.responsible_user_id} 
                          onChange={handleGlobalChange}
                          required
                        >
                          <option value="">Seleccione un usuario...</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.first_name} {u.last_name} ({u.username})
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold">Estado Inicial</Form.Label>
                        <Form.Select name="status" value={globalData.status} onChange={handleGlobalChange}>
                          <option value="tagging_pending">Pendiente a Etiquetar</option>
                          <option value="operative">Operativo</option>
                          <option value="maintenance">Mantenimiento</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold">Técnico a cargo de la instalación</Form.Label>
                        <Form.Control 
                          name="tecnico_instalacion" value={globalData.tecnico_instalacion} 
                          onChange={handleGlobalChange} placeholder="Nombre del técnico..."
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold">Técnico a cargo de la carga</Form.Label>
                        <Form.Control 
                          name="tecnico_carga" value={globalData.tecnico_carga} 
                          onChange={handleGlobalChange} placeholder="Nombre del técnico..."
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="small fw-bold">Número de GDE / Expediente</Form.Label>
                        <Form.Control 
                          name="gde_number" value={globalData.gde_number} onChange={handleGlobalChange} 
                          placeholder="EX-202X-..." 
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Equipos a Instalar ({devices.length})</h5>
                <Button variant="outline-primary" size="sm" onClick={addDevice} className="fw-bold">
                  <Plus size={16} className="me-1" /> AGREGAR OTRO EQUIPO
                </Button>
              </div>

              {devices.map((device, index) => (
                <Card key={device.id} className="border-0 shadow-sm mb-4 border-start border-4 border-primary">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="d-flex align-items-center">
                        <Badge bg="primary" className="me-2">#{index + 1}</Badge>
                        <h6 className="mb-0 fw-bold text-uppercase text-primary small">Detalles del Activo</h6>
                      </div>
                      {devices.length > 1 && (
                        <Button variant="link" className="text-danger p-0" onClick={() => removeDevice(device.id)}>
                          <Trash2 size={18} />
                        </Button>
                      )}
                    </div>

                    <Row className="g-3">
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="x-small fw-bold">Hostname *</Form.Label>
                          <Form.Control 
                            size="sm" name="hostname" value={device.hostname} 
                            onChange={(e) => handleDeviceChange(device.id, e)} required 
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="x-small fw-bold">IP Address *</Form.Label>
                          <Form.Control 
                            size="sm" name="ip_address" value={device.ip_address} 
                            onChange={(e) => handleDeviceChange(device.id, e)} required
                            placeholder="0.0.0.0"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="x-small fw-bold">MAC Address</Form.Label>
                          <Form.Control 
                            size="sm" name="mac_address" value={device.mac_address} 
                            onChange={(e) => handleDeviceChange(device.id, e)}
                            placeholder="00:00:00..." maxLength={17}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={8}>
                        <Form.Group>
                          <Form.Label className="x-small fw-bold">Dependencia *</Form.Label>
                          <Form.Control 
                            size="sm" name="dependencia" value={device.dependencia} 
                            onChange={(e) => handleDeviceChange(device.id, e)} required
                            placeholder="Ej: Div. Informática"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="x-small fw-bold">Código Dependencia</Form.Label>
                          <Form.Control 
                            size="sm" name="codigo_dependencia" value={device.codigo_dependencia} 
                            onChange={(e) => handleDeviceChange(device.id, e)}
                            placeholder="Solo números"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="x-small fw-bold">Tipo</Form.Label>
                          <Form.Select 
                            size="sm" name="device_type" value={device.device_type} 
                            onChange={(e) => handleDeviceChange(device.id, e)}
                          >
                            <option value="desktop">PC Escritorio</option>
                            <option value="notebook">Notebook</option>
                            <option value="server">Servidor</option>
                            <option value="mobile">Celular</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="x-small fw-bold">S.O. *</Form.Label>
                          <Form.Control 
                            size="sm" name="os_name" value={device.os_name} 
                            onChange={(e) => handleDeviceChange(device.id, e)} required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label className="x-small fw-bold">Antivirus</Form.Label>
                          <Form.Select 
                            size="sm" name="av_product" value={device.av_product} 
                            onChange={(e) => handleDeviceChange(device.id, e)}
                          >
                            <option value="ESET CLOUD">ESET Cloud</option>
                            <option value="FortiClient EMS">FortiClient EMS</option>
                            <option value="Windows Defender">Windows Defender</option>
                            <option value="FortiEDR">FortiEDR</option>
                            <option value="Sin Protección">Sin Protección</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="x-small fw-bold">Observaciones de la Instalación *</Form.Label>
                          <Form.Control 
                            size="sm" as="textarea" rows={1} name="observations" value={device.observations} 
                            onChange={(e) => handleDeviceChange(device.id, e)} required
                            placeholder="Particularidades de este equipo..."
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              ))}

              <div className="d-grid mb-5">
                <Button variant="outline-primary" onClick={addDevice} className="py-3 border-dashed">
                  <Plus size={20} className="me-2" /> AGREGAR OTRO EQUIPO
                </Button>
              </div>
            </Col>

            <Col lg={4}>
              <Card className="border-0 shadow-sm sticky-top" style={{ top: '100px' }}>
                <Card.Header className="bg-white py-3 border-0 d-flex align-items-center">
                  <Save className="me-2 text-primary" size={20} />
                  <h6 className="mb-0 fw-bold">Finalizar</h6>
                </Card.Header>
                <Card.Body>
                  <p className="small text-muted">Complete todos los campos obligatorios antes de guardar.</p>
                  <div className="d-grid">
                    <Button variant="primary" size="lg" type="submit" disabled={loading}>
                      {loading ? 'Guardando...' : <><Save size={18} className="me-2"/> Guardar Todo</>}
                    </Button>
                    <small className="text-center text-muted mt-2">Se crearán {devices.length} activos.</small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Form>
      </Container>

      <style jsx>{`
        .border-dashed {
          border-style: dashed !important;
          border-width: 2px !important;
        }
        .x-small {
          font-size: 0.75rem;
        }
      `}</style>
    </Layout>
  );
};

export default AssetInstallPage;
