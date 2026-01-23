import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppNavbar from '../../components/AppNavbar';
import { Container, Table, Badge } from 'react-bootstrap';

export default function ReportsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
      fetchAuditLogs(token);
    }
  }, [router]);

  const fetchAuditLogs = async (token: string) => {
    try {
      // Assuming endpoint exists or we implement it
      const res = await fetch('/api/v1/audit/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setLogs(await res.json());
    } catch (e) { console.error(e); }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Head><title>Audit Logs - Ticketera</title></Head>
      <AppNavbar />
      <Container className="mt-4">
        <h1>System Audit Logs</h1>
        <p className="text-muted">Immutable record of all security and data events.</p>
        
        <Table striped bordered hover responsive size="sm">
          <thead className="table-dark">
            <tr>
              <th>Timestamp</th>
              <th>Event</th>
              <th>User ID</th>
              <th>IP Address</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? logs?.map((log: any) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td><Badge bg="info">{log.event_type}</Badge></td>
                <td>{log.user_id || 'System'}</td>
                <td>{log.ip_address}</td>
                <td style={{fontSize: '0.8rem'}}><pre>{JSON.stringify(log.details, null, 2)}</pre></td>
              </tr>
            )) : (
                <tr><td colSpan={5} className="text-center text-muted">No audit logs found or endpoint pending implementation.</td></tr>
            )}
          </tbody>
        </Table>
      </Container>
    </>
  );
}