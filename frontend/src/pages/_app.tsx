import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/globals.css';
import '../i18n';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../context/AuthContext';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { useEffect, useState } from 'react';

export default function App({ Component, pageProps }: AppProps) {

  return (

    <I18nextProvider i18n={i18n}>

      <AuthProvider>

        <Component {...pageProps} />

      </AuthProvider>

    </I18nextProvider>

  );

}


