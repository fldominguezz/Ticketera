import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface AuthContextType {
  user: any;
  loading: boolean;
  isSuperuser: boolean;
  login: (identifier: string, password: string) => Promise<boolean | { needs_2fa: boolean, interim_token: string }>;
  verify2FA: (code: string, interimToken: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async (token: string): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Si es 200 o 403, intentamos leer el usuario (nuestro backend envía el JSON en ambos)
      if (res.ok || res.status === 403) {
        const userData = await res.json();
        if (userData && (userData.id || userData.email)) {
          setUser(userData);
          return true;
        }
      }
      
      // Si llegamos acá, el token es inválido de verdad
      localStorage.removeItem('access_token');
      setUser(null);
      return false;
    } catch (e) {
      console.error("Auth fetch error", e);
      localStorage.removeItem('access_token');
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (!user) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, [user]);

  const login = async (identifier: string, password: string) => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      if (res.ok) {
        const data = await res.json();
        // Caso: Requiere acciones de seguridad (interim token)
        if (data.needs_2fa || data.force_password_change || data.reset_2fa) {
          const token = data.interim_token;
          localStorage.setItem('access_token', token);
          await fetchUser(token); // Cargamos el usuario YA para que el context tenga los flags
          return data;
        }
        
        // Caso: Login completo
        localStorage.setItem('access_token', data.access_token);
        const success = await fetchUser(data.access_token);
        return success;
      }
      return false;
    } catch (e) {
      console.error("Login error", e);
      return false;
    }
  };

  const verify2FA = async (code: string, interimToken: string) => {
    try {
      const res = await fetch('/api/v1/auth/login/2fa', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${interimToken}`
        },
        body: JSON.stringify({ totp_code: code })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('access_token', data.access_token);
        const success = await fetchUser(data.access_token);
        return success;
      }
      return false;
    } catch (e) {
      console.error("2FA verify error", e);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isSuperuser: user?.is_superuser === true, 
      login, 
      verify2FA,
      logout,
      checkAuth: () => fetchUser(localStorage.getItem('access_token') || '')
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
