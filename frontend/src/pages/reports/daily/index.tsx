import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, InputGroup, Modal, Badge, Alert } from 'react-bootstrap';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { Search, Plus, Upload, Download, Eye, FileText, FileUp } from 'lucide-react';
import api from '../../../lib/api';
import { DailyReport } from '../../../types/dailyReport';
import { useAuth } from '../../../context/AuthContext';

export default function DailyReportsList() {
  const router = useRouter();
  const { isSuperuser } = useAuth();
  
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<DailyReport | null>(null);
  
  // Template Upload State
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  
  // Report Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDate, setUploadDate] = useState('');
  const [uploadShift, setUploadShift] = useState('');

  const fetchReports = async (search = '') => {
    setLoading(true);
    try {
      const params = search ? { search } : {};
      const res = await api.get('/daily-reports/', { params });
      setReports(res.data);
    } catch (error) {
      console.error(error);
      // alert("Error al cargar partes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(searchTerm);
  }, [searchTerm]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadFile(file);
    const name = file.name.toUpperCase();
    
    // Auto-detect date DD-MM-YYYY
    const dateMatch = name.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (dateMatch) {
      const [_, d, m, y] = dateMatch;
      setUploadDate(`${y}-${m}-${d}`);
    } else {
      setUploadDate('');
    }
    
    // Auto-detect shift
    if (name.includes('DIA')) setUploadShift('DIA');
    else if (name.includes('NOCHE')) setUploadShift('NOCHE');
    else setUploadShift('');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadDate || !uploadShift) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('date_str', uploadDate);
    formData.append('shift', uploadShift);

    try {
      await api.post('/daily-reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Parte subido correctamente");
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadDate('');
      setUploadShift('');
      fetchReports(searchTerm);
    } catch (error: any) {
      alert(error.response?.data?.detail || "Error al subir parte");
    }
  };

  const handleTemplateUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFile) return;

    const formData = new FormData();
    formData.append('file', templateFile);

    try {
      await api.post('/daily-reports/template', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Plantilla base actualizada correctamente");
      setTemplateModalOpen(false);
      setTemplateFile(null);
    } catch (error: any) {
      alert(error.response?.data?.detail || "Error al subir plantilla");
    }
  };

  const handleDownload = async (id: string, date: string, shift: string) => {
    try {
      const response = await api.get(`/daily-reports/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Parte_${date}_${shift}.docx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert("Error al descargar archivo");
    }
  };
  
  const highlightText = (text: string, highlight: string) => {
      if (!highlight.trim()) return text;
      const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
      return (
        <span>
            {parts.map((part, i) => 
                part.toLowerCase() === highlight.toLowerCase() ? <span key={i} className="bg-warning">{part}</span> : part
            )}
        </span>
      );
  };

  return (
    <Layout title="Partes Informativos">
      <Container fluid>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="mb-1">Partes Informativos Diarios</h4>
            <p className="text-muted mb-0 small text-uppercase fw-bold opacity-75">Gestión, búsqueda y generación de reportes</p>
          </div>
          <div className="d-flex gap-2">
            {isSuperuser && (
              <Button variant="outline-primary" onClick={() => setTemplateModalOpen(true)}>
                <FileUp size={18} className="me-2" />
                Plantilla
              </Button>
            )}
            <Button variant="outline-secondary" onClick={() => setUploadModalOpen(true)}>
              <Upload size={18} className="me-2" />
              Subir Viejo
            </Button>
            <Button variant="primary" onClick={() => router.push('/reports/daily/new')}>
              <Plus size={18} className="me-2" />
              Nuevo Parte
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-3">
            <InputGroup>
              <InputGroup.Text className="bg-transparent border-end-0">
                <Search size={18} className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Buscar por contenido, herramientas, fechas..."
                className="border-start-0 ps-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Card.Body>
        </Card>

        {loading ? (
            <div className="text-center py-5 text-muted small uppercase fw-bold">Cargando reportes...</div>
        ) : (
            <div className="table-responsive">
              <Table hover className="align-middle border rounded overflow-hidden">
                <thead className="bg-light">
                  <tr>
                    <th className="border-0 small text-muted text-uppercase px-4">Fecha</th>
                    <th className="border-0 small text-muted text-uppercase">Turno</th>
                    <th className="border-0 small text-muted text-uppercase">Snippet de contenido</th>
                    <th className="border-0 small text-muted text-uppercase text-end px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td className="px-4">
                        <div className="d-flex align-items-center gap-2">
                            <FileText size={16} className="text-primary opacity-75" />
                            <span className="fw-bold">{report.date}</span>
                        </div>
                      </td>
                      <td>
                        <Badge bg={report.shift === 'DIA' ? 'warning' : 'dark'} className="text-uppercase" style={{fontSize: '0.7rem'}}>
                            {report.shift}
                        </Badge>
                      </td>
                      <td>
                        {searchTerm && report.search_content ? (
                            <small className="text-muted fst-italic">
                                ...{report.search_content.substring(Math.max(0, report.search_content.toLowerCase().indexOf(searchTerm.toLowerCase()) - 20), report.search_content.toLowerCase().indexOf(searchTerm.toLowerCase()) + 60)}...
                            </small>
                        ) : (
                            <span className="text-muted small opacity-50">Documento analizado</span>
                        )}
                      </td>
                      <td className="text-end px-4">
                         <div className="d-flex justify-content-end gap-2">
                            <Button variant="light" size="sm" onClick={() => setPreviewReport(report)} className="rounded-circle p-2">
                                <Eye size={16} className="text-muted" />
                            </Button>
                            <Button variant="light" size="sm" onClick={() => handleDownload(report.id, report.date, report.shift)} className="rounded-circle p-2">
                                <Download size={16} className="text-muted" />
                            </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                        <td colSpan={4} className="text-center py-5 text-muted small uppercase fw-bold opacity-50">
                            No se encontraron partes informativos.
                        </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
        )}

        {/* Upload Template Modal */}
        <Modal show={templateModalOpen} onHide={() => setTemplateModalOpen(false)}>
            <Modal.Header closeButton className="border-0">
                <Modal.Title className="h5 fw-black text-uppercase">Cargar Plantilla Base</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleTemplateUpload}>
                <Modal.Body className="pt-0">
                    <Alert variant="info" className="small border-0 bg-primary bg-opacity-10 text-primary">
                      Suba el archivo <strong>parte_informativo_base.docx</strong>. Mantenga los placeholders: <code>{`{{FECHA_LARGA}}`}</code>, <code>{`{{FORTISIEM_SALUD}}`}</code>, etc.
                    </Alert>
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold">Archivo .docx</Form.Label>
                        <Form.Control 
                            type="file" 
                            accept=".docx" 
                            required 
                            onChange={(e: any) => setTemplateFile(e.target.files[0])}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="light" onClick={() => setTemplateModalOpen(false)} className="small fw-bold">Cancelar</Button>
                    <Button type="submit" variant="primary" disabled={!templateFile} className="small fw-bold px-4">Actualizar</Button>
                </Modal.Footer>
            </Form>
        </Modal>

        {/* Upload Modal */}
        <Modal show={uploadModalOpen} onHide={() => setUploadModalOpen(false)}>
            <Modal.Header closeButton className="border-0">
                <Modal.Title className="h5 fw-black text-uppercase">Subir Parte Viejo</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleUpload}>
                <Modal.Body className="pt-0">
                    <Form.Group className="mb-4">
                        <Form.Label className="small fw-bold text-uppercase opacity-75">Seleccionar archivo DOCX</Form.Label>
                        <Form.Control 
                            type="file" 
                            accept=".docx" 
                            required 
                            onChange={handleFileChange}
                        />
                        <Form.Text className="x-small text-muted">
                          Detección automática: PARTE... 26-01-2026 DIA
                        </Form.Text>
                    </Form.Group>
                    
                    <div className="bg-light p-3 rounded border border-dashed">
                        <p className="x-small fw-black text-muted text-uppercase mb-2 opacity-75">Datos detectados:</p>
                        <Row className="g-2">
                            <Col xs={7}>
                                <div className="p-2 bg-white border rounded">
                                    <label className="x-small d-block text-muted text-uppercase mb-1" style={{fontSize: '8px'}}>Fecha</label>
                                    <span className="fw-bold small text-dark">{uploadDate || <span className="text-danger opacity-50">---</span>}</span>
                                </div>
                            </Col>
                            <Col xs={5}>
                                <div className="p-2 bg-white border rounded">
                                    <label className="x-small d-block text-muted text-uppercase mb-1" style={{fontSize: '8px'}}>Turno</label>
                                    <span className="fw-bold small text-dark">{uploadShift || <span className="text-danger opacity-50">---</span>}</span>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="light" onClick={() => setUploadModalOpen(false)} className="small fw-bold">Cancelar</Button>
                    <Button type="submit" variant="primary" disabled={!uploadFile || !uploadDate || !uploadShift} className="small fw-bold px-4">Subir Parte</Button>
                </Modal.Footer>
            </Form>
        </Modal>

        {/* Preview Modal */}
        <Modal show={!!previewReport} onHide={() => setPreviewReport(null)} size="lg" scrollable centered>
            <Modal.Header closeButton className="border-0">
                <Modal.Title className="h5 fw-black text-uppercase">Previsualización</Modal.Title>
            </Modal.Header>
            <Modal.Body className="pt-0">
                <div className="mb-3 d-flex gap-2 align-items-center">
                    <Badge bg="primary">{previewReport?.date}</Badge>
                    <Badge bg="secondary" className="text-uppercase">{previewReport?.shift}</Badge>
                </div>
                {previewReport?.search_content ? (
                    <div className="p-4 bg-light rounded font-monospace border" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: '1.6' }}>
                        {highlightText(previewReport.search_content, searchTerm)}
                    </div>
                ) : (
                    <div className="text-center text-muted py-5 small uppercase fw-bold opacity-50">
                        No hay contenido de texto disponible.
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer className="border-0 pt-0">
                <Button variant="light" onClick={() => setPreviewReport(null)} className="small fw-bold">Cerrar</Button>
                {previewReport && (
                    <Button variant="primary" onClick={() => handleDownload(previewReport.id, previewReport.date, previewReport.shift)} className="small fw-bold px-4">
                        <Download size={16} className="me-2" /> Descargar Original
                    </Button>
                )}
            </Modal.Footer>
        </Modal>

      </Container>
      <style jsx>{`
        .fw-black { font-weight: 900; }
        .x-small { font-size: 10px; }
        .interactive-card { cursor: pointer; transition: all 0.2s; }
        .border-dashed { border-style: dashed !important; }
      `}</style>
    </Layout>
  );
}