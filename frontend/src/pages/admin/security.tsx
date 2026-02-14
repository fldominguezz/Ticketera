import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Card, Button, Form, Spinner, Alert, Row, Col, Badge } from 'react-bootstrap';
import { Shield, Save, RefreshCcw, Lock as LockIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

export default function PasswordPolicyPage() {
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<any>(null);

  const fetchPolicy = async () => {
    try {
      const res = await api.get('/admin/configs/password-policy');
      setPolicy(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPolicy(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/configs/password-policy', policy);
      setMessage({ type: 'success', text: 'Política de seguridad actualizada correctamente.' });
    } catch (err) {
      setMessage({ type: 'danger', text: 'Error al guardar la política.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout title="Cargando Política..."><div className="text-center py-5"><Spinner animation="border" /></div></Layout>;

  return (
    <Layout title="Política Global de Seguridad">
      <div className="mb-4">
        <h4 className="fw-black text-uppercase m-0 d-flex align-items-center">
          <Shield className="me-2 text-primary" size={24} /> SEGURIDAD Y CREDENCIALES
        </h4>
        <p className="text-muted small uppercase fw-bold opacity-75 letter-spacing-1">Configuración global de acceso y robustez</p>
      </div>

      {message && <Alert variant={message.type} className="border-0 shadow-sm small d-flex align-items-center gap-2">
        {message.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
        {message.text}
      </Alert>}

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm mb-4">
            <div className="p-3 bg-surface-muted border-bottom border-color d-flex justify-content-between align-items-center">
              <span className="x-small fw-black text-muted uppercase">Reglas de Complejidad</span>
              <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary ">STANDARD PRO</Badge>
            </div>
            <Card.Body className="p-4">
              <Form onSubmit={handleSave}>
                <Row className="g-4 mb-4">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="x-small fw-black text-muted uppercase">Longitud Mínima</Form.Label>
                      <Form.Control 
                        type="number" 
                        className="fw-bold"
                        value={policy?.min_length || 12} 
                        onChange={e => setPolicy({...policy, min_length: parseInt(e.target.value)})}
                      />
                      <Form.Text className="x-small">Se recomiendan 12 caracteres para entornos SOC.</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="x-small fw-black text-muted uppercase">Expiración (Días)</Form.Label>
                      <Form.Control 
                        type="number"
                        placeholder="Nunca expira"
                        value={policy?.expire_days || ''} 
                        onChange={e => setPolicy({...policy, expire_days: e.target.value ? parseInt(e.target.value) : null})}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="bg-surface-muted p-3 rounded border border-color mb-4">
                  <h6 className="x-small fw-black text-muted uppercase mb-3 d-flex align-items-center">
                    <LockIcon size={12} className="me-2"/> Requerimientos Obligatorios
                  </h6>
                  <Row className="g-3">
                    <Col md={6}><Form.Check type="switch" label="Letras Mayúsculas (A-Z)" checked={policy?.requires_uppercase || false} onChange={e => setPolicy({...policy, requires_uppercase: e.target.checked})}/></Col>
                    <Col md={6}><Form.Check type="switch" label="Letras Minúsculas (a-z)" checked={policy?.requires_lowercase || false} onChange={e => setPolicy({...policy, requires_lowercase: e.target.checked})}/></Col>
                    <Col md={6}><Form.Check type="switch" label="Números (0-9)" checked={policy?.requires_number || false} onChange={e => setPolicy({...policy, requires_number: e.target.checked})}/></Col>
                    <Col md={6}><Form.Check type="switch" label="Caracteres Especiales (!@#...)" checked={policy?.requires_special_char || false} onChange={e => setPolicy({...policy, requires_special_char: e.target.checked})}/></Col>
                  </Row>
                </div>

                <div className="bg-primary bg-opacity-5 p-3 rounded border border-primary mb-4">
                  <Form.Check 
                    type="switch" 
                    label={<span className="fw-bold text-primary">FORZAR 2FA (TOTP) PARA TODOS LOS USUARIOS</span>} 
                    checked={policy?.enforce_2fa_all || false} 
                    onChange={e => setPolicy({...policy, enforce_2fa_all: e.target.checked})}
                  />
                  <p className="x-small text-muted mt-2 mb-0">Obliga a configurar Google Authenticator en el primer inicio de sesión.</p>
                </div>

                <div className="text-end border-top border-color pt-4">
                  <Button variant="outline-secondary" size="sm" className="me-2 fw-bold" onClick={fetchPolicy}><RefreshCcw size={14} className="me-2"/> RESTAURAR</Button>
                  <Button variant="primary" size="sm" type="submit" disabled={saving} className="fw-bold px-4 shadow-sm">
                    {saving ? <Spinner size="sm" /> : <Save size={14} className="me-2"/>} GUARDAR CAMBIOS
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm bg-warning bg-opacity-10 border border-warning border-opacity-25">
            <Card.Body className="p-4">
              <h6 className="fw-black text-warning uppercase x-small mb-3 d-flex align-items-center">
                <AlertCircle size={16} className="me-2"/> Aviso de Excepciones
              </h6>
              <p className="small text-main mb-3">
                Esta política <strong>NO se aplica</strong> a cuentas de integración o administración de emergencia marcadas como exentas:
              </p>
              <div className="d-flex flex-column gap-2">
                <div className="p-2 bg-white rounded border border-warning border-opacity-25 d-flex justify-content-between align-items-center">
                  <span className="small fw-bold text-main">@Admin</span>
                  <Badge bg="warning" text="dark" className="x-small">EXENTO</Badge>
                </div>
                <div className="p-2 bg-white rounded border border-warning border-opacity-25 d-flex justify-content-between align-items-center">
                  <span className="small fw-bold text-main">@FortiSIEM</span>
                  <Badge bg="warning" text="dark" className="x-small">EXENTO</Badge>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <style jsx>{'.fw-black { font-weight: 900; }.x-small { font-size: 10px; }.letter-spacing-1 { letter-spacing: 1px; }'}</style>
    </Layout>
  );
}