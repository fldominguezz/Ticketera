import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import TicketDetail from '../../components/tickets/TicketDetail';
import api from '../../lib/api';
import { Spinner, Container, Alert } from 'react-bootstrap';

export default function TicketPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [watchers, setWatchers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Fetch Ticket Core (Attachments are included by default in backend options)
      const res = await api.get(`/tickets/${id}`);
      const ticketData = res.data;
      setTicket(ticketData);
      setAttachments(ticketData.attachments || []);

      // 2. Fetch Related Data using correct endpoints
      const [coms, watch, usrs, grps, hist] = await Promise.all([
        api.get(`/tickets/${id}/comments`),
        api.get(`/tickets/${id}/watchers`),
        api.get('/users'),
        api.get('/groups'),
        api.get('/audit', { params: { ticket_id: id, limit: 50 } })
      ]);

      setComments(coms.data);
      setWatchers(watch.data);
      setUsers(usrs.data);
      setGroups(grps.data);
      setHistory(hist.data || []);
      
      setError(null);
    } catch (err: any) {
      console.error('Error loading ticket data:', err);
      setError('No se pudo cargar la información del ticket. Verifique que el ID sea correcto.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchAllData();
  }, [id, fetchAllData]);

  const handleAddComment = async (content: string, isInternal: boolean) => {
    await api.post(`/tickets/${id}/comments`, { content, is_internal: isInternal });
    fetchAllData();
  };

  const handleUpdateTicket = async (data: any) => {
    await api.put(`/tickets/${id}`, data);
    fetchAllData();
  };

  const handleUploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/attachments/tickets/${id}`, formData);
    fetchAllData();
  };

  const handleDownloadFile = async (attachmentId: string, filename: string) => {
    try {
      const response = await api.get(`/attachments/${attachmentId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <Layout title={ticket ? `Ticket #${ticket.id?.substring(0, 8)}` : 'Cargando Ticket...'}>
      <Container fluid className="px-0">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted fw-bold">CARGANDO NÚCLEO DE DATOS...</p>
          </div>
        ) : error ? (
          <Alert variant="danger" className="border-0 shadow-sm">
            {error}
          </Alert>
        ) : (
          <TicketDetail 
            ticket={ticket}
            comments={comments}
            history={history}
            attachments={attachments}
            subtasks={subtasks}
            watchers={watchers}
            users={users}
            groups={groups}
            relations={[]}
            onAddComment={handleAddComment}
            onUpdateTicket={handleUpdateTicket}
            onUploadFile={handleUploadFile}
            onDownloadFile={handleDownloadFile}
            onAddRelation={async (targetId, type) => {
              await api.post(`/tickets/${id}/relations`, { target_ticket_id: targetId, relation_type: type });
              fetchAllData();
            }}
            onToggleWatch={async () => {
              await api.post(`/tickets/${id}/watchers`);
              fetchAllData();
            }}
            onToggleSubtask={async () => {}}
            onAddSubtask={async () => {}}
            onDeleteSubtask={async () => {}}
            onDeleteTicket={async () => {
              if (confirm('¿ELIMINAR TICKET PERMANENTEMENTE?')) {
                await api.delete(`/tickets/${id}`);
                router.push('/tickets');
              }
            }}
          />
        )}
      </Container>
    </Layout>
  );
}
