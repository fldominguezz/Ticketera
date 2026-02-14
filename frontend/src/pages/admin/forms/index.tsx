import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { Card, Row, Col, Button, Spinner, Table, Badge, Alert, Modal, Form } from 'react-bootstrap';
import { FileText, Copy, Trash2, Edit, Plus, AlertTriangle, ShieldCheck, CheckCircle, XCircle } from 'lucide-react';
import api from '../../../lib/api';
import Link from 'next/link';

const FormsManagement = () => {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const res = await api.get('/forms');
      setForms(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleClone = async (id: string) => {
    setCloning(id);
    setError(null);
    try {
      await api.post(`/forms/${id}/clone`);
      await fetchForms();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al clonar formulario');
    } finally {
      setCloning(null);
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('¿Desea publicar esta plantilla en PRODUCCIÓN? Esto desactivará la versión anterior.')) return;
    setError(null);
    try {
      await api.post(`/forms/${id}/publish`);
      await fetchForms();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al publicar');
    }
  };

  const handleToggleActive = async (form: any) => {
    setError(null);
    try {
      await api.patch(`/forms/${form.id}`, { is_active: !form.is_active });
      await fetchForms();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al actualizar estado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla? Los borradores no se pueden recuperar.')) return;
    try {
      await api.delete(`/forms/${id}`);
      await fetchForms();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al eliminar');
    }
  };

  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;

  return (
    <Layout title="Gestión de Plantillas">
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h1 className="fw-bold h2 mb-1">Plantillas de Formularios</h1>
          <p className="text-muted">Personaliza los campos para Tickets e Inventario.</p>
        </div>
        <Link href="/admin/forms/edit/new">
          <Button variant="primary" className="rounded-pill px-4 fw-bold shadow-sm">
            <Plus size={18} className="me-2" /> Nueva Plantilla
          </Button>
        </Link>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError(null)} className="shadow-sm border-0">
        <AlertTriangle size={20} className="me-2" /> {error}
      </Alert>}

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table responsive hover className="mb-0">
          <thead>
            <tr className="bg-surface-muted">
              <th className="border-0 small text-muted text-uppercase px-4 py-3">Nombre</th>
              <th className="border-0 small text-muted text-uppercase py-3">Categoría</th>
              <th className="border-0 small text-muted text-uppercase py-3">Estado</th>
              <th className="border-0 small text-muted text-uppercase py-3 text-center">Producción</th>
              <th className="border-0 small text-muted text-uppercase py-3 text-end px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {forms.length > 0 ? forms.map((f) => (
              <tr key={f.id} className="align-middle border-color">
                <td className="px-4">
                  <div className="d-flex align-items-center">
                    <div className={`p-2 rounded bg-opacity-10 me-3 ${f.is_active ? 'bg-success' : 'bg-secondary'}`}>
                      <FileText size={18} className={f.is_active ? 'text-success' : 'text-secondary'} />
                    </div>
                    <div>
                      <div className="fw-bold small text-body">{f.name}</div>
                      <div className="x-small text-muted">Versión {f.version}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <Badge bg="secondary" className="bg-opacity-10 text-body border fw-normal text-uppercase px-2">
                    {f.category || 'Sin Categoría'}
                  </Badge>
                </td>
                <td>
                  <div className="form-check form-switch">
                    <input 
                      className="form-check-input cursor-pointer" 
                      type="checkbox" 
                      checked={f.is_active}
                      onChange={() => handleToggleActive(f)}
                    />
                    <label className="small text-muted">{f.is_active ? 'Activa' : 'Desactivada'}</label>
                  </div>
                </td>
                <td className="text-center">
                  {f.is_production ? (
                    <Badge bg="primary" className="rounded-pill p-1 shadow-sm" title="Esta plantilla está en producción">
                      <ShieldCheck size={16} className="me-1" /> PROD
                    </Badge>
                  ) : (
                    <Badge bg="secondary" className="bg-opacity-10 text-muted border fw-normal">Borrador</Badge>
                  )}
                </td>
                <td className="text-end px-4">
                  <div className="d-flex justify-content-end gap-1">
                    {!f.is_production && (
                      <Button 
                        variant="link" 
                        className="p-1 text-success" 
                        onClick={() => handlePublish(f.id)}
                        title="Publicar en PRODUCCIÓN"
                      >
                        <CheckCircle size={18} />
                      </Button>
                    )}

                    <Button 
                      variant="link" 
                      className="p-1 text-primary" 
                      onClick={() => handleClone(f.id)}
                      disabled={cloning === f.id}
                      title="Clonar plantilla"
                    >
                      {cloning === f.id ? <Spinner animation="border" size="sm" /> : <Copy size={18} />}
                    </Button>
                    
                    <Link href={`/admin/forms/edit/${f.id}`}>
                      <Button 
                        variant="link" 
                        className={`p-1 ${f.is_production && f.is_active ? 'text-muted opacity-50' : 'text-info'}`}
                        disabled={f.is_production && f.is_active}
                        title={f.is_production && f.is_active ? 'Desactive para editar campos' : 'Editar campos'}
                      >
                        <Edit size={18} />
                      </Button>
                    </Link>

                    {!f.is_production && (
                      <Button 
                        variant="link" 
                        className="p-1 text-danger" 
                        onClick={() => handleDelete(f.id)}
                        title="Eliminar borrador"
                      >
                        <Trash2 size={18} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="text-center py-5 text-muted">No hay plantillas creadas</td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>

      <div className="mt-4">
        <Alert variant="info" className="border-0 shadow-sm small">
          <h6 className="fw-bold"><ShieldCheck size={16} className="me-2" /> Reglas de Protección</h6>
          <ul className="mb-0">
            <li>Las plantillas marcadas como <strong>PROD</strong> no pueden ser editadas mientras estén activas.</li>
            <li>Para modificar una plantilla de producción, debe clonarla, realizar los cambios en el borrador y luego activarla (esto desactivará automáticamente la anterior).</li>
            <li>Siempre debe existir al menos una plantilla activa por cada categoría obligatoria.</li>
          </ul>
        </Alert>
      </div>

      <style jsx>{`
        .cursor-pointer { cursor: pointer; }
        .x-small { font-size: 11px; }
      `}</style>
    </Layout>
  );
};

export default FormsManagement;