import React, { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { SettingsProvider } from '../context/SettingsContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { useRouter } from 'next/router';

// 1. Estilos base
import 'bootstrap/dist/css/bootstrap.min.css';

// 2. Mis estilos
import '../styles/globals.css';

import Footer from '../components/layout/Footer';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (loading || !isClient) return;

    const isLoginPage = router.pathname === '/login';
    if (!user) {
      if (!isLoginPage) {
        router.replace('/login');
      }
    } else if (isLoginPage) {
      router.replace('/');
    }
  }, [user, loading, router.pathname, isClient]);

  // Si no es cliente o está cargando, mostramos un contenedor estable
  if (!isClient || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        {isClient && (
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status"></div>
            <div className="fw-bold text-white small ms-3">INICIANDO...</div>
          </div>
        )}
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
          <SettingsProvider> 
            <WebSocketProvider>
              <AuthGuard>
                <Component {...pageProps} />
              </AuthGuard>
            </WebSocketProvider>
          </SettingsProvider> 
        </ThemeProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}