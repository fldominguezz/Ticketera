import React, { useState } from 'react';
import { Card, Button, Form, Badge, ListGroup, Row, Col, Table, Tabs, Tab } from 'react-bootstrap';
import { MessageSquare, Lock, Send, User, Clock, Link as LinkIcon, Plus, X, Paperclip, Download as DownloadIcon, CheckSquare, History, Eye } from 'lucide-react';

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
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newSt, setNewSt] = useState('');
  const [watching, setWatching] = useState(false);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try { await onAddComment(newComment, isInternal); setNewComment(''); }
    finally { setSubmitting(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try { await onUploadFile(e.target.files[0]); } catch (e) { console.error(e); }
    }
  };

  return (
    <div className="ticket-detail">
      {!ticket ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
      <Row>
        <Col lg={8}>
          <Card className="mb-4 shadow-sm border-0">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="mb-0 fw-bold">{ticket.title || 'Untitled Ticket'}</h2>
                <div className="d-flex gap-2">
                  <Form.Select 
                    size="sm" 
                    value={ticket.status || 'open'} 
                    onChange={(e) => onUpdateTicket({ status: e.target.value })}
                    className="w-auto fw-bold shadow-sm"
                  >
                    <option value="open">OPEN</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="pending">PENDING</option>
                    <option value="resolved">RESOLVED</option>
                    <option value="closed">CLOSED</option>
                  </Form.Select>
                  <Form.Select 
                    size="sm" 
                    value={ticket.priority || 'medium'} 
                    onChange={(e) => onUpdateTicket({ priority: e.target.value })}
                    className="w-auto fw-bold shadow-sm"
                  >
                    <option value="low">LOW</option>
                    <option value="medium">MEDIUM</option>
                    <option value="high">HIGH</option>
                    <option value="critical">CRITICAL</option>
                  </Form.Select>
                </div>
              </div>
              <p className="text-dark mb-4">{ticket.description || 'No description provided.'}</p>
              <div className="d-flex gap-3 text-muted small border-top pt-3 flex-wrap">
                <span><strong>Type:</strong> {ticket.ticket_type?.name || 'General'}</span>
                <span><strong>Created:</strong> {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'N/A'}</span>
                <div className="d-flex align-items-center gap-1">
                  <strong>Assigned to:</strong>
                  <Form.Select 
                    size="sm" 
                    value={ticket.assigned_to_id || ''} 
                    onChange={(e) => onUpdateTicket({ assigned_to_id: e.target.value || null })}
                    className="w-auto border-0 bg-transparent p-0 text-primary fw-bold"
                  >
                    <option value="">Unassigned</option>
                    {Array.isArray(users) && users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                    ))}
                  </Form.Select>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Tabs defaultActiveKey="comments" className="mb-4">
            <Tab eventKey="comments" title="Activity">
              <div className="p-3 bg-white border rounded-bottom shadow-sm">
                <ListGroup variant="flush" className="mb-4">
                  {Array.isArray(comments) && comments.map(c => (
                    <ListGroup.Item key={c.id} className={`border-0 mb-2 rounded ${c.is_internal ? 'bg-warning bg-opacity-10' : 'bg-light'}`}>
                      <div className="d-flex justify-content-between small fw-bold mb-1">
                        <span>{c.user_name || c.user_id?.substring(0,8) || 'Unknown'}</span>
                        <span className="text-muted">{c.created_at ? new Date(c.created_at).toLocaleTimeString() : 'N/A'}</span>
                      </div>
                      <div>{c.content}</div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                <Form onSubmit={handleCommentSubmit}>
                  <Form.Group className="mb-3" controlId="ticket-comment-textarea">
                    <Form.Label className="small fw-bold text-muted">Añadir Comentario</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={2} 
                      name="comment_content"
                      value={newComment} 
                      onChange={ticket => setNewComment(ticket.target.value)} 
                      placeholder="Escriba aquí..." 
                    />
                  </Form.Group>
                  <div className="d-flex justify-content-between align-items-center">
                    <Form.Check 
                      type="switch" 
                      id="internal-note-switch"
                      name="is_internal"
                      label="Nota Interna" 
                      checked={isInternal} 
                      onChange={ticket => setIsInternal(ticket.target.checked)} 
                      className="small" 
                    />
                    <Button size="sm" type="submit" disabled={submitting || !newComment.trim()}>Enviar</Button>
                  </div>
                </Form>
              </div>
            </Tab>
            <Tab eventKey="subtasks" title="Checklist">
              <div className="p-4 bg-white border rounded-bottom shadow-sm">
                {Array.isArray(subtasks) && subtasks.map(st => (
                  <div key={st.id} className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center">
                      <Form.Check checked={st.is_completed} onChange={e => onToggleSubtask(st.id, e.target.checked)} />
                      <span className={`ms-2 ${st.is_completed ? 'text-decoration-line-through text-muted' : ''}`}>{st.title}</span>
                    </div>
                    <Button variant="link" size="sm" className="text-danger p-0" onClick={() => onDeleteSubtask(st.id)}><X size={14}/></Button>
                  </div>
                ))}
                <div className="d-flex gap-2 mt-3">
                  <Form.Control size="sm" value={newSt} onChange={e => setNewSt(e.target.value)} placeholder="New task..." />
                  <Button size="sm" onClick={() => { onAddSubtask(newSt); setNewSt(''); }}>Add</Button>
                </div>
              </div>
            </Tab>
            <Tab eventKey="history" title="Registro de Actividad">
              <div className="bg-white border rounded-bottom shadow-sm p-4">
                <div className="timeline-activity">
                  {Array.isArray(history) && history.length > 0 ? history.map((h, i) => {
                    const getEventLabel = (type: string) => {
                      const labels: any = {
                        'ticket_created': 'Ticket creado',
                        'ticket_updated': 'Información actualizada',
                        'comment_added': 'Comentario añadido',
                        'attachment_uploaded': 'Archivo adjunto subido',
                        'subtask_added': 'Sub-tarea añadida',
                        'subtask_updated': 'Estado de sub-tarea cambiado',
                        'siem_incident_received': 'Alerta SIEM recibida',
                        'comment_added_internal': 'Nota interna añadida'
                      };
                      return labels[type] || type.replace('_', ' ').toUpperCase();
                    };

                    return (
                      <div key={i} className="d-flex mb-4 position-relative border-start ps-4" style={{ borderColor: '#dee2e6' }}>
                        <div className="position-absolute bg-white rounded-circle border" style={{ width: '12px', height: '12px', left: '-7px', top: '5px', borderColor: '#0d6efd' }}></div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold text-dark">{getEventLabel(h.event_type)}</span>
                            <span className="text-muted small"><Clock size={12} className="me-1" /> {h.created_at ? new Date(h.created_at).toLocaleString() : 'N/A'}</span>
                          </div>
                          <div className="small text-muted">
                            Realizado por <span className="fw-bold text-primary">{h.user_id?.substring(0,8) || 'SYSTEM'}</span> 
                            {h.ip_address && <span className="ms-2 opacity-75">• IP: {h.ip_address}</span>}
                          </div>
                          {h.details && (
                            <div className="mt-2 p-2 bg-light rounded x-small border border-opacity-10 text-wrap" style={{ fontSize: '0.75rem', overflowWrap: 'anywhere' }}>
                              {typeof h.details === 'object' ? JSON.stringify(h.details) : h.details}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-4 text-muted small italic">No hay registros de actividad para este ticket.</div>
                  )}
                </div>
              </div>
            </Tab>
          </Tabs>
        </Col>

        <Col lg={4}>
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold"><Eye size={16} className="me-2 text-primary" /> Observadores</h6>
              <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={onToggleWatch}>
                {Array.isArray(watchers) && watchers.some(w => w.username === 'admin') ? 'Dejar de observar' : 'Observar'}
              </Button>
            </Card.Header>
            <Card.Body>
              {(!Array.isArray(watchers) || watchers.length === 0) ? (
                <div className="text-muted small italic">Nadie está observando este ticket.</div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {watchers.map(w => (
                    <Badge key={w.id} bg="light" text="dark" className="border fw-normal">
                      {w.username}
                    </Badge>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold"><Paperclip size={16} className="me-2" /> Attachments</h6>
              <Form.Label htmlFor="file-up" className="btn btn-outline-primary btn-sm mb-0">+</Form.Label>
              <Form.Control id="file-up" type="file" className="d-none" onChange={handleFileChange} />
            </Card.Header>
            <Card.Body>
              {Array.isArray(attachments) && attachments.map(a => (
                <div key={a.id} className="d-flex justify-content-between small mb-1 border-bottom pb-1">
                  <span className="text-truncate">{a.filename}</span>
                  <DownloadIcon 
                    size={14} 
                    className="text-primary cursor-pointer" 
                    onClick={() => onDownloadFile(a.id, a.filename)}
                  />
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      )}
    </div>
  );
};

export default TicketDetail;
