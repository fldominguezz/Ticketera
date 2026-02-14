import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Cargador estable para Descripción
const loadQuillBasic = async () => {
 const mod = await import('react-quill');
 const RQ = mod.default;
 const QuillInstance = mod.Quill || (RQ as any).Quill;
 
 if (typeof window !== 'undefined' && QuillInstance) {
  (window as any).Quill = QuillInstance;
 }
 return RQ;
};

const ReactQuill = dynamic(loadQuillBasic, { 
 ssr: false, 
 loading: () => <div className="border rounded animate-pulse" style={{ height: '250px' }} />
});

interface Props {
 value: string;
 onChange: (content: string) => void;
 placeholder?: string;
}

const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder }) => {
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
  setMounted(true);
 }, []);

 const modules = {
  toolbar: [
   [{ 'header': [1, 2, false] }],
   ['bold', 'italic', 'underline', 'strike'],
   [{ 'color': [] }, { 'background': [] }],
   [{ 'list': 'ordered' }, { 'list': 'bullet' }],
   ['link', 'image', 'code-block'],
   ['clean']
  ]
 };

 if (!mounted) return <div className="border rounded" style={{ height: '250px' }} />;

 return (
  <div className="rich-text-system">
   <ReactQuill
    theme="snow"
    value={value || ''}
    onChange={onChange}
    modules={modules}
    placeholder={placeholder}
   />
   <style jsx global>{`
    .rich-text-system .ql-container {
     min-height: 200px;
     font-size: 14px;
     border-bottom-left-radius: 8px;
     border-bottom-right-radius: 8px;
     background-color: var(--bg-input);
     color: var(--text-main);
     border-color: var(--border-subtle) !important;
    }
    .rich-text-system .ql-editor.ql-blank::before {
     color: var(--text-muted) !important;
     opacity: 0.6;
     font-style: italic;
    }
    .rich-text-system .ql-toolbar {
     border-top-left-radius: 8px;
     border-top-right-radius: 8px;
     background-color: var(--bg-surface-muted);
     border-color: var(--border-subtle) !important;
    }
    .rich-text-system .ql-stroke { stroke: var(--text-main) !important; }
    .rich-text-system .ql-fill { fill: var(--text-main) !important; }
    .rich-text-system .ql-picker { color: var(--text-main) !important; }
   `}</style>
  </div>
 );
};

export default RichTextEditor;