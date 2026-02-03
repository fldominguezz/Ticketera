import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(

  (response) => response,

  (error) => {

    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('access_token');
        window.location.href = '/login?expired=true';
      }
    }

    if (error.response && error.response.status === 403) {
      const detail = error.response.data?.detail;
      if (detail === 'SECURITY_CHANGE_PASSWORD_REQUIRED' || detail === 'SECURITY_2FA_SETUP_REQUIRED') {
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/security/onboarding')) {
          window.location.href = '/security/onboarding';
        }
      }
    }

    return Promise.reject(error);

  }

);



export default api;
