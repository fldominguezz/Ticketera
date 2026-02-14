import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, InputGroup, Modal, Badge, Alert, Spinner, ListGroup } from 'react-bootstrap';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { Search, Plus, Upload, Download, Eye, FileUp, Clock, X, CheckCircle2, AlertTriangle, Trash2, Calendar, Filter, ChevronLeft, ChevronRight, Hash } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

export default function DailyReportsList() {
 const router = useRouter();
 const { user, isSuperuser } = useAuth();
 
 const isSOC = isSuperuser || user?.group?.name?.toUpperCase() === 'SOC';
 const canManageTemplates = isSuperuser || user?.roles?.some((r: any) => r.role?.name === 'owner' || r.role?.name === 'Administrator');
 const canDeleteReports = isSuperuser; 

 const [reports, setReports] = useState<any[]>([]);
 const [groups, setGroups] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 
 // Paginación
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(20);
 const [totalPages, setTotalPages] = useState(1);
 const [totalItems, setTotalItems] = useState(0);

 // Filters
 const [searchTerm, setSearchTerm] = useState('');
 const [filterGroup, setFilterGroup] = useState('');
 const [filterShift, setFilterShift] = useState('');
 const [filterYear, setFilterYear] = useState('');
 const [filterDate, setFilterDate] = useState('');
 
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
 const [isDragging, setIsDragging] = useState(false);

 const fetchReports = async () => {
  setLoading(true);
  try {
   const params: any = { 
    page, 
    size: pageSize,
    search: searchTerm || undefined,
    group_id: filterGroup || undefined,
    shift: filterShift || undefined,
    year: filterYear || undefined,
    exact_date: filterDate || undefined
   };
   const res = await api.get('/reports/daily/', { params });
   setReports(res.data.items);
   setTotalPages(res.data.pages);
   setTotalItems(res.data.total);
  } catch (error) { console.error(error); }
  finally { setLoading(false); }
 };

 const fetchGroups = async () => {
  try {
   const res = await api.get('/groups');
   setGroups(res.data);
  } catch (error) { console.error(error); }
 };

 useEffect(() => {
  fetchGroups();
 }, []);

 useEffect(() => {
  const timer = setTimeout(() => {
    fetchReports();
  }, 300);
  return () => clearTimeout(timer);
 }, [page, pageSize, searchTerm, filterGroup, filterShift, filterYear, filterDate]);

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

 const handleDelete = async () => {
  if (!reportToDelete) return;
  try {
   await api.delete(`/reports/daily/${reportToDelete.id}`);
   setReportToDelete(null);
   fetchReports();
  } catch (error) {
   alert('No se pudo eliminar el reporte');
  }
 };

 const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
 const handleDragLeave = () => { setIsDragging(false); };
 const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  const files = Array.from(e.dataTransfer.files) as File[];
  const docxFiles = files.filter(f => f.name.toLowerCase().endsWith('.docx'));
  if (docxFiles.length > 0) {
   setUploadFiles(prev => [...prev, ...docxFiles]);
   setUploadResults(prev => [...prev, ...docxFiles.map(f => ({ name: f.name, status: 'pending' as const }))]);
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
  fetchReports();
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

 const clearFilters = () => {
  setSearchTerm('');
  setFilterGroup('');
  setFilterShift('');
  setFilterYear('');
  setFilterDate('');
  setPage(1);
 };

 const years = [];
 const currentYear = new Date().getFullYear();
 for (let i = currentYear; i >= 2020; i--) years.push(i);

 return (
  <Layout title="Partes Informativos">
   <Container fluid className="py-4 px-lg-5">
    <div className="d-flex justify-content-between align-items-center mb-4">
     <div>
      <h2 className="fw-black m-0 uppercase tracking-tighter text-main">PARTES INFORMATIVOS</h2>
      <small className="text-muted fw-bold uppercase x-small tracking-widest">Repositorio Histórico y Generador SOC</small>
     </div>
     <div className="d-flex gap-2">
      <Button variant="outline-primary" size="sm" className="fw-black x-small px-3 rounded-pill" onClick={() => setUploadModalOpen(true)}>
       <Upload size={14} className="me-2" /> IMPORTACIÓN MASIVA
      </Button>
      {isSOC && (
       <Button variant="primary" size="sm" className="fw-black x-small px-4 rounded-pill shadow-sm" onClick={() => router.push('/reports/daily/new')}>
        <Plus size={14} className="me-2" /> CREAR NUEVO PARTE
       </Button>
      )}
     </div>
    </div>

    {/* Advanced Filters Card */}
    <Card className="border-0 shadow-sm rounded-4 mb-4 bg-card">
     <Card.Body className="p-3">
      <Row className="g-3 align-items-end">
       <Col lg={3}>
        <Form.Group controlId="search-content">
         <Form.Label className="x-small fw-black text-muted uppercase">Búsqueda de Contenido</Form.Label>
         <InputGroup size="sm" className="bg-surface-muted border-0 rounded-pill px-2">
          <InputGroup.Text className="bg-transparent border-0"><Search size={14}/></InputGroup.Text>
          <Form.Control 
           id="search-content"
           name="searchTerm"
           placeholder="Palabras clave..." 
           className="bg-transparent border-0 shadow-none x-small fw-bold"
           value={searchTerm}
           onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
          />
         </InputGroup>
        </Form.Group>
       </Col>
       <Col md={2}>
        <Form.Group controlId="filter-group">
         <Form.Label className="x-small fw-black text-muted uppercase">Área / Grupo</Form.Label>
         <Form.Select 
          id="filter-group"
          name="filterGroup"
          size="sm" className="bg-surface-muted border-0 rounded-pill x-small fw-bold"
          value={filterGroup} onChange={e => { setFilterGroup(e.target.value); setPage(1); }}
         >
          <option value="">TODAS LAS ÁREAS</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name.toUpperCase()}</option>)}
         </Form.Select>
        </Form.Group>
       </Col>
       <Col md={2}>
        <Form.Group controlId="filter-date">
         <Form.Label className="x-small fw-black text-muted uppercase">Fecha Exacta</Form.Label>
         <Form.Control 
          id="filter-date"
          name="filterDate"
          type="date" size="sm" className="bg-surface-muted border-0 rounded-pill x-small fw-bold"
          value={filterDate} onChange={e => { setFilterDate(e.target.value); setPage(1); }}
         />
        </Form.Group>
       </Col>
       <Col md={1}>
        <Form.Group controlId="filter-year">
         <Form.Label className="x-small fw-black text-muted uppercase">Año</Form.Label>
         <Form.Select 
          id="filter-year"
          name="filterYear"
          size="sm" className="bg-surface-muted border-0 rounded-pill x-small fw-bold"
          value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }}
         >
          <option value="">AÑO</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
         </Form.Select>
        </Form.Group>
       </Col>
       <Col md={2}>
        <Form.Group controlId="filter-shift">
         <Form.Label className="x-small fw-black text-muted uppercase">Turno</Form.Label>
         <Form.Select 
          id="filter-shift"
          name="filterShift"
          size="sm" className="bg-surface-muted border-0 rounded-pill x-small fw-bold"
          value={filterShift} onChange={e => { setFilterShift(e.target.value); setPage(1); }}
         >
          <option value="">TURNOS</option>
          <option value="DIA">DÍA</option>
          <option value="NOCHE">NOCHE</option>
         </Form.Select>
        </Form.Group>
       </Col>
       <Col md={2} className="d-flex gap-2">
        <Button variant="surface-muted" size="sm" className="rounded-pill x-small fw-black text-muted" onClick={clearFilters}>LIMPIAR</Button>
        {canManageTemplates && (
         <Button variant="outline-primary" size="sm" className="rounded-pill p-1 px-2 border-0" onClick={() => setTemplateModalOpen(true)} title="Configurar Plantillas">
          <FileUp size={16} />
         </Button>
        )}
       </Col>
      </Row>
     </Card.Body>
    </Card>

    {loading ? (
     <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
    ) : (
     <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-card">
      <div className="table-responsive">
       <Table hover className="align-middle mb-0 custom-daily-table">
        <thead>
         <tr className="x-small text-muted uppercase tracking-widest border-bottom border-color bg-surface">
          <th className="ps-4 py-3">FECHA Y TURNO</th>
          <th>ÁREA RESPONSABLE</th>
          <th>EXTRACTO DE CONTENIDO</th>
          <th className="text-end pe-4">ACCIONES</th>
         </tr>
        </thead>
        <tbody>
         {reports.map((report) => (
          <tr key={report.id} className="border-bottom border-color">
           <td className="ps-4 py-3">
            <div className="d-flex align-items-center gap-3">
             <div className={`p-2 rounded-3 bg-${report.shift === 'DIA' ? 'warning' : 'info'} bg-opacity-10 text-${report.shift === 'DIA' ? 'warning' : 'info'}`}>
              <Calendar size={18} />
             </div>
             <div>
              <div className="fw-black text-main" style={{fontSize: '13px'}}>{new Date(report.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              <Badge bg={report.shift === 'DIA' ? 'warning' : 'info'} className="x-tiny fw-black tracking-widest">{report.shift}</Badge>
             </div>
            </div>
           </td>
           <td>
            <div className="d-flex align-items-center gap-2">
              <div className="p-1 rounded bg-primary bg-opacity-10"><Hash size={12} className="text-primary"/></div>
              <span className="fw-bold x-small uppercase text-muted tracking-tight">{report.group_name || 'GENERAL'}</span>
            </div>
           </td>
           <td>
            <div className="small text-muted italic opacity-75 text-truncate" style={{ maxWidth: '450px' }}>
             {report.search_content ? `"${report.search_content.substring(0, 100).replace(/\n/g, ' ')}..."` : 'Documento DOCX generado'}
            </div>
           </td>
           <td className="text-end pe-4">
            <div className="d-flex justify-content-end gap-1">
             <Button variant="link" size="sm" onClick={() => setPreviewReport(report)} title="Previsualizar" className="text-muted hover-text-primary p-1"><Eye size={18} /></Button>
             <Button variant="link" size="sm" onClick={() => handleDownload(report.id, report.date, report.shift)} title="Descargar Word" className="text-primary hover-opacity-100 p-1"><Download size={18} /></Button>
             {canDeleteReports && (
              <Button variant="link" size="sm" onClick={() => setReportToDelete(report)} title="Eliminar" className="text-danger hover-opacity-100 p-1"><Trash2 size={18} /></Button>
             )}
            </div>
           </td>
          </tr>
         ))}
         {reports.length === 0 && (
          <tr><td colSpan={4} className="text-center py-5 text-muted x-small fw-black uppercase opacity-50">No se encontraron reportes con los filtros aplicados</td></tr>
         )}
        </tbody>
       </Table>
      </div>
     </Card>
    )}

    {/* Pagination Footer */}
    <div className="d-flex justify-content-between align-items-center mt-4 bg-surface p-3 rounded-4 shadow-sm border border-color">
      <div className="d-flex align-items-center gap-3">
        <span className="x-small fw-black text-muted text-uppercase">Mostrar</span>
        <Form.Group controlId="page-size-select">
         <Form.Select 
          id="page-size-select"
          name="pageSize"
          size="sm" 
          className="rounded-pill border-0 bg-surface-muted px-3 fw-bold" 
          style={{width: '80px'}}
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
         >
           <option value={20}>20</option>
           <option value={50}>50</option>
           <option value={100}>100</option>
         </Form.Select>
        </Form.Group>
        <span className="x-small text-muted fw-bold">Total: {totalItems}</span>
      </div>
      <div className="d-flex gap-2">
        <Button variant="surface-muted" size="sm" className="rounded-pill px-3 x-small fw-black border-color shadow-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
         <ChevronLeft size={14} className="me-1"/> ANTERIOR
        </Button>
        <div className="d-flex align-items-center px-3 bg-primary bg-opacity-10 text-primary rounded-pill x-small fw-black">PÁGINA {page} DE {totalPages}</div>
        <Button variant="surface-muted" size="sm" className="rounded-pill px-3 x-small fw-black border-color shadow-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
         SIGUIENTE <ChevronRight size={14} className="ms-1"/>
        </Button>
      </div>
    </div>

    {/* Bulk Upload Modal con Drag & Drop */}
    <Modal show={uploadModalOpen} onHide={() => !isUploading && setUploadModalOpen(false)} centered size="lg" contentClassName="border-0 shadow-2xl rounded-4">
     <Modal.Header closeButton={!isUploading} className="bg-surface-muted border-0 px-4 py-3">
      <Modal.Title className="x-small fw-black uppercase text-primary tracking-widest">Importación Masiva de Partes</Modal.Title>
     </Modal.Header>
     <Modal.Body className="p-4 bg-card">
      {!isUploading && uploadFiles.length === 0 && (
       <div 
        className={`text-center py-5 border-2 border-dashed rounded-4 mb-4 transition-all ${isDragging ? 'bg-primary bg-opacity-10 border-primary scale-102' : 'bg-surface-muted border-color'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ cursor: 'pointer' }}
        onClick={() => document.getElementById('bulk-file-input')?.click()}
       >
        <Upload size={48} className={`mb-3 opacity-25 ${isDragging ? 'text-primary opacity-100' : 'text-muted'}`} />
        <h6 className={`fw-black ${isDragging ? 'text-primary' : 'text-main'}`}>
         {isDragging ? '¡SUELTA LOS ARCHIVOS AQUÍ!' : 'ARRASTRA O SELECCIONA LOS ARCHIVOS'}
        </h6>
        <p className="x-small text-muted uppercase fw-bold tracking-tight">Solo archivos Word (.docx) | Formato: PARTE_DD-MM-YYYY_TURNO</p>
        <input type="file" multiple accept=".docx" className="d-none" id="bulk-file-input" onChange={handleFilesChange} />
        {!isDragging && <Button variant="primary" size="sm" className="fw-black x-small mt-2 px-4 shadow-sm">BUSCAR EN DISCO</Button>}
       </div>
      )}

      {uploadFiles.length > 0 && (
       <>
        <Form.Group className="mb-4" controlId="upload-target-group">
         <Form.Label className="x-small fw-black text-muted uppercase">Asignar a Área (Opcional)</Form.Label>
         <Form.Select id="upload-target-group" name="targetGroup" size="sm" className="bg-surface-muted border-0 rounded-pill x-small fw-bold" value={targetGroupId} onChange={e => setTargetGroupId(e.target.value)}>
          <option value="">Detectar automáticamente o Mi Grupo</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name.toUpperCase()}</option>)}
         </Form.Select>
        </Form.Group>

        <div className="max-vh-40 overflow-auto custom-scrollbar rounded-3 border border-color bg-surface">
         <ListGroup variant="flush">
          {uploadResults.map((res, idx) => (
           <ListGroup.Item key={idx} className="bg-transparent border-bottom border-color d-flex justify-content-between align-items-center py-2 px-3">
            <div className="d-flex align-items-center gap-2 overflow-hidden">
             {res.status === 'pending' && <Clock size={14} className="text-muted" />}
             {res.status === 'success' && <CheckCircle2 size={14} className="text-success" />}
             {res.status === 'skipped' && <AlertTriangle size={14} className="text-warning" />}
             {res.status === 'error' && <X size={14} className="text-danger" />}
             <span className="x-small fw-bold text-truncate text-main" style={{maxWidth: '400px'}}>{res.name}</span>
            </div>
            <div className="d-flex align-items-center gap-2 flex-shrink-0">
             {res.message && <Badge bg={res.status === 'error' ? 'danger' : 'warning'} className="x-tiny fw-black text-uppercase">{res.message}</Badge>}
             {!isUploading && res.status === 'pending' && (
              <Button variant="link" className="p-0 text-danger" onClick={() => removeFile(idx)}><X size={14} /></Button>
             )}
            </div>
           </ListGroup.Item>
          ))}
         </ListGroup>
        </div>
       </>
      )}
     </Modal.Body>
     <Modal.Footer className="bg-surface-muted border-0 px-4 py-3">
      <Button variant="link" disabled={isUploading} onClick={() => { setUploadFiles([]); setUploadResults([]); setUploadModalOpen(false); }} className="text-muted text-decoration-none x-small fw-black">CANCELAR</Button>
      <Button 
       variant="primary" 
       className="px-4 fw-black x-small uppercase rounded-pill shadow"
       disabled={isUploading || uploadFiles.length === 0}
       onClick={handleBulkUpload}
      >
       {isUploading ? <><Spinner size="sm" className="me-2" /> PROCESANDO...</> : `IMPORTAR ${uploadFiles.length} ARCHIVOS`}
      </Button>
     </Modal.Footer>
    </Modal>

    {/* Modal de Confirmación de Borrado */}
    <Modal show={!!reportToDelete} onHide={() => setReportToDelete(null)} centered contentClassName="border-0 shadow-2xl rounded-4">
     <Modal.Body className="p-5 text-center bg-card rounded-4">
      <div className="bg-danger bg-opacity-10 p-3 rounded-circle d-inline-flex mb-4">
        <AlertTriangle size={48} className="text-danger" />
      </div>
      <h5 className="fw-black uppercase text-main">¿ELIMINAR REPORTE DEFINITIVAMENTE?</h5>
      <p className="small text-muted mb-4 px-3">
       Estás por eliminar el parte del día <span className="fw-bold text-main">{reportToDelete?.date}</span> turno <span className="fw-bold text-main">{reportToDelete?.shift}</span>.
       Esta acción es irreversible y borrará el archivo físico del servidor.
      </p>
      <div className="d-grid gap-2">
       <Button variant="danger" onClick={handleDelete} className="fw-black x-small uppercase py-3 rounded-3 shadow-sm">SÍ, ELIMINAR AHORA</Button>
       <Button variant="link" onClick={() => setReportToDelete(null)} className="text-muted text-decoration-none x-small fw-bold">CANCELAR OPERACIÓN</Button>
      </div>
     </Modal.Body>
    </Modal>

    {/* Modal Plantilla */}
    <Modal show={templateModalOpen} onHide={() => setTemplateModalOpen(false)} centered contentClassName="border-0 shadow-2xl rounded-4">
     <Modal.Header closeButton className="bg-surface-muted border-0 px-4 py-3">
      <Modal.Title className="x-small fw-black text-primary uppercase tracking-widest">Configurar Plantillas de Área</Modal.Title>
     </Modal.Header>
     <Form onSubmit={handleTemplateUpload}>
      <Modal.Body className="p-4 bg-card">
       <Form.Group className="mb-4" controlId="tpl-group-select">
        <Form.Label className="x-small fw-black text-muted uppercase">1. Área Responsable</Form.Label>
        <Form.Select required id="tpl-group-select" name="groupId" className="bg-surface-muted border-0 rounded-pill x-small fw-bold" value={targetGroupId} onChange={e => setTargetGroupId(e.target.value)}>
         <option value="">Seleccione grupo...</option>
         {groups.map(g => <option key={g.id} value={g.id}>{g.name.toUpperCase()}</option>)}
        </Form.Select>
       </Form.Group>
       <Form.Group className="mb-2" controlId="tpl-file-input">
        <Form.Label className="x-small fw-black text-muted uppercase">2. Archivo Maestro (.docx)</Form.Label>
        <Form.Control id="tpl-file-input" name="file" type="file" accept=".docx" required className="bg-surface-muted border-0 rounded-pill x-small fw-bold" onChange={(e: any) => setTemplateFile(e.target.files[0])} />
       </Form.Group>
       <div className="mt-3 p-3 bg-primary bg-opacity-5 rounded-3 border border-primary ">
         <p className="x-small text-primary fw-bold mb-0">Esta plantilla se usará para autogenerar los partes informativos cuando el personal del área cree uno nuevo desde el sistema.</p>
       </div>
      </Modal.Body>
      <Modal.Footer className="bg-surface-muted border-0 px-4 py-3">
       <Button variant="primary" type="submit" disabled={!templateFile || !targetGroupId} className="w-100 fw-black x-small uppercase py-3 rounded-3 shadow">SUBIR Y VINCULAR PLANTILLA</Button>
      </Modal.Footer>
     </Form>
    </Modal>

    {/* Preview Modal con mejor estilo */}
    <Modal show={!!previewReport} onHide={() => setPreviewReport(null)} size="lg" scrollable centered contentClassName="border-0 shadow-2xl rounded-4">
     <Modal.Header closeButton className="bg-surface-muted border-0 px-4 py-3">
      <Modal.Title className="x-small fw-black text-uppercase tracking-widest text-primary">Previsualización Forense</Modal.Title>
     </Modal.Header>
     <Modal.Body className="p-0 bg-card">
      <div className="p-3 bg-surface border-bottom d-flex gap-2 align-items-center px-4">
       <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary fw-black px-2">{previewReport?.date}</Badge>
       <Badge bg="dark" className="bg-opacity-50 border  text-uppercase fw-black px-2">{previewReport?.shift}</Badge>
       <div className="ms-auto x-small fw-bold text-muted uppercase">Origen: {previewReport?.group_name || 'LEGACY'}</div>
      </div>
      <div className="p-4 font-monospace preview-content" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-main)', minHeight: '400px' }}>
       {previewReport?.search_content ? previewReport.search_content : (
        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted opacity-50 py-5">
          <FileText size={48} className="mb-3"/>
          <span className="fw-bold uppercase x-small">Contenido no indexado (Solo archivo binario)</span>
        </div>
       )}
      </div>
     </Modal.Body>
     <Modal.Footer className="bg-surface-muted border-0 px-4 py-3">
      <Button variant="link" onClick={() => setPreviewReport(null)} className="text-muted text-decoration-none x-small fw-black">CERRAR</Button>
      {previewReport && (
       <Button variant="primary" onClick={() => handleDownload(previewReport.id, previewReport.date, previewReport.shift)} className="fw-black x-small px-4 uppercase rounded-pill shadow">
        <Download size={14} className="me-2" /> DESCARGAR ORIGINAL DOCX
       </Button>
      )}
     </Modal.Footer>
    </Modal>

   </Container>
   <style jsx global>{`
    .fw-black { font-weight: 900; }
    .x-small { font-size: 11px; }
    .x-tiny { font-size: 9px; }
    .tracking-tighter { letter-spacing: -0.05em; }
    .custom-daily-table tr { transition: all 0.2s; }
    .custom-daily-table tr:hover { background-color: var(--bg-surface-muted) !important; }
    .max-vh-40 { max-height: 40vh; }
    .border-color { border-color: var(--border-subtle) !important; }
    .hover-text-primary:hover { color: var(--bs-primary) !important; }
    .preview-content mark { padding: 0; background: rgba(var(--bs-primary-rgb), 0.3); color: inherit; }
    .scale-102 { transform: scale(1.01); }
    .transition-all { transition: all 0.2s ease-in-out; }
   `}</style>
  </Layout>
 );
}

import { FileText } from 'lucide-react';
