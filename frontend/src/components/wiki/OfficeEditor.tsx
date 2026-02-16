import React, { useEffect, useRef } from 'react';
import { Spinner } from 'react-bootstrap';

interface Props {
  config: any;
  documentServerUrl: string;
}

declare const DocsAPI: any;

const OfficeEditor: React.FC<Props> = ({ config, documentServerUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scriptId = 'onlyoffice-api-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initEditor = () => {
      if (typeof DocsAPI !== 'undefined' && containerRef.current) {
        // Limpiar contenedor y destruir instancia previa si existe
        containerRef.current.innerHTML = "";
        const editorId = `onlyoffice-editor-${Math.random().toString(36).substr(2, 9)}`;
        containerRef.current.id = editorId;

        try {
          // Configuración optimizada para IP y SSL auto-firmado
          const editorConfig = {
            ...config,
            width: '100%',
            height: '100%',
            editorConfig: {
              ...config.editorConfig,
              customization: {
                ...config.editorConfig?.customization,
                forcesave: true,
                help: false
              }
            },
            events: {
              "onAppReady": () => { console.log("OnlyOffice: App Ready"); },
              "onError": (e: any) => { console.error("OnlyOffice Error Event:", e); }
            }
          };

          new DocsAPI.DocEditor(editorId, editorConfig);
        } catch (e) {
          console.error("OnlyOffice Init Error:", e);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `${window.location.origin}/office/web-apps/apps/api/documents/api.js`;
      script.onload = initEditor;
      document.head.appendChild(script);
    } else {
      initEditor();
    }
  }, [config, documentServerUrl]);

  return (
    <div className="onlyoffice-wrapper w-100 h-100 position-relative">
      <div id="onlyoffice-editor-container" ref={containerRef} className="w-100 h-100" />
      {!config && (
        <div className="position-absolute top-50 start-50 translate-middle text-center">
          <Spinner animation="border" variant="primary" />
          <div className="mt-2 fw-bold">Abriendo Editor...</div>
        </div>
      )}
    </div>
  );
};

export default OfficeEditor;
