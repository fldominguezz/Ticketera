import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

interface SystemSettings {
  app_name: string;
  primary_color: string;
  login_footer_text: string;
  require_2fa_all_users: boolean;
}

const SettingsContext = createContext<SystemSettings | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>({
    app_name: 'CyberCase SOC',
    primary_color: '#0d6efd',
    login_footer_text: '© 2026 CyberCase Security',
    require_2fa_all_users: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/admin/settings');
        if (res.data) {
          setSettings(res.data);
          // Aplicar cambios al DOM
          document.title = res.data.app_name;
          
          const primaryColor = res.data.primary_color;
          // Inyectar variable CSS para el color primario
          document.documentElement.style.setProperty('--bs-primary', primaryColor);
          document.documentElement.style.setProperty('--primary-color', primaryColor);
          document.documentElement.style.setProperty('--primary', primaryColor);

          // Generar y setear RGB para transparencias de Bootstrap
          const rgb = hexToRgb(primaryColor);
          if (rgb) {
            document.documentElement.style.setProperty('--bs-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            document.documentElement.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
          }
        }
      } catch (e) {
        console.error('No se pudieron cargar los settings globales');
      }
    };
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings debe usarse dentro de SettingsProvider');
  return context;
};
