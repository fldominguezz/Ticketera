import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

// Carga dinámica para evitar errores de Window en SSR (Next.js)
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => <div className="border rounded-3 bg-muted animate-pulse" style={{ height: '250px' }} />
});

interface Props {
 value: string;
 onChange: (content: string) => void;
 placeholder?: string;
}

/**
 * RichTextEditor - Versión SOC PRO (Enterprise)
 * Soporta Negritas, Cursivas, Listas, Enlaces y Código.
 */
const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder }) => {
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
  setMounted(true);
 }, []);

 const modules = {
  toolbar: [
   [{ 'header': [1, 2, 3, false] }],
   ['bold', 'italic', 'underline', 'strike'],
   [{ 'color': [] }, { 'background': [] }],
   [{ 'list': 'ordered' }, { 'list': 'bullet' }],
   ['link', 'code-block', 'blockquote'],
   ['clean']
  ],
 };

 const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list',
  'link', 'code-block', 'blockquote'
 ];

 if (!mounted) return <div className="border rounded-3 bg-muted animate-pulse" style={{ height: '250px' }} />;

 return (
  <div className="rich-text-system">
   <div className="custom-editor-container rounded-3 overflow-hidden shadow-sm border border-border bg-card">
    <ReactQuill 
     theme="snow"
     value={value || ''}
     onChange={onChange}
     placeholder={placeholder}
     modules={modules}
     formats={formats}
     className="soc-quill-editor"
    />
   </div>
   <style jsx global>{`
    .soc-quill-editor .ql-toolbar {
      background-color: var(--bg-muted) !important;
      border: none !important;
      border-bottom: 1px solid var(--border-border) !important;
      padding: 8px 12px !important;
    }
    .soc-quill-editor .ql-container {
      border: none !important;
      min-height: 200px;
      font-family: inherit !important;
      font-size: 14px !important;
    }
    .soc-quill-editor .ql-editor {
      min-height: 200px;
      color: var(--text-main) !important;
      line-height: 1.6;
    }
    .soc-quill-editor .ql-editor.ql-blank::before {
      color: var(--text-muted) !important;
      font-style: normal !important;
      opacity: 0.5;
    }
    .soc-quill-editor .ql-snow .ql-stroke {
      stroke: var(--text-muted-foreground) !important;
    }
    .soc-quill-editor .ql-snow .ql-fill {
      fill: var(--text-muted-foreground) !important;
    }
    .soc-quill-editor .ql-snow .ql-picker {
      color: var(--text-muted-foreground) !important;
    }
    
    .custom-editor-container:focus-within {
      border-color: var(--primary) !important;
      box-shadow: 0 0 0 3px var(--primary-muted) !important;
    }

    /* Links styling in editor */
    .soc-quill-editor .ql-editor a {
      color: var(--primary) !important;
      text-decoration: underline !important;
    }
   `}</style>
  </div>
 );
};

export default RichTextEditor;
