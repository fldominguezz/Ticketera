import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { Table, Badge, Card, Spinner, Button, Row, Col, Modal } from 'react-bootstrap';
import { Activity, ShieldAlert, ExternalLink, Info, Search, Filter } from 'lucide-react';
import { useRouter } from 'next/router';

export default function SIEMEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  useEffect(() => {
    fetchEvents();
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/soc?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    ws.onmessage = () => fetchEvents();
    
    return () => ws.close();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const siemEvents = data
            .filter((t: any) => t.extra_data && t.extra_data.siem_raw)
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setEvents(siemEvents);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getSeverityVariant = (p: string) => {
    switch (p.toLowerCase()) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <Layout title="SIEM Event Monitor">
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h4 className="fw-black text-uppercase m-0">Live Event Telemetry</h4>
          <p className="text-muted small m-0 uppercase tracking-widest fw-bold">SOC Operational Layer - Real-time Analysis</p>
        </div>
        <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-20 px-3 py-2">
          <Activity size={12} className="me-2 pulse" /> SYSTEM_ONLINE
        </Badge>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden bg-card">
        <div className="p-3 border-bottom border-white border-opacity-5 bg-white bg-opacity-2 d-flex justify-content-between">
          <div className="d-flex gap-2">
            <Button variant="dark" size="sm" className="border-white border-opacity-10 small fw-bold">
              <Search size={14} className="me-2" /> SEARCH
            </Button>
            <Button variant="dark" size="sm" className="border-white border-opacity-10 small fw-bold">
              <Filter size={14} className="me-2" /> FILTERS
            </Button>
          </div>
          <Button variant="link" size="sm" onClick={fetchEvents} className="text-muted text-decoration-none">
            REFRESH DATA
          </Button>
        </div>
        
        <Table hover responsive className="m-0 align-middle">
          <thead className="bg-dark text-muted x-small uppercase">
            <tr>
              <th className="ps-4">SEVERITY</th>
              <th>THREAT_DESCRIPTION</th>
              <th>SOURCE_NODE</th>
              <th>TIMESTAMP</th>
              <th className="text-end pe-4">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="small">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" size="sm" variant="primary" /></td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-5 text-muted italic">No active security threats detected in current stream.</td></tr>
            ) : (
              events.map(event => (
                <tr key={event.id} className={event.priority === 'critical' ? 'critical-bg' : ''}>
                  <td className="ps-4">
                    <Badge bg={getSeverityVariant(event.priority)} className="text-uppercase fw-black px-2 py-1" style={{ fontSize: '9px' }}>
                      {event.priority}
                    </Badge>
                  </td>
                  <td>
                    <div className="fw-bold text-white opacity-90">{event.title}</div>
                    <div className="x-small text-muted text-truncate" style={{ maxWidth: '350px' }}>{event.description}</div>
                  </td>
                  <td>
                    <code className="fw-mono text-info bg-info bg-opacity-10 px-2 py-1 rounded">
                      {event.extra_data.siem_raw.ip || event.extra_data.siem_raw.src_ip || '---'}
                    </code>
                  </td>
                  <td className="text-muted fw-mono x-small">
                    {new Date(event.created_at).toLocaleString()}
                  </td>
                  <td className="text-end pe-4">
                    <div className="d-flex gap-2 justify-content-end">
                      <Button variant="dark" size="sm" onClick={() => setSelectedEvent(event)} className="p-1 border-white border-opacity-5">
                        <Info size={14} />
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => router.push(`/tickets/${event.id}`)} className="p-1">
                        <ExternalLink size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <Modal show={!!selectedEvent} onHide={() => setSelectedEvent(null)} size="lg" centered className="soc-modal">
        <Modal.Header closeButton className="border-white border-opacity-5 bg-dark">
          <Modal.Title className="small fw-black uppercase">Raw Telemetry Payload</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-black p-0">
          <pre className="p-4 mb-0 text-info fw-mono x-small" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {JSON.stringify(selectedEvent?.extra_data?.siem_raw, null, 2)}
          </pre>
        </Modal.Body>
        <Modal.Footer className="border-white border-opacity-5 bg-dark">
          <Button variant="secondary" size="sm" onClick={() => setSelectedEvent(null)} className="fw-bold px-3">CLOSE</Button>
          <Button variant="primary" size="sm" onClick={() => router.push(`/tickets/${selectedEvent?.id}`)} className="fw-bold px-3">INVESTIGATE CASE</Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .fw-black { font-weight: 900; }
        .x-small { font-size: 10px; }
        .fw-mono { font-family: 'JetBrains Mono', monospace; }
        .bg-card { background-color: #0c1016 !important; }
        .critical-bg { background-color: rgba(255, 77, 79, 0.05) !important; }
        .pulse { animation: pulse-animation 2s infinite; }
        @keyframes pulse-animation {
          0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; }
        }
      `}</style>
    </Layout>
  );
}
