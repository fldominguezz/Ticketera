import { useEffect, useState } from 'react';
import Head from 'next/head';

import { Container, Table, Card, Badge, Form, Row, Col, Spinner } from 'react-bootstrap';
import { Shield, Search, Clock, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/audit', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getEventBadge = (type: string) => {
    const l = type.toLowerCase();
    if (l.includes('create')) return <Badge bg="success" className="px-2 py-1">{type}</Badge>;
    if (l.includes('fail') || l.includes('delete')) return <Badge bg="danger" className="px-2 py-1">{type}</Badge>;
    return <Badge bg="secondary" className="px-2 py-1">{type}</Badge>;
  };

  const filteredLogs = logs.filter(l => 
    l.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout title={t('audit_logs')}>
      <Container className="mt-4 mb-5">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
          <div>
            <h1 className="fw-bold mb-0">{t('audit_logs_title')}</h1>
            <p className="text-muted small mb-0">{t('audit_logs_desc')}</p>
          </div>
          <div className="bg-success bg-opacity-10 text-success p-2 rounded small fw-bold d-flex align-items-center align-self-start shadow-sm border border-success border-opacity-25">
            <Shield size={16} className="me-2" /> Compliance Monitoring Active
          </div>
        </div>

        <Card className="shadow-sm border-0 mb-4 overflow-hidden">
          <Card.Body className="bg-light p-3">
            <Row className="g-2">
              <Col md={6}>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-0"><Search size={14} /></span>
                  <Form.Control 
                    className="border-0 shadow-none" 
                    placeholder="Filter..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : (
              <Table responsive hover className="mb-0 align-middle">
                <thead className="bg-dark text-white border-0">
                  <tr className="small text-uppercase">
                    <th className="ps-4 py-3">{t('timestamp')}</th>
                    <th>{t('event')}</th>
                    <th>{t('username')} ID</th>
                    <th>{t('ip_address')}</th>
                    <th>{t('details')}</th>
                  </tr>
                </thead>
                <tbody className="border-0">
                  {filteredLogs.length > 0 ? filteredLogs?.map((log: any) => (
                    <tr key={log.id} className="small">
                      <td className="ps-4 text-muted">
                        <div className="d-flex align-items-center">
                          <Clock size={12} className="me-1" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td>{getEventBadge(log.event_type)}</td>
                      <td className="fw-bold"><UserIcon size={12} className="me-1 text-primary" /> {log.user_id?.substring(0,8) || 'SYSTEM'}</td>
                      <td className="text-muted font-monospace" style={{fontSize:'0.75rem'}}>{log.ip_address || 'N/A'}</td>
                      <td className="text-muted text-truncate" style={{maxWidth:'200px'}}>{log.details ? JSON.stringify(log.details) : '-'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="text-center py-5 text-muted">{t('no_audit_logs')}</td></tr>
                  )}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
}
