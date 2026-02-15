import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, Badge, Row, Col } from 'react-bootstrap';
import { Clock, AlertCircle, CheckCircle, PlayCircle, Archive } from 'lucide-react';

interface Ticket {
 id: string;
 title: string;
 status: string;
 priority: string;
 created_at: string;
 sla_deadline: string | null;
}

const getSLABadge = (deadline: string | null) => {
 if (!deadline) return null;
 const now = new Date();
 const target = new Date(deadline);
 const diff = target.getTime() - now.getTime();
 const hours = Math.round(diff / (1000 * 60 * 60));
 
 if (diff < 0) return <Badge bg="transparent" className="ms-1 border border-danger text-danger x-small fw-bold">OVERDUE</Badge>;
 if (hours < 2) return <Badge bg="transparent" className="ms-1 border border-warning text-warning x-small fw-bold">{hours}h left</Badge>;
 return <Badge bg="transparent" className="ms-1 border border-subtle text-muted x-small fw-bold">{hours}h left</Badge>;
};

interface KanbanBoardProps {
 initialTickets: Ticket[];
 onStatusChange: (ticketId: string, newStatus: string) => Promise<void>;
}

const COLUMNS = [
 { id: 'open', title: 'To Do', icon: <AlertCircle size={18} className="me-2 text-danger" /> },
 { id: 'in_progress', title: 'In Progress', icon: <PlayCircle size={18} className="me-2 text-primary" /> },
 { id: 'pending', title: 'Pending', icon: <Clock size={18} className="me-2 text-warning" /> },
 { id: 'resolved', title: 'Resolved', icon: <CheckCircle size={18} className="me-2 text-success" /> },
 { id: 'closed', title: 'Closed', icon: <Archive size={18} className="me-2 text-muted" /> }
];

const getPriorityClass = (priority: string) => {
 switch (priority) {
  case 'critical': return 'prio-critical';
  case 'high': return 'prio-high';
  case 'medium': return 'prio-medium';
  case 'low': return 'prio-low';
  default: return 'prio-low';
 }
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ initialTickets, onStatusChange }) => {
 const [ticketsByStatus, setTicketsByStatus] = useState<Record<string, Ticket[]>>({
  open: [],
  in_progress: [],
  pending: [],
  resolved: [],
  closed: []
 });

 useEffect(() => {
  const list = Array.isArray(initialTickets) ? initialTickets : [];
  const grouped = list.reduce((acc, ticket) => {
   const status = (ticket && ticket.status) || 'open';
   if (!acc[status]) acc[status] = [];
   acc[status].push(ticket);
   return acc;
  }, { open: [], in_progress: [], pending: [], resolved: [], closed: [] } as Record<string, Ticket[]>);
  setTicketsByStatus(grouped);
 }, [initialTickets]);

 const onDragEnd = async (result: DropResult) => {
  const { source, destination, draggableId } = result;

  if (!destination) return;
  if (source.droppableId === destination.droppableId && source.index === destination.index) return;

  const sourceStatus = source.droppableId;
  const destStatus = destination.droppableId;

  try {
   const newTicketsByStatus = { ...ticketsByStatus };
   if (!newTicketsByStatus[sourceStatus] || !newTicketsByStatus[destStatus]) return;
   
   const [movedTicket] = newTicketsByStatus[sourceStatus].splice(source.index, 1);
   if (movedTicket) {
    movedTicket.status = destStatus;
    newTicketsByStatus[destStatus].splice(destination.index, 0, movedTicket);
    setTicketsByStatus(newTicketsByStatus);
    await onStatusChange(draggableId, destStatus);
   }
  } catch (error) {
   console.error('Failed to update ticket status:', error);
  }
 };

 return (
  <DragDropContext onDragEnd={onDragEnd}>
   <Row className="kanban-row g-3 overflow-auto flex-nowrap pb-4" style={{ minHeight: '70vh' }}>
    {COLUMNS.map((column) => (
     <Col key={column.id} style={{ minWidth: '300px', maxWidth: '350px' }}>
      <div className="p-3 rounded-3 h-100 border border-subtle bg-surface shadow-sm kanban-column">
       <div className="d-flex align-items-center mb-3">
        {column.icon}
        <h6 className="mb-0 fw-black text-main uppercase tracking-tighter">{column.title}</h6>
        <Badge bg="transparent" className="ms-auto bg-primary-muted text-primary rounded-pill x-small fw-bold">
         {ticketsByStatus[column.id]?.length || 0}
        </Badge>
       </div>

       <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
         <div
          {...provided.droppableProps}
          ref={provided.innerRef}
          className={`kanban-column-body rounded-3 p-1 ${snapshot.isDraggingOver ? 'bg-surface-muted' : ''}`}
          style={{ minHeight: '100px', transition: 'background-color 0.2s ease' }}
         >
          {ticketsByStatus[column.id]?.map((ticket, index) => (
           <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
            {(provided, snapshot) => (
             <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className="mb-3"
             >
              <Card 
               className={`border-subtle shadow-sm bg-card ticket-kanban-card ${snapshot.isDragging ? 'shadow-lg border-primary' : ''}`}
               style={{ cursor: 'grab' }}
              >
               <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                 <div className="d-flex flex-wrap gap-1">
                  <Badge bg="transparent" className={`text-uppercase border border-subtle x-small fw-bold ${getPriorityClass(ticket.priority)}`}>
                   {ticket.priority || 'medium'}
                  </Badge>
                  {getSLABadge(ticket.sla_deadline)}
                 </div>
                 <small className="text-muted font-monospace opacity-50" style={{ fontSize: '0.65rem' }}>
                  {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '---'}
                 </small>
                </div>
                <Card.Title className="h6 mb-2 fw-bold text-main">
                 <a href={`/tickets/${ticket.id}`} className="text-decoration-none text-main hover:text-primary transition-all">
                  {ticket.title}
                 </a>
                </Card.Title>
                <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top border-subtle">
                 <small className="font-monospace text-muted opacity-75" style={{ fontSize: '0.65rem' }}>
                  {ticket.id ? ticket.id.substring(0, 8).toUpperCase() : '---'}
                 </small>
                 <div className="avatar-mini bg-primary-muted text-primary rounded-circle d-flex align-items-center justify-content-center fw-black" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                  {ticket.title.charAt(0).toUpperCase()}
                 </div>
                </div>
               </Card.Body>
              </Card>
             </div>
            )}
           </Draggable>
          ))}
          {provided.placeholder}
         </div>
        )}
       </Droppable>
      </div>
     </Col>
    ))}
   </Row>
   <style jsx>{`
     .fw-black { font-weight: 900; }
     .uppercase { text-transform: uppercase; }
     .tracking-tighter { letter-spacing: -0.05em; }
     .x-small { font-size: 0.65rem; }
     .font-monospace { font-family: 'Fira Code', monospace !important; }
     
     :global(.prio-critical) { color: var(--color-danger) !important; border-color: var(--color-danger) !important; background-color: color-mix(in srgb, var(--color-danger), transparent 92%) !important; }
     :global(.prio-high) { color: var(--color-warning) !important; border-color: var(--color-warning) !important; background-color: color-mix(in srgb, var(--color-warning), transparent 92%) !important; }
     :global(.prio-medium) { color: var(--primary) !important; border-color: var(--primary) !important; background-color: color-mix(in srgb, var(--primary), transparent 92%) !important; }
     :global(.prio-low) { color: var(--text-muted) !important; border-color: var(--border-subtle) !important; background-color: var(--bg-surface-muted) !important; }

     .ticket-kanban-card {
       transition: all 0.2s ease;
     }
     .ticket-kanban-card:hover {
       border-color: var(--primary) !important;
       transform: translateY(-2px);
     }
     .kanban-column {
       background-color: var(--bg-surface);
     }
   `}</style>
  </DragDropContext>
 );
};

export default KanbanBoard;
