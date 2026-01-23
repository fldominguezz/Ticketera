import { useState, FormEvent } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface LoginResponse {
  needs_2fa: boolean;
  interim_token: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needs2Fa, setNeeds2Fa] = useState(false);
  const [interimToken, setInterimToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data: LoginResponse | TokenResponse = await response.json();

      if ('needs_2fa' in data) { // This is a LoginResponse
        if (data.needs_2fa) {
          setNeeds2Fa(true);
          setInterimToken(data.interim_token);
        } else { // No 2FA needed, full token received
          localStorage.setItem('access_token', data.interim_token); // interim_token is actually the full token here
          router.push('/');
        }
      } else { // This is a direct TokenResponse (should not happen with current backend design)
        localStorage.setItem('access_token', data.access_token);
        router.push('/');
      }

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FaVerification = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!interimToken) {
      setError('No interim token found for 2FA verification.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/login/2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${interimToken}`,
        },
        body: JSON.stringify({ totp_code: totpCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '2FA verification failed');
      }

      const data: TokenResponse = await response.json();
      localStorage.setItem('access_token', data.access_token);
      router.push('/');

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during 2FA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Head>
        <title>Login - Ticketera</title>
      </Head>

      <main className="login-card">
        <h2>{needs2Fa ? 'Verify 2FA' : 'Login'}</h2>
        {error && <p className="error-message">{error}</p>}

        {!needs2Fa ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="identifier">Username or Email</label>
              <input
                type="text"
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handle2FaVerification}>
            <p>Please enter the 6-digit code from your authenticator app.</p>
            <div className="form-group">
              <label htmlFor="totpCode">2FA Code</label>
              <input
                type="text"
                id="totpCode"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify 2FA'}
            </button>
            <button type="button" onClick={() => setNeeds2Fa(false)} disabled={loading}>
              Back to Login
            </button>
          </form>
        )}
      </main>

      <style jsx>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #f0f2f5;
        }
        .login-card {
          background: #fff;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        h2 {
          margin-bottom: 1.5rem;
          color: #333;
        }
        .form-group {
          margin-bottom: 1rem;
          text-align: left;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          color: #555;
          font-weight: bold;
        }
        input[type="text"],
        input[type="password"] {
          width: 100%;
          padding: 0.8rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
          font-size: 1rem;
        }
        button {
          width: 100%;
          padding: 0.8rem;
          border: none;
          border-radius: 4px;
          background-color: #0070f3;
          color: white;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 1rem;
        }
        button:hover:not(:disabled) {
          background-color: #005bb5;
        }
        button:disabled {
          background-color: #a0cffc;
          cursor: not-allowed;
        }
        .error-message {
          color: #e00;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
