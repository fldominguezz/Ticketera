import React, { useState } from 'react';
import { Card, Button, Form, Badge, ListGroup, Row, Col, Table, Tabs, Tab } from 'react-bootstrap';
import { MessageSquare, Lock, Send, User, Clock, Link as LinkIcon, Plus, X, Paperclip, Download as DownloadIcon, CheckSquare, History } from 'lucide-react';

interface Comment { id: string; content: string; is_internal: boolean; user_id: string; user_name?: string; user_avatar?: string; created_at: string; }
interface Relation { id: string; source_ticket_id: string; target_ticket_id: string; relation_type: string; }
interface Attachment { id: string; filename: string; size: number; }
interface Subtask { id: string; title: string; is_completed: boolean; }

interface TicketDetailProps {
  ticket: any; comments: Comment[]; relations: Relation[]; attachments: Attachment[]; subtasks: Subtask[]; history: any[]; users: any[];
  onAddComment: (content: string, isInternal: boolean) => Promise<void>;
  onAddRelation: (targetId: string, type: string) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
  onToggleSubtask: (id: string, completed: boolean) => Promise<void>;
  onAddSubtask: (title: string) => Promise<void>;
  onDeleteSubtask: (id: string) => Promise<void>;
  onUpdateTicket: (data: any) => Promise<void>;
}

const TicketDetail: React.FC<TicketDetailProps> = ({ 
  ticket, comments, relations, attachments, subtasks, history, users,
  onAddComment, onAddRelation, onUploadFile, onToggleSubtask, onAddSubtask, onDeleteSubtask, onUpdateTicket
}) => {
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newSt, setNewSt] = useState('');

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
      <Row>
        <Col lg={8}>
          <Card className="mb-4 shadow-sm border-0">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="mb-0 fw-bold">{ticket.title}</h2>
                <div className="d-flex gap-2">
                  <Form.Select 
                    size="sm" 
                    value={ticket.status} 
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
                    value={ticket.priority} 
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
              <p className="text-dark mb-4">{ticket.description}</p>
              <div className="d-flex gap-3 text-muted small border-top pt-3 flex-wrap">
                <span><strong>Type:</strong> {ticket.ticket_type?.name || 'General'}</span>
                <span><strong>Created:</strong> {new Date(ticket.created_at).toLocaleDateString()}</span>
                <div className="d-flex align-items-center gap-1">
                  <strong>Assigned to:</strong>
                  <Form.Select 
                    size="sm" 
                    value={ticket.assigned_to_id || ''} 
                    onChange={(e) => onUpdateTicket({ assigned_to_id: e.target.value || null })}
                    className="w-auto border-0 bg-transparent p-0 text-primary fw-bold"
                  >
                    <option value="">Unassigned</option>
                    {users?.map(u => (
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
                  {comments?.map(c => (
                    <ListGroup.Item key={c.id} className={`border-0 mb-2 rounded ${c.is_internal ? 'bg-warning bg-opacity-10' : 'bg-light'}`}>
                      <div className="d-flex justify-content-between small fw-bold mb-1">
                        <span>{c.user_name || c.user_id.substring(0,8)}</span>
                        <span className="text-muted">{new Date(c.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div>{c.content}</div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                <Form onSubmit={handleCommentSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Control as="textarea" rows={2} value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." />
                  </Form.Group>
                  <div className="d-flex justify-content-between align-items-center">
                    <Form.Check type="switch" label="Internal Note" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="small" />
                    <Button size="sm" type="submit" disabled={submitting || !newComment.trim()}>Post</Button>
                  </div>
                </Form>
              </div>
            </Tab>
            <Tab eventKey="subtasks" title="Checklist">
              <div className="p-4 bg-white border rounded-bottom shadow-sm">
                {subtasks?.map(st => (
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
            <Tab eventKey="history" title="History">
              <div className="bg-white border rounded-bottom shadow-sm overflow-hidden">
                <Table responsive hover className="mb-0 small">
                  <thead><tr><th>User</th><th>Action</th><th>Time</th></tr></thead>
                  <tbody>{history?.map((h, i) => (<tr key={i}><td>{h.user_id.substring(0,8)}</td><td>{h.event_type}</td><td>{new Date(h.created_at).toLocaleDateString()}</td></tr>))}</tbody>
                </Table>
              </div>
            </Tab>
          </Tabs>
        </Col>

        <Col lg={4}>
          <Card className="shadow-sm border-0 mb-4">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold"><Paperclip size={16} className="me-2" /> Attachments</h6>
              <Form.Label htmlFor="file-up" className="btn btn-outline-primary btn-sm mb-0">+</Form.Label>
              <Form.Control id="file-up" type="file" className="d-none" onChange={handleFileChange} />
            </Card.Header>
            <Card.Body>
              {attachments?.map(a => (
                <div key={a.id} className="d-flex justify-content-between small mb-1 border-bottom pb-1">
                  <span className="text-truncate">{a.filename}</span>
                  <DownloadIcon size={14} className="text-primary cursor-pointer" />
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TicketDetail;
