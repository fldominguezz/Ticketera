import React, { useState } from 'react';
import Layout from '../../../components/Layout';
import { Card, Row, Col, Form, Button, Badge } from 'react-bootstrap';
import { Trash2, GripVertical, Save, Eye, Settings2, PlusSquare } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

export default function FormBuilder() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [formName, setFormName] = useState('Nuevo Formulario Operativo');
    const [fields, setFields] = useState<any[]>([
        { id: '1', label: 'Motivo de la Solicitud', type: 'text', required: true },
    ]);
    const [preview, setPreview] = useState(false);

    const addField = (type: string) => {
        setFields([...fields, { id: Math.random().toString(36).substr(2, 9), label: 'Nuevo Campo', type, required: false }]);
    };

    const removeField = (id: string) => setFields(fields.filter(f => f.id !== id));
    const updateField = (id: string, key: string, value: any) => setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));

    return (
        <Layout title="Form Architecture">
            <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <h4 className="fw-black text-uppercase m-0">Interface Designer</h4>
                    <p className="text-muted small m-0 uppercase tracking-widest fw-bold opacity-75">Schema Definition Layer</p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant={isDark ? "outline-light" : "outline-dark"} size="sm" onClick={() => setPreview(!preview)} className="fw-bold small">
                        {preview ? <Settings2 size={14} className="me-2" /> : <Eye size={14} className="me-2" />} 
                        {preview ? 'DESIGN' : 'PREVIEW'}
                    </Button>
                    <Button variant="primary" size="sm" className="fw-bold small">
                        <Save size={14} className="me-2"/> SAVE
                    </Button>
                </div>
            </div>

            <Row className="g-4">
                {!preview ? (
                    <>
                        <Col lg={8}>
                            <Card className="border-0 shadow-sm mb-4">
                                <div className={`p-4 border-bottom border-opacity-10 ${isDark ? 'bg-white bg-opacity-5' : 'bg-light'}`}>
                                    <Form.Label className="x-small fw-bold text-muted uppercase mb-2">Schema Identity</Form.Label>
                                    <Form.Control 
                                        size="lg" value={formName} onChange={(e) => setFormName(e.target.value)}
                                        className="bg-transparent border-0 fw-black p-0" placeholder="Form Name..."
                                    />
                                </div>
                                <Card.Body className="p-4">
                                    {fields.map((field) => (
                                        <div key={field.id} className={`mb-3 p-3 rounded d-flex align-items-center gap-3 border border-opacity-10 ${isDark ? 'bg-dark bg-opacity-50' : 'bg-light'}`}>
                                            <GripVertical className="text-muted opacity-20" size={20}/>
                                            <div className="flex-grow-1">
                                                <Form.Control size="sm" className="bg-transparent border-0 fw-bold p-0 mb-1" value={field.label} onChange={(e) => updateField(field.id, 'label', e.target.value)} />
                                                <div className="d-flex gap-2">
                                                    <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-20 fw-bold" style={{fontSize: '8px'}}>{field.type.toUpperCase()}</Badge>
                                                    <Form.Check type="checkbox" label={<span className="x-small fw-bold text-muted">Required</span>} checked={field.required} onChange={(e) => updateField(field.id, 'required', e.target.checked)} />
                                                </div>
                                            </div>
                                            <Button variant="link" className="text-danger p-0" onClick={() => removeField(field.id)}><Trash2 size={18} /></Button>
                                        </div>
                                    ))}
                                    <div className="mt-4 p-4 border-2 border-dashed border-opacity-10 rounded text-center text-muted small fw-bold">Select element from palette</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={4}>
                            <Card className="border-0 shadow-sm sticky-top" style={{top: '80px'}}>
                                <div className={`p-3 border-bottom border-opacity-10 ${isDark ? 'bg-white bg-opacity-5' : 'bg-light'}`}>
                                    <h6 className="fw-bold m-0 small uppercase">Palette</h6>
                                </div>
                                <Card.Body className="p-3">
                                    <div className="d-grid gap-2">
                                        {['text', 'textarea', 'select', 'date'].map(t => (
                                            <Button key={t} variant={isDark ? "dark" : "outline-secondary"} size="sm" className="text-start border-opacity-10 fw-bold" onClick={() => addField(t)}>{t.toUpperCase()}</Button>
                                        ))}
                                        <div className="mt-3 p-3 bg-primary bg-opacity-5 border border-primary border-opacity-10 rounded">
                                            <div className="text-primary x-small fw-bold mb-2 uppercase">Core SOC</div>
                                            <Button variant="primary" size="sm" className="w-100 fw-bold small" onClick={() => addField('multi-team')}><PlusSquare size={14} className="me-2" /> TEAM_GROUP</Button>
                                        </div>
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
                                            <Form.Control as={field.type === 'textarea' ? 'textarea' : 'input'} type={field.type !== 'textarea' ? field.type : undefined} className={isDark ? 'bg-dark border-opacity-10' : ''} />
                                        </Form.Group>
                                    ))}
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                )}
            </Row>
            <style jsx>{`.fw-black { font-weight: 900; }.x-small { font-size: 10px; }`}</style>
        </Layout>
    );
}
