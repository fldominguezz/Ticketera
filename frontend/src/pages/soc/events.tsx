import React, { useEffect, useState, useRef } from 'react';
import Layout from '../../components/Layout';
import { Table, Badge, Card, Spinner, Button, Modal, Form, Row, Col, ListGroup, InputGroup, Alert, Accordion } from 'react-bootstrap';
import { Activity, ExternalLink, Info, Search, Filter, ShieldCheck, UserPlus, Image, Send, AtSign, MessageSquare, History, CheckCircle2, AlertCircle, Monitor, LayoutList, Target, Terminal, Fingerprint, Box } from 'lucide-react';
import { useRouter } from 'next/router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getStatusBadge } from '../../lib/ui/badges';

/**
 * Utility to parse SIEM events (XML, JSON, Key-Value)
 */
const parseSIEMEvent = (raw: string): any => {
  if (!raw || typeof raw !== 'string') return {};
  const trimmed = raw.trim();

  // 1. JSON
  if (trimmed.startsWith('{')) {
    try { return JSON.parse(trimmed); } catch (e) {}
  }

  // 2. XML (FortiSIEM)
  if (trimmed.startsWith('<')) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(trimmed, "text/xml");
      if (xmlDoc.querySelector('parsererror')) return null;

      const walk = (node: Element): any => {
        if (node.children.length === 0) return node.textContent;
        const obj: any = {};
        Array.from(node.children).forEach(child => {
          const key = child.getAttribute('name') || child.getAttribute('attribute') || child.tagName;
          const value = walk(child);
          if (obj[key]) {
            if (Array.isArray(obj[key])) obj[key].push(value);
            else obj[key] = [obj[key], value];
          } else { obj[key] = value; }
        });
        return obj;
      };

      const result = walk(xmlDoc.documentElement);
      return typeof result === 'object' ? result : { content: result };
    } catch (e) {}
  }

  // 3. Key-Value (Fortinet/Syslog)
  if (trimmed.includes('=') && (trimmed.match(/=/g) || []).length > 2) {
    const data: any = {};
    const kvRegex = /([a-zA-Z0-9_\-\.]+)=("[^"]*"|'[^']*'|[^ ]+)/g;
    let m;
    while ((m = kvRegex.exec(trimmed)) !== null) {
      data[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    if (Object.keys(data).length > 2) return data;
  }

  return { raw_content: raw };
};

export default function SIEMEventsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const isDark = theme === 'dark';
  
  const [allSiemEvents, setAllSiemEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filterStatus, setFilterStatus] = useState('pending'); // pending (open/in_progress), resolved, all
  const [filterSearch, setFilterSearch] = useState('');
  
  const [showRemediate, setShowRemediate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'structured' | 'raw' | 'remediation'>('structured');
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  
  const [remediationText, setRemediationText] = useState('');
  const [newStatus, setNewStatus] = useState('resolved');
  const [assignTo, setAssignTo] = useState('');
  const [assignGroup, setAssignGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [parsedEvent, setParsedEvent] = useState<any>(null);
  const [rawSearchTerm, setRawSearchTerm] = useState('');
  const [isRawFormatted, setIsRawFormatted] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEvents();
    fetchSupportData();
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/soc?token=${token}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = () => fetchEvents();
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (router.query.status && typeof router.query.status === 'string') {
        setFilterStatus(router.query.status);
    }
  }, [router.query.status]);

  useEffect(() => {
    applyFilters();
  }, [allSiemEvents, filterStatus, filterSearch]);

  const fetchSupportData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const [uRes, gRes] = await Promise.all([
        fetch('/api/v1/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/groups', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (gRes.ok) setGroups(await gRes.json());
    } catch (e) { console.error(e); }
  };

  const fetchEvents = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/v1/tickets', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const siemEvents = (Array.isArray(data) ? data : [])
          .filter((t: any) => (t.extra_data && t.extra_data.siem_raw) || t.title?.startsWith('SIEM:'))
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setAllSiemEvents(siemEvents);
      } else {
        setError("No se pudieron cargar los eventos. Verifique su conexión.");
      }
    } catch (e) { 
      console.error(e); 
      setError("Error de red al intentar conectar con el servidor.");
    }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let result = [...allSiemEvents];
    
    if (filterStatus === 'pending') {
        result = result.filter(t => t.status === 'open' || t.status === 'in_progress');
    } else if (filterStatus === 'resolved') {
        result = result.filter(t => t.status === 'resolved' || t.status === 'closed');
    }
    
    if (filterSearch) {
        const s = filterSearch.toLowerCase();
        result = result.filter(t => 
            t.title?.toLowerCase().includes(s) || 
            t.id?.toLowerCase().includes(s) ||
            t.extra_data?.siem_raw?.ip?.includes(s)
        );
    }
    
    setFilteredEvents(result);
  };

  const fetchComments = async (ticketId: string) => {
    setLoadingComments(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/tickets/${ticketId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setComments(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingComments(false); }
  };

  const handleRemediate = (event: any) => {
    setSelectedTicket(event);
    const raw = event.raw_event || event.extra_data?.siem_raw || '';
    setParsedEvent(parseSIEMEvent(typeof raw === 'string' ? raw : JSON.stringify(raw)));
    
    setNewStatus(event.status === 'resolved' || event.status === 'closed' ? event.status : 'resolved');
    setAssignTo(event.assigned_to_id || currentUser?.id || '');
    setAssignGroup(event.group_id || '');
    setRemediationText('');
    setActiveTab('structured');
    fetchComments(event.id);
    setShowRemediate(true);
  };

  const saveRemediation = async () => {
    if (!selectedTicket) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      
      const isResolved = selectedTicket.status === 'resolved' || selectedTicket.status === 'closed';
      
      if (!isResolved || newStatus !== selectedTicket.status || assignTo !== selectedTicket.assigned_to_id) {
          const ticketRes = await fetch(`/api/v1/tickets/${selectedTicket.id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: newStatus,
              assigned_to_id: assignTo || null,
              group_id: assignGroup || selectedTicket.group_id
            })
          });
          if (!ticketRes.ok) throw new Error("Error updating alert");
      }

      if (remediationText) {
        const commentRes = await fetch(`/api/v1/tickets/${selectedTicket.id}/comments`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: remediationText })
        });
        if (!commentRes.ok) throw new Error("Error adding soc action note");
      }

      if (fileInputRef.current?.files?.[0]) {
        const formData = new FormData();
        formData.append('file', fileInputRef.current.files[0]);
        await fetch(`/api/v1/attachments/${selectedTicket.id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      }

      setShowRemediate(false);
      setTimeout(fetchEvents, 500);
    } catch (e) { console.error(e); alert("Error al aplicar cambios SOC."); }
    finally { setSaving(false); }
  };

  const renderStructuredEvent = () => {
      const data = parsedEvent || selectedTicket?.parsed_event || selectedTicket?.extra_data?.siem_raw || {};
      if (!data || Object.keys(data).length === 0) return <Alert variant="warning" className="x-small">No se detectaron campos estructurados en este evento.</Alert>;
      
      const resumen = {
          "Descripción": data.description || data.msg || data.message || "N/A",
          "Categoría": data.incidentCategory || data.category || "N/A",
          "Hora del Evento": data.displayTime || data.devtime || data.time || "N/A",
          "Severidad": data.severity || data.level || "N/A"
      };

      const objetivo: any = {
          "Host Name": data.hostName || data.hostname || data.incidentTarget?.hostName || "N/A",
          "Source IP": data.srcip || "N/A",
          "Destination IP": data.dstip || data.hostIpAddr || data.ip || data.incidentTarget?.hostIpAddr || "N/A",
      };

      if (data.srcport) objetivo["Source Port"] = data.srcport;
      if (data.dstport) objetivo["Destination Port"] = data.dstport;
      
      if (data.proto || data.service) {
          objetivo["Protocolo / Servicio"] = `${data.proto || '---'} / ${data.service || '---'}`;
      }

      if (data.incidentTarget && typeof data.incidentTarget === 'object') {
          Object.entries(data.incidentTarget).forEach(([k, v]) => {
              if (!['hostName', 'hostIpAddr'].includes(k)) objetivo[k] = v;
          });
      }

      const detalles: any = {
          "Job Name": data.jobName || data.incidentDetails?.jobName || "N/A",
          "Acción": data.action || "N/A",
          "Regla": data.rule || data.policy || "N/A",
      };
      if (data.incidentDetails && typeof data.incidentDetails === 'object') {
          Object.entries(data.incidentDetails).forEach(([k, v]) => {
              if (!['jobName', 'action', 'rule', 'policy'].includes(k)) detalles[k] = v;
          });
      }

      const mitre = {
          "Táctica": data.mitreTactic || data.tactic || "N/A",
          "Técnica ID": data.mitreTechniqueId || data.techniqueId || "N/A"
      };

      const handledKeys = [
          'description', 'msg', 'message', 'incidentCategory', 'category', 'displayTime', 'devtime', 'time', 'incidentId', 'id', 'severity', 'level',
          'hostName', 'hostname', 'hostIpAddr', 'ip', 'srcip', 'dstip', 'srcport', 'dstport', 'proto', 'service', 'incidentTarget',
          'jobName', 'incidentDetails', 'action', 'rule', 'policy',
          'mitreTactic', 'tactic', 'mitreTechniqueId', 'techniqueId', 'rawEvents', 'raw_content'
      ].map(k => k.toLowerCase());

      const otros: any = {};
      Object.entries(data).forEach(([k, v]) => {
          if (!handledKeys.includes(k.toLowerCase()) && typeof v !== 'object') {
              otros[k] = v;
          }
      });

      const Section = ({ title, icon: Icon, items, color = "primary", eventKey }: any) => {
          const entries = Object.entries(items);
          if (entries.length === 0) return null;
          return (
              <Accordion.Item eventKey={eventKey} className="border mb-2 rounded overflow-hidden shadow-sm">
                  <Accordion.Header className="x-small fw-bold text-uppercase">
                      <div className="d-flex align-items-center gap-2">
                          <Icon size={14} className={`text-${color}`} />
                          {title}
                      </div>
                  </Accordion.Header>
                  <Accordion.Body className={isDark ? 'bg-dark bg-opacity-25' : 'bg-light bg-opacity-50'}>
                      <Row className="g-3">
                          {entries.map(([k, v]) => (
                              <Col key={k} xs={12} md={6}>
                                  <div className="d-flex flex-column">
                                      <span className="x-small text-muted fw-bold text-uppercase" style={{fontSize: '0.65rem'}}>{k}</span>
                                      <span className="small font-monospace text-break">{String(v)}</span>
                                  </div>
                              </Col>
                          ))}
                      </Row>
                  </Accordion.Body>
              </Accordion.Item>
          );
      };

      return (
          <div className="structured-view custom-scrollbar" style={{maxHeight: '500px', overflowY: 'auto'}}>
              <Accordion defaultActiveKey="0" flush>
                  <Section eventKey="0" title="Resumen" icon={LayoutList} items={resumen} color="primary" />
                  <Section eventKey="1" title="Objetivo" icon={Target} items={objetivo} color="info" />
                  <Section eventKey="2" title="Detalles del Incidente" icon={Terminal} items={detalles} color="warning" />
                  <Section eventKey="3" title="MITRE ATT&CK" icon={Fingerprint} items={mitre} color="danger" />
                  {Object.keys(otros).length > 0 && <Section eventKey="4" title="Otros Datos" icon={Box} items={otros} color="secondary" />}
              </Accordion>
              
              {(data.rawEvents || data.raw_content) && (
                  <Card className="mt-3 border-0 bg-dark text-success bg-opacity-10">
                      <Card.Body className="p-2">
                          <div className="x-small fw-bold text-muted mb-1 text-uppercase">Log Original Asociado</div>
                          <pre className="x-small m-0" style={{whiteSpace: 'pre-wrap', fontSize: '0.65rem'}}>{String(data.rawEvents || data.raw_content)}</pre>
                      </Card.Body>
                  </Card>
              )}
          </div>
      );
  };

  const formatAndHighlight = (raw: string, search: string) => {
    if (!raw) return null;
    let formatted = raw.trim();
    const isXml = formatted.startsWith('<');
    const isJson = formatted.startsWith('{');

    try {
      if (isJson && isRawFormatted) {
        formatted = JSON.stringify(JSON.parse(formatted), null, 2);
      } else if (isXml && isRawFormatted) {
        let indent = 0;
        formatted = formatted.replace(/(>)(<)(\/*)/g, '$1\r\n$2$3');
        formatted = formatted.split('\r\n').map(line => {
          if (line.match(/<\/\w+/)) indent--;
          const l = '  '.repeat(Math.max(0, indent)) + line;
          if (line.match(/<\w+[^>]*[^\/]>.*$/) && !line.match(/<\/\w+/)) indent++;
          return l;
        }).join('\n');
      } else if (!isJson && !isXml && isRawFormatted) {
        if (formatted.includes('=') && (formatted.match(/=/g) || []).length > 2) {
          formatted = formatted.replace(/ ([a-zA-Z0-9_\-\.]+)=/g, '\n$1=');
        }
      }
    } catch (e) {}

    let html = formatted.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    if (isRawFormatted) {
      if (isXml) {
        html = html.replace(/(&lt;\/?[a-zA-Z0-9:]+)/g, '<span class="text-info">$1</span>');
        html = html.replace(/ ([a-zA-Z0-9_\-]+)=/g, ' <span class="text-warning">$1</span>=');
        html = html.replace(/"([^"]*)"/g, '<span class="text-success">"$1"</span>');
      } else if (isJson) {
        html = html.replace(/"([^"]+)":/g, '<span class="text-info">"$1"</span>:');
        html = html.replace(/: ("[^"]*"|\d+|true|false|null)/g, ': <span class="text-success">$1</span>');
      } else {
        html = html.replace(/([a-zA-Z0-9_\-\.]+)=/g, '<span class="text-info">$1</span>=');
      }
      const keywords = ['host', 'ip', 'severity', 'malware', 'exploit', 'error', 'denied', 'critical', 'high'];
      keywords.forEach(kw => {
        const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
        html = html.replace(regex, '<span class="bg-warning text-dark px-1 rounded fw-bold">$1</span>');
      });
    }

    if (search && search.length >= 2) {
      const regex = new RegExp(`(${search})`, 'gi');
      html = html.replace(regex, '<mark class="bg-primary text-white p-0">$1</mark>');
    }
    return html;
  };

  const handleCopyRaw = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDownloadRaw = (text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raw-event-${selectedTicket?.id?.substring(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderRawEvent = () => {
    const raw = selectedTicket?.raw_event || selectedTicket?.extra_data?.siem_raw || '';
    if (!raw) return <Alert variant="secondary" className="x-small m-3">No hay contenido RAW disponible.</Alert>;
    const data = parsedEvent || {};

    return (
      <div className="d-flex flex-column bg-dark rounded border border-opacity-10 overflow-hidden shadow-lg" style={{ height: '500px' }}>
        <div className="bg-dark border-bottom border-opacity-10 p-2 d-flex flex-wrap align-items-center justify-content-between gap-2 px-3">
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex flex-column">
              <span className="x-small text-muted text-uppercase fw-bold" style={{fontSize: '0.6rem'}}>Host / IP</span>
              <span className="small text-info fw-bold">{data.hostName || data.hostname || data.incidentTarget?.hostName || data.srcip || data.ip || 'IDENTIFICANDO...'}</span>
            </div>
            <div className="vr opacity-25" style={{ height: '24px' }}></div>
            <div className="d-flex flex-column">
              <span className="x-small text-muted text-uppercase fw-bold" style={{fontSize: '0.6rem'}}>Regla</span>
              <span className="small text-white text-truncate" style={{maxWidth: '150px'}} title={data.rule}>{data.rule || 'N/A'}</span>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <InputGroup size="sm" style={{ width: '180px' }}>
              <InputGroup.Text className="bg-black border-secondary text-muted p-1 px-2"><Search size={12} /></InputGroup.Text>
              <Form.Control className="bg-black border-secondary text-white x-small" placeholder="Buscar en log..." value={rawSearchTerm} onChange={e => setRawSearchTerm(e.target.value)} />
            </InputGroup>
            <div className="btn-group">
              <Button variant={isRawFormatted ? "primary" : "outline-secondary"} size="sm" className="x-small fw-bold px-2 py-1" onClick={() => setIsRawFormatted(true)}>FORMAT</Button>
              <Button variant={!isRawFormatted ? "primary" : "outline-secondary"} size="sm" className="x-small fw-bold px-2 py-1" onClick={() => setIsRawFormatted(false)}>RAW</Button>
            </div>
            <Button variant="outline-light" size="sm" className="p-1 border-opacity-25" title="Copiar" onClick={() => handleCopyRaw(String(raw))}><LayoutList size={14} /></Button>
            <Button variant="outline-light" size="sm" className="p-1 border-opacity-25" title="Descargar" onClick={() => handleDownloadRaw(String(raw))}><Terminal size={14} /></Button>
          </div>
        </div>
        <div className="flex-grow-1 overflow-auto custom-scrollbar p-3 bg-black bg-opacity-50">
          <pre 
            className="m-0 x-small font-monospace text-success lh-base" 
            dangerouslySetInnerHTML={{ __html: formatAndHighlight(String(raw), rawSearchTerm) || '' }} 
            style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}
          />
        </div>
        <div className="bg-dark p-1 px-3 border-top border-opacity-10 d-flex justify-content-between align-items-center">
          <span className="x-small text-muted italic" style={{fontSize: '0.6rem'}}>BYTES: {String(raw).length}</span>
          <span className="x-small text-muted fw-bold" style={{fontSize: '0.6rem'}}>MODO: {isRawFormatted ? 'FORMATEADO' : 'ORIGINAL'}</span>
        </div>
      </div>
    );
  };

  const renderRemediationPanel = () => (
      <div className="remediation-panel">
          <h6 className="x-small fw-bold text-primary mb-3">PASOS SUGERIDOS POR EL SIEM</h6>
          <ListGroup variant="flush" className="mb-4 rounded border">
              {(selectedTicket?.remediation_suggestions || ["No hay sugerencias automáticas para este tipo de evento."]).map((step: string, i: number) => (
                  <ListGroup.Item key={i} className="small d-flex gap-3 align-items-start">
                      <span className="bg-primary text-white rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center" style={{width:18, height:18, fontSize:10}}>{i+1}</span>
                      {step}
                  </ListGroup.Item>
              ))}
          </ListGroup>
          
          {selectedTicket?.siem_metadata?.mitre && (
              <Alert variant="dark" className="border-0 bg-opacity-10 py-2">
                  <div className="x-small fw-bold text-muted">TÉCNICA MITRE ATT&CK</div>
                  <div className="small fw-bold">{selectedTicket.siem_metadata.mitre}</div>
              </Alert>
          )}

          <Form.Group className="mb-3 mt-4">
              <Form.Label className="x-small fw-bold text-muted text-uppercase">Acción Aplicada por Analista</Form.Label>
              <Form.Control 
                  as="textarea" rows={3} 
                  placeholder="Describa la acción tomada para mitigar este evento..."
                  value={remediationText}
                  onChange={e => setRemediationText(e.target.value)}
              />
          </Form.Group>
      </div>
  );

  return (
    <Layout title="Monitor de Alertas SOC">
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h4 className="fw-black text-uppercase m-0">Monitor de Eventos SIEM</h4>
          <p className="text-muted small m-0 uppercase tracking-widest fw-bold opacity-75">SOC Real-Time Alert Monitoring</p>
        </div>
        <div className="d-flex gap-2">
            <Badge bg={isDark ? "light" : "dark"} text={isDark ? "dark" : "light"} className="px-3 py-2">
                <ShieldCheck size={12} className="me-2" /> VISTA PROFESIONAL
            </Badge>
            <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-20 px-3 py-2">
                <Activity size={12} className="pulse me-2" /> MONITORIZACIÓN ACTIVA
            </Badge>
        </div>
      </div>

      {error && (
          <div className="alert alert-danger border-0 shadow-sm small mb-4 d-flex align-items-center gap-2">
              <AlertCircle size={16} /> {error}
              <Button variant="link" size="sm" className="ms-auto p-0 text-danger fw-bold" onClick={fetchEvents}>REINTENTAR</Button>
          </div>
      )}

      {/* Barra de Filtros */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-3">
            <Row className="g-3 align-items-center">
                <Col md={4}>
                    <InputGroup size="sm" className="border rounded-pill px-2">
                        <InputGroup.Text className="bg-transparent border-0"><Search size={14} /></InputGroup.Text>
                        <Form.Control 
                            placeholder="Buscar por IP, ID o Título..." 
                            className="bg-transparent border-0 shadow-none"
                            value={filterSearch}
                            onChange={e => setFilterSearch(e.target.value)}
                        />
                    </InputGroup>
                </Col>
                <Col md={3}>
                    <Form.Select size="sm" className="rounded-pill border-opacity-25" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="pending">⏳ PENDIENTES (Abiertos/En Proceso)</option>
                        <option value="resolved">✅ RESUELTOS / CERRADOS</option>
                        <option value="all">🌐 TODOS LOS EVENTOS</option>
                    </Form.Select>
                </Col>
                <Col className="text-end">
                    <span className="x-small fw-bold text-muted text-uppercase me-2">Mostrando {filteredEvents.length} de {allSiemEvents.length} eventos</span>
                    <Button variant="outline-primary" size="sm" onClick={fetchEvents} className="rounded-circle p-1"><History size={14} /></Button>
                </Col>
            </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table hover responsive variant={isDark ? 'dark' : undefined} className="m-0 align-middle">
          <thead className={isDark ? 'bg-black' : 'bg-light'}>
            <tr className="small text-uppercase text-muted opacity-75">
              <th className="ps-4 py-3">ALERTA / EVENTO</th>
              <th>ORIGEN</th>
              <th>SEVERIDAD FINAL</th>
              <th>ESTADO</th>
              <th className="text-end pe-4">ANÁLISIS SOC</th>
            </tr>
          </thead>
          <tbody className="small">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" size="sm" variant="primary" /></td></tr>
            ) : filteredEvents.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-5 text-muted italic">No se encontraron eventos activos en el SIEM.</td></tr>
            ) : filteredEvents.map(event => {
              const isResolved = event.status === 'resolved' || event.status === 'closed';
              const sev = event.final_severity || event.priority || 'MEDIUM';
              const sevColor = sev === 'CRITICAL' ? 'danger' : (sev === 'HIGH' ? 'warning' : (sev === 'LOW' ? 'info' : 'primary'));
              
              return (
                <tr key={event.id}>
                  <td className="ps-4 py-3">
                    <div className="fw-bold d-flex align-items-center gap-2">
                        {event.title.replace('SIEM:', 'ALERTA:').replace('ALERTA: ALERTA:', 'ALERTA:')}
                        {event.enrichment?.asset_context && <Monitor size={12} className="text-info" title="Activo Identificado" />}
                    </div>
                    <div className="x-small text-muted d-flex gap-2 mt-1">
                        <span>{new Date(event.created_at).toLocaleString()}</span>
                        <span className="opacity-50">|</span>
                        <span className="font-monospace">ID: {event.siem_metadata?.incident_id || event.id.substring(0,8)}</span>
                    </div>
                  </td>
                  <td><code className="fw-mono text-primary bg-primary bg-opacity-10 px-2 py-1 rounded small">{event.extra_data?.siem_raw?.srcip || event.extra_data?.siem_raw?.ip || event.extra_data?.incident_id || 'N/A'}</code></td>
                  <td><Badge bg={sevColor} className="px-2 py-1" style={{fontSize: '9px'}}>{sev.toUpperCase()}</Badge></td>
                  <td>{getStatusBadge(event.status)}</td>
                  <td className="text-end pe-4">
                    <Button 
                        variant={isResolved ? "outline-secondary" : "primary"} 
                        size="sm" onClick={() => handleRemediate(event)} 
                        className="fw-bold shadow-sm px-3 x-small"
                    >
                      {isResolved ? <><Info size={14} className="me-2" /> REVISAR</> : <><ShieldCheck size={14} className="me-2" /> GESTIONAR</>}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Modal show={showRemediate} onHide={() => setShowRemediate(false)} size="lg" centered scrollable>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h6 fw-black text-uppercase d-flex align-items-center gap-3">
            <Activity size={20} className="text-primary" />
            Análisis de Alerta SIEM
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <div className={`p-3 rounded mb-3 border ${isDark ? 'bg-dark border-opacity-10' : 'bg-light'} d-flex justify-content-between align-items-start`}>
            <div>
                <h6 className="fw-bold mb-1 small">{selectedTicket?.title || 'Cargando...'}</h6>
                <div className="x-small text-muted font-monospace opacity-75">REFERENCIA: {selectedTicket?.id || '---'}</div>
            </div>
            <div className="d-flex gap-2">
                <Badge bg={selectedTicket?.final_severity === 'CRITICAL' ? 'danger' : 'primary'}>{selectedTicket?.final_severity || 'MEDIUM'}</Badge>
                <Badge bg="dark">{selectedTicket?.status?.toUpperCase()}</Badge>
            </div>
          </div>

          {/* Navegación SOC */}
          <div className="d-flex border-bottom mb-3 gap-1">
              <Button 
                variant={activeTab === 'structured' ? 'primary' : 'link'} 
                size="sm" className={`x-small fw-bold text-decoration-none ${activeTab === 'structured' ? '' : 'text-muted'}`}
                onClick={() => setActiveTab('structured')}
              >🔍 EVENTO ESTRUCTURADO</Button>
              <Button 
                variant={activeTab === 'raw' ? 'primary' : 'link'} 
                size="sm" className={`x-small fw-bold text-decoration-none ${activeTab === 'raw' ? '' : 'text-muted'}`}
                onClick={() => setActiveTab('raw')}
              >📄 EVENTO CRUDO (RAW)</Button>
              <Button 
                variant={activeTab === 'remediation' ? 'primary' : 'link'} 
                size="sm" className={`x-small fw-bold text-decoration-none ${activeTab === 'remediation' ? '' : 'text-muted'}`}
                onClick={() => setActiveTab('remediation')}
              >🛠 REMEDIACIÓN</Button>
          </div>

          <div className="mb-4">
              {activeTab === 'structured' && renderStructuredEvent()}
              {activeTab === 'raw' && renderRawEvent()}
              {activeTab === 'remediation' && (
                  <Row>
                      <Col md={7}>
                          {renderRemediationPanel()}
                      </Col>
                      <Col md={5} className="border-start">
                          <h6 className="x-small fw-bold text-muted text-uppercase mb-3">Intervención del Analista</h6>
                          <Form.Group className="mb-3">
                              <Form.Label className="x-small fw-bold opacity-75">ANALISTA</Form.Label>
                              <Form.Select size="sm" value={assignTo} onChange={e => setAssignTo(e.target.value)} className="x-small fw-bold">
                                  <option value="">SIN ASIGNAR</option>
                                  {users.map(u => <option key={u.id} value={u.id}>{u.username.toUpperCase()}</option>)}
                              </Form.Select>
                          </Form.Group>
                          <Form.Group className="mb-3">
                              <Form.Label className="x-small fw-bold opacity-75">NUEVO ESTADO</Form.Label>
                              <Form.Select size="sm" value={newStatus} onChange={e => setNewStatus(e.target.value)} className="x-small fw-bold text-primary">
                                  <option value="open">🔴 PENDIENTE</option>
                                  <option value="in_progress">🟡 EN PROCESO</option>
                                  <option value="resolved">🟢 MITIGADO / RESUELTO</option>
                                  <option value="closed">⚪ CERRADO</option>
                              </Form.Select>
                          </Form.Group>
                          <Form.Group>
                              <Form.Label className="x-small fw-bold opacity-75 d-flex align-items-center gap-2"><Image size={12} /> EVIDENCIA</Form.Label>
                              <Form.Control type="file" size="sm" ref={fileInputRef} className="x-small" />
                          </Form.Group>
                      </Col>
                  </Row>
              )}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 bg-light bg-opacity-10">
          <Button variant="link" size="sm" onClick={() => setShowRemediate(false)} className="text-muted text-decoration-none x-small fw-bold">CERRAR VISOR</Button>
          <Button variant="primary" size="sm" onClick={saveRemediation} disabled={saving} className="fw-bold px-4 shadow-sm x-small">
            {saving ? <Spinner animation="border" size="sm" /> : <><Send size={14} className="me-2" /> REGISTRAR ACCIONES SOC</>}
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .fw-black { font-weight: 900; }
        .pulse { animation: pulse-animation 2s infinite; }
        @keyframes pulse-animation { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        .cursor-pointer { cursor: pointer; }
        .x-small { font-size: 0.7rem; }
      `}</style>
    </Layout>
  );
}