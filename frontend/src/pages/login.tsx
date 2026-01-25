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
  
  const { login, verify2FA } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(username, password);
      if (typeof result === 'object' && result.needs_2fa) {
        setNeeds2FA(true);
        setInterimToken(result.interim_token);
      } else if (result === true) {
        router.push('/');
      } else {
        setError('ACCESS DENIED: Invalid operator credentials.');
      }
    } catch (err) {
      setError('CONNECTION ERROR: Security core unreachable.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const success = await verify2FA(totpCode, interimToken);
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
    <div className={`login-wrapper theme-${theme}`}>
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
            <div className="text-muted small fw-bold tracking-widest uppercase" style={{ fontSize: '9px' }}>
              Enterprise Security Gateway
            </div>
          </div>

          {error && (
            <Alert variant="danger" className="py-2 small border-0 bg-danger bg-opacity-10 text-danger fw-bold">
              {error}
            </Alert>
          )}

          {!needs2FA ? (
            <Form onSubmit={handleLoginSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="x-small fw-black text-muted uppercase">Operator ID</Form.Label>
                <div className="input-group-custom">
                  <User size={16} className="input-icon" />
                  <Form.Control 
                    type="text"
                    placeholder="Username"
                    className="input-field"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="x-small fw-black text-muted uppercase">Security Token</Form.Label>
                <div className="input-group-custom">
                  <Lock size={16} className="input-icon" />
                  <Form.Control 
                    type="password"
                    placeholder="Password"
                    className="input-field"
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
                  <>AUTHENTICATE <ArrowRight size={16} className="ms-2" /></>
                )}
              </Button>
            </Form>
          ) : (
            <Form onSubmit={handle2FASubmit}>
              <div className="text-center mb-4">
                <div className="text-primary x-small fw-black uppercase mb-2">Multi-Factor Authentication Required</div>
                <p className="text-muted x-small m-0">Enter the 6-digit verification code from your security device.</p>
              </div>
              
              <Form.Group className="mb-4">
                <Form.Label className="x-small fw-black text-muted uppercase">Verification Code</Form.Label>
                <div className="input-group-custom">
                  <Key size={16} className="input-icon" />
                  <Form.Control 
                    type="text"
                    placeholder="000000"
                    className="input-field text-center fw-black tracking-widest"
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
                {loading ? <Spinner animation="border" size="sm" /> : 'VERIFY IDENTITY'}
              </Button>
              
              <Button 
                variant="link" 
                className="w-100 text-muted x-small mt-3 text-decoration-none fw-bold uppercase"
                onClick={() => setNeeds2FA(false)}
              >
                Back to credentials
              </Button>
            </Form>
          )}

          <div className="mt-5 pt-3 border-top border-theme text-center">
            <div className="text-muted fw-mono uppercase italic" style={{ fontSize: '8px' }}>
              v1.3.5 • IMMUTABLE SECURE CONNECTION • AES-256
            </div>
            <div className="text-muted fw-mono mt-1" style={{ fontSize: '7px' }}>
              DETECTED_IP: {typeof window !== 'undefined' ? window.location.hostname : '...'}
            </div>
          </div>
        </Card.Body>
      </Card>

      <style jsx global>{`
        .theme-dark {
          --bg-login: #05070a;
          --bg-card: #0c1016;
          --text-primary: #ffffff;
          --text-muted: #8a8f98;
          --border-color: rgba(255, 255, 255, 0.05);
          --input-bg: #05070a;
        }

        .theme-light {
          --bg-login: #f0f2f5;
          --bg-card: #ffffff;
          --text-primary: #1a1f26;
          --text-muted: #64748b;
          --border-color: rgba(0, 0, 0, 0.1);
          --input-bg: #ffffff;
        }

        .login-wrapper {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--bg-login);
          transition: background-color 0.25s ease;
          position: relative;
        }

        .theme-toggle-fixed {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 100;
        }

        .vignette {
          position: absolute;
          inset: 0;
          box-shadow: inset 0 0 150px rgba(0,0,0,0.5);
          pointer-events: none;
        }

        .login-card {
          width: 100%;
          max-width: 380px;
          background: var(--bg-card) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 12px !important;
          color: var(--text-primary) !important;
          transition: all 0.25s ease;
        }

        .shield-container {
          display: inline-flex;
          padding: 15px;
          border-radius: 50%;
          background: rgba(13, 110, 253, 0.05);
          border: 1px solid rgba(13, 110, 253, 0.1);
          box-shadow: 0 0 30px rgba(13, 110, 253, 0.1);
        }

        .x-small { font-size: 10px; }
        .fw-black { font-weight: 900; }
        .fw-mono { font-family: 'JetBrains Mono', monospace; }

        .input-group-custom {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          opacity: 0.5;
          z-index: 10;
        }

        .input-field {
          background-color: var(--input-bg) !important;
          border: 1px solid var(--border-color) !important;
          color: var(--text-primary) !important;
          padding-left: 40px !important;
          height: 45px !important;
          font-size: 14px !important;
        }

        .input-field:focus {
          border-color: #0d6efd !important;
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15) !important;
        }

        .border-theme {
          border-color: var(--border-color) !important;
        }

        .text-muted { color: var(--text-muted) !important; }
      `}</style>
    </div>
  );
}