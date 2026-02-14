import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface AuthContextType {
 user: any;
 loading: boolean;
 isSuperuser: boolean;
 needs2FA: boolean;
 interimToken: string | null;
 login: (identifier: string, password: string) => Promise<any>;
 verify2FA: (code: string, interimToken: string) => Promise<boolean>;
 logout: () => void;
 checkAuth: () => Promise<void>;
 refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [user, setUser] = useState<any>(null);
 const [loading, setLoading] = useState(false);
 const [needs2FA, setNeeds2FA] = useState(false);
 const [interimToken, setInterimToken] = useState<string | null>(null);
 const router = useRouter();

 const fetchUser = async (token: string): Promise<boolean> => {
  setLoading(true);
  if (!token) {
    setUser(null);
    setLoading(false);
    return false;
  }
  
  try {
   // Decodificar scope del token para saber si es sesión completa
   let isFullSession = false;
   try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const scopes = payload.scope?.split(' ') || [];
    isFullSession = scopes.includes('session');
   } catch (e) {
    console.error('Token decode error', e);
   }

   const res = await fetch('/api/v1/users/me', {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
   });
   
   const contentType = res.headers.get('content-type');
   if (res.ok && contentType && contentType.indexOf('application/json') !== -1) {
    const userData = await res.json();
    if (userData && (userData.id || userData.email)) {
     // Inyectamos el estado de la sesión en el objeto user del contexto
     setUser({ ...userData, isFullSession });
     return true;
    }
   }
   
   if (res.status === 401) {
     // Si estamos en onboarding, NO borrar el token, es un token interino válido
     const isInterimPage = router.pathname.includes('security/onboarding');
     const isLoginPage = router.pathname.includes('/login');
     
     // También verificamos si el token guardado es interino (no tiene el prefijo de sesión real)
     // En este sistema, los tokens interinos suelen ser detectados por el backend.
     // Solo borramos si NO es una fase de transición de seguridad.
     if (!isInterimPage && !user?.force_password_change && !user?.reset_2fa_next_login) {
       localStorage.removeItem('access_token');
       setUser(null);
       
       if (!isLoginPage) {
        router.push('/login?expired=true');
       }
     }
   }
   return false;
  } catch (e) {
   console.error('Auth context critical error', e);
   setUser(null);
   return false;
  } finally {
   setLoading(false);
  }
 };

 useEffect(() => {
  const initAuth = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      await fetchUser(token);
    } else {
      setLoading(false);
    }
  };
  initAuth();
 }, []);

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
     setInterimToken(token);
     
     await fetchUser(token); 
     
     if (data.needs_2fa) {
      setNeeds2FA(true);
     }
     
     return data; // Devolvemos el objeto con las flags
    }
    
    // Caso: Login completo
    setNeeds2FA(false);
    setInterimToken(null);
    localStorage.setItem('access_token', data.access_token);
    // Guardar password temporalmente para autocompletado en Wiki
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('temp_pc', password);
    }
    const success = await fetchUser(data.access_token);
    return success;
   } else {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Error de autenticación');
   }
  } catch (e: any) {
   console.error('Login error', e);
   throw e;
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
   console.error('2FA verify error', e);
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
   needs2FA,
   interimToken,
   login, 
   verify2FA,
   logout,
   checkAuth: () => fetchUser(localStorage.getItem('access_token') || ''),
   refreshUser: async () => {
    const token = localStorage.getItem('access_token');
    if (token) await fetchUser(token);
   }
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
