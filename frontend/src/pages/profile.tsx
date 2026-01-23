import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppNavbar from '../components/AppNavbar';
import { Container, Card, Row, Col, Button, Badge, ListGroup, Tabs, Tab, Form, Spinner, Alert } from 'react-bootstrap';
import { Shield, Monitor, Globe, Clock, User as UserIcon, Mail, AlertTriangle } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    } else {
      fetchData(token);
    }
  }, [router]);

  const fetchData = async (token: string) => {
    try {
      setLoading(true);
      const [userRes, sessionsRes] = await Promise.all([
        fetch('/api/v1/users/me', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/sessions/me', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (userRes.ok) setUser(await userRes.json());
      else if (userRes.status === 401) { router.push('/login'); return; }
      else setError('Failed to load profile data');

      if (sessionsRes.ok) setSessions(await sessionsRes.json());
    } catch (e) { 
      console.error(e); 
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100"><Spinner animation="border" variant="primary" /></div>
  );

  if (error) return (
    <Container className="mt-5"><Alert variant="danger">{error}</Alert><Button onClick={() => router.reload()}>Retry</Button></Container>
  );

  if (!user) return null;

  return (
    <>
      <Head><title>My Profile - Ticketera</title></Head>
      <AppNavbar />
      <Container className="mt-4 mb-5">
        <Row>
          <Col lg={4}>
            <Card className="text-center shadow-sm border-0 mb-4 overflow-hidden">
              <div className="bg-primary py-5"></div>
              <Card.Body className="mt-n5">
                <div className="bg-white rounded-circle d-inline-flex align-items-center justify-content-center shadow-sm mb-3" style={{ width: '100px', height: '100px', marginTop: '-50px' }}>
                  <span className="h1 mb-0 text-primary">{user.first_name?.[0] || 'U'}{user.last_name?.[0] || ''}</span>
                </div>
                <h4 className="fw-bold">{user.first_name} {user.last_name}</h4>
                <p className="text-muted small">@{user.username}</p>
                <Badge bg={user.is_superuser ? "danger" : "info"} pill className="px-3">
                  {user.is_superuser ? 'Super Administrator' : 'Staff Member'}
                </Badge>
              </Card.Body>
            </Card>

            <Card className="shadow-sm border-0">
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between align-items-center py-3">
                  <div className="d-flex align-items-center small">
                    <Shield size={16} className="me-2 text-primary" /> <strong>2FA Status</strong>
                  </div>
                  <Badge bg={user.is_2fa_enabled ? "success" : "warning"}>{user.is_2fa_enabled ? "Active" : "Disabled"}</Badge>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center py-3">
                  <div className="d-flex align-items-center small">
                    <Globe size={16} className="me-2 text-primary" /> <strong>Group</strong>
                  </div>
                  <span className="small text-muted">{user.group_id?.substring(0, 8) || 'N/A'}</span>
                </ListGroup.Item>
              </ListGroup>
            </Card>
          </Col>

          <Col lg={8}>
            <Card className="shadow-sm border-0 h-100">
              <Tabs defaultActiveKey="sessions" className="custom-tabs border-bottom">
                <Tab eventKey="account" title="Account" className="p-4">
                  <Form>
                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Label className="small fw-bold">First Name</Form.Label>
                        <Form.Control type="text" defaultValue={user.first_name} readOnly />
                      </Col>
                      <Col md={6}>
                        <Form.Label className="small fw-bold">Last Name</Form.Label>
                        <Form.Control type="text" defaultValue={user.last_name} readOnly />
                      </Col>
                    </Row>
                    <Form.Label className="small fw-bold">Email</Form.Label>
                    <Form.Control type="email" defaultValue={user.email} readOnly />
                  </Form>
                </Tab>
                <Tab eventKey="sessions" title="Sessions" className="p-4">
                  <h6 className="fw-bold mb-3">Recent Activity</h6>
                  <ListGroup variant="flush">
                    {sessions?.other_sessions?.map((s: any) => (
                      <ListGroup.Item key={s.id} className="px-0 py-2 border-0 d-flex justify-content-between">
                        <div className="small"><Monitor size={14} className="me-2"/> {s.ip_address}</div>
                        <span className="text-muted" style={{fontSize:'0.7rem'}}>{new Date(s.created_at).toLocaleString()}</span>
                      </ListGroup.Item>
                    ))}
                    {(!sessions?.other_sessions || sessions.other_sessions.length === 0) && <p className="text-muted small">No other active sessions.</p>}
                  </ListGroup>
                </Tab>
              </Tabs>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}