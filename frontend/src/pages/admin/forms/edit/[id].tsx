import { sanitizeId } from "../../../utils/security";
import { sanitizeParam } from "../../utils/security";
import React, { useState, useEffect } from 'react';
import Layout from '../../../../components/Layout';
import { Card, Row, Col, Form, Button, Badge, Spinner } from 'react-bootstrap';
import { Trash2, GripVertical, Save, Eye, Settings2, PlusSquare, ArrowLeft } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { useRouter } from 'next/router';
import api from '../../../../lib/api';

export default function FormBuilder() {
  const router = useRouter();
  const { id } = router.query;
  if (!id || typeof id !== "string" || !/^[a-zA-Z0-9-]+$/.test(id)) return null;
  const { theme } = useTheme();
  
  const [formName, setFormName] = useState('');
  const [category, setCategory] = useState('general');
  const [automationRules, setAutomationRules] = useState<any>({ type: 'none' });
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchForm();
    } else if (id === 'new') {
      setFormName('Nueva Plantilla');
      setFields([{ id: '1', label: 'Descripción del Incidente', type: 'textarea', required: true }]);
      setLoading(false);
    }
  }, [id]);

  const fetchForm = async () => {
    try {
      const res = await api.get(encodeURI(`/forms/${(id)}`));
      setFormName(res.data.name);
      setCategory(res.data.category || 'general');
      setAutomationRules(res.data.automation_rules || { type: 'none' });
      if (res.data.fields_schema && res.data.fields_schema.fields) {
        setFields(res.data.fields_schema.fields);
      } else {
        setFields([]);
      }
    } catch (e) {
      console.error('Error fetching form:', e);
    } finally {
      setLoading(false);
    }
  };

  const addField = (type: string) => {
    const newField = { 
      id: Math.random().toString(36).substr(2, 9), 
      label: 'Nuevo Campo', 
      type, 
      required: false,
      options: type === 'select' ? ['Opción 1', 'Opción 2'] : undefined
    };
    setFields([...fields, newField]);
  };

  const removeField = (fieldId: string) => setFields(fields.filter(f => f.id !== fieldId));
  const updateField = (fieldId: string, key: string, value: any) => setFields(fields.map(f => f.id === fieldId ? { ...f, [key]: value } : f));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { 
        name: formName, 
        category: category,
        automation_rules: automationRules,
        fields_schema: { fields: fields }
      };
      if (id === 'new') {
        await api.post('/admin/forms', payload);
      } else {
        await api.patch(`/forms/${(id)}`, payload);
      }
      router.push('/admin/forms');
    } catch (e) {
      console.error(e);
      alert('Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout title="Cargando Diseñador..."><div className="text-center py-5"><Spinner animation="border" /></div></Layout>;

  return (
    <Layout title="Form Architecture">
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div className="d-flex align-items-center">
          <Button variant="link" className="text-body p-0 me-3" onClick={() => router.push('/admin/forms')}>
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h4 className="fw-black text-uppercase m-0">Interface Designer</h4>
            <p className="text-muted small m-0 uppercase tracking-widest fw-bold opacity-75">Schema Definition Layer: {id}</p>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" size="sm" onClick={() => setPreview(!preview)} className="fw-bold small">
            {preview ? <Settings2 size={14} className="me-2" /> : <Eye size={14} className="me-2" />} 
            {preview ? 'DESIGN' : 'PREVIEW'}
          </Button>
          <Button variant="primary" size="sm" className="fw-bold small px-4" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" className="me-2" /> : <Save size={14} className="me-2"/>} SAVE SCHEMA
          </Button>
        </div>
      </div>

      <Row className="g-4">
        {!preview ? (
          <>
            <Col lg={8}>
              <Card className="border-0 shadow-sm mb-4">
                <div className="p-4 border-bottom ">
                  <Form.Label className="x-small fw-bold text-muted uppercase mb-2">Schema Identity</Form.Label>
                  <Form.Control 
                    size="lg" value={formName} onChange={(e) => setFormName(e.target.value)}
                    className="bg-transparent border-0 fw-black p-0" placeholder="Form Name..."
                  />
                </div>
                <Card.Body className="p-4">
                  {fields.map((field) => (
                    <div key={field.id} className="mb-3 p-4 rounded border ">
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <GripVertical className="text-muted opacity-20" size={20}/>
                        <div className="flex-grow-1">
                          <Form.Control size="sm" className="bg-transparent border-0 fw-bold p-0 mb-1 fs-5" value={field.label} onChange={(e) => updateField(field.id, 'label', e.target.value)} />
                          <div className="d-flex gap-2">
                            <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-20 fw-bold" style={{fontSize: '9px'}}>{field.type.toUpperCase()}</Badge>
                            <Form.Check type="checkbox" label={<span className="x-small fw-bold text-muted">Required</span>} checked={field.required} onChange={(e) => updateField(field.id, 'required', e.target.checked)} />
                          </div>
                        </div>
                        <Button variant="link" className="text-danger p-0" onClick={() => removeField(field.id)}><Trash2 size={18} /></Button>
                      </div>

                      {field.type === 'select' && (
                        <div className="ms-5 p-3 bg-opacity-10 rounded border  ">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <Form.Label className="x-small fw-bold text-muted uppercase m-0">Selector Options</Form.Label>
                            <Button variant="link" size="sm" className="p-0 x-small fw-bold text-primary text-decoration-none" onClick={() => {
                              const newOptions = [...(field.options || []), 'Nueva Opción'];
                              updateField(field.id, 'options', newOptions);
                            }}>+ ADD OPTION</Button>
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            {(field.options || []).map((opt: string, optIdx: number) => (
                              <div key={optIdx} className="d-flex align-items-center bg-opacity-10 rounded-pill px-2 py-1 border  ">
                                <input 
                                  className="bg-transparent border-0 x-small fw-bold text-body" 
                                  style={{width: '100px', outline: 'none'}} 
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...field.options];
                                    newOpts[optIdx] = e.target.value;
                                    updateField(field.id, 'options', newOpts);
                                  }}
                                />
                                <Trash2 size={10} className="text-danger cursor-pointer ms-1" onClick={() => {
                                  updateField(field.id, 'options', field.options.filter((_: any, i: number) => i !== optIdx));
                                }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="mt-4 p-4 border-2 border-dashed rounded text-center text-muted small fw-bold">Arrastra o añade elementos de la paleta</div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="border-0 shadow-sm sticky-top mb-4" style={{top: '80px'}}>
                <div className="p-3 border-bottom ">
                  <h6 className="fw-bold m-0 small uppercase">Propiedades del Formulario</h6>
                </div>
                <Card.Body className="p-3">
                  <Form.Group className="mb-3">
                    <Form.Label className="x-small fw-bold text-muted uppercase">Propósito (Categoría)</Form.Label>
                    <Form.Select size="sm" value={category} onChange={(e) => setCategory(e.target.value)} className="fw-bold">
                      <option value="general">📄 GENERAL / LIBRE</option>
                      <option value="ticket_creation">🎫 CREACIÓN DE TICKETS</option>
                      <option value="asset_installation">🖥️ INSTALACIÓN DE EQUIPOS</option>
                      <option value="security_audit">🛡️ AUDITORÍA DE SEGURIDAD</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group>
                    <Form.Label className="x-small fw-bold text-muted uppercase">Automatización</Form.Label>
                    <Form.Select 
                      size="sm" 
                      value={automationRules.type} 
                      onChange={(e) => setAutomationRules({ ...automationRules, type: e.target.value })} 
                      className="fw-bold"
                    >
                      <option value="none">NINGUNA (Solo guardar datos)</option>
                      <option value="ticket_standard">CREAR TICKET ESTÁNDAR</option>
                      <option value="multi_device_installation">INSTALACIÓN MÚLTIPLE DE EQUIPOS</option>
                    </Form.Select>
                    {automationRules.type !== 'none' && (
                      <div className="mt-2 p-2 bg-success bg-opacity-10 border border-success border-opacity-20 rounded">
                        <p className="x-small fw-bold text-success m-0">✓ Este formulario activará flujos de trabajo automáticos al ser enviado.</p>
                      </div>
                    )}
                  </Form.Group>
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm sticky-top" style={{top: '320px'}}>
                <div className="p-3 border-bottom ">
                  <h6 className="fw-bold m-0 small uppercase">Paleta de Campos</h6>
                </div>
                <Card.Body className="p-3">
                  <div className="d-grid gap-2">
                    {[
                      { t: 'text', n: 'TEXTO CORTO' },
                      { t: 'textarea', n: 'PÁRRAFO' },
                      { t: 'select', n: 'SELECTOR (OPCIONES)' },
                      { t: 'date', n: 'FECHA' },
                      { t: 'number', n: 'NÚMERO' }
                    ].map(item => (
                      <Button key={item.t} variant="outline-primary" size="sm" className="text-start fw-bold" onClick={() => addField(item.t)}>{item.n}</Button>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </>
        ) : (
          <Col lg={12}>
            <Card className="border-0 shadow-sm max-width-md mx-auto" style={{maxWidth: '800px'}}>
              <Card.Body className="p-5">
                <h3 className="fw-black mb-5 text-uppercase text-center">{formName}</h3>
                <Form>
                  {fields.map(field => (
                    <Form.Group key={field.id} className="mb-4">
                      <Form.Label className="x-small fw-bold text-muted uppercase">{field.label}</Form.Label>
                      <Form.Control as={field.type === 'textarea' ? 'textarea' : 'input'} type={field.type !== 'textarea' ? field.type : undefined} className="" />
                    </Form.Group>
                  ))}
                </Form>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
      <style jsx>{'.fw-black { font-weight: 900; }.x-small { font-size: 10px; }'}</style>
    </Layout>
  );
}
