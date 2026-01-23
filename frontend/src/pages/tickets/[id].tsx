import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppNavbar from '../../components/AppNavbar';
import { Container, Breadcrumb, Button, Alert } from 'react-bootstrap';
import TicketDetail from '../../components/tickets/TicketDetail';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function TicketPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [relations, setRelations] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
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
      const [ticketRes, commentsRes, relationsRes, attachmentsRes, userRes, auditRes, subtasksRes, usersRes] = await Promise.all([
        fetch(`/api/v1/tickets/${ticketId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/v1/tickets/${ticketId}/comments`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/v1/tickets/${ticketId}/relations`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/v1/attachments/${ticketId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/v1/users/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/v1/audit/?ticket_id=${ticketId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/v1/tickets/${ticketId}/subtasks`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/v1/users/`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (ticketRes.ok && commentsRes.ok) {
        setTicket(await ticketRes.json());
        setComments(await commentsRes.json());
        setRelations(relationsRes.ok ? await relationsRes.json() : []);
        setAttachments(attachmentsRes.ok ? await attachmentsRes.json() : []);
        setHistory(auditRes.ok ? await auditRes.json() : []);
        setSubtasks(subtasksRes.ok ? await subtasksRes.json() : []);
        setUsers(usersRes.ok ? await usersRes.json() : []);
        
        if (userRes.ok) {
          const userData = await userRes.json();
          setIsSuperuser(userData.is_superuser);
        }
      } else {
        setError('Failed to fetch ticket data');
      }
    } catch (e) {
      console.error(e);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (content: string, isInternal: boolean) => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/v1/tickets/${id}/comments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, is_internal: isInternal })
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments([...comments, newComment]);
      }
    } catch (e) { alert(e); }
  };

  const handleAddRelation = async (targetId: string, type: string) => {
    // Logic for adding relations...
  };

  const handleUploadFile = async (file: File) => {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/v1/attachments/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const newAtt = await res.json();
        setAttachments([...attachments, newAtt]);
      }
    } catch (e) { console.error(e); }
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
        setSubtasks(subtasks?.map(st => st.id === subtaskId ? {...st, is_completed: completed} : st));
      }
    } catch (e) { console.error(e); }
  };

  const handleAddSubtask = async (title: string) => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/v1/tickets/${id}/subtasks`, {
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
        setSubtasks(subtasks?.filter(st => st.id !== subtaskId));
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdateTicket = async (data: any) => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/v1/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        setTicket(updated);
      }
    } catch (e) { console.error(e); }
  };
// ... skip
          <TicketDetail 
            ticket={ticket} 
            comments={comments} 
            relations={relations}
            attachments={attachments}
            subtasks={subtasks}
            history={history}
            users={users}
            onAddComment={handleAddComment} 
            onAddRelation={handleAddRelation}
            onUploadFile={handleUploadFile}
            onToggleSubtask={handleToggleSubtask}
            onAddSubtask={handleAddSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            onUpdateTicket={handleUpdateTicket}
          />}
