import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'soc' | 'high-contrast';

interface ThemeContextType {
 theme: Theme;
 setTheme: (theme: Theme) => void;
 toggleTheme: () => void;
 toggleHighContrast: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [theme, setThemeState] = useState<Theme>('soc');

 useEffect(() => {
  const savedTheme = localStorage.getItem('app-theme') as Theme;
  if (savedTheme) {
   setThemeState(savedTheme);
   document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
   document.documentElement.setAttribute('data-theme', 'soc');
  }
 }, []);

 const setTheme = (newTheme: Theme) => {
  setThemeState(newTheme);
  localStorage.setItem('app-theme', newTheme);
  document.documentElement.setAttribute('data-theme', newTheme);
 };

 const toggleTheme = () => {
  let nextTheme: Theme;
  if (theme === 'light') nextTheme = 'dark';
  else if (theme === 'dark') nextTheme = 'soc';
  else if (theme === 'soc') nextTheme = 'high-contrast';
  else nextTheme = 'light';
  
  setTheme(nextTheme);
 };

 const toggleHighContrast = () => {
  setTheme(theme === 'high-contrast' ? 'dark' : 'high-contrast');
 };

 return (
  <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, toggleHighContrast }}>
   {children}
  </ThemeContext.Provider>
 );
};

export const useTheme = () => {
 const context = useContext(ThemeContext);
 if (!context) throw new Error('useTheme must be used within ThemeProvider');
 return context;
};