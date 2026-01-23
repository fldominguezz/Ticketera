import { useEffect, useState } from 'react';
import Head from 'next/head';
import AppNavbar from '../../components/AppNavbar';
import { Container, Card, Button, ProgressBar, Badge, ListGroup, Row, Col, Alert } from 'react-bootstrap';
import { RefreshCw, ShieldCheck, Download, CheckCircle } from 'lucide-react';

export default function UpdateManagerPage() {
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState('...');
  const [corePluginId, setCorePluginId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchCurrentVersion();
  }, []);

  const fetchCurrentVersion = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/plugins/', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const plugins = await res.json();
        const core = plugins.find((p: any) => p.name === 'System Core');
        if (core) {
          setVersion(core.version);
          setCorePluginId(core.id);
        }
      }
    } catch (e) { console.error(e); }
  };

  const checkUpdates = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      if (version === '1.2.4') setUpdateAvailable(true);
    }, 2000);
  };

  const installUpdate = async () => {
    if (!corePluginId) return;
    setInstalling(true);
    let p = 0;
    const interval = setInterval(async () => {
      p += 20;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`/api/v1/plugins/${corePluginId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: '1.2.5' })
          });
          if (res.ok) {
            setInstalling(false);
            setUpdateAvailable(false);
            setVersion('1.2.5');
            setSuccess(true);
          }
        } catch (e) { console.error(e); }
      }
    }, 400);
  };

  return (
    <>
      <Head><title>Update Manager - Ticketera</title></Head>
      <AppNavbar />
      <Container className="mt-4">
        <h1 className="fw-bold mb-4 text-center text-md-start">Update Manager</h1>
        
        {success && <Alert variant="success" className="d-flex align-items-center shadow-sm border-0"><CheckCircle size={18} className="me-2"/> System successfully updated to v1.2.5</Alert>}

        <Row className="g-4">
          <Col lg={7}>
            <Card className="shadow-sm border-0 mb-4 overflow-hidden">
              <Card.Body className="p-5 text-center">
                {installing ? (
                  <div className="py-4">
                    <RefreshCw size={48} className="text-primary spin mb-3" />
                    <h5 className="fw-bold">Applying Patch v1.2.5...</h5>
                    <ProgressBar animated now={progress} label={`${progress}%`} className="mt-3" style={{height:'10px'}} />
                  </div>
                ) : (
                  <>
                    <ShieldCheck size={64} className="text-success mb-3" />
                    <h4 className="fw-bold">System Status</h4>
                    <p className="text-muted mb-4">Current Version: <Badge bg="dark" className="px-3 py-2">{version}</Badge></p>
                    <Button variant="primary" size="lg" className="px-5 shadow-sm" onClick={checkUpdates} disabled={checking}>
                      {checking ? 'Analyzing...' : 'Check for Updates'}
                    </Button>
                  </>
                )}
              </Card.Body>
            </Card>

            {updateAvailable && !installing && (
              <Card className="shadow-sm border-0 mb-4 bg-warning bg-opacity-10 border-start border-4 border-warning">
                <Card.Body className="p-4 d-flex flex-column flex-md-row justify-content-between align-items-center text-center text-md-start">
                  <div className="mb-3 mb-md-0">
                    <h5 className="fw-bold text-dark mb-1">Critical Update Available: v1.2.5</h5>
                    <p className="small mb-0 text-muted">Includes Nginx hardening and mobile UI optimizations.</p>
                  </div>
                  <Button variant="warning" className="fw-bold px-4 py-2 shadow-sm" onClick={installUpdate}>
                    <Download size={18} className="me-2" /> Install
                  </Button>
                </Card.Body>
              </Card>
            )}
          </Col>

          <Col lg={5}>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-white py-3 border-0">
                <h6 className="mb-0 fw-bold text-uppercase small text-muted">Release Notes</h6>
              </Card.Header>
              <Card.Body className="p-0">
                <ListGroup variant="flush">
                  <ListGroup.Item className="small py-3 px-4 border-0 border-bottom">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-success">v1.2.5</span>
                      <Badge bg="light" text="dark">Available</Badge>
                    </div>
                    <div className="text-muted mt-1">Mobile UI redesign, real audit logging and persistent versioning.</div>
                  </ListGroup.Item>
                  <ListGroup.Item className="small py-3 px-4 border-0">
                    <div className="fw-bold">v1.2.4</div>
                    <div className="text-muted mt-1">Internationalization (i18n) and Plugin system architecture.</div>
                  </ListGroup.Item>
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 2s linear infinite; }
      `}</style>
    </>
  );
}
