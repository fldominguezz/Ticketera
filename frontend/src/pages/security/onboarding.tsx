import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import { Lock, ShieldCheck, Key, ArrowRight, LogOut, CheckCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function SecurityOnboardingPage() {
 const router = useRouter();
 const { theme } = useTheme();
 const { user, logout, checkAuth } = useAuth();
 const isDark = theme === 'dark';

 const [step, setStep] = useState(1); // 1: Password, 2: 2FA, 3: Success
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // Form states for password
 const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
 
 // 2FA states
 const [qrCode, setQrCode] = useState<string | null>(null);
 const [totpCode, setTotpCode] = useState('');
 const [setupStep, setSetupStep] = useState(1); // 1: Info, 2: QR, 3: Verify

 useEffect(() => {
  if (!user) return;
  const needsPasswordChange = !!user.force_password_change;
  const needs2FAEnrollment = !!((user.enroll_2fa_mandatory || user.reset_2fa_next_login) && !user.is_2fa_enabled);

  if (!needsPasswordChange && !needs2FAEnrollment) {
   router.replace('/');
  } else if (!needsPasswordChange) {
   setStep(2);
  }
 }, [user]);

 const handlePasswordChange = async (e: React.FormEvent) => {
  e.preventDefault();
  if (passwords.new !== passwords.confirm) {
   setError('Las contraseñas no coinciden');
   return;
  }
  setLoading(true);
  setError(null);
  try {
   const token = localStorage.getItem('access_token');
   const res = await fetch('/api/v1/auth/reset-password-forced', {
    method: 'POST',
    headers: { 
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
    },
    body: JSON.stringify({ new_password: passwords.new })
   });
   if (res.ok) {
    const data = await res.json();
    if (data.access_token) {
     localStorage.setItem('access_token', data.access_token);
    }
    await checkAuth(); 
    setStep(2);
   } else {
    const data = await res.json();
    // Evitamos pasar el objeto directamente al estado de error
    const msg = typeof data.detail === 'string' ? data.detail : 
          Array.isArray(data.detail) ? data.detail[0]?.msg :
          'Error de validación en la contraseña.';
    setError(String(msg));
   }
  } catch (err) {
   setError('Error de conexión.');
  } finally {
   setLoading(false);
  }
 };

 const start2FASetup = async () => {
  setLoading(true);
  try {
   const token = localStorage.getItem('access_token');
   const res = await fetch('/api/v1/auth/setup-2fa-forced', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
   });
   const data = await res.json();
   // El backend devuelve secret, provisioning_uri y recovery_codes
   // Necesitamos generar el QR a partir del provisioning_uri o usar lo que venga
   setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.provisioning_uri)}`);
   setSetupStep(2);
  } catch (err) {
   setError('Error al iniciar configuración 2FA.');
  } finally {
   setLoading(false);
  }
 };

 const verify2FA = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
   const token = localStorage.getItem('access_token');
   const res = await fetch('/api/v1/auth/verify-2fa-forced', {
    method: 'POST',
    headers: { 
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
    },
    body: JSON.stringify({ totp_code: totpCode })
   });
   if (res.ok) {
    const data = await res.json();
    if (data.access_token) {
     localStorage.setItem('access_token', data.access_token);
    }
    await checkAuth();
    setStep(3);
   } else {
    setError('Código inválido. Intente de nuevo.');
   }
  } catch (err) {
   setError('Error de verificación.');
  } finally {
   setLoading(false);
  }
 };

 const progress = (step / 3) * 100;

 return (
  <div className={`min-vh-100 d-flex align-items-center bg-${isDark ? 'black' : 'light'}`}>
   <Container>
    <Row className="justify-content-center">
     <Col md={6} lg={5}>
      <div className="text-center mb-4">
       <h1 className="fw-black text-primary tracking-tighter">SEGURIDAD OBLIGATORIA</h1>
       <p className="text-muted small">Para proteger su cuenta, debe completar estos pasos.</p>
       <ProgressBar now={progress} size="sm" className="mb-4" style={{ height: '4px' }} />
      </div>

      <Card className={`border-0 shadow-lg p-4 bg-${isDark ? 'dark' : 'white'}`}>
       {step === 1 && (
        <div className="animate-in">
         <div className="d-flex align-items-center gap-3 mb-4">
          <div className="bg-primary bg-opacity-10 p-3 rounded-circle text-primary">
           <Key size={32} />
          </div>
          <div>
           <h4 className="fw-bold m-0">Cambio de Contraseña</h4>
           <p className="text-muted small m-0">Su contraseña actual es temporal.</p>
          </div>
         </div>

         {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

         <Form onSubmit={handlePasswordChange}>
          <Form.Group className="mb-3" controlId="onboarding-current-password">
           <Form.Label className="x-small fw-bold text-muted uppercase">Contraseña Actual</Form.Label>
           <Form.Control 
            id="onboarding-current-password"
            name="current"
            type="password" required 
            value={passwords.current}
            onChange={e => setPasswords({...passwords, current: e.target.value})}
           />
          </Form.Group>
          <Form.Group className="mb-3" controlId="onboarding-new-password">
           <Form.Label className="x-small fw-bold text-muted uppercase">Nueva Contraseña</Form.Label>
           <Form.Control 
            id="onboarding-new-password"
            name="new"
            type="password" required
            value={passwords.new}
            onChange={e => setPasswords({...passwords, new: e.target.value})}
           />
           <div className="mt-2 p-2 rounded x-small border text-muted">
            <div className="fw-bold mb-1 uppercase" style={{fontSize: '9px'}}>Requisitos de Seguridad:</div>
            <ul className="m-0 ps-3" style={{fontSize: '10px'}}>
             <li>Mínimo 12 caracteres</li>
             <li>Al menos una letra mayúscula y una minúscula</li>
             <li>Al menos un número y un carácter especial (!@#$%^&*)</li>
            </ul>
           </div>
          </Form.Group>
          <Form.Group className="mb-4" controlId="onboarding-confirm-password">
           <Form.Label className="x-small fw-bold text-muted uppercase">Confirmar Nueva Contraseña</Form.Label>
           <Form.Control 
            id="onboarding-confirm-password"
            name="confirm"
            type="password" required
            value={passwords.confirm}
            onChange={e => setPasswords({...passwords, confirm: e.target.value})}
           />
          </Form.Group>
          <Button variant="primary" type="submit" className="w-100 fw-bold py-3 shadow-sm" disabled={loading}>
           {loading ? <Spinner animation="border" size="sm" /> : <>CONTINUAR <ArrowRight size={18} className="ms-2" /></>}
          </Button>
         </Form>
        </div>
       )}

       {step === 2 && (
        <div className="animate-in">
         <div className="d-flex align-items-center gap-3 mb-4">
          <div className="bg-success bg-opacity-10 p-3 rounded-circle text-success">
           <ShieldCheck size={32} />
          </div>
          <div>
           <h4 className="fw-bold m-0">Configurar 2FA</h4>
           <p className="text-muted small m-0">Autenticación de dos factores requerida.</p>
          </div>
         </div>

         {setupStep === 1 && (
          <div className="text-center">
           <p className="small text-muted mb-4">
            Añada una capa extra de seguridad usando una aplicación como Google Authenticator o Microsoft Authenticator.
           </p>
           <Button variant="outline-primary" onClick={start2FASetup} className="w-100 fw-bold py-3" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'EMPEZAR CONFIGURACIÓN'}
           </Button>
          </div>
         )}

         {setupStep === 2 && (
          <div className="text-center">
           <p className="small text-muted mb-3">Escanee este código QR con su aplicación de autenticación:</p>
           {qrCode && <img src={qrCode} alt="2FA QR" className="img-fluid rounded border p-2 mb-4 bg-white" style={{ maxWidth: '200px' }} />}
           <Button variant="primary" onClick={() => setSetupStep(3)} className="w-100 fw-bold">YA LO ESCANEÉ</Button>
          </div>
         )}

         {setupStep === 3 && (
          <Form onSubmit={verify2FA}>
           <Form.Group className="mb-4 text-center" controlId="onboarding-totp-code">
            <Form.Label className="x-small fw-bold text-muted uppercase mb-3">Ingrese el código de 6 dígitos</Form.Label>
            <Form.Control 
             id="onboarding-totp-code"
             name="totpCode"
             type="text" className="text-center h2 fw-black tracking-widest" 
             maxLength={6} required autoFocus
             value={totpCode} onChange={e => setTotpCode(e.target.value)}
            />
           </Form.Group>
           {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
           <Button variant="success" type="submit" className="w-100 fw-bold py-3 shadow-sm" disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'VERIFICAR Y ACTIVAR'}
           </Button>
          </Form>
         )}
        </div>
       )}

       {step === 3 && (
        <div className="text-center animate-in py-4">
         <div className="text-success mb-4">
          <CheckCircle size={64} strokeWidth={3} />
         </div>
         <h3 className="fw-black">¡CUENTA ASEGURADA!</h3>
         <p className="text-muted mb-5">Ha completado el proceso de seguridad obligatorio. Ya puede acceder al sistema.</p>
         <Button variant="primary" size="lg" onClick={() => router.push('/')} className="w-100 fw-bold">
          ENTRAR AL DASHBOARD
         </Button>
        </div>
       )}
      </Card>

      <div className="text-center mt-4">
       <Button variant="link" className="text-muted small fw-bold text-decoration-none" onClick={() => logout()}>
        <LogOut size={14} className="me-2" /> CERRAR SESIÓN
       </Button>
      </div>
     </Col>
    </Row>
   </Container>
   
   <style jsx>{`
    .animate-in {
     animation: slideUp 0.4s ease-out;
    }
    @keyframes slideUp {
     from { opacity: 0; transform: translateY(20px); }
     to { opacity: 1; transform: translateY(0); }
    }
   `}</style>
  </div>
 );
}
