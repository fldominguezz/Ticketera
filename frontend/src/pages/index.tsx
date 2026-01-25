import React, { useState } from 'react';
import { Row, Col, Card, ProgressBar, Table } from 'react-bootstrap';
import { 
  ShieldAlert, 
  Activity, 
  Clock, 
  TrendingUp, 
  Zap, 
  Globe,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import Layout from '../components/Layout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { time: '00:00', events: 120 }, { time: '04:00', events: 80 },
  { time: '08:00', events: 450 }, { time: '12:00', events: 900 },
  { time: '16:00', events: 1200 }, { time: '20:00', events: 600 },
  { time: '23:59', events: 300 },
];

export default function Dashboard() {
  return (
    <Layout title="Command Center">
      {/* KPIS */}
      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="h-100 p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="text-muted small fw-bold uppercase">OPEN INCIDENTS</div>
              <ShieldAlert size={18} className="text-primary" />
            </div>
            <div className="h3 fw-black m-0">24</div>
            <div className="mt-2 text-success small fw-bold">
              <TrendingUp size={12} /> 12% vs yesterday
            </div>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100 p-3 border-start border-4 border-danger">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="text-muted small fw-bold uppercase">SLA BREACHED</div>
              <Clock size={18} className="text-danger" />
            </div>
            <div className="h3 fw-black m-0">03</div>
            <div className="mt-2 text-danger small fw-bold italic uppercase">Critical Attention</div>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100 p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="text-muted small fw-bold uppercase">NODES PROTECTED</div>
              <Activity size={18} className="text-success" />
            </div>
            <div className="h3 fw-black m-0">1,240</div>
            <ProgressBar variant="success" now={98} className="mt-2" style={{ height: '4px' }} />
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100 p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="text-muted small fw-bold uppercase">RESOLVED 24H</div>
              <CheckCircle2 size={18} className="text-info" />
            </div>
            <div className="h3 fw-black m-0">156</div>
            <div className="mt-2 text-muted small italic">Avg. TTR: 1h 24m</div>
          </Card>
        </Col>
      </Row>

      {/* CHARTS */}
      <Row className="g-4 mb-4">
        <Col lg={8}>
          <Card className="p-4 overflow-hidden">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h6 className="fw-black m-0 uppercase d-flex align-items-center">
                <Globe size={16} className="me-2 text-primary" /> Global Telemetry Stream
              </h6>
              <div className="tech-badge bg-primary bg-opacity-10 text-primary px-2 py-1 rounded small fw-bold">LIVE_FEED</div>
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0d6efd" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="#4a4e57" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#4a4e57" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0c1016', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="events" stroke="#0d6efd" fillOpacity={1} fill="url(#colorEvents)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="p-4 h-100">
            <h6 className="fw-black mb-4 uppercase d-flex align-items-center">
              <Zap size={16} className="me-2 text-warning" /> Threat Analytics
            </h6>
            <div className="mb-4">
              <div className="d-flex justify-content-between small mb-1 fw-bold">
                <span>NETWORK ANOMALIES</span>
                <span className="text-danger">72%</span>
              </div>
              <ProgressBar variant="danger" now={72} style={{ height: '6px' }} />
            </div>
            <div className="mb-4">
              <div className="d-flex justify-content-between small mb-1 fw-bold">
                <span>FAILED LOGINS</span>
                <span className="text-warning">45%</span>
              </div>
              <ProgressBar variant="warning" now={45} style={{ height: '6px' }} />
            </div>
            <div className="mb-4">
              <div className="d-flex justify-content-between small mb-1 fw-bold">
                <span>DATA EXFILTRATION</span>
                <span className="text-success">12%</span>
              </div>
              <ProgressBar variant="success" now={12} style={{ height: '6px' }} />
            </div>
            <div className="mt-4 p-3 bg-dark bg-opacity-50 border border-white border-opacity-5 rounded">
              <div className="text-primary x-small fw-black mb-1">AI_INSIGHT</div>
              <p className="x-small m-0 text-muted leading-sm">Traffic spike detected from subnet 10.0.4.x. Potential unauthorized data transfer.</p>
            </div>
          </Card>
        </Col>
      </Row>

      {/* RECENT ALERTS */}
      <Card className="overflow-hidden">
        <div className="p-3 border-bottom border-white border-opacity-5 bg-white bg-opacity-2">
          <h6 className="m-0 fw-black uppercase small">Recent Security Events</h6>
        </div>
        <Table hover responsive className="m-0 align-middle">
          <thead className="bg-dark text-muted x-small uppercase">
            <tr>
              <th className="ps-4">EVENT ID</th>
              <th>SOURCE</th>
              <th>PRIORITY</th>
              <th>TIMESTAMP</th>
              <th className="text-end pe-4">STATUS</th>
            </tr>
          </thead>
          <tbody className="small">
            <tr>
              <td className="ps-4 fw-mono text-primary">EVT-9021</td>
              <td>Firewall-Edge-01</td>
              <td><span className="badge bg-danger px-2">CRITICAL</span></td>
              <td className="text-muted">2 min ago</td>
              <td className="text-end pe-4"><span className="text-muted italic">UNASSIGNED</span></td>
            </tr>
            <tr>
              <td className="ps-4 fw-mono text-primary">EVT-9018</td>
              <td>AD-Server-PDC</td>
              <td><span className="badge bg-warning px-2 text-dark">HIGH</span></td>
              <td className="text-muted">12 min ago</td>
              <td className="text-end pe-4"><span className="text-muted italic">UNASSIGNED</span></td>
            </tr>
          </tbody>
        </Table>
      </Card>

      <style jsx>{`
        .tech-badge { font-size: 9px; letter-spacing: 1px; }
        .fw-black { font-weight: 900; }
        .uppercase { text-transform: uppercase; }
        .italic { font-style: italic; }
        .x-small { font-size: 11px; }
        .fw-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>
    </Layout>
  );
}