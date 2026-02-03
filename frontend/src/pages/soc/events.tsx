import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import { Table, Badge, Card, Spinner, Button, Modal, Form, Row, Col, InputGroup, Accordion, Dropdown } from 'react-bootstrap';
import { Activity, Search, ShieldCheck, ShieldAlert, Send, Target, FileText, Settings } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const Section = ({ title, icon: Icon, items, color = "primary", eventKey, isDark }: any) => {
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
            <Accordion.Body className={isDark ? 'bg-dark bg-opacity-25 border-top border-secondary' : 'bg-light bg-opacity-50 border-top'}>
                <Row className="g-3">{entries.map(([k, v]) => (<Col key={k} xs={12} md={6}><div className="d-flex flex-column"><span className="x-small text-muted fw-bold text-uppercase opacity-50 mb-1" style={{fontSize: '0.6rem'}}>{k}</span><span className="small font-monospace text-main text-break">{String(v)}</span></div></Col>))}</Row>
            </Accordion.Body>
        </Accordion.Item>
    );
};

export default function SIEMEventsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [allSiemEvents, setAllSiemEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCols, setVisibleColumns] = useState<string[]>(['source', 'arrival', 'severity']);
  const [filterStatus, setFilterStatus] = useState('all'); 
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
  const [rawSearchTerm, setRawSearchTerm] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<FileList | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch(`/api/v1/soc/alerts?page=${page}&size=${pageSize}`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      if (res.ok) { 
        const data = await res.json();
        setAllSiemEvents(data.items); 
        setTotalPages(data.pages);
        setTotalItems(data.total);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, pageSize]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(() => {
        if (page === 1) fetchEvents();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchEvents, page]);

  const fetchAI = async (alertId: string) => {
    if (!alertId) return;
    setLoadingAI(true);
    setAiAnalysis(null);
    try {
      const token = localStorage.getItem('access_token');
      const [sR, rR] = await Promise.all([
        fetch('/api/v1/ai/summarize', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_id: alertId }) }),
        fetch('/api/v1/ai/remediation', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_id: alertId }) })
      ]);
      const sD = await sR.json();
      const rD = await rR.json();
      setAiAnalysis({ summary: sD.summary || "Error", remediation: rD.remediation_steps || "Error" });
    } catch (e) { setAiAnalysis({ summary: "Error IA", remediation: "Error red" }); }
    finally { setLoadingAI(false); }
  };

  const parseRawLog = (raw: string) => {
    if (!raw) return {};
    const fields: any = {};
    const regex = /\/?([a-zA-Z0-9_.-]+)\/?=([^\s\[\]]+)/g;
    let m;
    while ((m = regex.exec(raw)) !== null) {
      if (m[1] && m[2]) fields[m[1]] = m[2];
    }
    if (Object.keys(fields).length === 0) return { "Raw Content": raw };
    return fields;
  };

  const downloadLog = () => {
    if (!selectedTicket?.raw_log) return;
    const element = document.createElement("a");
    const file = new Blob([selectedTicket.raw_log], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `log_${selectedTicket.id.substring(0,8)}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  const handleRemediate = (event: any) => {
    setSelectedTicket(event);
    setAiAnalysis(null);
    setNewStatus('resolved');
    setRemediationText('');
    setEvidenceFiles(null);
    setActiveTab('structured');
    fetchAI(event.id);
    setShowRemediate(true);
  };

  const saveRemediation = async () => {
    if (!selectedTicket || !remediationText.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      let targetId = selectedTicket.ticket_id;
      
      if (!targetId) {
          const res = await fetch(`/api/v1/soc/alerts/${selectedTicket.id}/promote`, { 
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}` } 
          });
          const d = await res.json();
          targetId = d.ticket_id;
      }

      if (targetId) {
          await fetch(`/api/v1/tickets/${targetId}`, { 
            method: 'PUT', 
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            }, 
            body: JSON.stringify({ 
                status: newStatus, 
                description: `${selectedTicket.description}\n\n--- ACCIÓN SOC ---\n${remediationText}` 
            }) 
          });

          if (evidenceFiles && evidenceFiles.length > 0) {
              for (let i = 0; i < evidenceFiles.length; i++) {
                  const formData = new FormData();
                  formData.append('file', evidenceFiles[i]);
                  await fetch(`/api/v1/attachments/${targetId}`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` },
                      body: formData
                  });
              }
          }
      }
      setShowRemediate(false);
      fetchEvents();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const filteredEvents = allSiemEvents.filter(event => {
      const matchesSearch = !filterSearch || 
          event.rule_name?.toLowerCase().includes(filterSearch.toLowerCase()) || 
          event.source_ip?.includes(filterSearch) || 
          event.raw_log?.toLowerCase().includes(filterSearch.toLowerCase());
      
      if (filterStatus === 'pending') return matchesSearch && event.status === 'new';
      if (filterStatus === 'resolved') return matchesSearch && (event.status === 'promoted' || event.status === 'acknowledged');
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
                <Col md={6}><InputGroup size="sm" className="bg-surface-muted border-0 rounded-pill px-3 py-1"><InputGroup.Text className="bg-transparent border-0"><Search size={14} /></InputGroup.Text><Form.Control placeholder="Búsqueda forense rápida en esta página..." className="bg-transparent border-0 shadow-none" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} /></InputGroup></Col>
                <Col md={6}><Form.Select size="sm" className="rounded-pill border-0 bg-surface-muted px-4 fw-bold" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="all">🌐 TODOS LOS EVENTOS</option><option value="pending">⏳ PENDIENTES</option><option value="resolved">✅ RESUELTOS</option></Form.Select></Col>
            </Row>
        </Card.Body>
      </Card>

      <div className="table-responsive rounded-4 shadow-sm border border-color overflow-hidden">
        <Table hover className="m-0 align-middle bg-surface">
          <thead className="bg-surface-muted border-bottom border-color">
            <tr className="small text-uppercase text-muted fw-black">
              <th className="ps-4 py-3">ALERTA</th>
              {visibleCols.includes('source') && <th>ORIGEN</th>}
              {visibleCols.includes('arrival') && <th>LLEGADA</th>}
              {visibleCols.includes('severity') && <th>SEVERIDAD</th>}
              <th className="text-end pe-4">COMANDO</th>
            </tr>
          </thead>
          <tbody className="small">
            {loading ? (<tr><td colSpan={10} className="text-center py-5"><Spinner animation="border" size="sm" /></td></tr>) : filteredEvents.map(event => (
                <tr key={event.id} className="border-bottom border-color hover-bg-surface-muted transition-all">
                  <td className="ps-4 py-3"><div className="d-flex align-items-center gap-3"><div className={`p-2 rounded-3 bg-opacity-10 bg-${event.severity === 'critical' ? 'danger' : 'warning'}`}><ShieldAlert size={18} className={`text-${event.severity === 'critical' ? 'danger' : 'warning'}`} /></div><div><div className="fw-black text-uppercase text-main">{event.rule_name !== 'N/A' ? event.rule_name : (event.raw_log?.substring(0, 40) || 'Generic Alert')}</div><div className="text-muted x-small font-monospace opacity-50">REF: {event.id.substring(0,8).toUpperCase()}</div></div></div></td>
                  {visibleCols.includes('source') && (<td><div className="fw-bold text-info">{event.source_ip || '---'}</div></td>)}
                  {visibleCols.includes('arrival') && (<td><div className="fw-bold text-main">{new Date(event.created_at).toLocaleDateString('es-AR')}</div><div className="x-small text-primary fw-black opacity-75">{new Date(event.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}</div></td>)}
                  {visibleCols.includes('severity') && (<td><Badge bg={event.severity === 'critical' ? 'danger' : 'warning'} className="bg-opacity-10 text-uppercase fw-black px-2 border border-opacity-10">{event.severity}</Badge></td>)}
                  <td className="text-end pe-4"><Button variant="primary" size="sm" className="fw-black x-small px-3 rounded-pill shadow-sm" onClick={() => handleRemediate(event)}>TRIAGE</Button></td>
                </tr>
            ))}
            {!loading && filteredEvents.length === 0 && (<tr><td colSpan={10} className="text-center py-5 text-muted uppercase fw-bold opacity-50">Sin eventos que coincidan</td></tr>)}
          </tbody>
        </Table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-4 bg-surface p-3 rounded-4 shadow-sm border border-color">
          <div className="d-flex align-items-center gap-3">
              <span className="x-small fw-black text-muted text-uppercase">Ver</span>
              <Form.Select size="sm" className="rounded-pill border-0 bg-surface-muted px-3 fw-bold" style={{width: '80px'}} value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
              </Form.Select>
              <span className="x-small text-muted fw-bold">Total: {totalItems}</span>
          </div>
          <div className="d-flex gap-2">
              <Button variant="surface-muted" size="sm" className="rounded-pill px-3 x-small fw-black border-color shadow-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>ANTERIOR</Button>
              <div className="d-flex align-items-center px-3 bg-primary bg-opacity-10 text-primary rounded-pill x-small fw-black">PÁGINA {page} DE {totalPages}</div>
              <Button variant="surface-muted" size="sm" className="rounded-pill px-3 x-small fw-black border-color shadow-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>SIGUIENTE</Button>
          </div>
      </div>

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
              <Button variant={activeTab === 'ia' ? 'primary' : 'link'} size="sm" onClick={() => setActiveTab('ia')} className="rounded-pill px-4 x-small fw-black text-decoration-none">IA ANALYSIS</Button>
          </div>
          <div className="mb-4">
              {activeTab === 'structured' && (<Accordion defaultActiveKey="0" flush className="custom-accordion"><Section eventKey="0" title="Resumen" icon={ShieldCheck} items={{ "Descripción": selectedTicket?.description || "N/A" }} isDark={isDark} /><Section eventKey="1" title="Vínculo" icon={Target} items={{ "IP Origen": selectedTicket?.source_ip || "N/A" }} color="info" isDark={isDark} /></Accordion>)}
              {activeTab === 'raw' && (
                <div className="bg-dark rounded-4 overflow-hidden border border-secondary border-opacity-25">
                  <div className="p-3 bg-secondary bg-opacity-10 d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25">
                    <InputGroup size="sm" className="w-50 bg-dark rounded-pill border border-secondary border-opacity-50 px-2"><InputGroup.Text className="bg-transparent border-0 text-muted"><Search size={14} /></InputGroup.Text><Form.Control placeholder="Filtrar atributos..." className="bg-transparent border-0 text-success x-small shadow-none" value={rawSearchTerm} onChange={e => setRawSearchTerm(e.target.value)} /></InputGroup>
                    <Button variant="outline-success" size="sm" className="x-small fw-black rounded-pill px-3" onClick={downloadLog}><FileText size={14} className="me-1" /> EXPORTAR</Button>
                  </div>
                  <div className="table-responsive" style={{ maxHeight: '400px' }}>
                    <Table variant="dark" hover size="sm" className="m-0 x-small font-monospace">
                      <thead className="bg-dark sticky-top"><tr className="text-muted border-bottom border-secondary border-opacity-25"><th className="ps-4 py-2" style={{width: '30%'}}>ATRIBUTO</th><th className="py-2">VALOR</th></tr></thead>
                      <tbody>{Object.entries(parseRawLog(selectedTicket?.raw_log)).filter(([k, v]) => !rawSearchTerm || k.toLowerCase().includes(rawSearchTerm.toLowerCase()) || String(v).toLowerCase().includes(rawSearchTerm.toLowerCase())).map(([k, v]) => (<tr key={k} className="border-bottom border-secondary border-opacity-10"><td className="ps-4 py-2 text-info opacity-75 fw-bold">{k}</td><td className="py-2 text-success">{String(v)}</td></tr>))}</tbody>
                    </Table>
                  </div>
                </div>
              )}
              {activeTab === 'ia' && (<div className="ia-analysis-view p-4 rounded-4 border border-primary border-opacity-25 bg-surface-muted">
                  {aiAnalysis ? (<><h6 className="x-small fw-black text-primary uppercase mb-2">Resumen IA</h6><div className="bg-surface p-3 rounded-3 small text-success font-monospace mb-3">{aiAnalysis.summary}</div><h6 className="x-small fw-black text-warning uppercase mb-2">Remediación</h6><div className="bg-surface p-3 rounded-3 small text-warning font-monospace">{aiAnalysis.remediation}</div></>) : <div className="text-center py-5"><Spinner animation="grow" size="sm" variant="primary" /><p className="small text-muted mt-2 uppercase fw-bold opacity-50">Procesando cerebro IA...</p></div>}
              </div>)}
          </div>
          <Form.Group className="mb-4"><Form.Label className="x-small fw-black uppercase">Adjuntar Evidencia</Form.Label><Form.Control type="file" multiple className="bg-surface-muted border-0 small" onChange={(e: any) => setEvidenceFiles(e.target.files)} /></Form.Group>
          <Form.Group className="mb-4"><Form.Label className="x-small fw-black uppercase">Acción Analista *</Form.Label><Form.Control as="textarea" rows={3} className="border-0 p-3 bg-surface rounded-3 small" value={remediationText} onChange={e => setRemediationText(e.target.value)} required /></Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-top border-color bg-surface-muted p-4">
          <Form.Select size="sm" value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-auto fw-bold text-success border-0 shadow-sm rounded-pill px-3 me-auto"><option value="resolved">✅ RESUELTO</option><option value="closed">🔒 CERRADO</option><option value="pending">⏳ PENDIENTE</option></Form.Select>
          <Button variant="primary" size="sm" onClick={saveRemediation} disabled={saving || !remediationText.trim()} className="fw-black px-4 shadow-sm rounded-pill"><Send size={14} /> COMMIT ACCIÓN</Button>
        </Modal.Footer>
      </Modal>
      <style jsx global>{`.fw-black { font-weight: 900; } .pulse { animation: pulse-animation 2s infinite; } @keyframes pulse-animation { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } } .shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06) !important; } .x-small { font-size: 0.7rem; }`}</style>
    </Layout>
  );
}