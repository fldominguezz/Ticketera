import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { Card, Row, Col, Badge, Button, Form, Alert, Table, Spinner } from 'react-bootstrap';
import { Zap, Shield, Key, Activity, Copy, CheckCircle, AlertCircle, Terminal, Globe } from 'lucide-react';

const SIEMIntegration = () => {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [apiKey] = useState('sk_live_fortisiem_550e8400-e29b-41d4-a716-446655440000');

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000); // Actualizar cada 10s
        return () => clearInterval(interval);
    }, []);

    const fetchStatus = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch('/api/v1/integrations/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setStatus(await res.json());
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    return (
        <Layout title="Integración FortiSIEM">
            <div className="mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h1 className="fw-bold">Integración con FortiSIEM</h1>
                    <p className="text-muted">Monitor de conectividad y gestión de reglas de correlación.</p>
                </div>
                {status?.status === 'online' ? 
                    <Badge bg="success" className="px-3 py-2"><CheckCircle size={14} className="me-1"/> SISTEMA ACTIVO</Badge> :
                    <Badge bg="warning" className="px-3 py-2 text-dark"><Activity size={14} className="me-1"/> ESPERANDO CONEXIÓN</Badge>
                }
            </div>

            <Row className="g-4">
                <Col lg={4}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body>
                            <h6 className="fw-bold mb-3 d-flex align-items-center">
                                <Globe size={18} className="me-2 text-primary"/> Conectividad del Sensor
                            </h6>
                            <div className="bg-light p-3 rounded-3 mb-3">
                                <div className="d-flex justify-content-between small mb-1">
                                    <span className="text-muted">Source IP:</span>
                                    <span className="fw-bold">10.1.78.10</span>
                                </div>
                                <div className="d-flex justify-content-between small">
                                    <span className="text-muted">Estado:</span>
                                    {status?.last_seen_ip === '10.1.78.10' ? 
                                        <span className="text-success fw-bold">Online</span> : 
                                        <span className="text-muted">Waiting...</span>
                                    }
                                </div>
                            </div>
                            <div className="small text-muted mb-4">
                                <AlertCircle size={14} className="me-1"/>
                                El sensor en la 10.1.78.10 está configurado para enviar alertas vía HTTPS POST (Puerto 443).
                            </div>
                            <Button variant="outline-primary" size="sm" className="w-100" onClick={fetchStatus}>
                                Probar Conectividad
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={8}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white border-0 pt-4">
                            <h5 className="fw-bold mb-0">Reglas de Correlación</h5>
                        </Card.Header>
                        <Card.Body>
                            <Table responsive hover className="align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="small fw-bold">REGLA</th>
                                        <th className="small fw-bold">ESTADO</th>
                                        <th className="small fw-bold">ERRORES</th>
                                        <th className="small fw-bold">ÚLTIMA ALERTA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={4} className="text-center py-4"><Spinner animation="border" size="sm" /></td></tr>
                                    ) : status?.active_rules.map((rule: any, i: number) => (
                                        <tr key={i}>
                                            <td className="fw-bold">{rule.name}</td>
                                            <td><Badge bg="success">Activa</Badge></td>
                                            <td>{rule.errors}</td>
                                            <td className="small text-muted">{status.last_event_time ? new Date(status.last_event_time).toLocaleString() : 'Nunca'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={12}>
                    <Card className="border-0 shadow-sm bg-dark text-white">
                        <Card.Header className="bg-transparent border-secondary border-opacity-25 pt-4">
                            <h5 className="fw-bold mb-0 d-flex align-items-center">
                                <Terminal size={18} className="me-2 text-success"/> Webhook Ingestion Log
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="font-monospace small p-3 bg-black rounded" style={{ height: '150px', overflowY: 'auto', color: '#00ff00' }}>
                                {status?.status === 'online' ? (
                                    <>
                                        <div>[2026-01-24 18:33:31] INFO: Received event from 10.1.78.10</div>
                                        <div>[2026-01-24 18:33:31] INFO: Rule matched: Brute Force Attack</div>
                                        <div>[2026-01-24 18:33:31] SUCCESS: Ticket {status.last_seen_ip === '10.1.78.10' ? 'created' : 'pending'}</div>
                                    </>
                                ) : (
                                    <div>[SYSTEM] Listening for events on https://10.1.9.245/api/v1/integrations/fortisiem-incident ...</div>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Layout>
    );
};

export default SIEMIntegration;
