import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'soc' | 'high-contrast';

interface ThemeContextType {
 theme: Theme;
 setTheme: (theme: Theme) => void;
 toggleTheme: () => void;
 toggleHighContrast: () => void;
 mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 // Usamos un estado inicial neutro o el por defecto para evitar inconsistencias en SSR
 const [theme, setThemeState] = useState<Theme>('soc');
 const [mounted, setMounted] = useState(false);

 // 1. Al montar, cargamos la preferencia y sincronizamos el DOM
 useEffect(() => {
  const savedTheme = localStorage.getItem('app-theme') as Theme;
  const initialTheme = savedTheme || 'soc';
  
  setThemeState(initialTheme);
  document.documentElement.setAttribute('data-theme', initialTheme);
  setMounted(true);
 }, []);

 // 2. Efecto reactivo: Cada vez que el estado 'theme' cambie, actualizamos localStorage y DOM
 // Esto garantiza que el tooltip (basado en estado) y la UI (basada en data-theme) estén SIEMPRE en sync.
 useEffect(() => {
  if (!mounted) return;
  
  localStorage.setItem('app-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  
  // Limpieza de clases residuales si el CSS dependiera de clases en lugar de data-theme
  document.documentElement.classList.remove('dark', 'light', 'soc', 'high-contrast');
  document.documentElement.classList.add(theme);
 }, [theme, mounted]);

 const setTheme = (newTheme: Theme) => {
  setThemeState(newTheme);
 };

 const toggleTheme = () => {
  setThemeState((prev) => {
    if (prev === 'light') return 'dark';
    if (prev === 'dark') return 'soc';
    if (prev === 'soc') return 'high-contrast';
    return 'light';
  });
 };

 const toggleHighContrast = () => {
  setThemeState((prev) => (prev === 'high-contrast' ? 'dark' : 'high-contrast'));
 };

 return (
  <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, toggleHighContrast, mounted }}>
   {children}
  </ThemeContext.Provider>
 );
};

export const useTheme = () => {
 const context = useContext(ThemeContext);
 if (!context) throw new Error('useTheme must be used within ThemeProvider');
 return context;
};
