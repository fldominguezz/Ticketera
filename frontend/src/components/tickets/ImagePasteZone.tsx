import React, { useState, useEffect, useCallback } from 'react';
import { Card, Spinner, Badge, Button } from 'react-bootstrap';
import { Upload, X, Image as ImageIcon, Paperclip } from 'lucide-react';

interface Attachment {
 id: string;
 filename: string;
 content_type: string;
 preview_url?: string;
}

interface Props {
 onAttachmentsChange: (attachments: string[]) => void;
 ticketId?: string; // Opcional si es un ticket nuevo
}

const ImagePasteZone: React.FC<Props> = ({ onAttachmentsChange, ticketId }) => {
 const [files, setFiles] = useState<Attachment[]>([]);
 const [uploading, setLoading] = useState(false);

 const handleUpload = async (file: File) => {
  setLoading(true);
  const formData = new FormData();
  formData.append('file', file);

  try {
   const token = localStorage.getItem('access_token');
   // Usamos un endpoint genérico si no hay ticketId (temporal) o el específico
   const url = ticketId ? `/api/v1/attachments/${ticketId}` : '/api/v1/attachments/temp';
   
   const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
   });

   if (res.ok) {
    const data = await res.json();
    const newAttachment: Attachment = {
     id: data.id,
     filename: data.filename,
     content_type: data.content_type,
     preview_url: URL.createObjectURL(file) // Previsualización local inmediata
    };
    const updated = [...files, newAttachment];
    setFiles(updated);
    onAttachmentsChange(updated.map(a => a.id));
   }
  } catch (err) {
   console.error('Upload error', err);
  } finally {
   setLoading(false);
  }
 };

 const handlePaste = useCallback((e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
   if (items[i].type.indexOf('image') !== -1) {
    const file = items[i].getAsFile();
    if (file) handleUpload(file);
   }
  }
 }, [files]);

 useEffect(() => {
  window.addEventListener('paste', handlePaste);
  return () => window.removeEventListener('paste', handlePaste);
 }, [handlePaste]);

 const removeFile = (id: string) => {
  const updated = files.filter(f => f.id !== id);
  setFiles(updated);
  onAttachmentsChange(updated.map(a => a.id));
 };

 return (
  <Card className="border-dashed mt-3">
   <Card.Body className="p-3">
    <div className="d-flex justify-content-between align-items-center mb-2">
      <span className="x-small fw-black text-muted uppercase tracking-widest d-flex align-items-center">
       <Paperclip size={14} className="me-2 text-primary"/> Adjuntos y Capturas
      </span>
      {uploading && <Spinner size="sm" animation="border" variant="primary" />}
    </div>

    {files.length === 0 ? (
     <div className="text-center py-3 opacity-50 border rounded bg-white border-dashed">
       <Upload size={20} className="mb-2 text-muted" />
       <p className="x-small fw-bold m-0 text-muted uppercase">Pega una imagen (Ctrl+V) o arrastra archivos aquí</p>
     </div>
    ) : (
     <div className="d-flex flex-wrap gap-2">
      {files.map(file => (
       <div key={file.id} className="position-relative">
        {file.content_type.startsWith('image/') ? (
         <img 
          src={file.preview_url} 
          alt="preview" 
          className="rounded border shadow-sm"
          style={{ width: '80px', height: '80px', objectFit: 'cover' }}
         />
        ) : (
         <div className="bg-white border rounded d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
          <ImageIcon size={24} className="text-muted" />
         </div>
        )}
        <Button 
         variant="danger" 
         size="sm" 
         className="position-absolute top-0 end-0 rounded-circle p-0 d-flex align-items-center justify-content-center shadow-sm"
         style={{ width: '18px', height: '18px', marginTop: '-5px', marginRight: '-5px' }}
         onClick={() => removeFile(file.id)}
        >
         <X size={10} />
        </Button>
       </div>
      ))}
     </div>
    )}
   </Card.Body>
   <style jsx>{`
    .border-dashed { border-style: dashed !important; border-width: 2px !important; }
    .x-small { font-size: 10px; }
   `}</style>
  </Card>
 );
};

export default ImagePasteZone;
