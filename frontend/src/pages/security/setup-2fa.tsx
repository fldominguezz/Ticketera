import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Container, Card, Button, Form, Alert, Row, Col, ListGroup, Spinner } from 'react-bootstrap';
import { ShieldCheck, ArrowLeft, Copy, CheckCircle, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';

export default function Setup2FAPage() {
 const router = useRouter();
 const { refreshUser } = useAuth();
 const [step, setStep] = useState(1);
 const [loading, setLoading] = useState(false);
 const [setupData, setSetupData] = useState<any>(null);
 const [totpCode, setTotpCode] = useState('');
 const [error, setError] = useState<string | null>(null);
 const [success, setSuccess] = useState(false);

 useEffect(() => {
  initiateSetup();
 }, []);

 const initiateSetup = async () => {
  setLoading(true);
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch('/api/v1/users/me/2fa/setup', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
   });
   if (res.ok) {
    setSetupData(await res.json());
   } else {
    setError('No se pudo iniciar la configuración de 2FA.');
   }
  } catch (err) {
   setError('Error de conexión con el servidor.');
  } finally {
   setLoading(false);
  }
 };

 const handleVerifyAndEnable = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  const token = localStorage.getItem('access_token');
  try {
   const res = await fetch('/api/v1/users/me/2fa/enable', {
    method: 'POST',
    headers: { 
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
    },
    body: JSON.stringify({ totp_code: totpCode })
   });
   if (res.ok) {
    setSuccess(true);
    setStep(3);
    await refreshUser();
   } else {
    const data = await res.json();
    setError(data.detail || 'Código inválido. Intente de nuevo.');
   }
  } catch (err) {
   setError('Error al verificar el código.');
  } finally {
   setLoading(false);
  }
 };

 const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  alert('Copiado al portapapeles');
 };

 return (
  <Layout title="Configurar 2FA">
   <Container className="py-4">
    <div className="max-width-md mx-auto">
     <Button variant="link" onClick={() => router.push('/profile')} className="p-0 mb-4 text-decoration-none">
      <ArrowLeft size={20} className="me-2" /> Volver al Perfil
     </Button>

     <Card className="border-0 shadow-sm overflow-hidden">
      <div className="bg-primary p-4 text-center">
       <ShieldCheck size={48} className="mb-3" />
       <h4 className="fw-bold mb-0">Autenticación de Dos Factores</h4>
      </div>
      <Card.Body className="p-4 p-md-5">
       
       {step === 1 && (
        <div className="text-center">
         <Smartphone size={40} className="text-primary mb-3" />
         <h5 className="fw-bold">Paso 1: Escanear el código QR</h5>
         <p className="text-muted small mb-4">
          Abre tu aplicación de autenticación (Google Authenticator, Authy, Microsoft Authenticator) 
          y escanea el siguiente código QR.
         </p>
         
         {loading ? (
          <Spinner animation="border" variant="primary" />
         ) : setupData ? (
          <div className="bg-white p-3 d-inline-block border rounded mb-4 shadow-sm">
           <QRCodeSVG value={setupData.provisioning_uri} size={200} />
          </div>
         ) : null}

         <div className="text-start p-3 rounded mb-4">
          <div className="small fw-bold text-muted mb-1 text-uppercase">O ingresa la clave manualmente:</div>
          <div className="d-flex justify-content-between align-items-center">
           <code className="fs-5">{setupData?.secret}</code>
           <Button variant="link" size="sm" onClick={() => copyToClipboard(setupData?.secret)}><Copy size={16} /></Button>
          </div>
         </div>

         <Button variant="primary" className="w-100 py-3 fw-bold" onClick={() => setStep(2)}>Siguiente: Verificar Código</Button>
        </div>
       )}

       {step === 2 && (
        <div>
         <h5 className="fw-bold text-center mb-3">Paso 2: Confirmar Activación</h5>
         <p className="text-muted small text-center mb-4">
          Ingresa el código de 6 dígitos que aparece en tu aplicación para confirmar que la configuración es correcta.
         </p>

         {error && <Alert variant="danger" className="small py-2">{error}</Alert>}

         <Form onSubmit={handleVerifyAndEnable}>
          <Form.Group className="mb-4" controlId="totp-input-field">
           <Form.Label className="small fw-bold">Código de Verificación</Form.Label>
           <Form.Control 
            type="text" 
            name="totp_code"
            placeholder="000000" 
            size="lg"
            className="text-center fw-bold letter-spacing-lg"
            maxLength={6}
            value={totpCode}
            onChange={e => setTotpCode(e.target.value)}
            autoFocus
            required
           />
          </Form.Group>
          <div className="d-grid gap-2">
           <Button variant="primary" size="lg" type="submit" disabled={loading || totpCode.length < 6}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Activar 2FA'}
           </Button>
           <Button variant="link" className="text-muted" onClick={() => setStep(1)}>Volver a ver QR</Button>
          </div>
         </Form>
        </div>
       )}

       {step === 3 && (
        <div className="text-center">
         <CheckCircle size={64} className="text-success mb-3" />
         <h4 className="fw-bold text-success">¡2FA Activado Correctamente!</h4>
         <p className="text-muted small mb-4">
          Tu cuenta ahora está protegida. Guarda estos códigos de recuperación en un lugar seguro. 
          Te permitirán acceder a tu cuenta si pierdes el acceso a tu teléfono.
         </p>

         <div className="text-success p-4 rounded mb-4 text-start">
          <div className="row g-2">
           {setupData?.recovery_codes?.map((code: string, i: number) => (
            <div key={i} className="col-6 font-monospace small">{code}</div>
           ))}
          </div>
         </div>

         <Button variant="primary" className="w-100 py-3 fw-bold" onClick={() => router.push('/profile')}>
          Finalizar y Volver al Perfil
         </Button>
        </div>
       )}

      </Card.Body>
     </Card>
    </div>
   </Container>
   <style jsx>{`
    .max-width-md { max-width: 500px; }
    .letter-spacing-lg { letter-spacing: 0.5rem; }
   `}</style>
  </Layout>
 );
}
