import React, { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { useRouter } from 'next/router';
import 'bootstrap/dist/css/bootstrap.min.css';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user && router.pathname !== '/login') {
        setAuthorized(false);
        router.push('/login');
      } else {
        setAuthorized(true);
      }
    }
  }, [user, loading, router.pathname]);

  if (!authorized && router.pathname !== '/login') {
    return (
      <div style={{ background: '#05070a', height: '100vh', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <ThemeProvider>
          <AuthGuard>
            <Component {...pageProps} />
          </AuthGuard>
        </ThemeProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}