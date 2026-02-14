import { sanitizeId } from "../../../utils/security";
import { sanitizeParam } from "../../utils/security";
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { Send, CheckCircle } from 'lucide-react';

export default function FormRenderPage() {
 const router = useRouter();
 const { id } = router.query;
 
 const [formDef, setFormDef] = useState<any>(null);
 const [formData, setFormData] = useState<any>({});
 const [submitting, setSubmitting] = useState(false);
 const [submitted, setSubmitted] = useState(false);
 const [error, setError] = useState('');

 useEffect(() => {
  const token = localStorage.getItem('access_token');
  if (!token) {
   router.push('/login');
  } else if (id) {
   fetchForm(token, id as string);
  }
 }, [router, id]);

 const fetchForm = async (token: string, formId: string) => {
  try {
   const res = await fetch('/api/v1/forms', { headers: { 'Authorization': `Bearer ${token}` } });
   if (res.ok) {
    const allForms = await res.json();
    const found = allForms.find((f: any) => f.id === formId);
    if (found) setFormDef(found);
    else setError('Form not found');
   }
  } catch (e) { console.error(e); setError('Error loading form'); }
 };

 const handleInputChange = (fieldId: string, value: any) => {
  setFormData({ ...formData, [fieldId]: value });
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch(`/api/v1/forms/${(id)}/submit`, {
    method: 'POST',
    headers: {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
   });
   if (res.ok) setSubmitted(true);
   else setError('Failed to submit form');
  } catch (e) { setError('Connection error'); }
  finally { setSubmitting(false); }
 };

 if (submitted) {
  return (
   <Container className="mt-5 text-center">
    <CheckCircle size={64} className="text-success mb-4" />
    <h1 className="fw-bold">Submission Successful</h1>
    <p className="text-muted">Your request has been received and a ticket has been created.</p>
    <Button variant="primary" onClick={() => router.push('/tickets')}>Go to My Tickets</Button>
   </Container>
  );
 }

 return (
  <>
   <Head><title>{formDef?.name || 'Form'} - Ticketera</title></Head>
   
   <Container className="mt-4 mb-5">
    <Row className="justify-content-center">
     <Col lg={8}>
      <Card className="shadow-sm border-0">
       <Card.Header className="bg-primary py-3">
        <h4 className="mb-0 fw-bold">{formDef?.name || 'Loading Form...'}</h4>
        <p className="mb-0 small opacity-75">{formDef?.description}</p>
       </Card.Header>
       <Card.Body className="p-4">
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
         {Array.isArray(formDef?.schema?.fields) && formDef.schema.fields.map((field: any) => (
          <Form.Group key={field.id} className="mb-4" controlId={`dynamic-field-${field.id}`}>
           <Form.Label className="fw-bold small">
            {field.label} {field.required && <span className="text-danger">*</span>}
           </Form.Label>
           
           {field.type === 'textarea' ? (
            <Form.Control 
             as="textarea" rows={3} 
             name={`field_${field.id}`}
             required={field.required}
             onChange={e => handleInputChange(field.id, e.target.value)}
            />
           ) : field.type === 'select' ? (
            <Form.Select 
             name={`field_${field.id}`}
             required={field.required}
             onChange={e => handleInputChange(field.id, e.target.value)}
            >
             <option value="">Select an option...</option>
             {Array.isArray(field.options) && field.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </Form.Select>
           ) : (
            <Form.Control 
             type={field.type} 
             name={`field_${field.id}`}
             required={field.required}
             onChange={e => handleInputChange(field.id, e.target.value)}
            />
           )}
          </Form.Group>
         ))}
         
         <div className="d-grid mt-5">
          <Button variant="primary" size="lg" type="submit" disabled={submitting || !formDef}>
           <Send size={18} className="me-2" /> {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
         </div>
        </Form>
       </Card.Body>
      </Card>
     </Col>
    </Row>
   </Container>
  </>
 );
}
