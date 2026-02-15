import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Card, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { ShieldCheck, Lock, User, Key, ArrowRight, Sun, Moon, Eye, EyeOff, XCircle, Activity, Shield } from 'lucide-react';
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
    setError('Credenciales inválidas o acceso denegado.');
   }
  } catch (err: any) {
   setError(err.message || 'Error de conexión con el servidor de seguridad.');
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
    setError('Código de seguridad inválido.');
   }
  } catch (err) {
   setError('Fallo en la verificación del token.');
  } finally {
   setLoading(false);
  }
 };

 if (!mounted) return null;

 return (
  <div className="login-page">
   <Head>
    <title>Secure Gateway | Ticketera SOC</title>
   </Head>

   <Row className="g-0 min-vh-100">
    {/* LADO IZQUIERDO: Branding e Info Técnica (Oculto en móvil pequeño) */}
    <Col lg={7} xl={8} className="d-none d-lg-flex bg-branding position-relative overflow-hidden align-items-center justify-content-center p-5">
      <div className="cyber-grid" />
      <div className="glow-orb" />
      
      <div className="branding-content position-relative z-10 text-white">
        <div className="mb-4 d-flex align-items-center gap-3">
          <div className="p-3 bg-white bg-opacity-10 rounded-4 border border-white border-opacity-20 backdrop-blur">
            <ShieldCheck size={64} className="text-white" />
          </div>
          <div>
            <h1 className="fw-black m-0 display-4 tracking-tighter uppercase">TICKETERA <span className="text-primary-light">SOC</span></h1>
            <p className="m-0 fw-bold tracking-widest text-uppercase opacity-50 small">Intelligence Security Gateway</p>
          </div>
        </div>
        
        <div className="mt-5 max-w-500 animate-slide-right">
          <div className="info-module mb-4 p-3 d-flex align-items-center gap-3">
            <div className="icon-box"><Activity size={22} /></div>
            <div>
              <div className="module-label">Threat Monitoring</div>
              <p className="m-0 module-text">Detección de amenazas y gestión de activos en tiempo real.</p>
            </div>
          </div>
          
          <div className="info-module mb-4 p-3 d-flex align-items-center gap-3">
            <div className="icon-box"><Shield size={22} /></div>
            <div>
              <div className="module-label">Access Control</div>
              <p className="m-0 module-text">Control de acceso inmutable basado en identidades seguras.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Movido fuera de branding-content para que sea absoluto respecto a la Col */}
      <div className="position-absolute bottom-0 start-0 p-5 z-10">
        <div className="system-status d-flex align-items-center gap-3">
          <div className="status-ping"></div>
          <div className="font-monospace x-small fw-black tracking-tighter opacity-50 text-white">
            TICKETERA CORE v2.0 // SYSTEM_STATUS: <span className="text-success">OPERATIONAL</span>
          </div>
        </div>
      </div>
    </Col>

    {/* LADO DERECHO: Formulario de Login */}
    <Col lg={5} xl={4} className="d-flex align-items-center justify-content-center bg-background p-4 p-md-5 position-relative">
      <div className="w-100 shadow-container" style={{ maxWidth: '450px' }}>
        <div className="d-lg-none text-center mb-5">
          <ShieldCheck size={48} className="text-primary mb-3" />
          <h2 className="fw-black m-0 tracking-tighter uppercase text-main">TICKETERA SOC</h2>
        </div>

        <div className="mb-5 animate-fade-in">
          <h3 className="fw-black text-main uppercase m-0 tracking-tighter" style={{ fontSize: '2rem' }}>Bienvenido</h3>
          <p className="text-muted-foreground fw-bold small uppercase tracking-widest opacity-75">Acceso al Terminal de Seguridad</p>
        </div>

        {error && (
          <Alert variant="danger" className="py-2 small border-0 bg-danger bg-opacity-10 text-danger fw-bold rounded-3 mb-4 animate-shake">
            <div className="d-flex align-items-center gap-2">
              <XCircle size={16} /> {error}
            </div>
          </Alert>
        )}

        {!is2FAPhase ? (
          <Form onSubmit={handleLoginSubmit}>
            <Form.Group className="mb-4" controlId="login-username-input">
              <Form.Label className="x-small fw-black text-muted-foreground uppercase tracking-wider mb-2">ID de Operador</Form.Label>
              <div className="position-relative">
                <User size={18} className="position-absolute text-muted" style={{ left: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 5 }} />
                <Form.Control
                  ref={usernameRef}
                  id="login-username-input"
                  name="username"
                  type="text"
                  placeholder="Usuario"
                  autoComplete="username"
                  className="border-subtle text-main rounded-3 fw-bold shadow-none custom-input"
                  style={{ paddingLeft: 48, height: 54 }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-5" controlId="login-password-input">
              <Form.Label className="x-small fw-black text-muted-foreground uppercase tracking-wider mb-2">Token de Seguridad</Form.Label>
              <div className="position-relative">
                <Lock size={18} className="position-absolute text-muted" style={{ left: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 5 }} />
                <Form.Control
                  ref={passwordRef}
                  id="login-password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="border-subtle text-main rounded-3 fw-bold shadow-none custom-input"
                  style={{ paddingLeft: 48, height: 54 }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  variant="link"
                  className="position-absolute text-muted p-0 border-0 shadow-none"
                  style={{ right: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </Button>
              </div>
            </Form.Group>

            <Button 
              variant="primary" 
              type="submit" 
              className="w-100 fw-black uppercase tracking-widest py-3 rounded-3 border-0 premium-btn shadow-lg d-flex align-items-center justify-content-center gap-3" 
              disabled={loading}
            >
              {loading ? (
                <><Spinner animation="border" size="sm" /> <span>VERIFICANDO...</span></>
              ) : (
                <>INICIAR SESIÓN <ArrowRight size={20} strokeWidth={3} /></>
              )}
            </Button>
          </Form>
        ) : (
          <Form onSubmit={handle2FASubmit}>
            <div className="text-center mb-4">
              <div className="text-primary small fw-black uppercase mb-2">MFA Requerido</div>
              <p className="text-muted small m-0 fw-medium">Introduce el código de 6 dígitos.</p>
            </div>
            <Form.Group className="mb-5" controlId="login-totp-input">
              <Form.Control
                ref={totpRef}
                id="login-totp-input"
                name="totpCode"
                type="text"
                placeholder="000 000"
                className="text-center fw-black tracking-widest bg-muted border-subtle text-main rounded-3 custom-input"
                style={{ height: 60, fontSize: '1.5rem' }}
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
              />
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100 fw-black uppercase py-3 rounded-3 premium-btn shadow-lg" disabled={loading}>
              VALIDAR TOKEN
            </Button>
          </Form>
        )}

        <div className="mt-5 d-flex justify-content-between align-items-center pt-4 border-top border-subtle">
          <Button variant="link" className="text-muted x-small fw-black text-decoration-none p-0 uppercase" onClick={toggleTheme}>
            {theme === 'dark' ? <Moon size={14} className="me-1"/> : <Sun size={14} className="me-1"/>} TEMA: {theme}
          </Button>
          <span className="x-small fw-bold text-muted opacity-50 uppercase">© 2026 TICKETERA</span>
        </div>
      </div>
    </Col>
   </Row>

   <style jsx global>{`
     .login-page {
       min-height: 100vh;
       background-color: var(--bg-background) !important;
     }
     
     .bg-branding {
       background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
     }

     .text-primary-light { color: #38bdf8; }
     
     .info-module {
       background: rgba(255, 255, 255, 0.03);
       border: 1px solid rgba(255, 255, 255, 0.08);
       border-left: 3px solid #38bdf8;
       border-radius: 8px;
       transition: all 0.3s ease;
     }
     
     .info-module:hover {
       background: rgba(255, 255, 255, 0.06);
       transform: translateX(5px);
     }

     .icon-box {
       color: #38bdf8;
       display: flex;
       align-items: center;
       justify-content: center;
     }

     .module-label {
       font-size: 0.65rem;
       font-weight: 900;
       text-transform: uppercase;
       letter-spacing: 0.1em;
       color: #38bdf8;
       margin-bottom: 2px;
     }

     .module-text {
       font-size: 0.85rem;
       font-weight: 500;
       color: rgba(255, 255, 255, 0.8);
     }

     .status-ping {
       width: 8px;
       height: 8px;
       background-color: #10b981;
       border-radius: 50%;
       position: relative;
       box-shadow: 0 0 10px #10b981;
     }

     .status-ping::after {
       content: '';
       position: absolute;
       inset: -4px;
       border: 2px solid #10b981;
       border-radius: 50%;
       animation: status-pulse 2s infinite;
     }

     @keyframes status-pulse {
       0% { transform: scale(1); opacity: 1; }
       100% { transform: scale(2.5); opacity: 0; }
     }

     .animate-slide-right {
       animation: slideRight 0.8s cubic-bezier(0.4, 0, 0.2, 1);
     }

     @keyframes slideRight {
       from { opacity: 0; transform: translateX(-30px); }
       to { opacity: 1; transform: translateX(0); }
     }

     .backdrop-blur { backdrop-filter: blur(10px); }
     
     .max-w-500 { max-width: 500px; }
     .max-w-400 { max-width: 400px; }

     .cyber-grid {
       position: absolute;
       inset: 0;
       background-image: radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px);
       background-size: 40px 40px;
       opacity: 0.3;
     }

     .glow-orb {
       position: absolute;
       width: 1000px;
       height: 1000px;
       background: radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%);
       top: -300px;
       left: -300px;
       filter: blur(100px);
     }

     .custom-input {
       transition: all 0.2s ease;
       border-width: 1.5px !important;
       background-color: var(--bg-muted) !important;
       color: var(--text-foreground) !important;
       border-color: var(--border-border) !important;
     }

     .custom-input:focus {
       background-color: var(--bg-card) !important;
       border-color: var(--primary) !important;
       box-shadow: 0 0 0 4px var(--primary-muted) !important;
     }

     .premium-btn {
       background: linear-gradient(135deg, var(--primary) 0%, #1e40af 100%) !important;
       transition: all 0.3s ease !important;
     }

     .premium-btn:hover:not(:disabled) {
       transform: translateY(-2px);
       box-shadow: 0 8px 25px var(--primary-muted) !important;
     }

     @keyframes shake {
       0%, 100% { transform: translateX(0); }
       25% { transform: translateX(-5px); }
       75% { transform: translateX(5px); }
     }
     .animate-shake { animation: shake 0.3s ease-in-out; }
     
     .x-small { font-size: 0.7rem; }
     .fw-black { font-weight: 900; }
   `}</style>
  </div>
 );
}
