import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import LocationSelector from '../../components/inventory/LocationSelector';
import { 
  Monitor, 
  Network, 
  ShieldCheck, 
  MapPin, 
  Save, 
  ChevronLeft,
  FileText
} from 'lucide-react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Badge,
  Alert
} from 'react-bootstrap';

const AssetInstallPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const [formData, setFormData] = useState({
    // Asset Data
    hostname: '',
    serial: '',
    asset_tag: '',
    mac_address: '',
    ip_address: '',
    device_type: 'desktop',
    os_name: 'Windows 10',
    os_version: '',
    av_product: 'ESET Endpoint Security',
    status: 'operative',
    criticality: 'medium',
    observations: '',
    
    // Install Record Data
    gde_number: '',
    install_details: {},
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!selectedNode) {
      setError("Debe seleccionar una ubicación en el árbol.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const payload = {
        asset_data: {
          ...formData,
          location_node_id: selectedNode.id
        },
        install_data: {
          gde_number: formData.gde_number,
          observations: formData.observations,
          install_details: {
            os: formData.os_name,
            version: formData.os_version,
            av: formData.av_product
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
        throw new Error(data.detail || 'Error al procesar la instalación');
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
          <h4 className="mb-0 fw-bold">Registro de Instalación / Etiquetado</h4>
        </div>

        {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Row>
            {/* Left Column: Form Details */}
            <Col lg={8}>
              {/* 1. Información del Equipo */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white py-3 border-0 d-flex align-items-center">
                  <Monitor className="me-2 text-primary" size={20} />
                  <h6 className="mb-0 fw-bold">Identificación del Activo</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group controlId="asset-hostname">
                        <Form.Label className="small fw-bold">Hostname *</Form.Label>
                        <Form.Control 
                          name="hostname" value={formData.hostname} onChange={handleChange}
                          placeholder="p.ej. WS-DSI-01" required 
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="asset-serial">
                        <Form.Label className="small fw-bold">Nro Serial</Form.Label>
                        <Form.Control name="serial" value={formData.serial} onChange={handleChange} placeholder="S/N" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="asset-tag">
                        <Form.Label className="small fw-bold">Asset Tag (Etiqueta)</Form.Label>
                        <Form.Control name="asset_tag" value={formData.asset_tag} onChange={handleChange} placeholder="TAG-12345" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="asset-type">
                        <Form.Label className="small fw-bold">Tipo de Dispositivo</Form.Label>
                        <Form.Select name="device_type" value={formData.device_type} onChange={handleChange}>
                          <option value="desktop">PC de Escritorio</option>
                          <option value="notebook">Notebook</option>
                          <option value="server">Servidor</option>
                          <option value="tablet">Tablet</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* 2. Red y Software */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white py-3 border-0 d-flex align-items-center">
                  <Network className="me-2 text-info" size={20} />
                  <h6 className="mb-0 fw-bold">Red y Sistema</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group controlId="asset-ip">
                        <Form.Label className="small fw-bold">Dirección IP</Form.Label>
                        <Form.Control name="ip_address" value={formData.ip_address} onChange={handleChange} placeholder="10.x.x.x" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="asset-mac">
                        <Form.Label className="small fw-bold">Dirección MAC</Form.Label>
                        <Form.Control name="mac_address" value={formData.mac_address} onChange={handleChange} placeholder="00:00:00:00:00:00" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="asset-os-name">
                        <Form.Label className="small fw-bold">Sistema Operativo</Form.Label>
                        <Form.Control name="os_name" value={formData.os_name} onChange={handleChange} placeholder="Windows 11 / Debian 12" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="asset-os-version">
                        <Form.Label className="small fw-bold">Versión / Build</Form.Label>
                        <Form.Control name="os_version" value={formData.os_version} onChange={handleChange} placeholder="22H2" />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* 3. Seguridad y SOC */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white py-3 border-0 d-flex align-items-center">
                  <ShieldCheck className="me-2 text-success" size={20} />
                  <h6 className="mb-0 fw-bold">Protección y Seguridad</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Group controlId="asset-av">
                        <Form.Label className="small fw-bold">Solución Antivirus / EDR</Form.Label>
                        <Form.Select name="av_product" value={formData.av_product} onChange={handleChange}>
                          <option value="ESET Endpoint Security">ESET Endpoint Security</option>
                          <option value="ESET Cloud">ESET Inspect (Cloud)</option>
                          <option value="FortiEDR">FortiEDR</option>
                          <option value="FortiClient EMS">FortiClient EMS</option>
                          <option value="AV Free">Antivirus Gratuito / Windows Defender</option>
                          <option value="None">Ninguno (Aclarar en obs)</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="asset-criticality">
                        <Form.Label className="small fw-bold">Criticidad del Activo</Form.Label>
                        <Form.Select name="criticality" value={formData.criticality} onChange={handleChange}>
                          <option value="low">Baja (Puesto común)</option>
                          <option value="medium">Media (Oficinas/Adm)</option>
                          <option value="high">Alta (Jefaturas/Dirección)</option>
                          <option value="critical">Crítica (Servidores/Infra)</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="asset-status">
                        <Form.Label className="small fw-bold">Estado Actual</Form.Label>
                        <Form.Select name="status" value={formData.status} onChange={handleChange}>
                          <option value="operative">Operativo</option>
                          <option value="tagging_pending">A Etiquetar</option>
                          <option value="maintenance">Mantenimiento</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* 5. GDE / Administrativo */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white py-3 border-0 d-flex align-items-center">
                  <FileText className="me-2 text-warning" size={20} />
                  <h6 className="mb-0 fw-bold">Documentación y GDE</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Group controlId="asset-gde">
                        <Form.Label className="small fw-bold">Número de GDE / Expediente (Opcional)</Form.Label>
                        <Form.Control name="gde_number" value={formData.gde_number} onChange={handleChange} placeholder="EX-202X-00000000- -APN-..." />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group controlId="asset-observations">
                        <Form.Label className="small fw-bold">Observaciones Obligatorias</Form.Label>
                        <Form.Control 
                          as="textarea" rows={3} name="observations" value={formData.observations} onChange={handleChange}
                          placeholder="Detallar particularidades, por qué se eligió X antivirus, etc." 
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Right Column: Location Selector */}
            <Col lg={4}>
              <Card className="border-0 shadow-sm sticky-top" style={{ top: '100px' }}>
                <Card.Header className="bg-white py-3 border-0 d-flex align-items-center">
                  <MapPin className="me-2 text-danger" size={20} />
                  <h6 className="mb-0 fw-bold">Ubicación en el Árbol *</h6>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    {selectedNode ? (
                      <div className="p-2 border rounded bg-light mb-3">
                        <small className="text-muted d-block">Ubicación seleccionada:</small>
                        <span className="fw-bold text-primary">{selectedNode.path}</span>
                      </div>
                    ) : (
                      <Alert variant="warning" className="small py-2">Seleccione una carpeta del árbol para ubicar el equipo.</Alert>
                    )}
                  </div>
                  <LocationSelector 
                    selectedId={selectedNode?.id} 
                    onSelect={(node) => setSelectedNode(node)} 
                  />

                  <hr />
                  
                  <div className="d-grid">
                    <Button variant="primary" size="lg" type="submit" disabled={loading}>
                      {loading ? 'Guardando...' : <><Save size={18} className="me-2"/> Guardar Ficha</>}
                    </Button>
                    <small className="text-center text-muted mt-2">Se creará/actualizará el activo y quedará auditado.</small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Form>
      </Container>
    </Layout>
  );
};

export default AssetInstallPage;
