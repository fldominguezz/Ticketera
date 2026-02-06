import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { ShieldCheck, Lock, User, Key, ArrowRight, Sun, Moon } from 'lucide-react';
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
  
  const { login, verify2FA, needs2FA: globalNeeds2FA, interimToken: globalInterimToken } = useAuth();
  const themeContext = useTheme(); 
  const theme = themeContext?.theme || 'dark';
  const toggleTheme = themeContext?.toggleTheme || (() => {});
  const router = useRouter();

  // Usamos el estado global si está disponible para mantener la persistencia
  const is2FAPhase = needs2FA || globalNeeds2FA;
  const currentInterimToken = interimToken || globalInterimToken;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(username, password);
      
      if (result === true) {
        // Login completo y directo (admin, fortisiem, etc.)
        router.push('/');
        return;
      }

      if (typeof result === 'object') {
        const { needs_2fa, force_password_change, reset_2fa } = result;
        
        if (needs_2fa) {
          // El estado global ya se encargará de mostrar el formulario
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
        <Button variant="link" className="text-muted" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </Button>
      </div>

      <div className="vignette" />
      
      <Card className="login-card shadow-2xl p-2">
        <Card.Body className="p-4">
          <div className="text-center mb-5">
            <div className="shield-container mb-3">
              <ShieldCheck size={48} className="text-primary" />
            </div>
            <h4 className="fw-black m-0 tracking-tighter uppercase">TICKETERA <span className="text-primary">SOC</span></h4>
            <div className="small fw-bold text-muted opacity-75 text-uppercase" style={{ fontSize: '9px' }}>
              Enterprise Security Gateway
            </div>
          </div>

          {error && (
            <Alert variant="danger" className="py-2 small border-0 bg-danger bg-opacity-10 text-danger fw-bold">
              {error}
            </Alert>
          )}

          {!is2FAPhase ? (
            <Form onSubmit={handleLoginSubmit}>
              <Form.Group className="mb-3" controlId="login-username">
                <Form.Label className="x-small fw-black text-muted uppercase opacity-75" htmlFor="login-username">ID de Operador</Form.Label>
                <div className="position-relative">
                  <User size={16} className="position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                  <Form.Control 
                    id="login-username"
                    type="text"
                    name="username"
                    placeholder="Nombre de usuario"
                    autoComplete="username"
                    style={{ paddingLeft: 40, height: 45 }}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-4" controlId="login-password">
                <Form.Label className="x-small fw-black text-muted uppercase opacity-75" htmlFor="login-password">Token de Seguridad</Form.Label>
                <div className="position-relative">
                  <Lock size={16} className="position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                  <Form.Control 
                    id="login-password"
                    type="password"
                    name="password"
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    style={{ paddingLeft: 40, height: 45 }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </Form.Group>

              <Button 
                variant="primary" 
                type="submit" 
                className="w-100 fw-black uppercase tracking-widest py-2 d-flex align-items-center justify-content-center"
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" /> : (
                  <>AUTENTICAR ACCESO <ArrowRight size={16} className="ms-2" /></>
                )}
              </Button>
            </Form>
          ) : (
            <Form onSubmit={handle2FASubmit}>
              <div className="text-center mb-4">
                <div className="text-primary x-small fw-black uppercase mb-2">Autenticación Multifactor Requerida</div>
                <p className="text-muted x-small m-0 opacity-75">Ingrese el código de verificación de 6 dígitos de su aplicación de seguridad.</p>
              </div>
              
              <Form.Group className="mb-4" controlId="login-totp">
                <Form.Label className="x-small fw-black text-muted uppercase opacity-75" htmlFor="login-totp">Código de Verificación</Form.Label>
                <div className="position-relative">
                  <Key size={16} className="position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                  <Form.Control 
                    id="login-totp"
                    type="text"
                    name="totpCode"
                    placeholder="000000"
                    className="text-center fw-black tracking-widest"
                    style={{ paddingLeft: 40, height: 45 }}
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </Form.Group>

              <Button 
                variant="primary" 
                type="submit" 
                className="w-100 fw-black uppercase tracking-widest py-2"
                disabled={loading || totpCode.length < 6}
              >
                {loading ? <Spinner animation="border" size="sm" /> : 'VERIFICAR IDENTIDAD'}
              </Button>
              
              <Button 
                variant="link" 
                className="w-100 text-muted x-small mt-3 text-decoration-none fw-bold uppercase opacity-75"
                onClick={() => setNeeds2FA(false)}
              >
                Volver a credenciales
              </Button>
            </Form>
          )}

          <div className="mt-5 pt-3 border-top border-opacity-10 text-center">
            <div className="text-muted fw-mono uppercase italic opacity-50" style={{ fontSize: '8px' }}>
              v1.3.5 • IMMUTABLE SECURE CONNECTION • AES-256
            </div>
          </div>
        </Card.Body>
      </Card>

      <style jsx>{`
        .login-wrapper {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--body-bg);
          position: relative;
        }
        .theme-toggle-fixed { position: fixed; top: 20px; right: 20px; z-index: 100; }
        .vignette { position: absolute; inset: 0; box-shadow: inset 0 0 150px rgba(0,0,0,0.3); pointer-events: none; }
        .login-card { width: 100%; max-width: 380px; }
        .shield-container { display: inline-flex; padding: 15px; border-radius: 50%; background: rgba(13, 110, 253, 0.05); border: 1px solid rgba(13, 110, 253, 0.1); }
        .x-small { font-size: 10px; }
        .fw-black { font-weight: 900; }
      `}</style>
    </div>
  );
}