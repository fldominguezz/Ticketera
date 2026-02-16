import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import { Spinner, Button, Badge, Form, InputGroup } from 'react-bootstrap';
import { 
  Book, Plus, Save, FileText, ChevronRight, Folder, 
  ChevronDown, Edit3, Trash2, ArrowLeft, Maximize2, Minimize2, Download, Upload, Eye, X, Search,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import api from '../../lib/api';

const OfficeEditor = dynamic(() => import('../../components/wiki/OfficeEditor'), { ssr: false });
const PDFViewer = dynamic(() => import('../../components/wiki/PDFViewer'), { ssr: false });
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

export default function WikiSpacePage() {
  const router = useRouter();
  const { id } = router.query; 
  
  const [pages, setPages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  
  // Modales y Estados de acción
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  
  const [actionPage, setActionPage] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [officeMode, setOfficeMode] = useState<'view' | 'edit'>('view');
  const [officeConfig, setOfficeConfig] = useState<any>(null);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') (window as any).ONLYOFFICE_FORCE_NO_WORKER = true;
    if (id) fetchTree(); 
  }, [id]);

  const fetchTree = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/wiki/spaces/${id}/tree`);
      const items = res.data;
      const map: any = {};
      const roots: any[] = [];
      items.forEach((item: any) => { map[item.id] = { ...item, children: [] }; });
      items.forEach((item: any) => {
        if (item.parent_id && map[item.parent_id]) map[item.parent_id].children.push(map[item.id]);
        else roots.push(map[item.id]);
      });
      setPages(roots);
    } catch (e) { }
    finally { setLoading(false); }
  };

  const handleCreateFolder = async () => {
    if (!newName || !id) return;
    try {
      setIsCreating(true);
      await api.post('/wiki/pages', {
        title: newName,
        space_id: id,
        parent_id: actionPage?.id || null,
        is_folder: true
      });
      setNewName("");
      setShowFolderModal(false);
      fetchTree();
    } catch (e) { }
    finally { setIsCreating(false); }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('space_id', id as string);
    if (actionPage?.id) formData.append('parent_id', actionPage.id);

    try {
      setLoading(true);
      await api.post('/wiki/pages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchTree();
      setShowUploadModal(false);
    } catch (e) { 
      alert("Error al subir archivo");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm("¿Estás seguro de eliminar este elemento y todo su contenido?")) return;
    try {
      await api.delete(`/wiki/pages/${pageId}`);
      if (selectedPage?.id === pageId) setSelectedPage(null);
      fetchTree();
    } catch (e) { }
  };

  const handleRename = async () => {
    if (!newName || !actionPage) return;
    try {
      await api.put(`/wiki/pages/${actionPage.id}`, { title: newName });
      setShowRenameModal(false);
      fetchTree();
    } catch (e) { }
  };

  const handleMove = async () => {
    if (!actionPage) return;
    try {
      await api.put(`/wiki/pages/${actionPage.id}`, { parent_id: targetFolderId === "root" ? null : targetFolderId });
      setShowMoveModal(false);
      fetchTree();
    } catch (e) { }
  };

  const loadOfficeConfig = async (pageId: string, mode: 'view' | 'edit') => {
    try {
      setLoading(true);
      const res = await api.get(`/wiki/pages/${pageId}/office-config?mode=${mode}`);
      setOfficeConfig(res.data);
      setOfficeMode(mode);
    } catch (e) { console.error("OnlyOffice Error", e); }
    finally { setLoading(false); }
  };

  const handleSelectPage = async (page: any) => {
    if (page.is_folder) {
      const s = new Set(collapsed);
      s.has(page.id) ? s.delete(page.id) : s.add(page.id);
      setCollapsed(s);
      return;
    }
    
    try {
      setLoading(true);
      setOfficeConfig(null);
      const res = await api.get(`/wiki/pages/${page.id}`);
      const fullPage = res.data;
      console.log("Wiki Debug: Selected Page Data:", fullPage);
      setSelectedPage(fullPage);
      setEditContent(fullPage.content || "");
      setIsEditMode(false);
      
      // Auto-contraer panel lateral al seleccionar documento
      setIsNavCollapsed(true);

      if (fullPage.original_file_path) {
        const path = fullPage.original_file_path.toLowerCase();
        if (path.endsWith('.docx') || path.endsWith('.doc') || path.endsWith('.xlsx')) {
          setPdfUrl(null);
          await loadOfficeConfig(fullPage.id, 'view');
        } else if (path.endsWith('.pdf')) {
          setOfficeConfig(null);
          // Usamos la ruta directa del API para el visor de PDF
          setPdfUrl(`/api/v1/wiki/pages/${fullPage.id}/pdf`);
        }
      } else {
        setPdfUrl(null);
      }
    } catch (e) { }
    finally { setLoading(false); }
  };

  const toggleOfficeMode = () => {
    if (!selectedPage) return;
    const newMode = officeMode === 'view' ? 'edit' : 'view';
    setOfficeConfig(null); // Limpiar config vieja para forzar recarga
    loadOfficeConfig(selectedPage.id, newMode);
  };

  const handleConvertToEditable = async () => {
    if (!selectedPage) return;
    try {
      setLoading(true);
      const res = await api.post(`/wiki/pages/${selectedPage.id}/convert-to-editable`);
      const { new_page_id } = res.data;
      
      // 1. Refrescar el árbol para que aparezca la nueva página
      await fetchTree();
      
      // 2. Seleccionar la nueva página creada
      const newPageRes = await api.get(`/wiki/pages/${new_page_id}`);
      handleSelectPage(newPageRes.data);
      
    } catch (e) {
      console.error("Error al crear copia editable:", e);
      alert("Hubo un error al crear la copia editable.");
    } finally {
      setLoading(false);
    }
  };

  const handleExpandToggle = () => {
    setIsFullScreen(!isFullScreen);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  };

  const NavItem = ({ page, level = 0 }: { page: any, level?: number }) => {
    const isCollapsed = collapsed.has(page.id);
    const isSelected = selectedPage?.id === page.id;
    
    // Identificar tipo de archivo por extensión
    const isPDF = page.original_file_path?.toLowerCase().endsWith('.pdf');
    const isWord = page.original_file_path?.toLowerCase().endsWith('.docx') || page.original_file_path?.toLowerCase().endsWith('.doc');

    const visibleChildren = page.children?.filter((c:any) => 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.children?.some((cc:any) => cc.title.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (searchTerm && !page.title.toLowerCase().includes(searchTerm.toLowerCase()) && (!visibleChildren || visibleChildren.length === 0)) {
      return null;
    }

    return (
      <div className="mb-1 px-1">
        <div 
          className={`d-flex align-items-center gap-2 py-2 px-2 rounded-2 cursor-pointer transition-all nav-item-wiki group-hover-actions ${isSelected ? 'selected-nav' : 'hover-bg-muted'}`} 
          style={{ marginLeft: `${level * 10}px` }} 
          onClick={() => handleSelectPage(page)}
        >
          <div className="d-flex align-items-center">
            {page.is_folder ? (
              isCollapsed ? <ChevronRight size={14} className="text-tertiary" /> : <ChevronDown size={14} className="text-tertiary" />
            ) : null}
          </div>
          
          {page.is_folder ? (
            <Folder size={14} className="text-warning fill-warning" />
          ) : isPDF ? (
            <FileText size={14} className="text-danger" />
          ) : isWord ? (
            <FileText size={14} className="text-primary" />
          ) : (
            <FileText size={14} className="text-tertiary" />
          )}

          <span className={`small flex-grow-1 text-truncate ${isSelected ? 'fw-black text-primary' : 'fw-semibold text-secondary'}`} style={{ fontSize: '12px' }}>
            {page.title}
          </span>

          <div className="wiki-item-actions d-none gap-1">
            <Button variant="link" size="sm" className="p-0 text-secondary" onClick={(e) => { e.stopPropagation(); setActionPage(page); setNewName(page.title); setShowRenameModal(true); }}>
              <Edit3 size={12} />
            </Button>
            <Button variant="link" size="sm" className="p-0 text-secondary" onClick={(e) => { e.stopPropagation(); setActionPage(page); setTargetFolderId(page.parent_id || "root"); setShowMoveModal(true); }}>
              <Maximize2 size={12} />
            </Button>
            <Button variant="link" size="sm" className="p-0 text-danger" onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }}>
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
        {page.is_folder && !isCollapsed && (
          <div className="mt-1 border-start border-subtle ms-2">
            {page.children.map((child: any) => (<NavItem key={child.id} page={child} level={level + 1} />))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout title="Wiki SSI">
      <div className="wiki-master-container">
        {!isFullScreen && !isNavCollapsed && (
          <aside className="wiki-nav-panel animate-fade-in">
            <div className="nav-header">
              <div className="d-flex flex-column w-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="fw-black text-primary small uppercase tracking-tighter">SSI REPOSITORIO</span>
                  <div className="d-flex gap-1">
                    <Button variant="outline-primary" className="p-1 rounded-circle" size="sm" onClick={() => { setActionPage(null); setNewName(""); setShowFolderModal(true); }}>
                      <Plus size={14} />
                    </Button>
                    <Button variant="outline-success" className="p-1 rounded-circle" size="sm" onClick={() => { setActionPage(null); setShowUploadModal(true); }}>
                      <Upload size={14} />
                    </Button>
                  </div>
                </div>
                <InputGroup size="sm" className="mb-2 shadow-sm rounded-pill overflow-hidden border-subtle bg-surface-raised">
                  <InputGroup.Text className="bg-transparent border-0 pe-0"><Search size={14} className="text-tertiary"/></InputGroup.Text>
                  <Form.Control 
                    className="bg-transparent border-0 x-small fw-bold text-primary shadow-none" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </div>
            </div>
            <div className="nav-tree-area custom-scrollbar py-2">
              {loading && !selectedPage ? <div className="text-center py-5"><Spinner size="sm" variant="primary" /></div> : pages.map(p => <NavItem key={p.id} page={p} />)}
            </div>
          </aside>
        )}

        <main className="wiki-content-panel">
          {selectedPage ? (
            <div className="d-flex flex-column h-100 animate-slide-up">
              <header className="content-toolbar shadow-sm border-bottom border-subtle">
                <div className="d-flex align-items-center gap-3">
                  <Button 
                    variant="link" 
                    className="p-0 text-tertiary hover-text-primary transition-all d-flex align-items-center" 
                    onClick={() => setIsNavCollapsed(!isNavCollapsed)}
                    title={isNavCollapsed ? "Mostrar Navegación" : "Ocultar Navegación"}
                  >
                    {isNavCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                  </Button>
                  {isFullScreen && <Button variant="outline-primary" size="sm" className="rounded-circle p-1" onClick={handleExpandToggle}><ArrowLeft size={18}/></Button>}
                  <div className="d-flex flex-column">
                    <h6 className="m-0 fw-black text-uppercase text-truncate tracking-tighter text-primary" style={{ maxWidth: '400px' }}>{selectedPage.title}</h6>
                    <div className="d-flex align-items-center gap-2">
                      <div className={`indicator-dot ${officeMode === 'edit' ? 'bg-danger pulse' : 'bg-success'}`}></div>
                      <span className="x-tiny text-tertiary fw-black uppercase tracking-widest">
                        {officeConfig ? (officeMode === 'edit' ? 'Escritura Habilitada' : 'Vista Lectura') : 'Estático'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  {selectedPage?.original_file_path?.toLowerCase().endsWith('.pdf') && (
                    <Button 
                      variant="warning" 
                      size="sm" 
                      className="rounded-pill px-3 fw-black x-small shadow-sm d-flex align-items-center" 
                      onClick={handleConvertToEditable}
                      disabled={loading}
                    >
                      <Edit3 size={14} className="me-1"/> 
                      {loading ? '...' : 'HACER EDITABLE'}
                    </Button>
                  )}
                  {officeConfig && (
                    <Button variant={officeMode === 'edit' ? 'success' : 'primary'} size="sm" className="rounded-pill px-3 fw-black x-small shadow-sm" onClick={toggleOfficeMode}>
                      {officeMode === 'edit' ? <><Save size={14} className="me-1"/> LEER</> : <><Edit3 size={14} className="me-1"/> EDITAR</>}
                    </Button>
                  )}
                  <Button variant="light" size="sm" className="rounded-pill px-3 fw-black x-small shadow-sm border-subtle" onClick={handleExpandToggle}>
                    {isFullScreen ? <Maximize2 size={14}/> : <Maximize2 size={14}/>}
                  </Button>
                </div>
              </header>

              <div className="content-viewport-mesa">
                <div className="document-container-wrapper shadow-lg border-subtle">
                  {officeConfig ? (
                    <div key={`${selectedPage.id}-${officeMode}-${isFullScreen}`} className="h-100 w-100">
                      <OfficeEditor config={officeConfig} documentServerUrl={`https://${window.location.hostname}/office`} />
                    </div>
                  ) : pdfUrl ? (
                    <div className="h-100 w-100 overflow-auto bg-dark p-4 shadow-inner"><PDFViewer file={pdfUrl} /></div>
                  ) : (
                    <div className="h-100 w-100 overflow-auto p-5 bg-surface text-primary" dangerouslySetInnerHTML={{__html: selectedPage.content}} />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-100 d-flex flex-column align-items-center justify-content-center bg-main">
              <div className="p-5 rounded-circle bg-surface shadow-inner mb-4">
                <Book size={100} className="text-primary opacity-25" />
              </div>
              <h4 className="fw-black uppercase tracking-widest text-primary">Repositorio SSI</h4>
              <p className="small fw-bold text-secondary">Selecciona un procedimiento para comenzar.</p>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        .wiki-master-container { display: flex; height: calc(100vh - 64px); width: 100%; overflow: hidden; background: var(--bg-main); }
        .wiki-nav-panel { width: 300px; min-width: 300px; height: 100%; display: flex; flex-direction: column; background: var(--bg-surface); border-right: 1px solid var(--border-subtle); }
        .nav-header { padding: 1.5rem 1rem; border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface-raised); }
        .nav-tree-area { flex: 1; overflow-y: auto; }
        .wiki-content-panel { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
        .content-toolbar { height: 60px; min-height: 60px; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); z-index: 100; border-bottom: 1px solid var(--border-subtle); }
        
        /* MODO DOCUMENT WORKSPACE: Sin márgenes, altura dinámica */
        .content-viewport-mesa { flex: 1; min-height: 0; background: var(--bg-surface-raised); padding: 0; overflow: hidden; display: flex; justify-content: center; }
        .document-container-wrapper { width: 100%; height: 100%; background: var(--bg-surface); border-radius: 0; overflow: hidden; border: none; transition: all 0.3s ease; }
        
        .nav-item-wiki { border-left: 3px solid transparent; }
        .nav-item-wiki.selected-nav { background: var(--primary-glow) !important; color: var(--primary) !important; border-left-color: var(--primary); }
        .nav-item-wiki:hover:not(.selected-nav) { background: var(--bg-surface-raised); }
        .group-hover-actions:hover .wiki-item-actions { display: flex !important; }
        .indicator-dot { width: 8px; height: 8px; border-radius: 50%; }
        .pulse { animation: pulse-anim 2s infinite; }
        @keyframes pulse-anim { 0% { transform: scale(0.95); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.5; } 100% { transform: scale(0.95); opacity: 1; } }
        .x-tiny { font-size: 10px; font-weight: 900; }
        .animate-slide-up { animation: slideUp 0.4s ease-out; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* MODAL: Nueva Carpeta */}
      {showFolderModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-100" style={{background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'}}>
          <div className="bg-surface p-4 rounded-4 shadow-lg animate-slide-up border border-subtle" style={{width: '400px'}}>
            <h5 className="fw-black uppercase small tracking-widest text-primary mb-3">Nueva Carpeta</h5>
            <Form.Group className="mb-3">
              <Form.Label className="x-tiny fw-bold text-label">Nombre</Form.Label>
              <Form.Control 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="Ej: Procedimientos Malware"
                className="rounded-3 border-subtle bg-surface-raised text-primary"
              />
            </Form.Group>
            <div className="d-flex gap-2 justify-content-end">
              <Button variant="light" className="rounded-pill px-4 fw-bold text-secondary" onClick={() => setShowFolderModal(false)}>CANCELAR</Button>
              <Button variant="primary" className="rounded-pill px-4 fw-black" onClick={handleCreateFolder}>CREAR</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Renombrar */}
      {showRenameModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-100" style={{background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'}}>
          <div className="bg-surface p-4 rounded-4 shadow-lg animate-slide-up border border-subtle" style={{width: '400px'}}>
            <h5 className="fw-black uppercase small tracking-widest text-primary mb-3">Cambiar Nombre</h5>
            <Form.Group className="mb-3">
              <Form.Label className="x-tiny fw-bold text-tertiary">Nombre Actual: {actionPage?.title}</Form.Label>
              <Form.Control 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                className="rounded-3 border-subtle bg-surface-raised text-primary"
              />
            </Form.Group>
            <div className="d-flex gap-2 justify-content-end">
              <Button variant="light" className="rounded-pill px-4 fw-bold text-secondary" onClick={() => setShowRenameModal(false)}>CANCELAR</Button>
              <Button variant="primary" className="rounded-pill px-4 fw-black" onClick={handleRename}>GUARDAR</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Mover */}
      {showMoveModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-100" style={{background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'}}>
          <div className="bg-surface p-4 rounded-4 shadow-lg animate-slide-up border border-subtle" style={{width: '400px'}}>
            <h5 className="fw-black uppercase small tracking-widest text-primary mb-3">Mover a...</h5>
            <Form.Group className="mb-3">
              <Form.Label className="x-tiny fw-bold text-label">Seleccionar Carpeta Destino</Form.Label>
              <Form.Select 
                value={targetFolderId || ""} 
                onChange={(e) => setTargetFolderId(e.target.value)}
                className="rounded-3 border-subtle bg-surface-raised text-primary"
              >
                <option value="root">Raíz de la Librería</option>
                {pages.filter(p => p.is_folder && p.id !== actionPage?.id).map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <div className="d-flex gap-2 justify-content-end">
              <Button variant="light" className="rounded-pill px-4 fw-bold text-secondary" onClick={() => setShowMoveModal(false)}>CANCELAR</Button>
              <Button variant="primary" className="rounded-pill px-4 fw-black" onClick={handleMove}>MOVER</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Importar Archivo */}
      {showUploadModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-100" style={{background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'}}>
          <div className="bg-surface p-4 rounded-4 shadow-lg animate-slide-up border border-subtle" style={{width: '500px'}}>
            <h5 className="fw-black uppercase small tracking-widest text-success mb-3">Importar Manual</h5>
            <div className="border-2 border-dashed border-subtle p-5 rounded-4 text-center mb-4 cursor-pointer hover-bg-muted transition-all" onClick={() => fileInputRef.current?.click()}>
              <Upload size={40} className="text-success opacity-50 mb-2" />
              <div className="fw-bold text-secondary">Click para seleccionar archivo</div>
              <div className="x-tiny text-tertiary uppercase mt-1">Soporta .docx, .doc, .pdf</div>
              <input type="file" ref={fileInputRef} className="d-none" accept=".docx,.doc,.pdf" onChange={handleUploadFile} />
            </div>
            <div className="d-flex justify-content-center">
              <Button variant="light" className="rounded-pill px-4 fw-bold text-secondary" onClick={() => setShowUploadModal(false)}>CERRAR</Button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
