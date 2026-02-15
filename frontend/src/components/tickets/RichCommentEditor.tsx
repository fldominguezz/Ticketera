import React, { useState, useEffect } from 'react';
import { Button, Card, Spinner, Form } from 'react-bootstrap';
import { Send as SendIcon, Lock as LockIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

// Importación dinámica para evitar errores de SSR
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface Props {
 onSubmit: (content: string, isInternal: boolean, attachmentIds: string[]) => void;
 isSubmitting: boolean;
 users?: any[];
 placeholder?: string;
}

export const RichCommentEditor: React.FC<Props> = ({ onSubmit, isSubmitting, placeholder = 'Escribe un comentario técnico...' }) => {
 const [content, setContent] = useState('');
 const [isInternal, setIsInternal] = useState(false);

 const modules = {
  toolbar: [
   ['bold', 'italic', 'underline', 'strike'],
   [{ 'list': 'ordered'}, { 'list': 'bullet' }],
   ['link', 'clean'],
  ],
 };

 const formats = [
  'bold', 'italic', 'underline', 'strike',
  'list',
  'link'
 ];

 const handleSubmit = () => {
  const strippedContent = content.replace(/<[^>]*>?/gm, '').trim();
  if (!strippedContent) return;
  onSubmit(content, isInternal, []);
  setContent('');
  setIsInternal(false);
 };

 return (
  <Card className="bg-input overflow-visible mb-4 position-relative border-border shadow-sm rounded-4">
   <div className="p-0 quill-container">
    <ReactQuill 
     theme="snow"
     value={content}
     onChange={setContent}
     placeholder={placeholder}
     modules={modules}
     formats={formats}
     className="border-0"
    />
   </div>

   <div className="p-2 bg-muted d-flex justify-content-between align-items-center border-top border-border">
    <Form.Check 
     type="switch" id="comment-switch-stable"
     label={<span className={`x-small fw-bold uppercase ${isInternal ? 'text-warning' : 'text-muted-foreground'}`}><LockIcon size={12} className="me-1" /> Interno</span>}
     checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)}
    />
    <Button 
     variant={isInternal ? 'warning' : 'primary'} size="sm" className="fw-black px-4 border-0 rounded-3 shadow-sm"
     onClick={handleSubmit} disabled={isSubmitting || !content.replace(/<[^>]*>?/gm, '').trim()}
    >
     {isSubmitting ? <Spinner size="sm" /> : <><SendIcon size={14} className="me-2" /> {isInternal ? 'POST INTERNO' : 'COMENTAR'}</>}
    </Button>
   </div>
   <style jsx global>{`
    .quill-container .ql-container {
      min-height: 120px;
      font-size: 14px;
      border: none !important;
    }
    .quill-container .ql-toolbar {
      border: none !important;
      border-bottom: 1px solid var(--border-border) !important;
      background: var(--bg-muted);
      border-radius: 12px 12px 0 0;
    }
    .quill-container .ql-editor {
      min-height: 120px;
      color: var(--text-foreground);
    }
    .quill-container .ql-editor.ql-blank::before {
      color: var(--text-muted-foreground);
      font-style: normal;
      opacity: 0.5;
    }
    .x-small { font-size: 11px; }
    .fw-black { font-weight: 900; }
   `}</style>
  </Card>
 );
};
