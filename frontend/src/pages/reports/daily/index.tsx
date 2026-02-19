import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, InputGroup, Modal, Badge, Alert, Spinner, ListGroup } from 'react-bootstrap';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { Search, Plus, Upload, Download, Eye, FileUp, Clock, X, CheckCircle2, AlertTriangle, Trash2, Calendar, Filter, ChevronLeft, ChevronRight, Hash, Book, Folder, ArrowLeft, FileText } from 'lucide-react';
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
 const [spaces, setSpaces] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [viewMode, setViewViewMode] = useState<'libraries' | 'list'>('libraries');
 const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
 
 // Paginación
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(20);
 const [totalPages, setTotalPages] = useState(1);
 const [totalItems, setTotalItems] = useState(0);

 // Filters
 const [searchTerm, setSearchTerm] = useState('');
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

 // Ref para seguimiento síncrono del progreso
 const processingResultsRef = React.useRef<{name: string, status: 'pending' | 'success' | 'error' | 'skipped', message?: string}[]>([]);

 // Correction Modal State
 const [correctionFile, setCorrectionFile] = useState<{index: number, file: File, detected: any} | null>(null);
 const [manualDate, setManualDate] = useState('');
 const [manualShift, setManualShift] = useState('DIA');

 const fetchReports = async () => {
  if (viewMode !== 'list' || !selectedGroup) return;
  setLoading(true);
  try {
   const params: any = { 
    page, 
    size: pageSize,
    search: searchTerm || undefined,
    group_id: selectedGroup?.id,
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

 const fetchInitialData = async () => {
  setLoading(true);
  try {
   const [groupsRes, spacesRes] = await Promise.all([
     api.get('/groups'),
     api.get('/wiki/spaces')
   ]);
   setGroups(groupsRes.data);
   setSpaces(spacesRes.data.filter((s: any) => s.owner_group_id !== null));
  } catch (error) { console.error(error); }
  finally { setLoading(false); }
 };

 useEffect(() => {
  fetchInitialData();
 }, []);

 useEffect(() => {
  if (selectedGroup) {
    setTargetGroupId(selectedGroup.id);
  }
 }, [selectedGroup]);

 useEffect(() => {
  if (viewMode === 'list') {
    const timer = setTimeout(() => {
      fetchReports();
    }, 300);
    return () => clearTimeout(timer);
  }
 }, [viewMode, selectedGroup, page, pageSize, searchTerm, filterShift, filterYear, filterDate]);

 const handleSelectLibrary = (space: any) => {
   const group = groups.find(g => g.id === space.owner_group_id);
   const gObj = group || { id: space.owner_group_id, name: space.name };
   setSelectedGroup(gObj);
   setTargetGroupId(gObj.id);
   setViewViewMode('list');
   setPage(1);
 };

 const handleBackToLibraries = () => {
   setSelectedGroup(null);
   setViewViewMode('libraries');
 };

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
   // Pequeño delay para asegurar que la DB impactó si es necesario
   setTimeout(() => fetchReports(), 300);
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
   const newItems = docxFiles.map(f => ({ name: f.name, status: 'pending' as const }));
   setUploadFiles(prev => [...prev, ...docxFiles]);
   setUploadResults(prev => {
     const updated = [...prev, ...newItems];
     processingResultsRef.current = updated;
     return updated;
   });
  }
 };

 const handleFilesChange = (e: any) => {
  const files = Array.from(e.target.files) as File[];
  const newItems = files.map(f => ({ name: f.name, status: 'pending' as const }));
  setUploadFiles(prev => [...prev, ...files]);
  setUploadResults(prev => {
    const updated = [...prev, ...newItems];
    processingResultsRef.current = updated;
    return updated;
  });
 };

 const removeFile = (index: number) => {
  setUploadFiles(prev => prev.filter((_, i) => i !== index));
  setUploadResults(prev => {
    const updated = prev.filter((_, i) => i !== index);
    processingResultsRef.current = updated;
    return updated;
  });
 };

 const handleBulkUpload = async () => {
  setIsUploading(true);
  
  for (let i = 0; i < uploadFiles.length; i++) {
   // USAR REF SINCRÓNICO PARA DECIDIR
   if (processingResultsRef.current[i].status === 'success' || processingResultsRef.current[i].status === 'skipped') {
     continue;
   }

   const file = uploadFiles[i];
   const formData = new FormData();
   formData.append('file', file);
   if (targetGroupId) formData.append('group_id', targetGroupId);

   try {
    const res = await api.post('/reports/daily/upload-legacy', formData, {
     headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    if (res.data === null) {
     processingResultsRef.current[i] = { ...processingResultsRef.current[i], status: 'skipped', message: 'Duplicado' };
    } else {
     processingResultsRef.current[i] = { ...processingResultsRef.current[i], status: 'success' };
    }
    // Sincronizar estado visual
    setUploadResults([...processingResultsRef.current]);
   } catch (error: any) {
    const errorData = error.response?.data?.detail;
    
    if (errorData?.code === 'METADATA_MISSING') {
      setCorrectionFile({ index: i, file: file, detected: errorData.detected });
      setManualDate(errorData.detected?.date || '');
      setManualShift(errorData.detected?.shift || 'DIA');
      setIsUploading(false); 
      return; // STOP AND WAIT
    }
    
    const detail = error.response?.data?.detail;
    const errorMsg = typeof detail === 'string' ? detail : (detail?.message || 'Fallo');
    processingResultsRef.current[i] = { ...processingResultsRef.current[i], status: 'error', message: errorMsg };
    setUploadResults([...processingResultsRef.current]);
   }
  }
  
  setIsUploading(false);
  fetchReports();
 };

 const handleManualSubmit = async () => {
  if (!correctionFile) return;
  
  const i = correctionFile.index;
  const file = correctionFile.file;
  setIsUploading(true);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('date_str', manualDate);
  formData.append('shift', manualShift);
  if (targetGroupId) formData.append('group_id', targetGroupId);

  try {
   const res = await api.post('/reports/daily/upload-legacy', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
   });
   
   if (res.data === null) {
    processingResultsRef.current[i] = { ...processingResultsRef.current[i], status: 'skipped', message: 'Duplicado' };
   } else {
    processingResultsRef.current[i] = { ...processingResultsRef.current[i], status: 'success' };
   }
   
   setCorrectionFile(null);
   setUploadResults([...processingResultsRef.current]);
   
   // Resume loop
   setTimeout(() => handleBulkUpload(), 100);
   
  } catch (error: any) {
   const detail = error.response?.data?.detail;
   const errorMsg = typeof detail === 'string' ? detail : (detail?.message || 'Fallo');
   alert(`Error en este archivo: ${errorMsg}`);
   
   processingResultsRef.current[i] = { ...processingResultsRef.current[i], status: 'error', message: errorMsg };
   setUploadResults([...processingResultsRef.current]);
   setCorrectionFile(null);
   handleBulkUpload();
  }
 };

 const skipFile = () => {
   if (!correctionFile) return;
   const i = correctionFile.index;
   processingResultsRef.current[i] = { ...processingResultsRef.current[i], status: 'skipped', message: 'Omitido' };
   setUploadResults([...processingResultsRef.current]);
   setCorrectionFile(null);
   handleBulkUpload();
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
      <div className="d-flex align-items-center gap-2 mb-1">
        {viewMode === 'list' && (
          <Button variant="link" onClick={handleBackToLibraries} className="p-0 text-primary">
            <ArrowLeft size={24} />
          </Button>
        )}
        <h2 className="fw-black m-0 uppercase tracking-tighter text-main">
          {viewMode === 'libraries' ? 'LIBRERÍAS DE PARTES' : `PARTES: ${selectedGroup?.name}`}
        </h2>
      </div>
      <small className="text-muted fw-bold uppercase x-small tracking-widest">
        {viewMode === 'libraries' ? 'Repositorio jerárquico de informes por área' : 'Historial de informes del área seleccionada'}
      </small>
     </div>
     <div className="d-flex gap-2">
      {viewMode === 'list' && selectedGroup?.name?.toUpperCase().includes('SOC') && (
       <Button variant="primary" size="sm" className="fw-black x-small px-4 rounded-pill shadow-sm" onClick={() => router.push('/reports/daily/new')}>
        <Plus size={14} className="me-2" /> CREAR NUEVO PARTE
       </Button>
      )}
     </div>
    </div>

    {viewMode === 'libraries' ? (
      <>
        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" variant="primary"/></div>
        ) : (
          <Row className="g-4">
            {spaces.map(space => (
              <Col key={space.id} md={4} lg={3}>
                <Card 
                  className="border-subtle shadow-sm h-100 cursor-pointer bg-surface overflow-hidden"
                  onClick={() => handleSelectLibrary(space)}
                  style={{ transition: 'transform 0.2s' }}
                >
                  <Card.Body className="p-4 d-flex flex-column align-items-center text-center">
                    <div className="p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-3">
                      <Book size={32} />
                    </div>
                    <h6 className="fw-black text-uppercase text-primary m-0 mb-2">{space.name}</h6>
                    <p className="small text-muted mb-0" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{space.description}</p>
                  </Card.Body>
                  <Card.Footer className="bg-surface-raised border-0 py-2 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-1 x-tiny fw-bold uppercase text-tertiary">
                      <Folder size={10}/> ACCEDER A ARCHIVOS
                    </div>
                    <ChevronRight size={14} className="text-tertiary" />
                  </Card.Footer>
                </Card>
              </Col>
            ))}
            {spaces.length === 0 && (
              <Col xs={12}>
                <Alert variant="info" className="text-center rounded-4 border-0 shadow-sm py-5">
                  <Book size={48} className="mb-3 opacity-25" />
                  <h5 className="fw-black uppercase">No hay librerías disponibles</h5>
                  <p className="small mb-0">No perteneces a ningún grupo con librería asignada o no hay librerías públicas.</p>
                </Alert>
              </Col>
            )}
          </Row>
        )}
      </>
    ) : (
      <>
        <Card className="border-0 shadow-sm rounded-4 mb-4 bg-card">
         <Card.Body className="p-3">
          <Row className="g-3 align-items-end">
           <Col lg={3}>
            <Form.Group controlId="search-content">
             <Form.Label className="x-small fw-black text-muted uppercase">Búsqueda en {selectedGroup?.name}</Form.Label>
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
           <Col md={3}>
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
           <Col md={2}>
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
            <Button variant="outline-primary" size="sm" className="rounded-pill p-1 px-3 border-0 d-flex align-items-center" onClick={() => setUploadModalOpen(true)} title="Importación Masiva">
              <Upload size={16} className="me-1" /> <span className="x-tiny fw-black">IMPORTAR</span>
            </Button>
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
           <Table hover className="align-middle mb-0">
            <thead>
             <tr className="x-small text-muted uppercase tracking-widest border-bottom border-color bg-surface">
              <th className="ps-4 py-3">FECHA Y TURNO</th>
              <th>ÁREA</th>
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
      </>
    )}

    {/* MODALS */}
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
        <p className="x-small text-muted uppercase fw-bold tracking-tight">Solo archivos Word (.docx)</p>
        <input type="file" multiple accept=".docx" className="d-none" id="bulk-file-input" onChange={handleFilesChange} />
        {!isDragging && <Button variant="primary" size="sm" className="fw-black x-small mt-2 px-4 shadow-sm">BUSCAR EN DISCO</Button>}
       </div>
      )}

      {uploadFiles.length > 0 && (
       <>
        <div className="mb-4 p-3 bg-primary bg-opacity-10 rounded-3 border border-primary border-opacity-25">
          <div className="x-tiny fw-black text-primary uppercase tracking-widest mb-1">Destino de Importación</div>
          <div className="small fw-bold text-main">{selectedGroup?.name.toUpperCase()}</div>
          <div className="x-tiny text-muted mt-1 italic">Los archivos se guardarán automáticamente en esta librería.</div>
        </div>

        <div className="max-vh-40 overflow-auto rounded-3 border border-color bg-surface">
         <ListGroup variant="flush">
          {uploadResults.map((res, idx) => (
           <ListGroup.Item key={idx} className="bg-transparent border-bottom border-color d-flex justify-content-between align-items-center py-2 px-3">
            <div className="d-flex align-items-center gap-2 overflow-hidden">
             <span className="x-small fw-bold text-truncate text-main" style={{maxWidth: '400px'}}>{res.name}</span>
            </div>
            <div className="d-flex align-items-center gap-2 flex-shrink-0">
             {res.status !== 'pending' && <Badge bg={res.status === 'success' ? 'success' : 'danger'} className="x-tiny fw-black text-uppercase">{res.status}</Badge>}
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
       {isUploading ? 'PROCESANDO...' : `IMPORTAR ARCHIVOS`}
      </Button>
     </Modal.Footer>
    </Modal>

    {/* MODAL DE CORRECCIÓN MANUAL */}
    <Modal show={!!correctionFile} onHide={() => setCorrectionFile(null)} centered backdrop="static" contentClassName="border-0 shadow-2xl rounded-4">
      <Modal.Header className="bg-warning bg-opacity-10 border-0 px-4 py-3">
        <Modal.Title className="x-small fw-black uppercase text-warning tracking-widest d-flex align-items-center">
          <AlertTriangle size={18} className="me-2" /> Datos Faltantes
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4 bg-card">
        <p className="small fw-bold text-main mb-3">No se pudo detectar automáticamente la fecha o el turno en el archivo:</p>
        <div className="p-3 bg-surface-muted rounded-3 mb-4 border border-color">
          <code className="x-small text-primary fw-black">{correctionFile?.file.name}</code>
        </div>
        
        <Form.Group className="mb-3">
          <Form.Label className="x-small fw-black text-muted uppercase">Fecha del Informe</Form.Label>
          <Form.Control 
            type="date" 
            size="sm" 
            className="bg-surface-muted border-0 rounded-pill x-small fw-bold"
            value={manualDate}
            onChange={e => setManualDate(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="x-small fw-black text-muted uppercase">Turno</Form.Label>
          <Form.Select 
            size="sm" 
            className="bg-surface-muted border-0 rounded-pill x-small fw-bold"
            value={manualShift}
            onChange={e => setManualShift(e.target.value)}
          >
            <option value="DIA">DÍA</option>
            {selectedGroup?.name?.toUpperCase().includes('SOC') && <option value="NOCHE">NOCHE</option>}
          </Form.Select>
          {!selectedGroup?.name?.toUpperCase().includes('SOC') && <small className="x-tiny text-muted mt-1 d-block">Solo el área SOC dispone de turno noche.</small>}
        </Form.Group>
      </Modal.Body>
      <Modal.Footer className="bg-surface-muted border-0 px-4 py-3">
        <Button variant="link" onClick={skipFile} className="text-muted text-decoration-none x-small fw-black">SALTAR ARCHIVO</Button>
        <Button 
          variant="warning" 
          className="px-4 fw-black x-small uppercase rounded-pill shadow text-white"
          disabled={!manualDate || !manualShift}
          onClick={handleManualSubmit}
        >
          CONTINUAR IMPORTACIÓN
        </Button>
      </Modal.Footer>
    </Modal>

    {/* MODAL ELIMINAR */}
    <Modal show={!!reportToDelete} onHide={() => setReportToDelete(null)} centered contentClassName="border-0 shadow-2xl rounded-4">
      <Modal.Header closeButton className="bg-danger bg-opacity-10 border-0 px-4 py-3">
        <Modal.Title className="x-small fw-black uppercase text-danger tracking-widest">Eliminar Informe</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4 bg-card text-center">
        <div className="p-3 rounded-circle bg-danger bg-opacity-10 text-danger d-inline-block mb-3">
          <Trash2 size={32} />
        </div>
        <h5 className="fw-black text-main uppercase">¿Estás seguro?</h5>
        <p className="small text-muted mb-0">Esta acción eliminará permanentemente el informe del día <strong>{reportToDelete && new Date(reportToDelete.date).toLocaleDateString()}</strong> y su archivo Word asociado.</p>
      </Modal.Body>
      <Modal.Footer className="bg-surface-muted border-0 px-4 py-3">
        <Button variant="link" onClick={() => setReportToDelete(null)} className="text-muted text-decoration-none x-small fw-black">CANCELAR</Button>
        <Button variant="danger" className="px-4 fw-black x-small uppercase rounded-pill shadow" onClick={handleDelete}>
          ELIMINAR PERMANENTEMENTE
        </Button>
      </Modal.Footer>
    </Modal>

    {/* PREVIEW MODAL */}
    <Modal show={!!previewReport} onHide={() => setPreviewReport(null)} size="lg" scrollable centered contentClassName="border-0 shadow-2xl rounded-4">
     <Modal.Header closeButton className="bg-surface-muted border-0 px-4 py-3">
      <Modal.Title className="x-small fw-black text-uppercase tracking-widest text-primary">Previsualización</Modal.Title>
     </Modal.Header>
     <Modal.Body className="p-0 bg-card">
      <div className="p-4 font-monospace" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
       {previewReport?.search_content || 'Contenido no indexado'}
      </div>
     </Modal.Body>
     <Modal.Footer className="bg-surface-muted border-0 px-4 py-3">
      <Button variant="link" onClick={() => setPreviewReport(null)} className="text-muted text-decoration-none x-small fw-black">CERRAR</Button>
      {previewReport && (
       <Button variant="primary" onClick={() => handleDownload(previewReport.id, previewReport.date, previewReport.shift)} className="fw-black x-small px-4 uppercase rounded-pill shadow">
        DESCARGAR ORIGINAL
       </Button>
      )}
     </Modal.Footer>
    </Modal>

   </Container>
  </Layout>
 );
}
