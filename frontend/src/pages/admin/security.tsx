import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppNavbar from '../../components/AppNavbar';
import { Container, Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { ShieldCheck, Save, Info, AlertTriangle } from 'lucide-react';

export default function SecuritySettingsPage() {
  const [policy, setPolicy] = useState({
    min_length: 12,
    requires_uppercase: true,
    requires_lowercase: true,
    requires_number: true,
    requires_special_char: true,
    expire_days: 90
  });
  const [saving, setSaving] = useState(false);

  return (
    <>
      <Head><title>Security Settings - Ticketera</title></Head>
      <AppNavbar />
      <Container className="mt-4">
        <div className="mb-4">
          <h1 className="fw-bold mb-0">Global Security Policy</h1>
          <p className="text-muted">Configure authentication hardening and password requirements</p>
        </div>

        <Row>
          <Col lg={7}>
            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-white py-3 fw-bold d-flex align-items-center">
                <ShieldCheck size={18} className="me-2 text-primary" /> Password Complexity
              </Card.Header>
              <Card.Body className="p-4">
                <Form>
                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-bold">Minimum Password Length</Form.Label>
                    <Form.Control type="number" value={policy.min_length} onChange={e => setPolicy({...policy, min_length: parseInt(e.target.value)})} />
                    <Form.Text className="text-muted">NIST recommendations suggest at least 12 characters.</Form.Text>
                  </Form.Group>

                  <div className="d-flex flex-column gap-3">
                    <Form.Check type="switch" label="Require Uppercase Letters (A-Z)" checked={policy.requires_uppercase} onChange={e => setPolicy({...policy, requires_uppercase: e.target.checked})} />
                    <Form.Check type="switch" label="Require Lowercase Letters (a-z)" checked={policy.requires_lowercase} onChange={e => setPolicy({...policy, requires_lowercase: e.target.checked})} />
                    <Form.Check type="switch" label="Require Numbers (0-9)" checked={policy.requires_number} onChange={e => setPolicy({...policy, requires_number: e.target.checked})} />
                    <Form.Check type="switch" label="Require Special Characters (!@#$%...)" checked={policy.requires_special_char} onChange={e => setPolicy({...policy, requires_special_char: e.target.checked})} />
                  </div>

                  <hr className="my-4" />
                  
                  <div className="mb-4">
                    <h6 className="fw-bold text-danger d-flex align-items-center">
                      <AlertTriangle size={18} className="me-2" /> Maintenance Mode
                    </h6>
                    <Form.Check 
                      type="switch" 
                      id="maintenance-switch" 
                      label="Enable Maintenance Mode (Restricts access to non-admins)" 
                      className="mt-2"
                    />
                  </div>

                  <Button variant="primary" className="fw-bold px-4" disabled={saving}>
                    <Save size={18} className="me-2" /> {saving ? 'Applying...' : 'Apply Security Policy'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={5}>
            <Alert variant="info" className="border-0 shadow-sm">
              <div className="d-flex">
                <Info size={24} className="me-3 mt-1" />
                <div>
                  <h6 className="fw-bold">Security Compliance</h6>
                  <p className="small mb-0">Changes to the password policy will be applied to all new passwords and password changes. Existing users will not be forced to change immediately unless expiration is met.</p>
                </div>
              </div>
            </Alert>
          </Col>
        </Row>
      </Container>
    </>
  );
}
