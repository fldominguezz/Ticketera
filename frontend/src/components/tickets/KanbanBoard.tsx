import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, Badge, Container, Row, Col } from 'react-bootstrap';
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
 
 if (diff < 0) return <Badge bg="danger" className="ms-1">OVERDUE</Badge>;
 if (hours < 2) return <Badge bg="warning" text="dark" className="ms-1">{hours}h left</Badge>;
 return <Badge bg="light" text="dark" className="ms-1 border">{hours}h left</Badge>;
};

interface KanbanBoardProps {
 initialTickets: Ticket[];
 onStatusChange: (ticketId: string, newStatus: string) => Promise<void>;
}

const COLUMNS = [
 { id: 'open', title: 'To Do', icon: <AlertCircle size={18} className="me-2" /> },
 { id: 'in_progress', title: 'In Progress', icon: <PlayCircle size={18} className="me-2" /> },
 { id: 'pending', title: 'Pending', icon: <Clock size={18} className="me-2" /> },
 { id: 'resolved', title: 'Resolved', icon: <CheckCircle size={18} className="me-2" /> },
 { id: 'closed', title: 'Closed', icon: <Archive size={18} className="me-2" /> }
];

const getPriorityColor = (priority: string) => {
 switch (priority) {
  case 'critical': return 'danger';
  case 'high': return 'warning';
  case 'medium': return 'info';
  case 'low': return 'success';
  default: return 'secondary';
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

  // Update local state immediately for UX
  try {
   const newTicketsByStatus = { ...ticketsByStatus };
   if (!newTicketsByStatus[sourceStatus] || !newTicketsByStatus[destStatus]) return;
   
   const [movedTicket] = newTicketsByStatus[sourceStatus].splice(source.index, 1);
   if (movedTicket) {
    movedTicket.status = destStatus;
    newTicketsByStatus[destStatus].splice(destination.index, 0, movedTicket);
    setTicketsByStatus(newTicketsByStatus);
    
    // Update backend
    await onStatusChange(draggableId, destStatus);
   }
  } catch (error) {
   console.error('Failed to update ticket status:', error);
  }
 };

 return (
  <DragDropContext onDragEnd={onDragEnd}>
   <Row className="kanban-row g-3 overflow-auto flex-nowrap pb-4" style={{ minHeight: '70vh' }}>
    {Array.isArray(COLUMNS) && COLUMNS.map((column) => (
     <Col key={column.id} style={{ minWidth: '300px', maxWidth: '350px' }}>
      <div className="p-3 rounded-3 h-100 border shadow-sm">
       <div className="d-flex align-items-center mb-3">
        {column.icon}
        <h5 className="mb-0 fw-bold">{column.title}</h5>
        <Badge bg="secondary" pill className="ms-2">
         {(ticketsByStatus[column.id] && ticketsByStatus[column.id].length) || 0}
        </Badge>
       </div>

       <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
         <div
          {...provided.droppableProps}
          ref={provided.innerRef}
          className={`kanban-column-body ${snapshot.isDraggingOver ? 'bg-secondary bg-opacity-10' : ''}`}
          style={{ minHeight: '100px', transition: 'background-color 0.2s ease' }}
         >
          {Array.isArray(ticketsByStatus[column.id]) && ticketsByStatus[column.id].map((ticket, index) => (
           <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
            {(provided, snapshot) => (
             <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className="mb-3"
             >
              <Card 
               className={`shadow-sm border-0 ${snapshot.isDragging ? 'shadow-lg border-primary' : ''}`}
               style={{ cursor: 'grab' }}
              >
               <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                 <div className="d-flex flex-wrap gap-1">
                  <Badge bg={getPriorityColor(ticket.priority || 'medium')} className="text-uppercase" style={{ fontSize: '0.7rem' }}>
                   {ticket.priority || 'medium'}
                  </Badge>
                  {getSLABadge(ticket.sla_deadline)}
                 </div>
                 <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '---'}
                 </small>
                </div>
                <Card.Title className="h6 mb-2 fw-bold">
                 <a href={`/tickets/${ticket.id}`} className="text-decoration-none hover-primary">
                  {ticket.title}
                 </a>
                </Card.Title>
                <div className="d-flex justify-content-between align-items-center mt-3">
                 <small className="text-truncate text-muted" style={{ maxWidth: '150px' }}>
                  ID: {ticket.id ? ticket.id.substring(0, 8) : '---'}
                 </small>
                 <div className="avatar-placeholder bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                  U
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
  </DragDropContext>
 );
};

export default KanbanBoard;
