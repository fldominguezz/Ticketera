import React, { useState } from 'react';
import { Card, Button, Form, Badge, ListGroup, Row, Col, Table, Tabs, Tab, Spinner, Alert } from 'react-bootstrap';
import { MessageSquare, Lock, Send, User, Clock, Link as LinkIcon, Plus, X, Paperclip, Download as DownloadIcon, CheckSquare, History, Eye, Image, Terminal, LayoutList, Target, Fingerprint, Box } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface Comment { id: string; content: string; is_internal: boolean; user_id: string; user_name?: string; user_avatar?: string; created_at: string; }
interface Relation { id: string; source_ticket_id: string; target_ticket_id: string; relation_type: string; }
interface Attachment { id: string; filename: string; size: number; }
interface Subtask { id: string; title: string; is_completed: boolean; }
interface Watcher { id: string; user_id: string; username: string; }

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
}

const TicketDetail: React.FC<TicketDetailProps> = ({ 
  ticket, comments, relations, attachments, subtasks, watchers, history, users,
  onAddComment, onAddRelation, onUploadFile, onDownloadFile, onToggleWatch, onToggleSubtask, onAddSubtask, onDeleteSubtask, onUpdateTicket
}) => {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const isDark = theme === 'dark';
  
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newSt, setNewSt] = useState('');
  
  // States for attachments pre-upload
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const isGlobalAdmin = currentUser?.is_superuser || currentUser?.group?.name === "División Seguridad Informática";
  const isCreator = ticket?.created_by_id === currentUser?.id;
  const isResolvedOrClosed = ticket?.status === 'resolved' || ticket?.status === 'closed';
  
  // Permission rule: Creator can manage only if NOT resolved/closed. Global Admin always.
  const canManageState = isGlobalAdmin || (isCreator && !isResolvedOrClosed);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try { await onAddComment(newComment, isInternal); setNewComment(''); }
    finally { setSubmitting(false); }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const confirmUploads = async () => {
    setUploadingFiles(true);
    try {
      for (const file of pendingFiles) {
        await onUploadFile(file);
      }
      setPendingFiles([]);
    } finally {
      setUploadingFiles(false);
    }
  };

  const formatAuditDetail = (h: any) => {
    const d = h.details;
    if (!d || typeof d !== 'object') return String(d || '');
    
    if (h.event_type === 'ticket_updated') {
      if (d.old_status && d.new_status) return `Estado cambiado de ${d.old_status.toUpperCase()} a ${d.new_status.toUpperCase()}`;
      if (d.old_assignee && d.new_assignee) {
        const oldUser = users.find(u => u.id === d.old_assignee)?.username || 'Nadie';
        const newUser = users.find(u => u.id === d.new_assignee)?.username || 'Desconocido';
        return `Reasignado de ${oldUser} a ${newUser}`;
      }
    }
    if (h.event_type === 'comment_added') return `Añadió un comentario: "${d.content_preview || '...'}"`;
    if (h.event_type === 'attachment_added') return `Adjuntó el archivo: ${d.filename}`;
    
    return JSON.stringify(d);
  };

  return (
    <div className="ticket-detail">
      {!ticket ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : (
      <Row className="g-4">
        <Col lg={8}>
          <Card className="mb-4 shadow-sm border-0 overflow-hidden">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-10 x-small fw-bold">{ticket.platform || 'INTERNO'}</Badge>
                    <span className="text-muted x-small font-monospace">#{ticket.id?.substring(0,8)}</span>
                  </div>
                  <h2 className="mb-0 fw-bold">{ticket.title || 'Untitled Ticket'}</h2>
                </div>
                <div className="d-flex gap-2">
                  <Form.Select 
                    size="sm" 
                    value={ticket.status || 'open'} 
                    disabled={!canManageState}
                    onChange={(e) => onUpdateTicket({ status: e.target.value })}
                    className={`w-auto fw-bold border-opacity-25 ${!canManageState ? 'bg-light' : 'text-primary'}`}
                  >
                    <option value="open">OPEN</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="pending">PENDING</option>
                    <option value="resolved">RESOLVED</option>
                    <option value="closed">CLOSED</option>
                  </Form.Select>
                </div>
              </div>
              
              {!canManageState && isResolvedOrClosed && (
                <Alert variant="info" className="py-2 px-3 mb-4 x-small d-flex align-items-center gap-2">
                  <Lock size={14} /> El ticket está resuelto/cerrado. Solo administradores pueden realizar cambios adicionales.
                </Alert>
              )}

              <p className="mb-4 opacity-90">{ticket.description || 'No description provided.'}</p>
              
              <div className="d-flex gap-3 text-muted x-small border-top pt-3 flex-wrap text-uppercase fw-bold letter-spacing-1">
                <span>Type: <span className="text-body">{(ticket.ticket_type && ticket.ticket_type.name) || 'General'}</span></span>
                <span>Created: <span className="text-body">{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'N/A'}</span></span>
                <div className="d-flex align-items-center gap-1">
                  <span>Assigned to:</span>
                  <Form.Select 
                    size="sm" 
                    value={ticket.assigned_to_id || ''} 
                    disabled={!canManageState}
                    onChange={(e) => onUpdateTicket({ assigned_to_id: e.target.value || null })}
                    className="w-auto border-0 bg-transparent p-0 text-primary fw-bold"
                    style={{ fontSize: 'inherit' }}
                  >
                    <option value="">Unassigned</option>
                    {Array.isArray(users) && users.map(u => (
                      <option key={u.id} value={u.id}>{(u.first_name && u.last_name) ? `${u.first_name} ${u.last_name}` : u.username || u.id}</option>
                    ))}
                  </Form.Select>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Tabs defaultActiveKey="comments" className="custom-tabs mb-4">
            <Tab eventKey="comments" title="Activity Feed">
              <Card className="border-0 shadow-sm rounded-top-0">
                <Card.Body className="p-4">
                    <ListGroup variant="flush" className="mb-4">
                    {Array.isArray(comments) && comments.map(c => (
                        <ListGroup.Item key={c.id} className={`border-0 mb-3 rounded p-3 ${c.is_internal ? 'bg-warning bg-opacity-10 border-start border-3 border-warning' : (isDark ? 'bg-white bg-opacity-5' : 'bg-light')}`}>
                        <div className="d-flex justify-content-between x-small fw-bold mb-2 opacity-75 text-uppercase">
                            <div className="d-flex align-items-center gap-2">
                                <span className={c.is_internal ? 'text-warning' : 'text-primary'}>{c.user_name || c.user_id?.substring(0,8) || 'Analyst'}</span>
                                {c.is_internal && <Badge bg="warning" text="dark" className="x-small">INTERNAL</Badge>}
                            </div>
                            <span className="text-muted">{c.created_at ? new Date(c.created_at).toLocaleString() : '---'}</span>
                        </div>
                        <div className="small lh-base" style={{ whiteSpace: 'pre-wrap' }}>
                            {c.content.split(/(@\w+)/).map((part, i) => 
                                part.startsWith('@') ? <span key={i} className="text-primary fw-bold">{part}</span> : part
                            )}
                        </div>
                        </ListGroup.Item>
                    ))}
                    </ListGroup>
                    
                    <Form onSubmit={handleCommentSubmit} className="mt-4 border-top pt-4">
                    <Form.Group className="mb-3">
                        <div className="d-flex justify-content-between mb-2">
                            <Form.Label className="x-small fw-bold text-muted text-uppercase m-0">Añadir Comentario</Form.Label>
                            <span className="x-small text-muted opacity-50 italic">Usa @usuario para mencionar</span>
                        </div>
                        <Form.Control 
                        as="textarea" rows={3} 
                        value={newComment} 
                        onChange={e => setNewComment(e.target.value)} 
                        placeholder="Escriba aquí sus observaciones..." 
                        className={isDark ? 'bg-dark border-opacity-10' : ''}
                        />
                    </Form.Group>
                    <div className="d-flex justify-content-between align-items-center">
                        <Form.Check 
                        type="switch" id="internal-note-switch" label={<span className="small fw-bold">Nota Interna</span>}
                        checked={isInternal} onChange={e => setIsInternal(e.target.checked)} 
                        />
                        <Button variant="primary" size="sm" type="submit" disabled={submitting || !newComment.trim()} className="fw-bold px-4 shadow-sm">
                            <Send size={14} className="me-2" /> ENVIAR
                        </Button>
                    </div>
                    </Form>
                </Card.Body>
              </Card>
            </Tab>
            <Tab eventKey="history" title="Audit Log">
              <Card className="border-0 shadow-sm rounded-top-0">
                <Card.Body className="p-4">
                    <div className="timeline-activity">
                    {Array.isArray(history) && history.length > 0 ? history.map((h, i) => (
                        <div key={i} className="d-flex mb-4 position-relative border-start border-opacity-25 ps-4" style={{ borderColor: 'var(--bs-primary)' }}>
                        <div className="position-absolute bg-primary rounded-circle shadow-sm" style={{ width: 10, height: 10, left: -6, top: 6 }}></div>
                        <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold small text-uppercase letter-spacing-1">{h.event_type.replace('_', ' ')}</span>
                            <span className="text-muted x-small font-monospace">{new Date(h.created_at).toLocaleString()}</span>
                            </div>
                            <div className="x-small text-muted mb-2">
                            Operator: <span className="text-primary fw-bold">{users.find(u => u.id === h.user_id)?.username || 'SYSTEM'}</span> 
                            {h.ip_address && <span className="ms-2 opacity-50">• IP: {h.ip_address}</span>}
                            </div>
                            <div className={`p-2 rounded x-small border border-opacity-10 ${isDark ? 'bg-dark bg-opacity-50' : 'bg-light'}`} style={{ fontStyle: 'italic' }}>
                                {formatAuditDetail(h)}
                            </div>
                        </div>
                        </div>
                    )) : <div className="text-center py-4 text-muted small italic">Sin registros de auditoría detallados.</div>}
                    </div>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>

        <Col lg={4}>
          <Card className="shadow-sm border-0 mb-4 overflow-hidden">
            <Card.Header className="py-3 d-flex justify-content-between align-items-center bg-transparent border-bottom">
              <h6 className="mb-0 fw-bold x-small text-uppercase letter-spacing-1"><Paperclip size={14} className="me-2 text-primary" /> Evidencia</h6>
              <div className="d-flex gap-2">
                <Form.Label htmlFor="file-up" className="btn btn-outline-primary btn-sm mb-0 px-2" title="Seleccionar archivos">+</Form.Label>
                <Form.Control id="file-up" type="file" multiple className="d-none" onChange={handleFileSelection} />
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {/* Pre-upload List */}
              {pendingFiles.length > 0 && (
                <div className="p-3 bg-primary bg-opacity-10 border-bottom border-primary border-opacity-25">
                  <div className="x-small fw-bold text-primary mb-2 text-uppercase">Archivos pendientes de subir</div>
                  {pendingFiles.map((f, idx) => (
                    <div key={idx} className="d-flex justify-content-between align-items-center mb-2 bg-white bg-opacity-50 p-2 rounded shadow-sm">
                      <span className="x-small text-truncate fw-bold" style={{maxWidth: '150px'}}>{f.name}</span>
                      <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => removePendingFile(idx)}><X size={14}/></Button>
                    </div>
                  ))}
                  <Button variant="primary" size="sm" className="w-100 fw-bold mt-2 x-small shadow-sm" onClick={confirmUploads} disabled={uploadingFiles}>
                    {uploadingFiles ? <Spinner animation="border" size="sm" /> : 'CONFIRMAR Y SUBIR'}
                  </Button>
                </div>
              )}

              {/* Already uploaded list */}
              {Array.isArray(attachments) && attachments.length > 0 ? attachments.map(a => (
                <div key={a.id} className="d-flex justify-content-between align-items-center p-3 border-bottom border-opacity-10 hover-bg transition-all">
                  <div className="d-flex align-items-center gap-2 overflow-hidden">
                    <Image size={14} className="text-muted flex-shrink-0" />
                    <span className="small text-truncate fw-medium">{a.filename}</span>
                  </div>
                  <div className="d-flex gap-2">
                    <Button variant="link" size="sm" className="p-0 text-primary" onClick={() => onDownloadFile(a.id, a.filename)}>
                      <DownloadIcon size={14} />
                    </Button>
                    {isGlobalAdmin && (
                      <Button variant="link" size="sm" className="p-0 text-danger opacity-50 hover-opacity-100" title="Borrar adjunto">
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              )) : pendingFiles.length === 0 && <div className="p-4 text-center text-muted small italic">Sin archivos adjuntos.</div>}
            </Card.Body>
          </Card>

          {/* Watchers & Subtasks remained same style but cleaned up */}
          <Card className="shadow-sm border-0 mb-4 overflow-hidden">
            <Card.Header className="py-3 d-flex justify-content-between align-items-center bg-transparent border-bottom">
              <h6 className="mb-0 fw-bold x-small text-uppercase letter-spacing-1"><Eye size={14} className="me-2 text-primary" /> Observadores</h6>
              <Button variant="link" size="sm" className="p-0 text-decoration-none x-small fw-bold" onClick={onToggleWatch}>
                {watchers.some(w => w.user_id === currentUser?.id) ? 'DEJAR DE SEGUIR' : 'OBSERVAR'}
              </Button>
            </Card.Header>
            <Card.Body>
              {watchers.length === 0 ? (
                <div className="text-muted small italic">Nadie observando.</div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {watchers.map(w => (
                    <Badge key={w.id} bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-10 fw-normal">
                      {w.username}
                    </Badge>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      )}
      <style jsx global>{`
        .custom-tabs .nav-link { color: var(--text-muted); font-weight: 700; border: none !important; font-size: 13px; text-transform: uppercase; padding: 12px 20px; }
        .custom-tabs .nav-link.active { color: var(--bs-primary) !important; background: transparent !important; border-bottom: 2px solid var(--bs-primary) !important; }
        .hover-bg:hover { background-color: rgba(128,128,128,0.05); }
        .hover-bg-dark:hover { background-color: rgba(255,255,255,0.03); }
        .hover-bg-light:hover { background-color: rgba(0,0,0,0.02); }
        .letter-spacing-1 { letter-spacing: 1px; }
      `}</style>
    </div>
  );
};

export default TicketDetail;