import React, { useState, useEffect, useRef } from 'react';
import { Container, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { ShieldCheck, Lock, User, Key, ArrowRight, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
 const [username, setUsername] = useState('');
 const [password, setPassword] = useState('');
 const [totpCode, setTotpCode] = useState('');
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [needs2FA, setNeeds2FA] = useState(false);
 const [interimToken, setInterimToken] = useState('');
 const [mounted, setMounted] = useState(false);
 const [showPassword, setShowPassword] = useState(false);

 const usernameRef = useRef<HTMLInputElement>(null);
 const passwordRef = useRef<HTMLInputElement>(null);
 const totpRef = useRef<HTMLInputElement>(null);
 const errorRef = useRef<HTMLDivElement>(null);

 const { login, verify2FA, needs2FA: globalNeeds2FA, interimToken: globalInterimToken } = useAuth();
 const themeContext = useTheme();
 const theme = themeContext?.theme || 'dark';
 const toggleTheme = themeContext?.toggleTheme || (() => {});
 const router = useRouter();

 const is2FAPhase = needs2FA || globalNeeds2FA;
 const currentInterimToken = interimToken || globalInterimToken;

 useEffect(() => {
  setMounted(true);
  setTimeout(() => usernameRef.current?.focus(), 100);
 }, []);

 const handleLoginSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  try {
   const result = await login(username, password);
   if (result === true) {
    router.push('/');
    return;
   }
   if (typeof result === 'object') {
    const { needs_2fa, force_password_change, reset_2fa } = result;
    if (needs_2fa) {
     setLoading(false);
    } else if (force_password_change || reset_2fa) {
     router.replace('/security/onboarding');
    }
   } else if (result === false) {
    setError('ERROR: Credenciales inválidas o acceso denegado.');
   }
  } catch (err: any) {
   setError(err.message || 'CONNECTION ERROR: Security core unreachable.');
  } finally {
   setLoading(false);
  }
 };

 const handle2FASubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  try {
   const success = await verify2FA(totpCode, currentInterimToken || '');
   if (success) {
    router.push('/');
   } else {
    setError('AUTH_FAILED: Invalid security code.');
   }
  } catch (err) {
   setError('VALIDATION_ERROR: Verification core failed.');
  } finally {
   setLoading(false);
  }
 };

 if (!mounted) return null;

 return (
  <div className="login-wrapper">
   <Head>
    <title>Secure Gateway | Ticketera SOC</title>
   </Head>

   <div className="theme-toggle-fixed">
    <Button
     variant="link"
     className="text-muted d-flex align-items-center gap-2 text-decoration-none"
     onClick={toggleTheme}
     aria-label="Cambiar tema visual"
    >
     {theme === 'dark' && <Moon size={20} />}
     {theme === 'light' && <Sun size={20} />}
     {theme === 'soc' && <ShieldCheck size={20} className="text-primary" />}
     {theme === 'high-contrast' && <Eye size={20} className="text-warning" />}
     <span className="x-small fw-black uppercase opacity-75">{theme}</span>
    </Button>
   </div>

   <div className="vignette" />

   <Card className="login-card shadow-2xl p-2">
    <Card.Body className="p-4">
     <div className="text-center mb-5">
      <div className="shield-container mb-3">
       <ShieldCheck size={48} className="text-primary" />
      </div>
      <h4 className="fw-black m-0 tracking-tighter uppercase">
       TICKETERA <span className="text-primary">SOC</span>
      </h4>
      <div className="small fw-bold text-muted opacity-75 text-uppercase" style={{ fontSize: '9px' }}>
       Enterprise Security Gateway
      </div>
     </div>

     {error && (
      <Alert ref={errorRef} variant="danger" className="py-2 small border-0 bg-danger bg-opacity-10 text-danger fw-bold">
       {error}
      </Alert>
     )}

     {!is2FAPhase ? (
      <Form onSubmit={handleLoginSubmit}>
       <Form.Group className="mb-3" controlId="login-username-input">
        <Form.Label className="x-small fw-black text-muted uppercase opacity-75">
         ID de Operador
        </Form.Label>
        <div className="position-relative">
         <User size={16} className="position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
         <Form.Control
          ref={usernameRef}
          id="login-username-input"
          name="username"
          type="text"
          placeholder="Nombre de usuario"
          autoComplete="username"
          style={{ paddingLeft: 40, height: 45 }}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
         />
        </div>
       </Form.Group>

       <Form.Group className="mb-4" controlId="login-password-input">
        <Form.Label className="x-small fw-black text-muted uppercase opacity-75">
         Token de Seguridad
        </Form.Label>
        <div className="position-relative">
         <Lock size={16} className="position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
         <Form.Control
          ref={passwordRef}
          id="login-password-input"
          name="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Contraseña"
          autoComplete="current-password"
          style={{ paddingLeft: 40, height: 45 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
         />
         <Button
          variant="link"
          className="position-absolute text-muted p-0"
          style={{ right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
          onClick={() => setShowPassword(!showPassword)}
          aria-label="Toggle password visibility"
         >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
         </Button>
        </div>
       </Form.Group>

       <Button variant="primary" type="submit" className="w-100 fw-black uppercase tracking-widest py-2" disabled={loading}>
        {loading ? <Spinner animation="border" size="sm" /> : <>AUTENTICAR ACCESO <ArrowRight size={16} className="ms-2" /></>}
       </Button>
      </Form>
     ) : (
      <Form onSubmit={handle2FASubmit}>
       <div className="text-center mb-4">
        <div className="text-primary x-small fw-black uppercase mb-2">Autenticación Multifactor</div>
        <p className="text-muted x-small m-0 opacity-75">Ingrese el código de 6 dígitos.</p>
       </div>

       <Form.Group className="mb-4" controlId="login-totp-input">
        <Form.Label className="x-small fw-black text-muted uppercase opacity-75">Código de Verificación</Form.Label>
        <div className="position-relative">
         <Key size={16} className="position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
         <Form.Control
          ref={totpRef}
          id="login-totp-input"
          name="totpCode"
          type="text"
          placeholder="000000"
          autoComplete="one-time-code"
          className="text-center fw-black tracking-widest"
          style={{ paddingLeft: 40, height: 45 }}
          maxLength={6}
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value)}
          required
         />
        </div>
       </Form.Group>

       <Button variant="primary" type="submit" className="w-100 fw-black uppercase tracking-widest py-2" disabled={loading || totpCode.length < 6}>
        {loading ? <Spinner animation="border" size="sm" /> : 'VERIFICAR IDENTIDAD'}
       </Button>
      </Form>
     )}
    </Card.Body>
   </Card>
  </div>
 );
}
