import React, { useEffect, useState } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import api from '../../lib/api';

interface DynamicFieldProps {
 field: any;
 value: any;
 onChange: (val: any) => void;
}

export const DynamicFormField: React.FC<DynamicFieldProps> = ({ field, value, onChange }) => {
 const [options, setOptions] = useState<any[]>(field.options || []);
 const [loading, setLoading] = useState(false);

 useEffect(() => {
  // Si el campo es un selector dinámico (ej: 'source': 'assets')
  if (field.type === 'select' && field.data_source) {
   setLoading(true);
   api.get(`/${field.data_source}`)
    .then(res => {
     const formatted = res.data.map((item: any) => ({
      label: item.name || item.hostname || item.title,
      value: item.id
     }));
     setOptions(formatted);
    })
    .catch(err => console.error('Error loading dynamic options:', err))
    .finally(() => setLoading(false));
  }
 }, [field.data_source]);

 const fieldId = `dynamic-field-${field.id || field.name}`;

 if (field.type === 'select') {
  return (
   <Form.Group className="mb-3" controlId={fieldId}>
    <Form.Label className="x-small fw-bold text-muted uppercase tracking-wider">{field.label}</Form.Label>
    <Form.Select 
     id={fieldId}
     name={field.name}
     className="bg-black  shadow-none"
     value={value || ''}
     onChange={(e) => onChange(e.target.value)}
     disabled={loading}
    >
     <option value="">-- Seleccionar --</option>
     {options.map((opt, i) => (
      <option key={i} value={opt.value}>{opt.label}</option>
     ))}
    </Form.Select>
    {loading && <small className="text-primary x-small">Cargando datos...</small>}
   </Form.Group>
  );
 }

 // Otros tipos de campos... (text, textarea, etc)
 return (
  <Form.Group className="mb-3" controlId={fieldId}>
   <Form.Label className="x-small fw-bold text-muted uppercase tracking-wider">{field.label}</Form.Label>
   <Form.Control 
    id={fieldId}
    name={field.name}
    type={field.type === 'number' ? 'number' : 'text'}
    as={field.type === 'textarea' ? 'textarea' : 'input'}
    rows={field.type === 'textarea' ? 3 : 1}
    className="bg-black  shadow-none"
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
   />
  </Form.Group>
 );
};
