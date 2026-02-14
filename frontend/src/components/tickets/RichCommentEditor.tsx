import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Spinner, Form, ListGroup } from 'react-bootstrap';
import { Send, Lock, User } from 'lucide-react';

interface Props {
 onSubmit: (content: string, isInternal: boolean, attachmentIds: string[]) => void;
 isSubmitting: boolean;
 users?: any[];
 placeholder?: string;
}

export const RichCommentEditor: React.FC<Props> = ({ onSubmit, isSubmitting, users = [], placeholder = 'Escribe un comentario... (Usa @ para mencionar)' }) => {
 const [content, setContent] = useState('');
 const [isInternal, setIsInternal] = useState(false);
 const [showMentions, setShowMentions] = useState(false);
 const [mentionFilter, setMentionFilter] = useState('');
 const [cursorPos, setCursorPos] = useState(0);
 const textareaRef = useRef<HTMLTextAreaElement>(null);

 const filteredUsers = users.filter(u => 
  (u.username || '').toLowerCase().includes(mentionFilter.toLowerCase()) ||
  (u.first_name || '').toLowerCase().includes(mentionFilter.toLowerCase())
 ).slice(0, 5);

 const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const val = e.target.value;
  const pos = e.target.selectionStart;
  setContent(val);
  setCursorPos(pos);

  // Lógica simple de detección de @
  const lastAt = val.lastIndexOf('@', pos - 1);
  if (lastAt !== -1 && !val.substring(lastAt, pos).includes(' ')) {
   setShowMentions(true);
   setMentionFilter(val.substring(lastAt + 1, pos));
  } else {
   setShowMentions(false);
  }
 };

 const insertMention = (user: any) => {
  const val = content;
  const lastAt = val.lastIndexOf('@', cursorPos - 1);
  const username = user.username || `${user.first_name}${user.last_name}`;
  const newVal = val.substring(0, lastAt) + '@' + username + ' ' + val.substring(cursorPos);
  setContent(newVal);
  setShowMentions(false);
  if (textareaRef.current) textareaRef.current.focus();
 };

 const handleSubmit = () => {
  if (!content.trim()) return;
  onSubmit(content, isInternal, []);
  setContent('');
  setIsInternal(false);
 };

 return (
  <Card className="bg-black  overflow-visible mb-4 position-relative">
   <div className="p-0">
    <Form.Control 
     id="comment-editor-textarea"
     name="commentContent"
     aria-label="Contenido del comentario"
     as="textarea"
     ref={textareaRef}
     rows={3}
     value={content}
     onChange={handleTextChange}
     placeholder={placeholder}
     className="bg-transparent border-0 shadow-none p-3"
     style={{ resize: 'none', fontSize: '14px', minHeight: '100px' }}
    />
   </div>

   {showMentions && filteredUsers.length > 0 && (
    <Card className="position-absolute shadow-lg border border-primary border-opacity-25  z-3" style={{ bottom: '100%', left: '10px', width: '250px', marginBottom: '5px' }}>
     <ListGroup variant="flush">
      {filteredUsers.map(u => (
       <ListGroup.Item 
        key={u.id} 
        action 
        onClick={() => insertMention(u)}
        className=" border-opacity-5 hover-bg-primary d-flex align-items-center gap-2 py-2"
       >
        <div className="bg-primary p-1 rounded-circle"><User size={14} className="text-primary"/></div>
        <div className="flex-grow-1">
         <div className="small fw-bold">{u.username}</div>
         <div className="x-tiny text-muted uppercase">{u.first_name} {u.last_name}</div>
        </div>
       </ListGroup.Item>
      ))}
     </ListGroup>
    </Card>
   )}

   <div className="p-2 bg-black bg-opacity-40 d-flex justify-content-between align-items-center border-top ">
    <Form.Check 
     type="switch" id="comment-switch-stable"
     label={<span className={`x-small fw-bold uppercase ${isInternal ? 'text-warning' : 'text-muted'}`}><Lock size={12} className="me-1" /> Interno</span>}
     checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)}
    />
    <Button 
     variant={isInternal ? 'warning' : 'primary'} size="sm" className="fw-black px-4"
     onClick={handleSubmit} disabled={isSubmitting || !content.trim()}
    >
     {isSubmitting ? <Spinner size="sm" /> : <><Send size={14} className="me-2" /> {isInternal ? 'POST INTERNO' : 'COMENTAR'}</>}
    </Button>
   </div>
   <style jsx>{`
    .hover-bg-primary:hover { background-color: var(--bs-primary) !important; color: white !important; }
    .x-tiny { font-size: 8px; }
    .z-3 { z-index: 1050; }
   `}</style>
  </Card>
 );
};
