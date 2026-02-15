import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { Container, Row, Col, Card, Form, Button, Table, Tabs, Tab, Badge, Spinner, Alert, ListGroup, InputGroup } from 'react-bootstrap';
import { UploadCloud, Mail, ShieldAlert, Globe, Link as LinkIcon, FileText, Search, Fingerprint, ChevronRight, Download, Eye, ExternalLink, ShieldCheck, ShieldX, Info } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../lib/api';

export default function EMLForensicsPage() {
 const { theme } = useTheme();
 const isDark = theme === 'dark';
 
 const [file, setFile] = useState<File | null>(null);
 const [loading, setLoading] = useState(false);
 const [result, setResult] = useState<any>(null);
 const [error, setError] = useState<string | null>(null);
 
 // VT Options
 const [checkVT, setCheckVT] = useState(false);
 const [vtApiKey, setVtApiKey] = useState('');

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
   setFile(e.target.files[0]);
   setResult(null);
   setError(null);
  }
 };

 const analyzeEmail = async () => {
  if (!file) return;
  setLoading(true);
  setError(null);
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('check_vt', String(checkVT));
  if (vtApiKey) formData.append('vt_api_key', vtApiKey);

  try {
   const res = await api.post('/forensics/analyze-eml', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
   });
   setResult(res.data);
  } catch (err: any) {
   setError(err.response?.data?.detail || 'Error analizando el archivo.');
  } finally {
   setLoading(false);
  }
 };

 const getVerdictBadge = (verdict: string) => {
  switch(verdict) {
   case 'MALICIOUS': return <Badge bg="danger" className="p-2 px-3 fw-black shadow-sm d-flex align-items-center gap-2"><ShieldX size={16}/> MALICIOSO</Badge>;
   case 'SUSPICIOUS': return <Badge bg="warning" className="p-2 px-3 fw-black shadow-sm d-flex align-items-center gap-2"><AlertTriangle size={16}/> SOSPECHOSO</Badge>;
   case 'CLEAN': return <Badge bg="success" className="p-2 px-3 fw-black shadow-sm d-flex align-items-center gap-2"><ShieldCheck size={16}/> LIMPIO</Badge>;
   case 'ERROR_NO_KEY': return <Badge bg="secondary" className="p-2 px-3 fw-black shadow-sm d-flex align-items-center gap-2"><Info size={16}/> FALTA API KEY</Badge>;
   default: return <Badge bg="dark" className="p-2 px-3 fw-black shadow-sm border border-secondary opacity-50">SIN ESCANEAR</Badge>;
  }
 };

 const VTResultSmall = ({ item }: { item: any }) => {
  if (item.status === 'Redirected (Rate Limit)') {
   return (
    <div className="d-flex align-items-center gap-2">
     <Badge bg="secondary" className="x-tiny fw-bold opacity-75">LÍMITE API</Badge>
     {item.link && (
      <a href={item.link} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-xs py-0 x-tiny fw-bold text-decoration-none">
       REVISIÓN MANUAL <ExternalLink size={10} className="ms-1"/>
      </a>
     )}
    </div>
   );
  }
  if (!item.scanned) return <span className="x-tiny text-muted italic">{item.status || 'No disponible'}</span>;
  return (
   <div className="d-flex align-items-center gap-2">
    <Badge bg={item.malicious > 0 ? 'danger' : item.suspicious > 0 ? 'warning' : 'success'} className="x-tiny fw-bold">
     {item.malicious}/{item.malicious + item.suspicious + item.harmless} motores
    </Badge>
    {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="text-primary"><ExternalLink size={10}/></a>}
   </div>
  );
 };

 return (
  <Layout title="Laboratorio Forense de EML">
   <div className="mb-4">
    <h4 className="fw-black text-uppercase m-0 d-flex align-items-center gap-2">
     <Mail className="text-primary" size={24}/> Análisis Forense de Correo
    </h4>
    <p className="text-muted-foreground small m-0 text-uppercase tracking-widest fw-bold opacity-75">TICKETERA EML Intelligence Lab</p>
   </div>

   <Row className="g-4">
    {/* Panel de Carga y Opciones */}
    <Col lg={result ? 4 : 12}>
     <Card className="border-0 shadow-sm mb-4">
      <Card.Body className="p-4">
       <h6 className="fw-bold mb-3 small text-uppercase text-muted">Cargar Archivo .EML</h6>
       <div 
        className={`text-center py-5 border border-dashed rounded bg-opacity-10 cursor-pointer transition-all mb-4 ${file ? 'border-primary' : 'border-secondary opacity-50'}`}
        onClick={() => document.getElementById('eml-upload')?.click()}
       >
        <UploadCloud size={48} className={file ? 'text-primary mb-3' : 'text-muted mb-3'} />
        {file ? (
         <div>
          <div className="fw-bold text-primary">{file.name}</div>
          <div className="x-small text-muted">{(file.size / 1024).toFixed(2)} KB</div>
         </div>
        ) : (
         <div>
          <h6 className="fw-bold m-0">Selecciona o arrastra un archivo</h6>
          <p className="x-small text-muted m-0">Soporta formato RFC 822 (.eml)</p>
         </div>
        )}
        <input type="file" id="eml-upload" className="d-none" accept=".eml" onChange={handleFileChange} />
       </div>

       <div className="bg-opacity-10 p-3 rounded border mb-4">
        <Form.Check 
         type="switch"
         id="vt-switch"
         label="Integración con VirusTotal"
         className="fw-bold small text-uppercase mb-2"
         checked={checkVT}
         onChange={(e) => setCheckVT(e.target.checked)}
        />
        <p className="x-tiny text-muted mb-0 italic">Consulta hashes de adjuntos y URLs extraídas automáticamente.</p>
       </div>
       
       <Button 
        variant="primary" 
        className="w-100 fw-bold shadow-sm" 
        disabled={!file || loading}
        onClick={analyzeEmail}
       >
        {loading ? <Spinner animation="border" size="sm" /> : <><Search size={16} className="me-2" /> INICIAR ANÁLISIS</>}
       </Button>
       
       {error && <Alert variant="danger" className="mt-3 x-small fw-bold">{error}</Alert>}
      </Card.Body>
     </Card>
    </Col>

    {/* Panel de Resultados */}
    {result && (
     <Col lg={8}>
      <div className="d-flex flex-column gap-4">
       {/* Veredicto VT */}
       <Card className="border-0 shadow-sm  overflow-hidden">
        <Card.Body className="p-4 d-flex justify-content-between align-items-center">
         <div>
          <h6 className="x-small fw-black text-muted text-uppercase mb-1 tracking-widest">Veredicto de Inteligencia</h6>
          <div className="d-flex align-items-center gap-3">
           {getVerdictBadge(result.vt_analysis.verdict)}
           <div className="vr opacity-25"></div>
           <div className="d-flex gap-4">
            <div className="text-center">
             <div className="h4 m-0 fw-black">{result.iocs.urls.length}</div>
             <div className="x-tiny text-muted uppercase">URLs</div>
            </div>
            <div className="text-center">
             <div className="h4 m-0 fw-black">{result.attachments.length}</div>
             <div className="x-tiny text-muted uppercase">Adjuntos</div>
            </div>
           </div>
          </div>
         </div>
         <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2 small fw-bold">
          ID: {result.summary['Message-ID']?.substring(0, 15)}...
         </Badge>
        </Card.Body>
       </Card>

       {/* Resumen de Cabeceras */}
       <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
         <div className="d-flex flex-column gap-2">
          <div className="border-bottom pb-2 mb-2 d-flex justify-content-between align-items-center">
           <h6 className="m-0 fw-bold small text-uppercase text-muted">Cabeceras del Correo</h6>
           <Badge bg="info" className="bg-opacity-10 text-info uppercase x-small">Original</Badge>
          </div>
          <div><span className="fw-bold text-muted x-small text-uppercase">De:</span> <span className="small fw-bold">{result.summary.From}</span></div>
          <div><span className="fw-bold text-muted x-small text-uppercase">Para:</span> <span className="small">{result.summary.To}</span></div>
          <div><span className="fw-bold text-muted x-small text-uppercase">Asunto:</span> <span className="small fw-bold text-primary">{result.summary.Subject}</span></div>
          <div><span className="fw-bold text-muted x-small text-uppercase">Fecha:</span> <span className="small font-monospace">{result.summary.Date}</span></div>
         </div>
        </Card.Body>
       </Card>

       {/* Tabs Forenses */}
       <Card className="border-0 shadow-sm overflow-hidden">
        <Card.Body className="p-0">
         <Tabs defaultActiveKey="security" className="custom-tabs px-3 pt-2 ">
          <Tab eventKey="security" title="Análisis de Amenazas" className="p-4">
           <Row className="g-4">
            <Col md={12}>
             <h6 className="fw-bold small text-uppercase text-primary mb-3">VirusTotal: Resultados Detallados</h6>
             {result.vt_analysis.verdict === 'SKIPPED' ? (
              <div className="p-4 text-center rounded border border-dashed">
               <Info size={32} className="text-muted mb-2 opacity-50"/>
               <p className="small text-muted m-0">No se realizó análisis de VirusTotal para este archivo.</p>
              </div>
             ) : (
              <Table hover size="sm" className="x-small border">
               <thead className="">
                <tr><th>Tipo</th><th>Objetivo</th><th>Veredicto VT</th></tr>
               </thead>
               <tbody>
                {[...result.vt_analysis.urls, ...result.vt_analysis.attachments].map((item: any, i: number) => (
                 <tr key={i}>
                  <td><Badge bg="dark" className="uppercase x-tiny">{item.type === 'url' ? 'URL' : 'ADJUNTO'}</Badge></td>
                  <td className="text-truncate" style={{maxWidth: '300px'}} title={item.target}>{item.target}</td>
                  <td><VTResultSmall item={item}/></td>
                 </tr>
                ))}
               </tbody>
              </Table>
             )}
            </Col>
            
            <Col md={6}>
             <div className="p-3 border rounded bg-danger bg-opacity-10 h-100">
              <h6 className="fw-bold x-small text-danger text-uppercase mb-2 d-flex align-items-center gap-2">
               <ShieldAlert size={14}/> Enlaces Maliciosos
              </h6>
              {result.security.malicious_links.length > 0 ? (
               result.security.malicious_links.map((l: string, i: number) => <div key={i} className="x-tiny text-danger mb-1 font-monospace">● {l}</div>)
              ) : <div className="x-tiny text-muted italic">Ninguno detectado por heurística.</div>}
             </div>
            </Col>
            <Col md={6}>
             <div className="p-3 border rounded bg-warning bg-opacity-10 h-100">
              <h6 className="fw-bold x-small text-warning text-uppercase mb-2 d-flex align-items-center gap-2">
               <ShieldAlert size={14}/> Adjuntos Sospechosos
              </h6>
              {result.security.suspicious_attachments.length > 0 ? (
               result.security.suspicious_attachments.map((a: string, i: number) => <div key={i} className="x-tiny text-warning mb-1 font-monospace">● {a}</div>)
              ) : <div className="x-tiny text-muted italic">Ninguno detectado por heurística.</div>}
             </div>
            </Col>
           </Row>
          </Tab>

          <Tab eventKey="body" title="Cuerpo del Mensaje" className="p-4">
           <div className=" p-4 rounded shadow-inner" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <pre className="small m-0 lh-base" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{result.body}</pre>
           </div>
          </Tab>

          <Tab eventKey="attachments" title="Hashes de Adjuntos" className="p-4">
           {result.attachments.length > 0 ? (
            <div className="table-responsive">
             <Table hover className="align-middle">
              <thead className="">
               <tr className="x-small text-uppercase"><th>Archivo</th><th>Tipo</th><th>SHA-256</th></tr>
              </thead>
              <tbody className="small">
               {result.attachments.map((a: any, i: number) => (
                <tr key={i}>
                 <td><div className="fw-bold"><Fingerprint size={14} className="me-2 text-primary" /> {a.filename}</div></td>
                 <td className="x-small text-muted">{a.content_type}</td>
                 <td><code className="x-small text-success px-2 py-1 rounded">{a.sha256}</code></td>
                </tr>
               ))}
              </tbody>
             </Table>
            </div>
           ) : <p className="small text-muted italic">Sin adjuntos.</p>}
          </Tab>

          <Tab eventKey="headers" title="Encabezados Técnicos" className="p-0">
           <div className="table-responsive" style={{ maxHeight: '400px' }}>
            <Table striped hover size="sm" className="mb-0 x-small font-monospace">
             <thead className=" sticky-top">
              <tr><th className="ps-3 py-2">Encabezado</th><th className="py-2">Valor</th></tr>
             </thead>
             <tbody>
              {result.full_headers.map((h: any, i: number) => (
               <tr key={i}><td className="fw-bold ps-3 text-primary">{h.key}</td><td className="text-muted text-break">{h.value}</td></tr>
              ))}
             </tbody>
            </Table>
           </div>
          </Tab>
         </Tabs>
        </Card.Body>
       </Card>
      </div>
     </Col>
    )}
   </Row>

   <style jsx>{`
    .fw-black { font-weight: 900; }
    .x-small { font-size: 0.75rem; }
    .x-tiny { font-size: 0.65rem; }
    .custom-tabs { border-bottom: none !important; }
    .shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.5); }
   `}</style>
  </Layout>
 );
}

// Icono faltante en import anterior
const AlertTriangle = ({ size, className }: any) => (
 <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);