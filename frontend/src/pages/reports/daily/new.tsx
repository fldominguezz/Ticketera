import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, ProgressBar, InputGroup, Spinner } from 'react-bootstrap';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { ArrowLeft } from 'lucide-react';
import api from '../../../lib/api';
import { LicenseConfig } from '../../../types/dailyReport';

export default function NewDailyReport() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [licensesMax, setLicensesMax] = useState<LicenseConfig | null>(null);
  
  // Form State
  const [date, setDate] = useState('');
  const [shift, setShift] = useState('DIA');
  
  // Tools
  const createToolState = () => ({ health: 'OK', obs: '' });
  const [tools, setTools] = useState<Record<string, any>>({
    fortisiem: createToolState(),
    fortisandbox: createToolState(),
    forticlient_ems: createToolState(),
    fortianalyzer: createToolState(),
    fortiedr: createToolState(),
    eset_soc: createToolState(),
    eset_bienestar: createToolState(),
  });
  
  const [correoObs, setCorreoObs] = useState('');
  const [novedadesGenerales, setNovedadesGenerales] = useState('');

  // Licenses & Counters
  const [licenses, setLicenses] = useState({
    eset_soc_lic_usadas: 0,
    eset_soc_mobile_usadas: 0,
    eset_bienestar_lic_usadas: 0,
    ems_lic_usadas: 0
  });

  const [counters, setCounters] = useState({
    eset_bienestar_incidentes: '-?-',
    edr_colectores_ws: '-?-',
    edr_colectores_srv: '-?-',
    bloqueo_srd: '-?-',
    bloqueo_cfd: '-?-'
  });

  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
    api.get('/reports/daily/config/licenses')
      .then(res => setLicensesMax(res.data))
      .catch(err => {
        console.error('Error loading config:', err);
        setLicensesMax({
          ESET_SOC_LIC_MAX: 700,
          ESET_SOC_MOBILE_LIC_MAX: 700,
          ESET_BIENESTAR_LIC_MAX: 1550,
          EMS_LIC_MAX: 1000
        });
      });
  }, []);

  const handleToolChange = (tool: string, field: string, value: string) => {
    setTools(prev => ({
      ...prev,
      [tool]: { ...prev[tool], [field]: value }
    }));
  };

  const handleLicenseChange = (key: string, value: string) => {
    const num = parseInt(value) || 0;
    setLicenses(prev => ({ ...prev, [key]: num }));
  };

  const handleCounterChange = (key: string, value: string) => {
    setCounters(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const missingTools = Object.entries(tools).filter(([_, val]) => !val.health.trim());
    if (missingTools.length > 0) {
      alert('Por favor, complete el Estado de Salud de todas las herramientas.');
      return;
    }

    setSubmitting(true);
    
    try {
      const payload = {
        date: date || null,
        shift,
        ...licenses,
        ...counters,
        ...tools,
        correo_obs: correoObs,
        novedades_generales: [novedadesGenerales] // Backend expects a list
      };
      
      await api.post('/reports/daily/', payload);
      alert('Parte creado exitosamente');
      router.push('/reports/daily');
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      alert('Error: ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)));
      console.error('Error al crear parte:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderToolSection = (key: string, label: string) => (
    <Card className="mb-3 border-0 shadow-sm" key={key}>
      <Card.Header className="bg-surface-muted fw-bold border-0">{label}</Card.Header>
      <Card.Body>
        <Row>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label className="x-small fw-bold uppercase text-muted">Estado de Salud</Form.Label>
              <InputGroup>
                <Form.Control 
                  type="text"
                  value={tools[key].health}
                  onChange={(e) => handleToolChange(key, 'health', e.target.value)}
                  placeholder="Ej: OK, CAIDO..."
                  required
                  list={`health-options-${key}`}
                  className="shadow-none"
                />
                <datalist id={`health-options-${key}`}>
                  <option value="OK" />
                  <option value="DEGRADADO" />
                  <option value="CAIDO" />
                  <option value="MANTENIMIENTO" />
                </datalist>
              </InputGroup>
            </Form.Group>
          </Col>
          <Col md={8}>
            <Form.Group className="mb-3">
              <Form.Label className="x-small fw-bold uppercase text-muted">Observaciones</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2}
                value={tools[key].obs}
                onChange={(e) => handleToolChange(key, 'obs', e.target.value)}
                placeholder={`Novedades de ${label}...`}
                className="shadow-none"
              />
            </Form.Group>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );

  const renderLicenseField = (key: keyof typeof licenses, label: string, maxKey: keyof LicenseConfig) => {
    const max = licensesMax ? licensesMax[maxKey] : 100;
    const current = licenses[key];
    const percent = Math.min((current / max) * 100, 100);
    
    return (
      <div className="mb-4" key={key}>
        <div className="d-flex justify-content-between mb-1">
          <label className="fw-medium small">{label}</label>
          <span className="text-muted small">{current} / {max}</span>
        </div>
        <InputGroup className="mb-2">
          <Form.Control 
            type="number"
            min="0"
            max={max}
            value={current}
            onChange={(e) => handleLicenseChange(key, e.target.value)}
            className="shadow-none"
          />
        </InputGroup>
        <ProgressBar now={percent} variant={percent > 90 ? 'danger' : percent > 75 ? 'warning' : 'primary'} style={{height: '6px'}} />
      </div>
    );
  };

  if (!licensesMax) return <Layout><Container className="py-5 text-center">Cargando configuración...</Container></Layout>;

  return (
    <Layout title="Nuevo Parte Informativo">
      <Container className="py-4">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="surface" className="rounded-circle p-2 border shadow-sm" onClick={() => router.back()}>
              <ArrowLeft size={20} />
            </Button>
            <h4 className="m-0 fw-black uppercase tracking-tighter">Generar Nuevo Parte</h4>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          <Row>
            <Col lg={8}>
              {/* Info General */}
              <Card className="mb-4 border-0 shadow-sm">
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="x-small fw-bold uppercase text-muted">Fecha del Reporte</Form.Label>
                        <Form.Control 
                          type="date" 
                          required 
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="shadow-none"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="x-small fw-bold uppercase text-muted">Turno de Guardia</Form.Label>
                        <div className="d-flex gap-2">
                          <Button 
                            type="button"
                            variant={shift === 'DIA' ? 'primary' : 'outline-primary'} 
                            className="flex-grow-1 fw-bold"
                            onClick={() => setShift('DIA')}
                          >DIA</Button>
                          <Button 
                            type="button"
                            variant={shift === 'NOCHE' ? 'primary' : 'outline-primary'} 
                            className="flex-grow-1 fw-bold"
                            onClick={() => setShift('NOCHE')}
                          >NOCHE</Button>
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Contadores */}
              <Card className="mb-4 border-0 shadow-sm">
                <Card.Header className="bg-surface-muted fw-bold border-0">Contadores e Incidentes</Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="x-small fw-bold uppercase text-muted">ESET Bienestar Incidentes</Form.Label>
                        <Form.Control className="shadow-none" value={counters.eset_bienestar_incidentes} onChange={(e) => handleCounterChange('eset_bienestar_incidentes', e.target.value)} />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label className="x-small fw-bold uppercase text-muted">EDR WS</Form.Label>
                        <Form.Control className="shadow-none" value={counters.edr_colectores_ws} onChange={(e) => handleCounterChange('edr_colectores_ws', e.target.value)} />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label className="x-small fw-bold uppercase text-muted">EDR SRV</Form.Label>
                        <Form.Control className="shadow-none" value={counters.edr_colectores_srv} onChange={(e) => handleCounterChange('edr_colectores_srv', e.target.value)} />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="x-small fw-bold uppercase text-muted">Bloqueo SRD</Form.Label>
                        <Form.Control className="shadow-none" value={counters.bloqueo_srd} onChange={(e) => handleCounterChange('bloqueo_srd', e.target.value)} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="x-small fw-bold uppercase text-muted">Bloqueo CFD</Form.Label>
                        <Form.Control className="shadow-none" value={counters.bloqueo_cfd} onChange={(e) => handleCounterChange('bloqueo_cfd', e.target.value)} />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Novedades Generales Simplificadas */}
              <Card className="mb-3 border-0 shadow-sm">
                <Card.Header className="bg-surface-muted fw-bold border-0">Novedades Generales</Card.Header>
                <Card.Body>
                  <Form.Group>
                    <Form.Label className="x-small fw-bold uppercase text-muted">Observaciones del Turno</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={4} 
                      value={novedadesGenerales}
                      onChange={(e) => setNovedadesGenerales(e.target.value)}
                      placeholder="Describa las novedades generales del turno..."
                      className="shadow-none"
                    />
                  </Form.Group>
                </Card.Body>
              </Card>

              {/* Herramientas */}
              {renderToolSection('fortisiem', 'FortiSIEM')}
              {renderToolSection('fortisandbox', 'FortiSandbox')}
              {renderToolSection('forticlient_ems', 'FortiClient EMS')}
              {renderToolSection('fortianalyzer', 'FortiAnalyzer')}
              {renderToolSection('fortiedr', 'FortiEDR')}
              {renderToolSection('eset_soc', 'ESET SOC')}
              {renderToolSection('eset_bienestar', 'ESET Bienestar')}
              
              {/* Correo */}
              <Card className="mb-3 border-0 shadow-sm">
                <Card.Header className="bg-surface-muted fw-bold border-0">Correo Policial</Card.Header>
                <Card.Body>
                  <Form.Group>
                    <Form.Label className="x-small fw-bold uppercase text-muted">Novedades del Correo</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={3} 
                      value={correoObs}
                      onChange={(e) => setCorreoObs(e.target.value)}
                      placeholder="Novedades del correo policial..."
                      className="shadow-none"
                    />
                  </Form.Group>
                </Card.Body>
              </Card>

            </Col>

            <Col lg={4}>
              <div className="sticky-top" style={{top: '80px', zIndex: 1}}>
                <Card className="border-0 shadow-sm mb-4 overflow-hidden">
                  <Card.Header className="bg-primary bg-opacity-10 text-primary fw-bold border-0 py-3 uppercase x-small tracking-widest">Uso de Licencias</Card.Header>
                  <Card.Body>
                    {renderLicenseField('eset_soc_lic_usadas', 'ESET SOC', 'ESET_SOC_LIC_MAX')}
                    {renderLicenseField('eset_soc_mobile_usadas', 'ESET Mobile', 'ESET_SOC_MOBILE_LIC_MAX')}
                    {renderLicenseField('eset_bienestar_lic_usadas', 'ESET Bienestar', 'ESET_BIENESTAR_LIC_MAX')}
                    {renderLicenseField('ems_lic_usadas', 'EMS Desplegadas', 'EMS_LIC_MAX')}
                  </Card.Body>
                </Card>

                <div className="d-grid gap-2">
                  <Button variant="primary" size="lg" type="submit" disabled={submitting} className="fw-black uppercase x-small tracking-widest py-3">
                    {submitting ? <Spinner size="sm" /> : 'Guardar y Generar DOCX'}
                  </Button>
                  <Button type="button" variant="outline-secondary" onClick={() => router.back()} className="fw-bold x-small uppercase">
                    Cancelar
                  </Button>
                </div>
              </div>
            </Col>
          </Row>
        </Form>
      </Container>
      <style jsx>{`
        .fw-black { font-weight: 900; }
        .x-small { font-size: 11px; }
        .tracking-tighter { letter-spacing: -0.05em; }
      `}</style>
    </Layout>
  );
}