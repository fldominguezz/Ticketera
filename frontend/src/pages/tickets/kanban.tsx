import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container, Button, Alert } from 'react-bootstrap';
import KanbanBoard from '../../components/tickets/KanbanBoard';
import { List } from 'lucide-react';
import Link from 'next/link';
import Layout from '../../components/Layout';

export default function KanbanPage() {
 const router = useRouter();
 const [isAuthenticated, setIsAuthenticated] = useState(false);
 const [isSuperuser, setIsSuperuser] = useState(false);
 const [tickets, setTickets] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
  setMounted(true);
  const token = localStorage.getItem('access_token');
  if (!token) {
   router.push('/login');
  } else {
   setIsAuthenticated(true);
   fetchData(token);
  }
 }, [router]);

 const fetchData = async (token: string) => {
  try {
   setLoading(true);
   const [ticketsRes, userRes] = await Promise.all([
    fetch('/api/v1/tickets', { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch('/api/v1/users/me', { headers: { 'Authorization': `Bearer ${token}` } })
   ]);
   
   if (ticketsRes.ok) {
    const data = await ticketsRes.json();
    if (Array.isArray(data)) {
     // Filtro estricto anti-SIEM
     setTickets(data.filter((t: any) => {
      const isSiem = 
       (t.extra_data && t.extra_data.siem_raw) || 
       (t.created_by_id === '852d2452-e98a-48eb-9d41-9281e03f1cf0') ||
       (t.title && t.title.startsWith('SIEM:'));
      return !isSiem;
     }));
    }
   }
   if (userRes.ok) {
    const userData = await userRes.json();
    setIsSuperuser(userData.is_superuser);
   }
  } catch (e) { console.error(e); }
  finally { setLoading(false); }
 };

 const handleStatusChange = async (ticketId: string, newStatus: string) => {
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch(`/api/v1/tickets/${ticketId}`, {
    method: 'PUT',
    headers: {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: newStatus })
   });
   if (!res.ok) throw new Error('Failed to update status');
  } catch (e: any) {
   alert(`Error updating ticket: ${e.message}`);
   fetchData(token!);
  }
 };

 if (!mounted || !isAuthenticated) return null;

 return (
  <Layout title="Tickets Kanban">
   <Container fluid className="mt-4 px-0">
    <div className="d-flex justify-content-between align-items-center mb-4">
     <div>
      <h1 className="fw-bold mb-0">Tickets Kanban</h1>
      <p className="text-muted small">Drag and drop tickets to update their status</p>
     </div>
     <div className="d-flex gap-2">
      <Link href="/tickets" passHref legacyBehavior>
       <Button variant="outline-secondary">
        <List size={18} className="me-2" /> List View
       </Button>
      </Link>
      <Button variant="primary" onClick={() => router.push('/tickets/new')}>New Ticket</Button>
     </div>
    </div>

    {error && <Alert variant="danger">{error}</Alert>}

    {loading ? (
     <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status"></div>
     </div>
    ) : (
     <KanbanBoard initialTickets={tickets} onStatusChange={handleStatusChange} />
    )}
   </Container>
  </Layout>
 );
}