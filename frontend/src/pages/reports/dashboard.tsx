import { useEffect, useState, useMemo } from 'react';
import Layout from '../../components/Layout';
import { Container, Row, Col, Card, Spinner, Button, Table, Badge, Dropdown, Form } from 'react-bootstrap';
import dynamic from 'next/dynamic';

const ResponsiveContainer = dynamic(() => import('recharts').then((recharts) => recharts.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then((recharts) => recharts.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((recharts) => recharts.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((recharts) => recharts.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((recharts) => recharts.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((recharts) => recharts.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((recharts) => recharts.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then((recharts) => recharts.Legend), { ssr: false });
const PieChart = dynamic(() => import('recharts').then((recharts) => recharts.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then((recharts) => recharts.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then((recharts) => recharts.Cell), { ssr: false });
import { FileText, Download, Filter, ArrowLeft, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/router';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ReportsDashboard() {
 const router = useRouter();
 const [stats, setStats] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [exporting, setExporting] = useState(false);
 const [mounted, setMounted] = useState(false);
 const [activeWidgets, setActiveWidgets] = useState(['kpis', 'status', 'priority', 'summary']);

 const statusData = useMemo(() => [
  { name: 'OPEN', value: stats?.by_status?.open || 0 },
  { name: 'IN PROGRESS', value: stats?.by_status?.in_progress || 0 },
  { name: 'RESOLVED', value: stats?.by_status?.resolved || 0 },
  { name: 'CLOSED', value: stats?.by_status?.closed || 0 },
 ], [stats]);

 const priorityData = useMemo(() => [
  { name: 'Critical', value: stats?.by_priority?.critical || 0 },
  { name: 'High', value: stats?.by_priority?.high || 0 },
  { name: 'Medium', value: stats?.by_priority?.medium || 0 },
  { name: 'Low', value: stats?.by_priority?.low || 0 },
 ], [stats]);

 const toggleWidget = (id: string) => {
  setActiveWidgets(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
 };

 const fetchStats = async () => {
  setLoading(true);
  try {
   // Placeholder for actual API call
   setStats({
    by_status: { open: 10, in_progress: 5, resolved: 20, closed: 30 },
    by_priority: { critical: 2, high: 8, medium: 15, low: 25 },
    overdue: 3
   });
  } catch (e) {
   console.error(e);
  } finally {
   setLoading(false);
  }
 };

 const handleExport = (format: string) => {
  setExporting(true);
  setTimeout(() => setExporting(false), 2000);
 };

 useEffect(() => {
  setMounted(true);
  fetchStats();
 }, []);

 return (
  <Layout title="Dashboard de Desempeño">
   <Container fluid className="px-0">
    <div className="d-flex justify-content-between align-items-center mb-4">
     <div className="d-flex align-items-center">
      <Button variant="link" className="p-0 me-3" onClick={() => router.push('/reports')}>
       <ArrowLeft size={24} />
      </Button>
      <div>
       <h2 className="fw-black mb-1 text-uppercase">Intelligence HUB</h2>
       <p className="text-muted mb-0 small fw-bold opacity-75 uppercase tracking-widest">Operational Analytics Layer</p>
      </div>
     </div>
     <div className="d-flex gap-2">
      <Dropdown>
       <Dropdown.Toggle variant="outline-dark" size="sm" className="fw-bold px-3">
        <Filter size={14} className="me-2" /> WIDGETS
       </Dropdown.Toggle>
       <Dropdown.Menu className="shadow border-0 p-2">
        <Form.Check type="checkbox" label="KPI Cards" checked={activeWidgets.includes('kpis')} onChange={() => toggleWidget('kpis')} className="mb-2 small fw-bold" />
        <Form.Check type="checkbox" label="Status Chart" checked={activeWidgets.includes('status')} onChange={() => toggleWidget('status')} className="mb-2 small fw-bold" />
        <Form.Check type="checkbox" label="Priority Chart" checked={activeWidgets.includes('priority')} onChange={() => toggleWidget('priority')} className="mb-2 small fw-bold" />
        <Form.Check type="checkbox" label="SLA Summary" checked={activeWidgets.includes('summary')} onChange={() => toggleWidget('summary')} className="small fw-bold" />
       </Dropdown.Menu>
      </Dropdown>
      <Button variant="primary" size="sm" onClick={() => handleExport('pdf')} disabled={exporting} className="fw-bold px-3">
       <Download size={14} className="me-2" /> REPORT
      </Button>
     </div>
    </div>

    {activeWidgets.includes('kpis') && (
     <Row className="g-4 mb-4">
      <Col md={3}>
       <Card className="border-0 shadow-sm text-center p-3 h-100 bg-white">
        <div className="text-primary mb-2 opacity-50"><FileText size={20} /></div>
        <h3 className="fw-black mb-0">{statusData.reduce((acc, curr) => acc + (curr.value as number), 0)}</h3>
        <div className="x-small text-muted fw-bold uppercase letter-spacing-1">Incident Volume</div>
       </Card>
      </Col>
      <Col md={3}>
       <Card className="border-0 shadow-sm text-center p-3 h-100 border-bottom border-4 border-danger bg-white">
        <div className="text-danger mb-2 opacity-50"><AlertCircle size={20} /></div>
        <h3 className="fw-black mb-0">{stats?.overdue || 0}</h3>
        <div className="x-small text-muted fw-bold uppercase letter-spacing-1">SLA Breach</div>
       </Card>
      </Col>
      <Col md={3}>
       <Card className="border-0 shadow-sm text-center p-3 h-100 border-bottom border-4 border-success bg-white">
        <div className="text-success mb-2 opacity-50"><CheckCircle size={20} /></div>
        <h3 className="fw-black mb-0">
         {Math.round(((statusData.find(s => s.name === 'CLOSED' || s.name === 'RESOLVED')?.value as number || 0) / 
         (statusData.reduce((acc, curr) => acc + (curr.value as number), 0) || 1)) * 100)}%
        </h3>
        <div className="x-small text-muted fw-bold uppercase letter-spacing-1">Resolution Rate</div>
       </Card>
      </Col>
      <Col md={3}>
       <Card className="border-0 shadow-sm text-center p-3 h-100 bg-white">
        <div className="text-info mb-2 opacity-50"><TrendingUp size={20} /></div>
        <h3 className="fw-black mb-0">4.2h</h3>
        <div className="x-small text-muted fw-bold uppercase letter-spacing-1">Avg Lead Time</div>
       </Card>
      </Col>
     </Row>
    )}

    <Row className="g-4">
     {activeWidgets.includes('status') && (
      <Col lg={activeWidgets.includes('priority') ? 6 : 12}>
       <Card className="border-0 shadow-sm h-100">
        <Card.Header className="bg-white py-3 border-0">
         <h6 className="mb-0 fw-bold uppercase small tracking-wider">Status Distribution</h6>
        </Card.Header>
        <Card.Body style={{ minHeight: '300px' }}>
          {mounted && (
          <ResponsiveContainer width="100%" height={250}>
           <PieChart>
            <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label>
             {statusData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
             ))}
            </Pie>
            <Tooltip />
            <Legend />
           </PieChart>
          </ResponsiveContainer>
         )}
        </Card.Body>
       </Card>
      </Col>
     )}
     {activeWidgets.includes('priority') && (
      <Col lg={activeWidgets.includes('status') ? 6 : 12}>
       <Card className="border-0 shadow-sm h-100">
        <Card.Header className="bg-white py-3 border-0">
         <h6 className="mb-0 fw-bold uppercase small tracking-wider">Load by Severity</h6>
        </Card.Header>
        <Card.Body style={{ minHeight: '300px' }}>
         {mounted && (
          <ResponsiveContainer width="100%" height={250}>
           <BarChart data={priorityData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
            <XAxis dataKey="name" fontSize={10} fw-bold />
            <YAxis fontSize={10} />
            <Tooltip cursor={{fill: '#f8f9fa'}} />
            <Bar dataKey="value" fill="#0d6efd" radius={[4, 4, 0, 0]} />
           </BarChart>
          </ResponsiveContainer>
         )}
        </Card.Body>
       </Card>
      </Col>
     )}
    </Row>

    {activeWidgets.includes('summary') && (
     <Card className="border-0 shadow-sm mt-4 mb-5">
      <Card.Header className="bg-white py-3 border-0">
       <h6 className="mb-0 fw-bold uppercase small tracking-wider">SLA Compliance Matrix</h6>
      </Card.Header>
      <Card.Body className="p-0">
       <Table hover responsive className="mb-0 small align-middle">
        <thead className="text-muted x-small text-uppercase">
         <tr>
          <th className="ps-4">Metric</th>
          <th>Current</th>
          <th>Threshold</th>
          <th>Compliance</th>
         </tr>
        </thead>
        <tbody className="border-0">
         <tr>
          <td className="ps-4 fw-bold">Mean Time to Respond (MTTR)</td>
          <td>15 min</td>
          <td>30 min</td>
          <td><Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-20 px-3">OPTIMAL</Badge></td>
         </tr>
         <tr>
          <td className="ps-4 fw-bold">Mean Time to Resolve</td>
          <td>8.5 h</td>
          <td>12 h</td>
          <td><Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-20 px-3">OPTIMAL</Badge></td>
         </tr>
         <tr>
          <td className="ps-4 fw-bold">Reopened Tickets</td>
          <td>2</td>
          <td>&lt; 5</td>
          <td><Badge bg="warning" className="bg-opacity-10 text-warning border border-warning border-opacity-20 px-3">WARNING</Badge></td>
         </tr>
        </tbody>
       </Table>
      </Card.Body>
     </Card>
    )}
   </Container>
   <style jsx>{`
    .x-small { font-size: 0.7rem; }
   `}</style>
  </Layout>
 );
}

