import React, { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { SettingsProvider } from '../context/SettingsContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { useRouter } from 'next/router';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

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
  const isOnboardingPage = router.pathname === '/security/onboarding';

  // 1. Si estamos en el login, NO intervenimos. Dejamos que el componente Login maneje su estado.
  if (isLoginPage) return;

  if (!user) {
   // 2. Si no hay usuario y no es login/onboarding, al login.
   if (!isOnboardingPage) {
    router.replace('/login');
   }
  } else {
   // 3. Si el usuario está cargado, verificar integridad de la sesión
   const isExempt = user.username === 'admin' || user.username === 'fortisiem' || !!user.policy_exempt;
   const needsPasswordChange = !!user.force_password_change && !isExempt;
   const needs2FASetup = !!((user.enroll_2fa_mandatory || user.reset_2fa_next_login) && !user.is_2fa_enabled) && !isExempt;
   
   // Si tiene acciones de seguridad REALMENTE pendientes, va a onboarding
   if ((needsPasswordChange || needs2FASetup) && !isOnboardingPage) {
    router.replace('/security/onboarding');
    return;
   }

   // Si es una sesión interina (no exenta) y trata de entrar a páginas privadas, al login
   const isFullSession = !!user.isFullSession || isExempt;
   if (!isFullSession && !isLoginPage && !isOnboardingPage) {
    router.replace('/login');
    return;
   }

   // Si está en el login pero ya tiene sesión completa, al home
   if (isLoginPage && isFullSession) {
    router.replace('/');
   }
  }
 }, [user, loading, router.pathname, isClient]);

 // Si no es cliente o está cargando, mostramos un contenedor estable
 if (!isClient || loading) {
  return (
   <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
    {isClient && (
     <div className="text-center">
      <div className="spinner-border text-primary mb-3" role="status"></div>
      <div className="fw-bold small ms-3">INICIANDO...</div>
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
   <GoogleReCaptchaProvider reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}>
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
   </GoogleReCaptchaProvider>
  </I18nextProvider>
 );
}