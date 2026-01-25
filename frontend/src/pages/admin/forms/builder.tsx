import React, { useState } from 'react';
import Layout from '../../../components/Layout';
import { Card, Row, Col, Form, Button, Badge, Table, ListGroup } from 'react-bootstrap';
import { Plus, Trash2, GripVertical, Save, Eye, Settings2, PlusSquare } from 'lucide-react';

export default function FormBuilder() {
    const [formName, setFormName] = useState('Nuevo Formulario Operativo');
    const [fields, setFields] = useState<any[]>([
        { id: '1', label: 'Motivo de la Solicitud', type: 'text', required: true },
    ]);
    const [preview, setPreview] = useState(false);

    const addField = (type: string) => {
        const newField = {
            id: Math.random().toString(36).substr(2, 9),
            label: 'Nuevo Campo',
            type: type,
            required: false
        };
        setFields([...fields, newField]);
    };

    const removeField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const updateField = (id: string, key: string, value: any) => {
        setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    return (
        <Layout title="Form Architecture">
            <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <h4 className="fw-black text-uppercase m-0">Interface Designer</h4>
                    <p className="text-muted small m-0 uppercase tracking-widest fw-bold">Telemetry Schema Definition</p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="outline-primary" size="sm" onClick={() => setPreview(!preview)} className="fw-black small uppercase">
                        {preview ? <Settings2 size={14} className="me-2" /> : <Eye size={14} className="me-2" />} 
                        {preview ? 'DESIGN_MODE' : 'PREVIEW_UI'}
                    </Button>
                    <Button variant="primary" size="sm" className="fw-black small uppercase">
                        <Save size={14} className="me-2"/> SAVE_VERSION
                    </Button>
                </div>
            </div>

            <Row className="g-4">
                {!preview ? (
                    <>
                        <Col lg={8}>
                            <Card className="border-0 shadow-sm bg-card mb-4">
                                <div className="p-4 border-bottom border-white border-opacity-5 bg-white bg-opacity-2">
                                    <Form.Label className="x-small fw-black text-muted uppercase mb-2">Schema Identity</Form.Label>
                                    <Form.Control 
                                        size="lg" 
                                        value={formName} 
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="bg-transparent border-0 text-white fw-black p-0"
                                        placeholder="Form Name..."
                                    />
                                </div>
                                <Card.Body className="p-4">
                                    <div className="fields-container">
                                        {fields.map((field) => (
                                            <div key={field.id} className="mb-3 p-3 bg-dark bg-opacity-50 border border-white border-opacity-5 rounded d-flex align-items-center gap-3">
                                                <GripVertical className="text-muted opacity-20" size={20}/>
                                                <div className="flex-grow-1">
                                                    <Form.Control 
                                                        size="sm"
                                                        className="bg-transparent border-0 text-white fw-bold p-0 mb-1"
                                                        value={field.label}
                                                        onChange={(e) => updateField(field.id, 'label', e.target.value)}
                                                    />
                                                    <div className="d-flex gap-2">
                                                        <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-20 fw-black uppercase" style={{fontSize: '8px'}}>{field.type}</Badge>
                                                        <Form.Check 
                                                            type="checkbox" 
                                                            label={<span className="x-small fw-bold text-muted uppercase">Required</span>}
                                                            className="small"
                                                            checked={field.required}
                                                            onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                                                        />
                                                    </div>
                                                </div>
                                                <Button variant="link" className="text-danger p-0" onClick={() => removeField(field.id)}>
                                                    <Trash2 size={18} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 p-4 border border-2 border-dashed border-white border-opacity-5 rounded text-center">
                                        <p className="text-muted x-small uppercase m-0 fw-bold">Select element from palette to extend schema</p>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={4}>
                            <Card className="border-0 shadow-sm bg-card sticky-top" style={{top: '80px'}}>
                                <div className="p-3 border-bottom border-white border-opacity-5 bg-white bg-opacity-2">
                                    <h6 className="fw-black m-0 small uppercase">Element Palette</h6>
                                </div>
                                <Card.Body className="p-3">
                                    <div className="d-grid gap-2">
                                        <Button variant="dark" size="sm" className="text-start border-white border-opacity-5 small fw-bold" onClick={() => addField('text')}>SHORT_TEXT</Button>
                                        <Button variant="dark" size="sm" className="text-start border-white border-opacity-5 small fw-bold" onClick={() => addField('textarea')}>LONG_TEXT_AREA</Button>
                                        <Button variant="dark" size="sm" className="text-start border-white border-opacity-5 small fw-bold" onClick={() => addField('select')}>DROPDOWN_SELECT</Button>
                                        <Button variant="dark" size="sm" className="text-start border-white border-opacity-5 small fw-bold" onClick={() => addField('date')}>DATE_SELECTOR</Button>
                                        
                                        <div className="mt-3 p-3 bg-primary bg-opacity-5 border border-primary border-opacity-10 rounded">
                                            <div className="text-primary x-small fw-black mb-2 uppercase">SOC_ADVANCED</div>
                                            <Button variant="primary" size="sm" className="w-100 fw-black small" onClick={() => addField('multi-team')}>
                                                <PlusSquare size={14} className="me-2" /> MULTI_TEAM_GROUP
                                            </Button>
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </>
                ) : (
                    <Col lg={12}>
                        <Card className="border-0 shadow-sm bg-card max-width-md mx-auto" style={{maxWidth: '800px'}}>
                            <Card.Body className="p-5">
                                <h3 className="fw-black mb-5 text-uppercase text-center">{formName}</h3>
                                <Form>
                                    {fields.map(field => (
                                        <Form.Group key={field.id} className="mb-4">
                                            <Form.Label className="x-small fw-black text-muted uppercase">
                                                {field.label} {field.required && <span className="text-danger">*</span>}
                                            </Form.Label>
                                            {field.type === 'textarea' ? (
                                                <Form.Control as="textarea" rows={3} className="bg-dark border-white border-opacity-10 text-white" />
                                            ) : (
                                                <Form.Control type={field.type} className="bg-dark border-white border-opacity-10 text-white" />
                                            )}
                                        </Form.Group>
                                    ))}
                                    <div className="d-grid mt-5">
                                        <Button variant="primary" size="lg" className="fw-black uppercase tracking-widest">Submit Telemetry</Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                )}
            </Row>
            <style jsx>{`
                .fw-black { font-weight: 900; }
                .x-small { font-size: 10px; }
                .bg-card { background-color: #0c1016 !important; }
            `}</style>
        </Layout>
    );
}