import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { Container, Row, Col, Card, Form, Button, Table, Tabs, Tab, Badge, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { UploadCloud, Mail, ShieldAlert, Globe, Link as LinkIcon, FileText, Search, Fingerprint, ChevronRight, Download, Eye } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../lib/api';

export default function EMLForensicsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const analyzeEmail = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/forensics/analyze-eml', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error analizando el archivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Laboratorio Forense EML">
      <div className="mb-4">
        <h4 className="fw-black text-uppercase m-0">Análisis Forense de Correo</h4>
        <p className="text-muted small m-0 text-uppercase tracking-widest fw-bold opacity-75">CyberCase EML Intelligence Lab</p>
      </div>

      <Row className="g-4">
        {/* Panel de Carga */}
        <Col lg={result ? 4 : 12}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-3 small text-uppercase text-muted">Cargar Archivo .EML</h6>
              <div 
                className={`text-center py-5 border border-dashed rounded bg-light bg-opacity-10 cursor-pointer transition-all ${file ? 'border-primary' : 'border-secondary opacity-50'}`}
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
              
              <Button 
                variant="primary" 
                className="w-100 mt-4 fw-bold shadow-sm" 
                disabled={!file || loading}
                onClick={analyzeEmail}
              >
                {loading ? <Spinner animation="border" size="sm" /> : <><Search size={16} className="me-2" /> INICIAR ANÁLISIS FORENSE</>}
              </Button>
              
              {error && <Alert variant="danger" className="mt-3 x-small fw-bold">{error}</Alert>}
            </Card.Body>
          </Card>
        </Col>

        {/* Panel de Resultados */}
        {result && (
          <Col lg={8}>
            <div className="d-flex flex-column gap-4">
              {/* Resumen Superior */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <Card.Header className="bg-primary text-white py-3">
                  <div className="d-flex align-items-center gap-2">
                    <Mail size={20} />
                    <span className="fw-bold small text-uppercase">Resultado del Análisis: Detalles del EML</span>
                  </div>
                </Card.Header>
                <Card.Body className="p-4 bg-light bg-opacity-10">
                  <div className="d-flex flex-column gap-2">
                    <div><span className="fw-bold text-muted x-small text-uppercase">De:</span> <span className="small fw-bold">{result.summary.From}</span></div>
                    <div><span className="fw-bold text-muted x-small text-uppercase">Para:</span> <span className="small">{result.summary.To}</span></div>
                    <div><span className="fw-bold text-muted x-small text-uppercase">Asunto:</span> <span className="small fw-bold text-primary">{result.summary.Subject}</span></div>
                    <div><span className="fw-bold text-muted x-small text-uppercase">Fecha:</span> <span className="small font-monospace">{result.summary.Date}</span></div>
                  </div>
                </Card.Body>
              </Card>

              {/* Análisis de Seguridad Heurístico */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <Card.Header className="bg-dark text-white py-3 d-flex align-items-center gap-2">
                  <ShieldAlert size={20} className="text-warning" />
                  <span className="fw-bold small text-uppercase">Análisis de Seguridad</span>
                </Card.Header>
                <Card.Body className="p-4">
                  <Row className="g-4">
                    <Col md={4}>
                      <h6 className="fw-bold small text-uppercase text-danger mb-3 border-bottom pb-2">Enlaces Maliciosos</h6>
                      {result.security.malicious_links.length > 0 ? (
                        result.security.malicious_links.map((l: string, i: number) => <div key={i} className="x-small text-danger mb-2 font-monospace">⚠️ {l}</div>)
                      ) : <div className="x-small text-muted italic">No se detectaron enlaces maliciosos obvios.</div>}
                    </Col>
                    <Col md={4} className="border-start border-end">
                      <h6 className="fw-bold small text-uppercase text-warning mb-3 border-bottom pb-2">Adjuntos Sospechosos</h6>
                      {result.security.suspicious_attachments.length > 0 ? (
                        result.security.suspicious_attachments.map((a: string, i: number) => <div key={i} className="x-small text-warning mb-2 font-monospace">☢️ {a}</div>)
                      ) : <div className="x-small text-muted italic">No se detectaron adjuntos sospechosos.</div>}
                    </Col>
                    <Col md={4}>
                      <h6 className="fw-bold small text-uppercase text-info mb-3 border-bottom pb-2">Indicadores de Phishing</h6>
                      {result.security.phishing_indicators.length > 0 ? (
                        result.security.phishing_indicators.map((p: string, i: number) => <div key={i} className="x-small text-info mb-2 font-monospace">🚩 {p}</div>)
                      ) : <div className="x-small text-muted italic">No se detectaron indicadores de phishing obvios.</div>}
                      
                      {/* Agregado: IPs detectadas con VirusTotal */}
                      <div className="mt-4 pt-2 border-top">
                        <h6 className="fw-bold small text-uppercase text-muted mb-2" style={{fontSize: '0.6rem'}}>IPs Públicas (VT)</h6>
                        <div className="d-flex flex-wrap gap-1">
                          {result.iocs.ips?.map((ip: string, i: number) => (
                            <a key={i} href={`https://www.virustotal.com/gui/ip-address/${ip}`} target="_blank" rel="noreferrer" className="badge bg-dark text-warning border border-warning border-opacity-25 text-decoration-none d-flex align-items-center gap-1">
                              {ip} <Search size={10} />
                            </a>
                          )) || <span className="x-small text-muted italic">Ninguna</span>}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Cuerpo del Correo */}
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-transparent py-3 border-bottom d-flex align-items-center gap-2">
                  <FileText size={18} className="text-muted" />
                  <span className="fw-bold small text-uppercase">Cuerpo del Correo</span>
                </Card.Header>
                <Card.Body className="p-4 bg-dark bg-opacity-10">
                  <pre className="small m-0 lh-base text-white" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{result.body}</pre>
                </Card.Body>
              </Card>

              {/* Tabs Técnicos (Adjuntos, IOCs, Rutas, Encabezados Completos) */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <Card.Body className="p-0">
                  <Tabs defaultActiveKey="full_headers" className="custom-tabs px-3 pt-2 bg-light">
                    <Tab eventKey="full_headers" title="Encabezados Completos" className="p-0">
                      <div className="table-responsive" style={{ maxHeight: '400px' }}>
                        <Table striped hover size="sm" className="mb-0 x-small font-monospace">
                          <thead className="bg-dark text-white sticky-top">
                            <tr><th className="ps-3 py-2">Header</th><th className="py-2">Value</th></tr>
                          </thead>
                          <tbody>
                            {result.full_headers.map((h: any, i: number) => (
                              <tr key={i}><td className="fw-bold ps-3 text-primary">{h.key}</td><td className="text-muted text-break">{h.value}</td></tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </Tab>
                    
                    <Tab eventKey="attachments" title="Adjuntos & Hashes" className="p-4">
                      {result.attachments.length > 0 ? (
                        <div className="table-responsive">
                          <Table hover className="align-middle">
                            <thead className="bg-light">
                              <tr className="x-small text-uppercase"><th>Archivo</th><th>Técnico</th><th>Hash SHA-256</th></tr>
                            </thead>
                            <tbody className="small">
                              {result.attachments.map((a: any, i: number) => (
                                <tr key={i}>
                                  <td><div className="fw-bold"><Fingerprint size={14} className="me-2 text-primary" /> {a.filename}</div></td>
                                  <td><div className="x-small text-muted">{a.content_type} ({(a.size / 1024).toFixed(1)} KB)</div></td>
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      <code className="x-small bg-dark text-success px-2 py-1 rounded text-truncate" style={{maxWidth: '150px'}} title={a.sha256}>{a.sha256}</code>
                                      <a 
                                        href={`https://www.virustotal.com/gui/file/${a.sha256}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-success hover-opacity-100"
                                        title="Consultar en VirusTotal"
                                      >
                                        <Search size={14} />
                                      </a>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      ) : <p className="small text-muted italic">Sin adjuntos detectados.</p>}
                    </Tab>

                    <Tab eventKey="hops" title="Ruta Forense" className="p-4">
                      <div className="timeline-hops">
                        {result.hops.map((hop: string, i: number) => (
                          <div key={i} className="d-flex mb-3 position-relative border-start ps-4" style={{ borderColor: 'var(--bs-primary)' }}>
                            <div className="position-absolute bg-primary rounded-circle" style={{ width: 10, height: 10, left: -6, top: 5 }}></div>
                            <div className="x-small font-monospace text-muted text-break">{hop}</div>
                          </div>
                        ))}
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
        .x-small { font-size: 0.7rem; }
        .custom-tabs { border-bottom: none !important; }
        .timeline-hops::before { content: ""; position: absolute; }
      `}</style>
    </Layout>
  );
}
