import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, InputGroup, Modal, Badge, Alert, Spinner, ListGroup } from 'react-bootstrap';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { Search, Plus, Upload, Download, Eye, FileUp, Clock, X, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

export default function DailyReportsList() {
  const router = useRouter();
  const { user, isSuperuser } = useAuth();
  
  const canManageTemplates = isSuperuser || user?.roles?.some((r: any) => r.role?.name === 'owner' || r.role?.name === 'Administrator');
  const canDeleteReports = canManageTemplates; // Mismos permisos para borrar

  const [reports, setReports] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<any | null>(null);
  const [reportToDelete, setReportToDelete] = useState<any | null>(null);
  
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [targetGroupId, setTargetGroupId] = useState('');
  
  // Bulk Upload State
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{name: string, status: 'pending' | 'success' | 'error' | 'skipped', message?: string}[]>([]);

  const fetchReports = async (search = '') => {
    setLoading(true);
    try {
      const params = search ? { search } : {};
      const res = await api.get('/reports/daily/', { params });
      setReports(res.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!reportToDelete) return;
    try {
      await api.delete(`/reports/daily/${reportToDelete.id}`);
      setReportToDelete(null);
      fetchReports(searchTerm);
    } catch (error) {
      alert('No se pudo eliminar el reporte');
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchReports(searchTerm);
    fetchGroups();
  }, [searchTerm]);

  const handleTemplateUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFile || !targetGroupId) return;
    const formData = new FormData();
    formData.append('file', templateFile);
    try {
      await api.post(`/reports/daily/config/template/${targetGroupId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Plantilla de área actualizada correctamente');
      setTemplateModalOpen(false);
      setTemplateFile(null);
      setTargetGroupId('');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al subir plantilla');
    }
  };

  const handleFilesChange = (e: any) => {
    const files = Array.from(e.target.files) as File[];
    setUploadFiles(prev => [...prev, ...files]);
    setUploadResults(prev => [...prev, ...files.map(f => ({ name: f.name, status: 'pending' as const }))]);
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
    setUploadResults(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkUpload = async () => {
    setIsUploading(true);
    const newResults = [...uploadResults];

    for (let i = 0; i < uploadFiles.length; i++) {
      if (newResults[i].status === 'success' || newResults[i].status === 'skipped') continue;

      const file = uploadFiles[i];
      const formData = new FormData();
      formData.append('file', file);
      if (targetGroupId) formData.append('group_id', targetGroupId);

      try {
        const res = await api.post('/reports/daily/upload-legacy', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (res.data === null) {
          newResults[i] = { ...newResults[i], status: 'skipped', message: 'Duplicado' };
        } else {
          newResults[i] = { ...newResults[i], status: 'success' };
        }
      } catch (error: any) {
        newResults[i] = { ...newResults[i], status: 'error', message: error.response?.data?.detail || 'Fallo' };
      }
      setUploadResults([...newResults]);
    }
    
    setIsUploading(false);
    fetchReports(searchTerm);
  };

  const handleDownload = async (id: string, date: string, shift: string) => {
    try {
      const response = await api.get(`/reports/daily/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Parte_${date}_${shift}.docx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) { alert('Error al descargar archivo'); }
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() 
            ? <mark key={i} className="bg-primary text-white p-0">{part}</mark> 
            : part
        )}
      </span>
    );
  };

  return (
    <Layout title="Partes Informativos">
      <Container fluid className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-black m-0 uppercase tracking-tighter">Partes Informativos Diarios</h4>
            <small className="text-muted fw-bold uppercase x-small">Gestión, búsqueda y generación de reportes por área</small>
          </div>
          <div className="d-flex gap-2">
            {canManageTemplates && (
              <Button variant="outline-primary" size="sm" className="fw-black x-small px-3 rounded-pill" onClick={() => setTemplateModalOpen(true)}>
                <FileUp size={14} className="me-2" /> PLANTILLAS ÁREAS
              </Button>
            )}
            <Button variant="outline-secondary" size="sm" className="fw-black x-small px-3 rounded-pill" onClick={() => setUploadModalOpen(true)}>
              <Upload size={14} className="me-2" /> IMPORTAR HISTÓRICO
            </Button>
            <Button variant="primary" size="sm" className="fw-black x-small px-4 rounded-pill shadow-sm" onClick={() => router.push('/reports/daily/new')}>
              <Plus size={14} className="me-2" /> NUEVO PARTE
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-lg rounded-xl overflow-hidden mb-4">
          <Card.Body className="p-3">
            <InputGroup className="bg-surface-muted rounded-pill px-3 py-1 border">
              <InputGroup.Text className="bg-transparent border-0">
                <Search size={18} className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Búsqueda forense en el histórico de partes..."
                className="bg-transparent border-0 shadow-none small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Card.Body>
        </Card>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle custom-table">
              <thead>
                <tr className="x-small text-muted uppercase tracking-widest border-bottom">
                  <th className="ps-4 py-3">FECHA / TURNO</th>
                  <th>ÁREA / GRUPO</th>
                  <th>CONTENIDO</th>
                  <th className="text-end pe-4">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-bottom">
                    <td className="ps-4 py-3">
                      <div className="d-flex align-items-center gap-3">
                        <div className={`p-2 rounded bg-${report.shift === 'DIA' ? 'warning' : 'info'} bg-opacity-10 text-${report.shift === 'DIA' ? 'warning' : 'info'}`}>
                          <Clock size={16} />
                        </div>
                        <div>
                          <div className="fw-bold small">{new Date(report.date).toLocaleDateString()}</div>
                          <Badge bg={report.shift === 'DIA' ? 'warning' : 'info'} className="x-small text-dark fw-black">{report.shift}</Badge>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-10 fw-bold x-small uppercase">
                        {report.group_name || 'GENERAL'}
                      </Badge>
                    </td>
                    <td>
                      <div className="small text-muted italic opacity-75 text-truncate" style={{ maxWidth: '400px' }}>
                        {report.search_content ? `"${report.search_content.substring(0, 80)}..."` : 'Documento DOCX generado'}
                      </div>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-1">
                        <Button variant="link" size="sm" onClick={() => setPreviewReport(report)} title="Previsualizar" className="text-muted hover-opacity-100"><Eye size={16} /></Button>
                        <Button variant="link" size="sm" onClick={() => handleDownload(report.id, report.date, report.shift)} title="Descargar" className="text-primary hover-opacity-100"><Download size={16} /></Button>
                        {canDeleteReports && (
                          <Button variant="link" size="sm" onClick={() => setReportToDelete(report)} title="Eliminar" className="text-danger hover-opacity-100"><Trash2 size={16} /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Modal de Confirmación de Borrado */}
        <Modal show={!!reportToDelete} onHide={() => setReportToDelete(null)} centered contentClassName="border-danger border-opacity-25">
          <Modal.Body className="p-4 text-center">
            <AlertTriangle size={48} className="text-danger mb-3" />
            <h5 className="fw-black uppercase">¿Eliminar Reporte?</h5>
            <p className="small text-muted mb-4">
              Estás por eliminar el parte del día <span className="fw-bold">{reportToDelete?.date}</span> turno <span className="fw-bold">{reportToDelete?.shift}</span>.
              Esta action borrará el registro y el archivo físico permanentemente.
            </p>
            <div className="d-flex gap-2 justify-content-center">
              <Button variant="link" onClick={() => setReportToDelete(null)} className="text-muted text-decoration-none x-small fw-bold">CANCELAR</Button>
              <Button variant="danger" onClick={handleDelete} className="fw-black x-small uppercase px-4 shadow-sm">ELIMINAR PERMANENTEMENTE</Button>
            </div>
          </Modal.Body>
        </Modal>

        {/* Modal Plantilla */}
        <Modal show={templateModalOpen} onHide={() => setTemplateModalOpen(false)} centered contentClassName="border-primary border-opacity-25">
          <Modal.Header closeButton className="bg-surface-muted">
            <Modal.Title className="x-small fw-black text-primary uppercase">Configurar Plantilla de Área</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleTemplateUpload}>
            <Modal.Body className="p-4">
              <Form.Group className="mb-3">
                <Form.Label className="x-small fw-bold text-muted uppercase">1. Seleccionar Área Responsable</Form.Label>
                <Form.Select required className="shadow-none" value={targetGroupId} onChange={e => setTargetGroupId(e.target.value)}>
                  <option value="">Seleccione grupo...</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="x-small fw-bold text-muted uppercase">2. Archivo Word (.docx)</Form.Label>
                <Form.Control type="file" accept=".docx" required className="shadow-none" onChange={(e: any) => setTemplateFile(e.target.files[0])} />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer className="bg-surface-muted">
              <Button variant="primary" type="submit" disabled={!templateFile || !targetGroupId} className="w-100 fw-black x-small uppercase py-2">Subir y Vincular Plantilla</Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Bulk Upload Modal */}
        <Modal show={uploadModalOpen} onHide={() => !isUploading && setUploadModalOpen(false)} centered size="lg" contentClassName="border-opacity-10">
          <Modal.Header closeButton={!isUploading} className="bg-surface-muted">
            <Modal.Title className="x-small fw-black uppercase">Importación Masiva de Partes</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            {!isUploading && uploadFiles.length === 0 && (
              <div className="text-center py-5 border border-dashed rounded-xl mb-4 bg-surface-muted">
                <Upload size={48} className="text-muted mb-3 opacity-25" />
                <h6 className="fw-bold">Selecciona los archivos DOCX</h6>
                <p className="x-small text-muted uppercase">Formato: PARTE_DD-MM-YYYY_TURNO.docx</p>
                <input type="file" multiple accept=".docx" className="d-none" id="bulk-file-input" onChange={handleFilesChange} />
                <Button variant="primary" size="sm" className="fw-black x-small mt-2 px-4" onClick={() => document.getElementById('bulk-file-input')?.click()}>SELECCIONAR ARCHIVOS</Button>
              </div>
            )}

            {uploadFiles.length > 0 && (
              <>
                <Form.Group className="mb-4">
                  <Form.Label className="x-small fw-bold text-muted uppercase">Asignar a Área (Opcional)</Form.Label>
                  <Form.Select size="sm" className="shadow-none" value={targetGroupId} onChange={e => setTargetGroupId(e.target.value)}>
                    <option value="">Detectar automáticamente o Mi Grupo</option>
                    {groups.filter(g => 
                      // Mostrar grupo propio y subgrupos directos (o todos si es superuser)
                      isSuperuser || g.id === user?.group_id || g.parent_id === user?.group_id
                    ).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </Form.Select>
                </Form.Group>

                <ListGroup variant="flush" className="bg-transparent border rounded-lg overflow-hidden max-vh-50 overflow-auto">
                  {uploadResults.map((res, idx) => (
                    <ListGroup.Item key={idx} className="bg-surface-muted border-bottom d-flex justify-content-between align-items-center py-2">
                      <div className="d-flex align-items-center gap-2">
                        {res.status === 'pending' && <Clock size={14} className="text-muted" />}
                        {res.status === 'success' && <CheckCircle2 size={14} className="text-success" />}
                        {res.status === 'skipped' && <Clock size={14} className="text-warning" />}
                        {res.status === 'error' && <AlertTriangle size={14} className="text-danger" />}
                        <span className="x-small fw-bold text-truncate" style={{maxWidth: '300px'}}>{res.name}</span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {res.message && <Badge bg={res.status === 'error' ? 'danger' : 'warning'} className="x-tiny fw-black">{res.message}</Badge>}
                        {!isUploading && res.status === 'pending' && (
                          <Button variant="link" className="p-0 text-danger" onClick={() => removeFile(idx)}><X size={14} /></Button>
                        )}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </>
            )}
          </Modal.Body>
          <Modal.Footer className="bg-surface-muted">
            <Button variant="link" disabled={isUploading} onClick={() => { setUploadFiles([]); setUploadResults([]); setUploadModalOpen(false); }} className="text-muted text-decoration-none x-small fw-bold">CANCELAR</Button>
            <Button 
              variant="primary" 
              className="px-4 fw-black x-small uppercase"
              disabled={isUploading || uploadFiles.length === 0}
              onClick={handleBulkUpload}
            >
              {isUploading ? <><Spinner size="sm" className="me-2" /> PROCESANDO...</> : `IMPORTAR ${uploadFiles.length} ARCHIVOS`}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Preview Modal */}
        <Modal show={!!previewReport} onHide={() => setPreviewReport(null)} size="lg" scrollable centered contentClassName="border-opacity-10">
          <Modal.Header closeButton className="bg-surface-muted">
            <Modal.Title className="x-small fw-black text-uppercase tracking-widest">Previsualización de Contenido</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-0">
            <div className="p-3 bg-surface-muted border-bottom d-flex gap-2 align-items-center">
              <Badge bg="primary" className="bg-opacity-20 text-primary border border-primary border-opacity-20">{previewReport?.date}</Badge>
              <Badge bg="secondary" className="bg-opacity-20 text-muted border border-opacity-10 text-uppercase">{previewReport?.shift}</Badge>
            </div>
            {previewReport?.search_content ? (
              <div className="p-4 font-monospace" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
                {highlightText(previewReport.search_content, searchTerm)}
              </div>
            ) : (
              <div className="text-center text-muted py-5 small uppercase fw-bold opacity-50">
                No hay contenido de texto disponible para previsualizar.
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="bg-surface-muted">
            <Button variant="link" onClick={() => setPreviewReport(null)} className="text-muted text-decoration-none x-small fw-bold">CERRAR</Button>
            {previewReport && (
              <Button variant="primary" onClick={() => handleDownload(previewReport.id, previewReport.date, previewReport.shift)} className="fw-black x-small px-4 uppercase">
                <Download size={14} className="me-2" /> Descargar DOCX
              </Button>
            )}
          </Modal.Footer>
        </Modal>

      </Container>
      <style jsx>{`
        .fw-black { font-weight: 900; }
        .x-small { font-size: 10px; }
        .x-tiny { font-size: 8px; }
        .custom-table { border-collapse: separate; border-spacing: 0 4px; }
        .custom-table tr { background-color: var(--bg-surface); transition: all 0.2s; }
        .custom-table tr:hover { background-color: var(--bg-surface-muted); }
        .max-vh-50 { max-height: 50vh; }
      `}</style>
    </Layout>
  );
}