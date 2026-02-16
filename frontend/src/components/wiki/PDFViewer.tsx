import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Spinner, Button } from 'react-bootstrap';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// Configuración del worker fuera del componente para que sea estática
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.5.4.296.js';
}

interface Props {
  file: string;
}

const PDFViewer: React.FC<Props> = ({ file }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  console.log("PDFViewer: Intentando cargar archivo con token:", file);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log("PDFViewer: Documento cargado con éxito. Páginas:", numPages);
    setNumPages(numPages);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDFViewer: Error crítico al cargar el PDF:", error);
  };

  return (
    <div className="d-flex flex-column align-items-center position-relative w-100 h-100">
      {/* Controles de Zoom Flotantes - Minimalista Abajo Derecha */}
      <div className="position-fixed bottom-0 end-0 m-4 z-100">
        <div className="d-flex align-items-center bg-dark text-white rounded-pill px-2 py-1 gap-2 shadow-lg border border-secondary" style={{ backdropFilter: 'blur(10px)', opacity: 0.9 }}>
          <Button variant="link" size="sm" className="p-1 text-white opacity-75 hover-opacity-100 text-decoration-none" onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}><ZoomOut size={14}/></Button>
          <span className="x-small fw-black text-white user-select-none" style={{ minWidth: '35px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <Button variant="link" size="sm" className="p-1 text-white opacity-75 hover-opacity-100 text-decoration-none" onClick={() => setZoom(prev => Math.min(2.5, prev + 0.1))}><ZoomIn size={14}/></Button>
          <div className="vr bg-secondary mx-1" style={{ height: '12px' }} />
          <Button variant="link" size="sm" className="p-1 text-white opacity-75 hover-opacity-100 text-decoration-none" onClick={() => setZoom(1.0)}><RotateCcw size={14}/></Button>
        </div>
      </div>

      <div className="wiki-pdf-document-wrapper py-4 w-100">
        <Document
          file={{
            url: file,
            httpHeaders: { 'Authorization': `Bearer ${token}` }
          }}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div className="text-center py-5 text-white"><Spinner animation="grow" variant="primary"/><div className="mt-2 fw-bold uppercase small tracking-widest">Dibujando Motor Word...</div></div>}
          error={<div className="text-center py-5 text-danger fw-bold bg-card p-4 rounded-4 shadow">Error al cargar el documento original. Por favor, intente descargar el archivo.</div>}
        >
          {Array.from(new Array(numPages), (el, index) => (
            <div key={`page_${index + 1}`} className="wiki-page-paper-shadow mb-5">
              <Page 
                key={`page_${index + 1}`}
                pageNumber={index + 1} 
                scale={zoom}
                renderAnnotationLayer={false}
                renderTextLayer={false} // Desactivamos la capa de texto para eliminar el 90% de los warnings de la consola
                loading={null}
              />
            </div>
          ))}
        </Document>
      </div>

      <style jsx global>{`
        .wiki-pdf-document-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: var(--bg-primary);
        }
        .wiki-page-paper-shadow {
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          background: var(--bg-surface) !important;
          border: 1px solid var(--border-subtle);
          transition: transform 0.2s ease;
          display: flex;
          justify-content: center;
          width: fit-content;
          margin-left: auto;
          margin-right: auto;
        }
        [data-theme='high-contrast'] .wiki-page-paper-shadow {
          border: 2px solid #fff;
        }
        .react-pdf__Page__canvas {
          display: block !important;
          max-width: 100%;
          height: auto !important;
          background: transparent !important;
        }
        .react-pdf__Page__textLayer {
          background-color: transparent;
        }
        .z-100 { z-index: 100; }
        .x-small { font-size: 11px; }
        .fw-black { font-weight: 900; }
      `}</style>
    </div>
  );
};

export default PDFViewer;
