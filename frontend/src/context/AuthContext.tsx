import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface AuthContextType {
  user: any;
  loading: boolean;
  isSuperuser: boolean;
  login: (identifier: string, password: string) => Promise<boolean | { needs_2fa: boolean, interim_token: string }>;
  verify2FA: (code: string, interimToken: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async (token: string) => {
    try {
      const res = await fetch('/api/v1/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const userData = await res.json();
        if (userData && (userData.id || userData.email)) {
          setUser(userData);
        } else {
          throw new Error("Invalid user data");
        }
      } else {
        localStorage.removeItem('access_token');
        setUser(null);
      }
    } catch (e) {
      console.error("Auth fetch error", e);
      localStorage.removeItem('access_token');
      setUser(null);
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
        if (data.needs_2fa) {
          return { needs_2fa: true, interim_token: data.interim_token };
        }
        
        localStorage.setItem('access_token', data.access_token);
        await fetchUser(data.access_token);
        return true;
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
        await fetchUser(data.access_token);
        return true;
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
      refreshUser: () => fetchUser(localStorage.getItem('access_token') || '')
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
