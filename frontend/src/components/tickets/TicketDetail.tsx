import React, { useState } from 'react';
import { Card, Button, Form, Badge, Table, Tabs, Tab, Spinner, Modal, Row, Col } from 'react-bootstrap';
import { User, Clock, Paperclip, Download as DownloadIcon, Eye, AlertCircle, Monitor, Send, Lock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { RichCommentEditor } from './RichCommentEditor';
import 'react-quill/dist/quill.snow.css';

interface Comment { id: string; content: string; is_internal: boolean; user_id: string; user_name?: string; user_avatar?: string; created_at: string; }
interface Relation { id: string; source_ticket_id: string; target_ticket_id: string; relation_type: string; }
interface Attachment { id: string; filename: string; size: number; }
interface Subtask { id: string; title: string; is_completed: boolean; }
interface Watcher { id: string; user_id: string; username: string; }

interface SLAMetric {
  id: string;
  response_deadline?: string;
  resolution_deadline?: string;
  responded_at?: string;
  resolved_at?: string;
  is_response_breached: boolean;
  is_resolution_breached: boolean;
}

interface TicketDetailProps {
  ticket: any; comments: Comment[]; relations: Relation[]; attachments: Attachment[]; subtasks: Subtask[]; 
  watchers: Watcher[]; history: any[]; users: any[];
  onAddComment: (content: string, isInternal: boolean) => Promise<void>;
  onAddRelation: (targetId: string, type: string) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
  onDownloadFile: (attachmentId: string, filename: string) => void;
  onToggleWatch: () => Promise<void>;
  onToggleSubtask: (id: string, completed: boolean) => Promise<void>;
  onAddSubtask: (title: string) => Promise<void>;
  onDeleteSubtask: (id: string) => Promise<void>;
  onUpdateTicket: (data: any) => Promise<void>;
  onDeleteTicket?: () => Promise<void>;
}

const TicketDetail: React.FC<TicketDetailProps> = ({
  ticket, comments, relations, attachments, subtasks, watchers, history, users,
  onAddComment, onAddRelation, onUploadFile, onDownloadFile, onToggleWatch, onToggleSubtask, onAddSubtask, onDeleteSubtask, onUpdateTicket, onDeleteTicket
}) => {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const isDark = theme === 'dark' || theme === 'soc';
  
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isGlobalAdmin = currentUser?.is_superuser || currentUser?.group?.name === 'DIVISIÓN SEGURIDAD INFORMÁTICA';
  const isCreator = ticket?.created_by_id === currentUser?.id;
  const isResolvedOrClosed = ticket?.status === 'resolved' || ticket?.status === 'closed';
  const canManageState = isGlobalAdmin || (isCreator && !isResolvedOrClosed);

  const handleCommentSubmit = async (content: string, isInternal: boolean, attachmentIds: string[]) => {
    setSubmitting(true);
    try {
      await onAddComment(content, isInternal);
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatAuditDetail = (h: any) => {
    const d = h.details;
    const actor = h.user?.username || 'Sistema';
    if (!d || typeof d !== 'object') return String(d || '');

    switch (h.event_type) {
      case 'ticket_created':
        return `${actor} creó el ticket: "${d.title || '---'}"`;
      case 'comment_added':
        return `${actor} añadió un nuevo comentario.`;
      case 'ticket_updated':
        if (d.old_status && d.new_status) return `${actor} cambió el estado: ${d.old_status.toUpperCase()} ➔ ${d.new_status.toUpperCase()}`;
        if (d.old_assignee && d.new_assignee) {
          const u1 = users.find(u => u.id === d.old_assignee)?.username || 'Nadie';
          const u2 = users.find(u => u.id === d.new_assignee)?.username || 'Desconocido';
          return `${actor} cambió la asignación: ${u1} ➔ ${u2}`;
        }
        return `${actor} actualizó el ticket`;
      case 'attachment_added':
        return `${actor} subió un archivo: ${d.filename || '---'}`;
      default:
        return JSON.stringify(d);
    }
  };

  const SLADisplay = ({ sla }: { sla: SLAMetric }) => {
    const now = new Date();
    const resDeadline = sla.response_deadline ? new Date(sla.response_deadline) : null;
    const solDeadline = sla.resolution_deadline ? new Date(sla.resolution_deadline) : null;

    const isResBreached = sla.is_response_breached || (resDeadline && resDeadline < now && !sla.responded_at);
    const isSolBreached = sla.is_resolution_breached || (solDeadline && solDeadline < now && !sla.resolved_at);

    return (
      <div className="sla-container p-3 rounded-3 mb-4 bg-black bg-opacity-20 border border-white border-opacity-10">
        <h6 className="x-small fw-black text-primary uppercase tracking-widest mb-3 d-flex align-items-center">
          <Clock size={14} className="me-2" /> Cumplimiento de Niveles de Servicio (SLA)
        </h6>
        <Row className="g-3">
          <Col md={6}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="x-small fw-bold text-muted uppercase">Primera Respuesta</span>
              {sla.responded_at ? (
                <Badge bg="success" className="x-small">CUMPLIDO</Badge>
              ) : isResBreached ? (
                <Badge bg="danger" className="x-small">INCUMPLIDO</Badge>
              ) : (
                <Badge bg="info" className="x-small text-white">EN TIEMPO</Badge>
              )}
            </div>
            <div className="small fw-bold text-main">
              {sla.responded_at ? `Atendido el ${new Date(sla.responded_at).toLocaleString()}` : `Vence: ${resDeadline?.toLocaleString() || 'N/A'}`}
            </div>
          </Col>
          <Col md={6}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="x-small fw-bold text-muted uppercase">Resolución Final</span>
              {sla.resolved_at ? (
                <Badge bg="success" className="x-small">CUMPLIDO</Badge>
              ) : isSolBreached ? (
                <Badge bg="danger" className="x-small">INCUMPLIDO</Badge>
              ) : (
                <Badge bg="info" className="x-small text-white">EN TIEMPO</Badge>
              )}
            </div>
            <div className="small fw-bold text-main">
              {sla.resolved_at ? `Resuelto el ${new Date(sla.resolved_at).toLocaleString()}` : `Vence: ${solDeadline?.toLocaleString() || 'N/A'}`}
            </div>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <div className="ticket-detail">
      {!ticket ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : (
        <Row className="g-4">
          <Col lg={8}>
            {ticket.sla_metric && <SLADisplay sla={ticket.sla_metric} />}
            <Card className="mb-4 shadow-sm border-0 overflow-hidden bg-surface">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-10 x-small fw-bold">{ticket.platform || 'INTERNO'}</Badge>
                      <span className="text-muted x-small font-monospace opacity-50">#{ticket.id?.substring(0, 8)}</span>
                    </div>
                    <h2 className="mb-0 fw-black text-main">{ticket.title || 'Untitled Ticket'}</h2>
                  </div>
                  <div className="d-flex gap-2">
                    {isGlobalAdmin && (
                      <Button variant="outline-danger" size="sm" className="rounded-pill px-3 x-small fw-bold" onClick={() => setShowDeleteModal(true)}>ELIMINAR</Button>
                    )}
                    <Form.Select 
                      size="sm" value={ticket.status || 'open'} disabled={!canManageState}
                      onChange={(e) => onUpdateTicket({ status: e.target.value })}
                      className={`w-auto fw-bold border-0 shadow-sm rounded-pill px-3 ${isDark ? 'bg-dark text-success' : 'bg-light text-primary'}`}
                    >
                      <option value="open">OPEN</option><option value="in_progress">IN PROGRESS</option><option value="pending">PENDING</option><option value="resolved">RESOLVED</option><option value="closed">CLOSED</option>
                    </Form.Select>
                  </div>
                </div>

                {ticket.asset && (
                  <div className="mb-4 p-3 rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-10 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                      <div className="p-2 bg-primary bg-opacity-10 rounded-circle">
                        <Monitor size={20} className="text-primary" />
                      </div>
                      <div>
                        <div className="x-small fw-black text-primary uppercase tracking-wider mb-1">Equipo Vinculado</div>
                        <h6 className="mb-0 fw-bold text-main">{ticket.asset.hostname}</h6>
                        <div className="x-small text-muted font-monospace">{ticket.asset.ip_address || 'Sin IP'} | TAG: {ticket.asset.asset_tag || '---'}</div>
                      </div>
                    </div>
                    <Button 
                      variant="primary" size="sm" className="rounded-pill px-3 x-small fw-bold"
                      onClick={() => window.open(`/inventory/${ticket.asset.id}`, '_blank')}
                    >
                      VER EQUIPO
                    </Button>
                  </div>
                )}

                <div 
                  className="mb-4 text-main opacity-90 lh-base ql-editor p-0" 
                  dangerouslySetInnerHTML={{ __html: ticket.description || 'No description provided.' }} 
                />
                
                <div className="d-flex gap-4 text-muted x-small border-top border-color pt-3 flex-wrap text-uppercase fw-bold tracking-wider">
                  <span className="d-flex align-items-center gap-1">TYPE: <span className="text-primary">{ticket.ticket_type?.name || 'General'}</span></span>
                  <span className="d-flex align-items-center gap-1">CREATED: <span className="text-primary">{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A'}</span></span>
                  <div className="d-flex align-items-center gap-2">
                    <span>ASSIGNED:</span>
                    <Form.Select 
                      size="sm" value={ticket.assigned_to_id || ''} disabled={!canManageState}
                      onChange={(e) => onUpdateTicket({ assigned_to_id: e.target.value || null })}
                      className="w-auto border-0 bg-transparent p-0 text-primary fw-black" style={{ fontSize: 'inherit' }}
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => (<option key={u.id} value={u.id}>{u.username}</option>))}
                    </Form.Select>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Tabs defaultActiveKey="comments" className="custom-tabs mb-4 border-0">
              <Tab eventKey="comments" title={`Activity (${comments.length})`}>
                <Card className="border-0 shadow-sm bg-surface">
                  <Card.Body className="p-4">
                    <RichCommentEditor 
                      onSubmit={handleCommentSubmit}
                      isSubmitting={submitting}
                      users={users}
                      placeholder="Escribe un comentario técnico o usa @ para mencionar..."
                    />
                    {comments.map(c => (
                      <div key={c.id} className={`d-flex gap-3 mb-4 p-3 rounded-4 ${c.is_internal ? 'bg-warning bg-opacity-10' : 'hover-bg-surface-muted'}`}>
                        <div className="bg-primary bg-opacity-10 p-2 rounded-circle flex-shrink-0" style={{ width: 40, height: 40 }}><User size={24} className="text-primary" /></div>
                                              <div className="flex-grow-1">
                                                <div className="d-flex justify-content-between mb-1"><span className="fw-black text-main small">{c.user_name || 'User'}</span><span className="text-muted x-small">{new Date(c.created_at).toLocaleString()}</span></div>
                                                <div className="small text-main opacity-90" style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
                                              </div>                      </div>
                    ))}
                  </Card.Body>
                </Card>
              </Tab>
              <Tab eventKey="history" title="Audit Log">
                <Card className="border-0 shadow-sm bg-surface overflow-hidden">
                  <Table hover responsive className="m-0 small">
                    <thead className="bg-surface-muted"><tr className="x-small fw-black text-muted uppercase"><th className="ps-4">Timestamp</th><th>Analyst</th><th>Action</th><th>Details</th></tr></thead>
                    <tbody>
                      {history.map(h => (<tr key={h.id}><td className="ps-4 text-muted">{new Date(h.created_at).toLocaleString()}</td><td className="fw-bold">{h.user?.username || 'System'}</td><td><Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-10">{h.event_type.toUpperCase()}</Badge></td><td className="text-main">{formatAuditDetail(h)}</td></tr>))}
                    </tbody>
                  </Table>
                </Card>
              </Tab>
            </Tabs>
          </Col>

          <Col lg={4}>
            <Card className="shadow-sm border-0 mb-4 bg-surface overflow-hidden">
              <Card.Header className="py-3 d-flex justify-content-between align-items-center bg-surface-muted border-bottom border-color"><h6 className="mb-0 fw-black x-small uppercase"><Paperclip size={14} className="me-2" /> Evidencia</h6><Form.Label htmlFor="file-up" className="btn btn-primary btn-sm mb-0 rounded-circle p-1">+</Form.Label><Form.Control id="file-up" type="file" multiple className="d-none" onChange={(e: any) => setPendingFiles(Array.from(e.target.files))} /></Card.Header>
              <Card.Body className="p-0">
                {pendingFiles.length > 0 && <div className="p-3 bg-primary bg-opacity-5"><Button variant="primary" size="sm" className="w-100 fw-black x-small" onClick={async () => { setUploadingFiles(true); for (const f of pendingFiles) await onUploadFile(f); setPendingFiles([]); setUploadingFiles(false); }}>SUBIR {pendingFiles.length} ARCHIVOS</Button></div>}
                {attachments.map(a => (<div key={a.id} className="d-flex justify-content-between align-items-center p-3 border-bottom border-color hover-bg-surface-muted transition-all"><span className="small text-truncate text-main">{a.filename}</span><Button variant="link" size="sm" onClick={() => onDownloadFile(a.id, a.filename)}><DownloadIcon size={14} /></Button></div>))}
              </Card.Body>
            </Card>
            <Card className="shadow-sm border-0 mb-4 bg-surface overflow-hidden">
              <Card.Header className="py-3 d-flex justify-content-between align-items-center bg-surface-muted border-bottom border-color"><h6 className="mb-0 fw-black x-small uppercase"><Eye size={14} className="me-2" /> Observadores</h6><Button variant="link" size="sm" className="p-0 x-small fw-black" onClick={onToggleWatch}>{watchers.some(w => w.user_id === currentUser?.id) ? 'UNWATCH' : 'WATCH'}</Button></Card.Header>
              <Card.Body><div className="d-flex flex-wrap gap-2">{watchers.map(w => (<Badge key={w.id} bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-10 fw-normal rounded-pill px-3">{w.username}</Badge>))}</div></Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered contentClassName="bg-surface rounded-4">
        <Modal.Body className="p-4 text-center">
          <AlertCircle size={48} className="text-danger mb-3" />
          <h5 className="fw-black text-main uppercase">¿Eliminar Ticket?</h5>
          <p className="small text-muted mb-4">Esta acción es irreversible y borrará todo el historial y adjuntos asociados.</p>
          <div className="d-flex gap-2 justify-content-center">
            <Button variant="link" className="text-muted text-decoration-none fw-bold" onClick={() => setShowDeleteModal(false)}>CANCELAR</Button>
            <Button variant="danger" className="fw-black px-4 rounded-pill shadow-sm" onClick={() => { setShowDeleteModal(false); if (onDeleteTicket) onDeleteTicket(); }}>BORRAR PERMANENTEMENTE</Button>
          </div>
        </Modal.Body>
      </Modal>

      <style jsx global>{`
        .text-main { color: var(--text-main) !important; }
        .bg-surface { background-color: var(--bg-surface) !important; }
        .bg-surface-muted { background-color: var(--bg-surface-muted) !important; }
        .custom-tabs .nav-link { color: var(--text-muted); font-weight: 900; border: none !important; font-size: 11px; text-transform: uppercase; padding: 15px 25px; letter-spacing: 1px; opacity: 0.6; }
        .custom-tabs .nav-link.active { color: var(--bs-primary) !important; background: transparent !important; border-bottom: 3px solid var(--bs-primary) !important; opacity: 1; }
        .fw-black { font-weight: 900; }
        .x-small { font-size: 0.7rem; }
      `}</style>
    </div>
  );
};

export default TicketDetail;