import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Container, Card, Form, Button, Row, Col, Spinner, Alert, ListGroup, Badge, InputGroup } from 'react-bootstrap';
import { Save, ArrowLeft, AlertCircle, Monitor, Search, X, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

export default function NewTicketPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { asset_id } = router.query;
  const { user: currentUser, isSuperuser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  
  // Asset search states
  const [assets, setAssets] = useState<any[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [searchingAssets, setSearchingAssets] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [showAssetResults, setShowAssetResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ticket_type_id: '',
    group_id: '',
    priority: 'medium',
    platform: 'INTERNO',
    asset_id: (asset_id as string) || ''
  });

  const PLATFORMS = [
    'Forti-EMS', 'ESET CLOUD', 'ESET BIENESTAR', 
    'Forti-SIEM', 'Forti-ANALYZER', 'GDE', 'INTERNO'
  ];

  useEffect(() => {
    fetchMetadata();
    // Handle click outside for asset search results
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowAssetResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (asset_id && assets.length > 0) {
      const found = assets.find(a => a.id === asset_id);
      if (found) {
        setSelectedAsset(found);
        setFormData(prev => ({ ...prev, asset_id: asset_id as string }));
      }
    }
  }, [asset_id, assets]);

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const [typesRes, groupsRes, assetsRes] = await Promise.all([
        fetch('/api/v1/ticket-types', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/groups', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/assets?limit=500', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (typesRes.ok && groupsRes.ok && assetsRes.ok) {
        const typesData = await typesRes.json();
        const groupsData = await groupsRes.json();
        const assetsData = await assetsRes.json();
        
        setAssets(Array.isArray(assetsData) ? assetsData : []);
        
        const filteredTypes = Array.isArray(typesData) 
          ? typesData.filter((t: any) => t.name !== 'FortiSIEM')
          : [];
        setTicketTypes(filteredTypes);
        
        const isAdmin = isSuperuser || currentUser?.is_superuser;
        let filteredGroups = groupsData;
        if (!isAdmin && currentUser?.group_id) {
          filteredGroups = groupsData.filter((g: any) => g.id === currentUser.group_id);
        }
        setGroups(filteredGroups);
        
        if (filteredTypes.length > 0) setFormData(prev => ({ ...prev, ticket_type_id: filteredTypes[0].id }));
        if (filteredGroups.length > 0) setFormData(prev => ({ ...prev, group_id: filteredGroups[0].id }));
      } else {
        setError('Failed to fetch required metadata');
      }
    } catch (e) {
      setError('An error occurred while loading form data');
    } finally {
      setFetching(false);
    }
  };

  const filteredAssets = assets.filter(a => 
    a.hostname.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.ip_address?.includes(assetSearch) ||
    a.mac_address?.toLowerCase().includes(assetSearch.toLowerCase())
  ).slice(0, 10);

  const handleSelectAsset = (asset: any) => {
    setSelectedAsset(asset);
    setFormData({ ...formData, asset_id: asset.id });
    setAssetSearch('');
    setShowAssetResults(false);
  };

  const clearSelectedAsset = () => {
    setSelectedAsset(null);
    setFormData({ ...formData, asset_id: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const payload = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        platform: formData.platform,
        ticket_type_id: formData.ticket_type_id || null,
        group_id: formData.group_id || null,
        asset_id: formData.asset_id || null,
        parent_ticket_id: null,
      };

      const res = await fetch('/api/v1/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/tickets/${data.id}`);
      } else {
        const errData = await res.json();
        setError(typeof errData.detail === 'string' ? errData.detail : 'Failed to create ticket');
      }
    } catch (e) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <Layout title="Nuevo Ticket"><div className="text-center py-5"><Spinner animation="border" variant="primary" /></div></Layout>;

  return (
    <Layout title={t('new_ticket') || 'Nuevo Ticket'}>
      <Container className="py-2">
        <div className="mb-4 d-flex align-items-center">
          <Button variant="link" className="p-0 me-3 text-dark" onClick={() => router.back()}><ArrowLeft size={24} /></Button>
          <h2 className="fw-black mb-0">CREAR NUEVO TICKET</h2>
        </div>

        {error && <Alert variant="danger" className="py-2 border-0 shadow-sm mb-4">{error}</Alert>}

        <Row className="justify-content-center">
          <Col lg={8}>
            <Form onSubmit={handleSubmit}>
              <Card className="shadow-sm border-0 mb-4">
                <Card.Body className="p-4">
                  <h6 className="fw-bold mb-4 text-uppercase text-muted small border-bottom pb-2">Información Básica</h6>
                  
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-bold">Asunto / Título *</Form.Label>
                    <Form.Control 
                      required
                      placeholder="Breve descripción del problema..."
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </Form.Group>

                  <Row className="g-3 mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold">Plataforma / Origen *</Form.Label>
                        <Form.Select 
                          required
                          value={formData.platform}
                          onChange={e => setFormData({ ...formData, platform: e.target.value })}
                        >
                          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold">Tipo de Ticket *</Form.Label>
                        <Form.Select 
                          required
                          value={formData.ticket_type_id}
                          onChange={e => setFormData({ ...formData, ticket_type_id: e.target.value })}
                        >
                          <option value="">Seleccionar...</option>
                          {ticketTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="g-3 mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold">Prioridad *</Form.Label>
                        <Form.Select 
                          required
                          value={formData.priority}
                          onChange={e => setFormData({ ...formData, priority: e.target.value })}
                        >
                          <option value="low">Baja</option>
                          <option value="medium">Media</option>
                          <option value="high">Alta</option>
                          <option value="critical">Crítica</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold">Grupo Responsable *</Form.Label>
                        <Form.Select 
                          required
                          value={formData.group_id}
                          onChange={e => setFormData({ ...formData, group_id: e.target.value })}
                        >
                          <option value="">Seleccionar grupo...</option>
                          {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Asset Linking Section */}
              <Card className="shadow-sm border-0 mb-4 border-start border-4 border-primary">
                <Card.Body className="p-4">
                  <h6 className="fw-bold mb-3 text-uppercase text-primary small border-bottom pb-2">Vincular Equipo del Inventario</h6>
                  
                  {!selectedAsset ? (
                    <div className="position-relative" ref={searchRef}>
                      <InputGroup className="border rounded-pill px-3 py-1">
                        <InputGroup.Text className="bg-transparent border-0"><Search size={18} className="text-muted" /></InputGroup.Text>
                        <Form.Control 
                          placeholder="Buscar por Hostname, IP o MAC..."
                          className="bg-transparent border-0 shadow-none"
                          value={assetSearch}
                          onChange={e => { setAssetSearch(e.target.value); setShowAssetResults(true); }}
                          onFocus={() => setShowAssetResults(true)}
                        />
                      </InputGroup>
                      
                      {showAssetResults && assetSearch.length >= 2 && (
                        <Card className="position-absolute w-100 mt-2 shadow-lg border-0 z-3">
                          <ListGroup variant="flush">
                            {filteredAssets.length > 0 ? (
                              filteredAssets.map(a => (
                                <ListGroup.Item 
                                  key={a.id} 
                                  action 
                                  className="d-flex justify-content-between align-items-center py-2"
                                  onClick={() => handleSelectAsset(a)}
                                >
                                  <div>
                                    <div className="fw-bold small text-primary">{a.hostname}</div>
                                    <div className="x-small text-muted font-monospace">{a.ip_address} | {a.mac_address}</div>
                                  </div>
                                  <Badge bg="light" text="dark" className="border font-monospace x-small">{a.location_name || 'Sin Ubicación'}</Badge>
                                </ListGroup.Item>
                              ))
                            ) : (
                              <ListGroup.Item className="text-center py-3 text-muted small">No se encontraron equipos</ListGroup.Item>
                            )}
                          </ListGroup>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-light rounded border d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary bg-opacity-10 p-2 rounded">
                          <Monitor className="text-primary" size={20} />
                        </div>
                        <div>
                          <div className="fw-bold text-primary">{selectedAsset.hostname}</div>
                          <div className="small text-muted font-monospace">
                            <span className="badge bg-white text-dark border me-2">{selectedAsset.ip_address}</span>
                            <MapPin size={12} className="me-1" /> {selectedAsset.location_name || 'Ubicación Desconocida'}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline-danger" size="sm" onClick={clearSelectedAsset} className="rounded-circle p-1"><X size={16} /></Button>
                    </div>
                  )}
                  <div className="mt-2 x-small text-muted italic">Vincular un equipo permite realizar el seguimiento técnico en el historial del activo.</div>
                </Card.Body>
              </Card>

              <Card className="shadow-sm border-0 mb-4">
                <Card.Body className="p-4">
                  <Form.Group>
                    <Form.Label className="small fw-bold text-uppercase text-muted">Descripción del Incidente *</Form.Label>
                    <Form.Control 
                      as="textarea" rows={6} 
                      placeholder="Detalle aquí toda la información técnica relevante..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Card.Body>
              </Card>

              <div className="d-grid mb-5">
                <Button variant="primary" type="submit" size="lg" disabled={loading} className="fw-bold py-3 shadow">
                  {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <Save size={20} className="me-2" />}
                  GUARDAR Y CREAR TICKET
                </Button>
              </div>
            </Form>
          </Col>
        </Row>
      </Container>
      <style jsx>{`
        .fw-black { font-weight: 900; }
        .x-small { font-size: 10px; }
        .z-3 { z-index: 1050; }
      `}</style>
    </Layout>
  );
}
