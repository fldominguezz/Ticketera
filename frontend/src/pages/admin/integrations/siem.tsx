import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppNavbar from '../../../components/AppNavbar';
import { Container, Card, Table, Button, Badge, Form, Modal } from 'react-bootstrap';
import { Zap, Plus, Trash2, ShieldAlert, Settings } from 'lucide-react';

export default function SIEMIntegrationPage() {
  const router = useRouter();
  const [rules, setRules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) router.push('/login');
    else fetchGroups(token);
  }, [router]);

  const fetchGroups = async (token: string) => {
    const res = await fetch('/api/v1/groups/', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setGroups(await res.json());
  };

  return (
    <>
      <Head><title>SIEM Integration - Ticketera</title></Head>
      <AppNavbar />
      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="fw-bold mb-0">FortiSIEM Correlation Rules</h1>
            <p className="text-muted">Automate ticket creation based on SIEM alerts</p>
          </div>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus size={18} className="me-2" /> New Rule
          </Button>
        </div>

        <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">Rule Name</th>
                  <th>Event Pattern</th>
                  <th>Target Priority</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-middle">
                  <td className="ps-4 fw-bold">
                    <Zap size={16} className="me-2 text-warning" /> 
                    Brute Force Detection
                  </td>
                  <td><code>*Logon_Failure*</code></td>
                  <td><Badge bg="danger">CRITICAL</Badge></td>
                  <td><Badge bg="success">Active</Badge></td>
                  <td className="text-center">
                    <Button variant="outline-danger" size="sm" className="border-0"><Trash2 size={16} /></Button>
                  </td>
                </tr>
              </tbody>
            </Table>
          </Card.Body>
        </Card>

        <Card className="mt-4 border-0 shadow-sm bg-dark text-white p-4">
          <div className="d-flex align-items-center">
            <ShieldAlert size={32} className="text-warning me-3" />
            <div>
              <h6 className="fw-bold mb-1">SIEM Webhook URL</h6>
              <code className="text-warning">https://10.1.9.245/api/v1/integrations/fortisiem/webhook</code>
              <p className="small mb-0 mt-2 opacity-75">Use this URL in FortiSIEM "External Actions" to send alerts to this platform.</p>
            </div>
          </div>
        </Card>
      </Container>
    </>
  );
}
