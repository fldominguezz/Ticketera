import { useEffect, useState, useMemo } from 'react';
import Layout from '../../components/Layout';
import { Container, Row, Col, Card, Spinner, Button, Table, Badge } from 'react-bootstrap';
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
  const [mounted, setMounted] = useState(false); // Add mounted state

  useEffect(() => {
    setMounted(true); // Set mounted to true after component mounts
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/tickets/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleExport = async (format: string) => {
    setExporting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/reports/tickets/${format}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_tickets.${format === 'excel' ? 'xlsx' : format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  const statusData = useMemo(() => {
    if (!stats?.status || typeof stats.status !== 'object') return [];
    return Object.entries(stats.status).map(([name, value]) => ({ 
      name: name.replace('_', ' ').toUpperCase(), 
      value 
    }));
  }, [stats]);

  const priorityData = useMemo(() => {
    if (!stats?.priority || typeof stats.priority !== 'object') return [];
    return Object.entries(stats.priority).map(([name, value]) => ({
      name: name.toUpperCase(), 
      value 
    }));
  }, [stats]);

  if (loading) {
    return (
      <Layout title="Cargando Reportes...">
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard de Desempeño">
      <Container fluid className="px-0">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center">
            <Button variant="link" className="text-dark p-0 me-3" onClick={() => router.push('/reports')}>
              <ArrowLeft size={24} />
            </Button>
            <div>
              <h2 className="fw-bold mb-1">KPIs de Gestión SOC</h2>
              <p className="text-muted mb-0">Análisis operativo y cumplimiento de ANS.</p>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-primary" size="sm" onClick={() => handleExport('csv')} disabled={exporting}>
              CSV
            </Button>
            <Button variant="outline-success" size="sm" onClick={() => handleExport('excel')} disabled={exporting}>
              Excel
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleExport('pdf')} disabled={exporting}>
              Descargar PDF
            </Button>
          </div>
        </div>

        <Row className="g-4 mb-4">
          <Col md={3}>
            <Card className="border-0 shadow-sm text-center p-3 h-100">
              <div className="text-primary mb-2"><FileText size={24} /></div>
              <h3 className="fw-bold mb-0">{statusData.reduce((acc, curr) => acc + (curr.value as number), 0)}</h3>
              <div className="small text-muted fw-bold">Total Tickets</div>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm text-center p-3 h-100 border-start border-4 border-danger">
              <div className="text-danger mb-2"><AlertCircle size={24} /></div>
              <h3 className="fw-bold mb-0">{stats?.overdue || 0}</h3>
              <div className="small text-muted fw-bold">Vencidos (SLA)</div>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm text-center p-3 h-100 border-start border-4 border-success">
              <div className="text-success mb-2"><CheckCircle size={24} /></div>
              <h3 className="fw-bold mb-0">
                {Math.round(((statusData.find(s => s.name === 'CLOSED' || s.name === 'RESOLVED')?.value as number || 0) / 
                (statusData.reduce((acc, curr) => acc + (curr.value as number), 0) || 1)) * 100)}%
              </h3>
              <div className="small text-muted fw-bold">Tasa de Resolución</div>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm text-center p-3 h-100">
              <div className="text-info mb-2"><TrendingUp size={24} /></div>
              <h3 className="fw-bold mb-0">4.2h</h3>
              <div className="small text-muted fw-bold">Tiempo Medio Resp.</div>
            </Card>
          </Col>
        </Row>

        <Row className="g-4">
          <Col lg={6}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white py-3 border-0">
                <h6 className="mb-0 fw-bold">Distribución por Estado</h6>
              </Card.Header>
              <Card.Body style={{ minHeight: '350px', width: '100%' }}>
                 {mounted && ( // Conditionally render ResponsiveContainer
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label
                      >
                        {Array.isArray(statusData) && statusData.map((entry, index) => (
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
          <Col lg={6}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white py-3 border-0">
                <h6 className="mb-0 fw-bold">Carga por Prioridad</h6>
              </Card.Header>
              <Card.Body style={{ minHeight: '350px', width: '100%' }}>
                {mounted && ( // Conditionally render ResponsiveContainer
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={priorityData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip cursor={{fill: '#f8f9fa'}} />
                      <Bar dataKey="value" fill="#0d6efd" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card className="border-0 shadow-sm mt-4 mb-5">
          <Card.Header className="bg-white py-3 border-0">
            <h6 className="mb-0 fw-bold">Resumen de Métricas por Categoría</h6>
          </Card.Header>
          <Card.Body className="p-0">
            <Table hover responsive className="mb-0 small align-middle">
              <thead className="bg-light text-muted x-small text-uppercase">
                <tr>
                  <th className="ps-4">Métrica</th>
                  <th>Valor Actual</th>
                  <th>Meta (SLA)</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="ps-4 fw-bold">Tiempo de Respuesta (Media)</td>
                  <td>15 min</td>
                  <td>30 min</td>
                  <td><Badge bg="success">CUMPLE</Badge></td>
                </tr>
                <tr>
                  <td className="ps-4 fw-bold">Tiempo de Resolución (Media)</td>
                  <td>8.5 h</td>
                  <td>12 h</td>
                  <td><Badge bg="success">CUMPLE</Badge></td>
                </tr>
                <tr>
                  <td className="ps-4 fw-bold">Tickets Reabiertos</td>
                  <td>2</td>
                  <td>&lt; 5</td>
                  <td><Badge bg="warning">ALERTA</Badge></td>
                </tr>
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Container>
      <style jsx>{`
        .x-small { font-size: 0.7rem; }
      `}</style>
    </Layout>
  );
}

