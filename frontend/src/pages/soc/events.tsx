import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import { Table, Badge, Card, Spinner, Button, Modal, Form, Row, Col, InputGroup, Accordion, Dropdown } from 'react-bootstrap';
import { Activity, Search, ShieldCheck, ShieldAlert, Send, Target, FileText, Settings, User, Download as DownloadIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../lib/api';

const Section = ({ title, icon: Icon, items, color = 'primary', eventKey }: any) => {
  const entries = Object.entries(items);
  if (entries.length === 0) return null;
  return (
    <Accordion.Item eventKey={eventKey} className="border-0 mb-3 rounded-3 overflow-hidden shadow-sm">
      <Accordion.Header className="bg-surface border-0">
        <div className="d-flex align-items-center gap-3">
          <div className={`p-2 rounded bg-${color} bg-opacity-10 text-${color}`}><Icon size={16} /></div>
          <span className="fw-black x-small text-uppercase tracking-wider">{title}</span>
        </div>
      </Accordion.Header>
      <Accordion.Body className="bg-surface-muted bg-opacity-50 border-top">
        <Row className="g-3">{entries.map(([k, v]) => (<Col key={k} xs={12} md={6}><div className="d-flex flex-column"><span className="x-small text-muted fw-bold text-uppercase opacity-50 mb-1" style={{fontSize: '0.6rem'}}>{k}</span><span className="small font-monospace text-main text-break">{String(v)}</span></div></Col>))}</Row>
      </Accordion.Body>
    </Accordion.Item>
  );
};

export default function SIEMEventsPage() {
 const { theme } = useTheme();
 
 const [allSiemEvents, setAllSiemEvents] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [visibleCols, setVisibleColumns] = useState<string[]>(['source', 'arrival', 'severity']);
 const [filterStatus, setFilterStatus] = useState('pending'); 
 const [filterSearch, setFilterSearch] = useState('');
 
 // Paginación
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(20);
 const [totalPages, setTotalPages] = useState(1);
 const [totalItems, setTotalItems] = useState(0);

 const [showRemediate, setShowRemediate] = useState(false);
 const [selectedTicket, setSelectedTicket] = useState<any>(null);
 const [activeTab, setActiveTab] = useState<'structured' | 'raw' | 'ia'>('structured');
 const [remediationText, setRemediationText] = useState('');
 const [newStatus, setNewStatus] = useState('resolved');
 const [saving, setSaving] = useState(false);
 const [aiAnalysis, setAiAnalysis] = useState<{summary: string, remediation: string} | null>(null);
 const [loadingAI, setLoadingAI] = useState(false);
 const [reanalyzing, setReanalyzing] = useState(false);
 const [rawSearchTerm, setRawSearchTerm] = useState('');
 const [evidenceFiles, setEvidenceFiles] = useState<FileList | null>(null);

 // Asignación
 const [showAssign, setShowAssign] = useState(false);
 const [usersToAssign, setUsersToAssign] = useState<any[]>([]);
 const [selectedAssignee, setSelectedAssignee] = useState('');

 // Sorting
 const [sortField, setSortField] = useState<string>('created_at');
 const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

 const handleSort = (field: string) => {
  if (sortField === field) {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  } else {
    setSortField(field);
    setSortOrder('desc');
  }
  setPage(1);
 };

 const fetchEvents = useCallback(async () => {
  setLoading(true);
  try {
   const res = await api.get('/soc/alerts', {
    params: {
      page,
      size: pageSize,
      sort_by: sortField,
      order: sortOrder
    }
   });
   setAllSiemEvents(res.data.items); 
   setTotalPages(res.data.pages);
   setTotalItems(res.data.total);
  } catch (e) { console.error(e); }
  finally { setLoading(false); }
 }, [page, pageSize, sortField, sortOrder]);

 useEffect(() => {
  fetchEvents();
  const interval = setInterval(() => {
    if (page === 1) fetchEvents();
  }, 10000);
  return () => clearInterval(interval);
 }, [fetchEvents, page]);

 const handleReanalyze = async () => {
  if (!selectedTicket) return;
  setReanalyzing(true);
  try {
   const res = await api.post(`/soc/alerts/${selectedTicket.id}/reanalyze`);
   const data = res.data;
   setAiAnalysis({
    summary: data.ai_summary || 'Sin hallazgos.',
    remediation: data.ai_remediation || 'Sin acciones.'
   });
   setSelectedTicket((prev: any) => ({
    ...prev,
    ai_summary: data.ai_summary,
    ai_remediation: data.ai_remediation
   }));
  } catch (e) { console.error(e); }
  finally { setReanalyzing(false); }
 };

 const handleOpenAssign = async (event: any) => {
   setSelectedTicket(event);
   setSelectedAssignee('');
   setShowAssign(true);
   try {
     const res = await api.get('/users');
     setUsersToAssign(res.data);
   } catch (e) { console.error(e); }
 };

 const confirmAssignment = async () => {
   if (!selectedTicket) return;
   setSaving(true);
   try {
     await api.post(`/soc/alerts/${selectedTicket.id}/assign`, { user_id: selectedAssignee || null });
     setShowAssign(false);
     fetchEvents();
   } catch (e) { console.error(e); }
   finally { setSaving(false); }
 };

 const handleRemediate = (event: any) => {
  setSelectedTicket(event);
  setAiAnalysis(null);
  setNewStatus('resolved');
  setRemediationText('');
  setEvidenceFiles(null);
  setActiveTab('structured');
  if (event.ai_summary || event.ai_remediation) {
    setAiAnalysis({
      summary: event.ai_summary || 'Sin hallazgos.',
      remediation: event.ai_remediation || 'Sin acciones.'
    });
  }
  setShowRemediate(true);
 };

 // Efecto para cargar IA automáticamente al entrar en la pestaña 'ia'
 useEffect(() => {
   if (activeTab === 'ia' && selectedTicket && !aiAnalysis) {
     const loadAI = async () => {
       try {
         const res = await api.post(`/soc/alerts/${selectedTicket.id}/reanalyze`);
         if (res.data.ai_summary) {
           setAiAnalysis({
             summary: res.data.ai_summary,
             remediation: res.data.ai_remediation
           });
         }
       } catch (e) {
         console.error("Error cargando IA:", e);
         setAiAnalysis({
           summary: "Error al conectar con el motor de IA local.",
           remediation: "Verifique que el servicio Ollama esté activo y el modelo llama3.2:1b cargado."
         });
       }
     };
     loadAI();
   }
 }, [activeTab, selectedTicket, aiAnalysis]);

 const saveRemediation = async () => {
  if (!selectedTicket || !remediationText.trim()) return;
  setSaving(true);
  try {
   let targetId = selectedTicket.ticket_id;
   if (!targetId) {
     const res = await api.post(`/soc/alerts/${selectedTicket.id}/promote`);
     targetId = res.data.ticket_id;
   }

   if (targetId) {
     // Resolver Alerta SIEM
     await api.post(`/soc/alerts/${selectedTicket.id}/resolve`);
     // Actualizar Ticket
     await api.put(`/tickets/${targetId}`, { 
       status: newStatus, 
       description: `${selectedTicket.description}\n\n--- ACCIÓN SOC ---\n${remediationText}` 
     });

     if (evidenceFiles && evidenceFiles.length > 0) {
       for (let i = 0; i < evidenceFiles.length; i++) {
         const formData = new FormData();
         formData.append('file', evidenceFiles[i]);
         await api.post(`/attachments/${targetId}`, formData);
       }
     }
   }
   setShowRemediate(false);
   fetchEvents();
   // Redirigir al ticket recien creado/actualizado
   if (targetId) {
     router.push(`/tickets/${targetId}`);
   }
  } catch (e) { console.error(e); }
  finally { setSaving(false); }
 };

 const parseRawLog = (raw: string) => {
  if (!raw) return {};
  const fields: any = {};
  const regex = /\/?([a-zA-Z0-9_.-]+)\/?=([^\s\[\]]+)/g;
  let m;
  while ((m = regex.exec(raw)) !== null) {
   if (m[1] && m[2]) fields[m[1]] = m[2];
  }
  return Object.keys(fields).length === 0 ? { 'Raw Content': raw } : fields;
 };

 const downloadLog = () => {
  if (!selectedTicket?.raw_log) return;
  const element = document.createElement('a');
  const file = new Blob([selectedTicket.raw_log], {type: 'text/plain'});
  element.href = URL.createObjectURL(file);
  element.download = `log_${selectedTicket.id.substring(0,8)}.txt`;
  document.body.appendChild(element);
  element.click();
 };

 const parseIntelligence = (event: any) => {
  if (!event) return {};
  const raw = event.raw_log || '';
  const extra = event.extra_data || {};
  const find = (key: string) => {
    const regex = new RegExp(`(?:[\\s\\[]|^)${key}\\s*=\\s*["']?([^"'\\]\\s,;]+)["']?`, 'i');
    return raw.match(regex)?.[1];
  };
  return {
    'IP Origen (Source)': event.source_ip || find('src') || find('srcIp') || '---',
    'IP Destino (Dest)': extra.dest_ip || find('dst') || find('destIp') || '---',
    'Dispositivo Afectado': find('devname') || find('device') || find('hostName') || '---',
    'Acción Firewall': find('action') || find('policy_action') || '---',
    'Severidad Original': extra.original_severity || find('pri') || '---',
    'MITRE Táctica': extra.mitre?.tactic || 'N/A',
    'MITRE Técnica': extra.mitre?.tech || 'N/A',
    'Usuario Involucrado': find('user') || find('user_name') || '---',
    'Protocolo / Servicio': find('proto') || find('service') || '---',
    'Policy / Regla FW': find('policy') || find('rule') || '---'
  };
 };

 const filteredEvents = allSiemEvents.filter(event => {
   const matchesSearch = !filterSearch || 
     event.rule_name?.toLowerCase().includes(filterSearch.toLowerCase()) || 
     event.source_ip?.includes(filterSearch) || 
     event.raw_log?.toLowerCase().includes(filterSearch.toLowerCase());
   
   if (filterStatus === 'pending') return matchesSearch && (event.status === 'new' || event.status === 'pending');
   if (filterStatus === 'resolved') return matchesSearch && (event.status === 'resolved' || event.status === 'promoted' || event.status === 'acknowledged');
   return matchesSearch;
 });

 return (
  <Layout title="SOC Radar">
   <div className="d-flex justify-content-between align-items-end mb-4">
    <div><h4 className="fw-black text-uppercase m-0">Monitor SIEM</h4><p className="text-muted small m-0 uppercase opacity-50">Intelligent Monitoring</p></div>
    <div className="d-flex gap-2">
      <Dropdown align="end">
        <Dropdown.Toggle variant="outline-secondary" size="sm" className="rounded-pill px-3 x-small fw-black shadow-sm"><Settings size={14} className="me-2" /> VISTA</Dropdown.Toggle>
        <Dropdown.Menu className="shadow-lg border-color p-3" style={{minWidth: '200px'}}>
          {[ { id: 'source', label: 'IP Origen' }, { id: 'arrival', label: 'Llegada' }, { id: 'severity', label: 'Severidad' } ].map(col => (
            <Form.Check key={col.id} type="switch" label={col.label} checked={visibleCols.includes(col.id)} onChange={() => setVisibleColumns(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id])} className="x-small fw-bold mb-2" />
          ))}
        </Dropdown.Menu>
      </Dropdown>
      <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-20 px-3 py-2"><Activity size={12} className="pulse me-2" /> ACTIVO</Badge>
    </div>
   </div>

   <Card className="border-0 shadow-sm mb-4 bg-surface rounded-4">
    <Card.Body className="p-3">
      <Row className="g-3 align-items-center">
        <Col md={6}><InputGroup size="sm" className="bg-surface-muted border-0 rounded-pill px-3 py-1"><InputGroup.Text className="bg-transparent border-0"><Search size={14} /></InputGroup.Text><Form.Control id="soc-event-search" name="soc-event-search" placeholder="Búsqueda forense rápida..." className="bg-transparent border-0 shadow-none" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} /></InputGroup></Col>
        <Col md={6}><Form.Select id="soc-event-status-filter" name="soc-event-status-filter" size="sm" className="rounded-pill border-0 bg-surface-muted px-4 fw-bold" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="all">🌐 TODOS LOS EVENTOS</option><option value="pending">⏳ PENDIENTES</option><option value="resolved">✅ RESUELTOS</option></Form.Select></Col>
      </Row>
    </Card.Body>
   </Card>

   <Card className="shadow-sm overflow-hidden">
    <div className="table-responsive">
     <Table hover className="m-0 align-middle">
      <thead>
       <tr>
        <th className="ps-4 sortable-header" onClick={() => handleSort('rule_name')}>
          ALERTA {sortField === 'rule_name' && (sortOrder === 'asc' ? <ChevronUp size={14} className="sort-icon active" /> : <ChevronDown size={14} className="sort-icon active" />)}
        </th>
        {visibleCols.includes('source') && (
          <th className="sortable-header" onClick={() => handleSort('source_ip')}>
            ORIGEN {sortField === 'source_ip' && (sortOrder === 'asc' ? <ChevronUp size={14} className="sort-icon active" /> : <ChevronDown size={14} className="sort-icon active" />)}
          </th>
        )}
        {visibleCols.includes('arrival') && (
          <th className="sortable-header" onClick={() => handleSort('created_at')}>
            LLEGADA {sortField === 'created_at' && (sortOrder === 'asc' ? <ChevronUp size={14} className="sort-icon active" /> : <ChevronDown size={14} className="sort-icon active" />)}
          </th>
        )}
        {visibleCols.includes('severity') && (
          <th className="sortable-header" onClick={() => handleSort('severity')}>
            SEVERIDAD {sortField === 'severity' && (sortOrder === 'asc' ? <ChevronUp size={14} className="sort-icon active" /> : <ChevronDown size={14} className="sort-icon active" />)}
          </th>
        )}
        <th className="text-end pe-4">COMANDO</th>
       </tr>
      </thead>
      <tbody>
       {loading ? (<tr><td colSpan={10} className="text-center py-5"><Spinner animation="border" size="sm" variant="primary" /></td></tr>) : filteredEvents.map(event => (
         <tr key={event.id}>
          <td className="ps-4 py-3">
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 rounded-3 severity-icon-wrapper" data-severity={event.severity}>
                <ShieldAlert size={18} />
              </div>
              <div>
                <div className="fw-black text-uppercase text-foreground">{event.rule_name !== 'N/A' ? event.rule_name : (event.raw_log?.substring(0, 40) || 'Generic Alert')}</div>
                <div className="text-muted-foreground x-small font-monospace opacity-50">REF: {event.id.substring(0,8).toUpperCase()}</div>
              </div>
            </div>
          </td>
          {visibleCols.includes('source') && (<td><div className="fw-bold text-info">{event.source_ip || '---'}</div></td>)}
          {visibleCols.includes('arrival') && (<td><div className="fw-bold text-foreground">{new Date(event.created_at).toLocaleDateString('es-AR')}</div><div className="x-small text-primary fw-black opacity-75">{new Date(event.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}</div></td>)}
          {visibleCols.includes('severity') && (
            <td>
              <Badge 
                bg="transparent" 
                className="severity-badge fw-black px-2 border"
                data-severity={event.severity}
              >
                {event.severity.toUpperCase()}
              </Badge>
            </td>
          )}
          <td className="text-end pe-4">
           <div className="d-flex gap-2 justify-content-end">
             {event.status === 'new' && (
               <Button variant="primary" size="sm" className="fw-black x-small px-3 rounded-pill shadow-sm border-0" onClick={() => handleOpenAssign(event)}>ASIGNAR</Button>
             )}
             {event.status === 'pending' && (
               <Button variant="success" size="sm" className="fw-black x-small px-3 rounded-pill shadow-sm border-0 text-white" onClick={() => handleRemediate(event)}>TRIAGE</Button>
             )}
             {(event.status === 'resolved' || event.status === 'promoted') && (
               <Button variant="outline-secondary" size="sm" className="fw-black x-small px-3 rounded-pill shadow-sm border-0 text-muted-foreground" onClick={() => handleRemediate(event)}>VER</Button>
             )}
           </div>
          </td>
         </tr>
       ))}
      </tbody>
     </Table>
    </div>
   </Card>

   <style jsx global>{`
     .fw-black { font-weight: 900; } 
     .x-small { font-size: 0.7rem; }
     
     /* Severity logic in CSS instead of JS inline styles */
     [data-severity="critical"] { color: var(--color-danger) !important; border-color: var(--color-danger) !important; background-color: color-mix(in srgb, var(--color-danger), transparent 90%) !important; }
     [data-severity="high"] { color: var(--color-warning) !important; border-color: var(--color-warning) !important; background-color: color-mix(in srgb, var(--color-warning), transparent 90%) !important; }
     [data-severity="medium"] { color: #0ea5e9 !important; border-color: #0ea5e9 !important; background-color: rgba(14, 165, 233, 0.1) !important; }
     [data-severity="low"] { color: var(--color-success) !important; border-color: var(--color-success) !important; background-color: color-mix(in srgb, var(--color-success), transparent 90%) !important; }
     
     .severity-badge[data-severity="critical"] { background-color: var(--color-danger) !important; color: white !important; }
     .severity-badge[data-severity="high"] { background-color: var(--color-warning) !important; color: black !important; }
     .severity-badge[data-severity="medium"] { background-color: #0ea5e9 !important; color: white !important; }
     .severity-badge[data-severity="low"] { background-color: var(--color-success) !important; color: white !important; }

     .severity-icon-wrapper[data-severity="medium"] { color: #0ea5e9 !important; background-color: rgba(14, 165, 233, 0.1) !important; }
   `}</style>

   <Modal show={showRemediate} onHide={() => setShowRemediate(false)} size="lg" centered scrollable contentClassName="bg-surface rounded-4 border-0 shadow-lg">
    <Modal.Header closeButton className="border-0 pb-0"><Modal.Title className="h6 fw-black text-uppercase">ANÁLISIS DE AMENAZA</Modal.Title></Modal.Header>
    <Modal.Body className="pt-3">
     <div className="p-4 rounded-4 mb-4 border border-color bg-surface-muted d-flex justify-content-between align-items-center">
      <div><h5 className="fw-black mb-1 text-primary uppercase">{selectedTicket?.rule_name}</h5><div className="small text-muted">ID: {selectedTicket?.id}</div></div>
      <Badge bg={selectedTicket?.severity === 'critical' ? 'danger' : 'warning'} className="uppercase px-3 py-2 shadow-sm">{selectedTicket?.severity}</Badge>
     </div>
     <div className="d-flex bg-surface-muted p-1 rounded-pill mb-4 gap-1 border border-color shadow-inner" style={{width: 'fit-content'}}>
       <Button variant={activeTab === 'structured' ? 'primary' : 'link'} size="sm" onClick={() => setActiveTab('structured')} className="rounded-pill px-4 x-small fw-black text-decoration-none">DATOS</Button>
       <Button variant={activeTab === 'raw' ? 'primary' : 'link'} size="sm" onClick={() => setActiveTab('raw')} className="rounded-pill px-4 x-small fw-black text-decoration-none">LOG</Button>
       <Button variant={activeTab === 'ia' ? 'primary' : 'link'} size="sm" onClick={() => setActiveTab('ia')} className="rounded-pill px-4 x-small fw-black text-decoration-none">IA</Button>
     </div>
     <div className="mb-4">
       {activeTab === 'structured' && (
        <Accordion defaultActiveKey="0" flush>
          <Section eventKey="0" title="Resumen" icon={ShieldCheck} items={{ 'Descripción': selectedTicket?.description || 'N/A' }} />
          <Section eventKey="1" title="Inteligencia" icon={Target} items={parseIntelligence(selectedTicket)} color="info" />
        </Accordion>
       )}
       {activeTab === 'raw' && (
        <div>
         {/* Buscador de Log (Lupita) */}
         <div className="d-flex gap-2 mb-4">
          <InputGroup size="sm" className="bg-surface-muted border-0 rounded-pill px-3 py-1 flex-grow-1 shadow-inner">
           <InputGroup.Text className="bg-transparent border-0 text-primary"><Search size={14} /></InputGroup.Text>
           <Form.Control 
            placeholder="Filtrar atributos o contenido del log..." 
            className="bg-transparent border-0 shadow-none x-small fw-bold" 
            value={rawSearchTerm} 
            onChange={e => setRawSearchTerm(e.target.value)} 
           />
          </InputGroup>
          <Button variant="outline-primary" size="sm" className="rounded-pill px-3 x-small fw-black shadow-sm" onClick={downloadLog}>
           <DownloadIcon size={14} className="me-2" /> DESCARGAR
          </Button>
         </div>

         {/* Tabla de Atributos del RAW (Filtrada) */}
         <div className="rounded-4 overflow-hidden border border-secondary border-opacity-25 bg-surface-muted p-0 mb-4 shadow-sm">
          <div className="bg-surface p-2 border-bottom border-color d-flex justify-content-between align-items-center">
            <span className="x-small fw-black text-primary uppercase ms-2">Atributos Técnicos</span>
            <span className="x-small text-muted me-2">Campos: {
              selectedTicket?.extra_data 
                ? Object.keys(selectedTicket.extra_data).filter(k => 
                    !['Incident', 'Organization', 'Rule', 'Description', 'Category', 'Name', 'Remediation'].some(exclude => k.toLowerCase().includes(exclude.toLowerCase()))
                  ).length 
                : 0
            }</span>
          </div>
          <div className="table-responsive" style={{ maxHeight: '250px' }}>
           <table className="table table-hover table-sm m-0 x-small">
            <tbody className="bg-transparent">
             {selectedTicket?.extra_data ? (
              Object.entries(selectedTicket.extra_data)
                .filter(([key, val]) => {
                  const isExcluded = ['Incident', 'Organization', 'Rule', 'Description', 'Category', 'Name', 'Remediation'].some(exclude => key.toLowerCase().includes(exclude.toLowerCase()));
                  const matchesSearch = !rawSearchTerm || 
                    key.toLowerCase().includes(rawSearchTerm.toLowerCase()) || 
                    String(val).toLowerCase().includes(rawSearchTerm.toLowerCase());
                  return !isExcluded && matchesSearch;
                })
                .map(([key, value]) => (
                 <tr key={key} className="border-bottom border-color">
                  <td className="p-2 fw-bold text-main" style={{ width: '35%', backgroundColor: 'rgba(0,0,0,0.02)' }}>{key}</td>
                  <td className="p-2 font-monospace text-success">{String(value)}</td>
                 </tr>
                ))
             ) : (
              <tr><td className="p-3 text-center text-muted">No hay atributos disponibles.</td></tr>
             )}
            </tbody>
           </table>
          </div>
         </div>

         {/* RAW Log Limpio */}
         <div className="d-flex justify-content-between align-items-center mb-2 px-1">
           <span className="x-small fw-black text-muted uppercase tracking-wider">Contenido Raw Log</span>
         </div>
         <div className="rounded-4 overflow-hidden border border-secondary border-opacity-25 bg-dark shadow-lg">
          <div className="p-3 overflow-auto" style={{ maxHeight: '300px' }}>
           <pre className="m-0 x-small font-monospace text-success lh-sm" style={{ whiteSpace: 'pre-wrap' }}>
            {(() => {
              const rawContent = selectedTicket?.raw_log?.includes('<rawEvents>') 
                ? selectedTicket.raw_log.split('<rawEvents>')[1]?.split('</rawEvents>')[0]?.trim() || selectedTicket.raw_log
                : selectedTicket?.raw_log;
              
              if (!rawSearchTerm) return rawContent;
              
              // Si hay búsqueda, resaltar o filtrar el contenido del raw
              return rawContent
                ?.split('\n')
                .filter(line => line.toLowerCase().includes(rawSearchTerm.toLowerCase()))
                .join('\n') || 'No hay coincidencias en el log.';
            })()}
           </pre>
          </div>
         </div>
        </div>
       )}
       {activeTab === 'ia' && (
        <div className="p-4 rounded-4 border border-primary border-opacity-25 bg-surface-muted shadow-inner">
         {aiAnalysis ? (
          <>
            <div className="mb-4">
              <div className="x-small fw-black text-primary uppercase mb-2 d-flex align-items-center gap-2">
                <ShieldCheck size={14} /> ¿POR QUÉ SE DIO LA ALERTA?
              </div>
              <div className="bg-surface p-3 rounded-3 small text-main font-monospace border border-color shadow-sm lh-base">
                {aiAnalysis.summary}
              </div>
            </div>
            
            <div>
              <div className="x-small fw-black text-warning uppercase mb-2 d-flex align-items-center gap-2">
                <Target size={14} /> ACCIONES RECOMENDADAS
              </div>
              <div className="bg-surface p-3 rounded-3 small text-warning font-monospace border border-color shadow-sm white-space-pre-wrap">
                {aiAnalysis.remediation}
              </div>
            </div>
          </>
         ) : (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" variant="primary" className="mb-3" />
            <p className="small text-muted fw-bold uppercase opacity-50">Analizando log con IA...</p>
          </div>
         )}
        </div>
       )}
     </div>
     <div className="bg-surface-muted p-3 rounded-4 border border-color mb-4 shadow-inner">
      <Form.Group>
       <Form.Label className="x-small fw-black uppercase text-primary mb-2 d-flex align-items-center gap-2">
        <FileText size={14} /> Registro de Acción Analista *
       </Form.Label>
       <Form.Control 
        as="textarea" 
        rows={4} 
        className="border-0 bg-surface shadow-sm small fw-bold text-main p-3" 
        placeholder="Describa los hallazgos y acciones tomadas para mitigar la amenaza..."
        value={remediationText} 
        onChange={e => setRemediationText(e.target.value)} 
        required 
       />
      </Form.Group>
     </div>
    </Modal.Body>
    <Modal.Footer className="border-top border-color bg-surface-muted p-4 d-flex justify-content-between align-items-center">
     <div className="d-flex flex-column gap-1">
      <span className="x-small fw-black text-muted uppercase tracking-widest mb-1" style={{fontSize: '9px', opacity: 0.7}}>Cambiar Estado Operativo</span>
      <Form.Select 
       size="sm" 
       value={newStatus} 
       onChange={e => setNewStatus(e.target.value)} 
       className="w-auto fw-bold text-success border-0 shadow-sm rounded-pill px-3"
       style={{ minWidth: '160px' }}
      >
       <option value="resolved">✅ RESUELTO</option>
       <option value="pending">⏳ PENDIENTE</option>
       <option value="closed">🔒 CERRADO</option>
      </Form.Select>
     </div>
     <Button 
      variant="primary" 
      size="sm" 
      onClick={saveRemediation} 
      disabled={saving || !remediationText.trim()} 
      className="fw-black px-4 py-2 shadow-sm rounded-pill d-flex align-items-center gap-2"
     >
      {saving ? <Spinner size="sm" /> : <Send size={14} />} 
      COMMIT ACCIÓN
     </Button>
    </Modal.Footer>
   </Modal>

   <Modal show={showAssign} onHide={() => setShowAssign(false)} centered size="sm" contentClassName="bg-surface rounded-4 border-0 shadow-lg">
     <Modal.Header closeButton className="border-0 pb-0"><Modal.Title className="x-small fw-black text-uppercase">DELEGAR</Modal.Title></Modal.Header>
     <Modal.Body className="py-4">
       <p className="small text-muted mb-3 fw-bold">¿A quién deseas asignar el análisis?</p>
       <Form.Select size="sm" className="bg-surface-muted border-0 fw-bold rounded-pill px-3 py-2" value={selectedAssignee} onChange={e => setSelectedAssignee(e.target.value)}>
         <option value="">( Auto-asignarme )</option>
         {usersToAssign.map(u => (<option key={u.id} value={u.id}>{u.username}</option>))}
       </Form.Select>
     </Modal.Body>
     <Modal.Footer className="border-0 pt-0"><Button variant="primary" className="w-100 fw-black x-small uppercase rounded-pill py-2" onClick={confirmAssignment} disabled={saving}>CONFIRMAR</Button></Modal.Footer>
   </Modal>

   <style jsx global>{'.fw-black { font-weight: 900; } .x-small { font-size: 0.7rem; }'}</style>
  </Layout>
 );
}
