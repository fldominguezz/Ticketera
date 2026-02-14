import { sanitizeParam } from "../../utils/security";
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container, Breadcrumb, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import TicketDetail from '../../components/tickets/TicketDetail';
import Layout from '../../components/Layout';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function TicketPage() {
 const router = useRouter();
 const { id } = router.query;
 const { user: currentUser } = useAuth();
 
 const [isAuthenticated, setIsAuthenticated] = useState(false);
 const [isSuperuser, setIsSuperuser] = useState(false);
 const [ticket, setTicket] = useState<any>(null);
 const [comments, setComments] = useState<any[]>([]);
 const [relations, setRelations] = useState<any[]>([]);
 const [attachments, setAttachments] = useState<any[]>([]);
 const [subtasks, setSubtasks] = useState<any[]>([]);
 const [watchers, setWatchers] = useState<any[]>([]);
 const [history, setHistory] = useState<any[]>([]);
 const [users, setUsers] = useState<any[]>([]);
 const [groups, setGroups] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');

 useEffect(() => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (!token) {
   router.push('/login');
  } else if (id) {
   setIsAuthenticated(true);
   fetchData(token, id as string);
  }
 }, [router, id]);

 const fetchData = async (token: string, ticketId: string) => {
  try {
   setLoading(true);
   const [ticketRes, commentsRes, relationsRes, attachmentsRes, userRes, auditRes, subtasksRes, usersRes, watchersRes, groupsRes] = await Promise.all([
    fetch(`/api/v1/tickets/${ticketId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`/api/v1/tickets/${ticketId}/comments`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`/api/v1/tickets/${ticketId}/relations`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`/api/v1/attachments/${ticketId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch('/api/v1/users/me', { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`/api/v1/audit?ticket_id=${ticketId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`/api/v1/tickets/${ticketId}/subtasks`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch('/api/v1/users', { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch(`/api/v1/tickets/${ticketId}/watchers`, { headers: { 'Authorization': `Bearer ${token}` } }),
    fetch('/api/v1/groups', { headers: { 'Authorization': `Bearer ${token}` } })
   ]);

   if (ticketRes.ok) {
    setTicket(await ticketRes.json());
    
    const commentsData = commentsRes.ok ? await commentsRes.json() : [];
    setComments(Array.isArray(commentsData) ? commentsData : []);
    
    const relationsData = relationsRes.ok ? await relationsRes.json() : [];
    setRelations(Array.isArray(relationsData) ? relationsData : []);
    
    const attachmentsData = attachmentsRes.ok ? await attachmentsRes.json() : [];
    setAttachments(Array.isArray(attachmentsData) ? attachmentsData : []);
    
    const auditData = auditRes.ok ? await auditRes.json() : [];
    setHistory(Array.isArray(auditData) ? auditData : []);
    
    const subtasksData = subtasksRes.ok ? await subtasksRes.json() : [];
    setSubtasks(Array.isArray(subtasksData) ? subtasksData : []);
    
    const usersData = usersRes.ok ? await usersRes.json() : [];
    setUsers(Array.isArray(usersData) ? usersData : []);

    const groupsData = groupsRes.ok ? await groupsRes.json() : [];
    setGroups(Array.isArray(groupsData) ? groupsData : []);
    
    const watchersData = watchersRes.ok ? await watchersRes.json() : [];
    setWatchers(Array.isArray(watchersData) ? watchersData : []);
    
    if (userRes.ok) {
     const userData = await userRes.json();
     setIsSuperuser(userData.is_superuser);
    }
   } else {
    setError('Ticket no encontrado');
   }
  } catch (e) {
   console.error(e);
   setError('Error al cargar el ticket');
  } finally {
   setLoading(false);
  }
 };

 const handleAddComment = async (content: string, isInternal: boolean) => {
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch(`/api/v1/tickets/${(id)}/comments`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, is_internal: isInternal })
   });
   if (res.ok) {
    const newComment = await res.json();
    setComments([...comments, newComment]);
   }
  } catch (e) { console.error(e); }
 };

 const handleAddRelation = async (targetId: string, type: string) => {
  // Implementación opcional
 };

 const handleUploadFile = async (file: File) => {
  // Esta función ahora será llamada por el botón "Guardar" de evidencias
  const token = localStorage.getItem('access_token');
  const formData = new FormData();
  formData.append('file', file);
  try {
   const res = await fetch(`/api/v1/attachments/${(id)}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
   });
   if (res.ok) {
    const newAtt = await res.json();
    setAttachments(prev => [...prev, newAtt]);
    return true;
   }
  } catch (e) { console.error(e); }
  return false;
 };

 const handleDeleteTicket = async () => {
  if (!confirm('¿Está seguro de que desea eliminar este ticket de forma permanente?')) return;
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch(`/api/v1/tickets/${(id)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
   });
   if (res.ok) {
    router.push('/tickets');
   } else {
    alert('No tiene permisos para eliminar este ticket.');
   }
  } catch (e) { console.error(e); }
 };

 const handleDownloadFile = async (attachmentId: string, filename: string) => {
  const token = localStorage.getItem('access_token');
  try {
   const response = await fetch(`/api/v1/attachments/download/${attachmentId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
   });
   if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
   }
  } catch (e) { console.error('Download failed', e); }
 };

 const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch(`/api/v1/tickets/subtasks/${subtaskId}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_completed: completed })
   });
   if (res.ok) {
    setSubtasks(subtasks.map(st => st.id === subtaskId ? {...st, is_completed: completed} : st));
   }
  } catch (e) { console.error(e); }
 };

 const handleAddSubtask = async (title: string) => {
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch(`/api/v1/tickets/${(id)}/subtasks`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, is_completed: false })
   });
   if (res.ok) {
    const newSt = await res.json();
    setSubtasks([...subtasks, newSt]);
   }
  } catch (e) { console.error(e); }
 };

 const handleDeleteSubtask = async (subtaskId: string) => {
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch(`/api/v1/tickets/subtasks/${subtaskId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
   });
   if (res.ok) {
    setSubtasks(subtasks.filter(st => st.id !== subtaskId));
   }
  } catch (e) { console.error(e); }
 };

 const handleToggleWatch = async () => {
  if (!currentUser) return;
  const token = localStorage.getItem('access_token');
  const isWatching = watchers.some(w => w.user_id === currentUser.id);
  const method = isWatching ? 'DELETE' : 'POST';
  
  try {
   const res = await fetch(`/api/v1/tickets/${(id)}/watchers`, {
    method: method,
    headers: { 'Authorization': `Bearer ${token}` }
   });
   if (res.ok) {
    // Refresh watchers
    const watchersRes = await fetch(`/api/v1/tickets/${(id)}/watchers`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (watchersRes.ok) setWatchers(await watchersRes.json());
   }
  } catch (e) { console.error(e); }
 };

 const handleUpdateTicket = async (data: any) => {
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch(`/api/v1/tickets/${(id)}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
   });
   if (res.ok) {
    const updatedData = await res.json();
    // Actualización inmediata del estado local con el objeto completo del backend
    setTicket(updatedData);
   }
  } catch (e) { 
   console.error('Error updating ticket:', e);
   // Opcional: mostrar un toast de error
  }
 };

 if (loading) {
  return (
   <Layout title="Cargando...">
    <Container className="text-center py-5">
     <Spinner animation="border" variant="primary" />
    </Container>
   </Layout>
  );
 }

 if (error || !ticket) {
  return (
   <Layout title="Error">
    <Container className="py-5">
     <Alert variant="danger">{error || 'Ticket no encontrado'}</Alert>
     <Button variant="primary" onClick={() => router.push('/tickets')}>Volver a la lista</Button>
    </Container>
   </Layout>
  );
 }

 return (
  <Layout title={ticket?.title ? `Ticket: ${ticket.title}` : 'Ticket'}>
   <Container fluid className="px-0">
    <div className="mb-4 d-flex align-items-center">
     <Button variant="link" className="p-0 me-3 text-main" onClick={() => router.push('/tickets')}>
      <ChevronLeft size={24} />
     </Button>
     <Breadcrumb className="mb-0 custom-breadcrumb">
      <Breadcrumb.Item href="/tickets">Tickets</Breadcrumb.Item>
      <Breadcrumb.Item active>#{ticket.id?.substring(0,8)}</Breadcrumb.Item>
     </Breadcrumb>
    </div>

    <TicketDetail 
     ticket={ticket} 
     comments={comments} 
     relations={relations}
     attachments={attachments}
     subtasks={subtasks}
     watchers={watchers}
     history={history}
     users={users}
     groups={groups}
     onAddComment={handleAddComment} 
     onAddRelation={handleAddRelation}
     onUploadFile={handleUploadFile}
     onDownloadFile={handleDownloadFile}
     onToggleWatch={handleToggleWatch}
     onToggleSubtask={handleToggleSubtask}
     onAddSubtask={handleAddSubtask}
     onDeleteSubtask={handleDeleteSubtask}
     onUpdateTicket={handleUpdateTicket}
     onDeleteTicket={handleDeleteTicket}
    />
   </Container>
   <style jsx global>{`
    .text-main { color: var(--text-main) !important; }
    .custom-breadcrumb .breadcrumb-item a { color: var(--primary) !important; text-decoration: none; }
    .custom-breadcrumb .breadcrumb-item.active { color: var(--text-muted) !important; }
   `}</style>
  </Layout>
 );
}