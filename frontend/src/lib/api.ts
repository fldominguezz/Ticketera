import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Only logout if not on login or onboarding pages
        const path = window.location.pathname;
        if (!path.includes('/login') && !path.includes('/security/onboarding')) {
          localStorage.removeItem('access_token');
          window.location.href = '/login?expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Compatibility method for legacy secure calls
 */
(api as any).getById = async (id: string) => {
  const safeId = String(id).replace(/[^a-zA-Z0-9-]/g, "");
  return api.get(`/tickets/${safeId}`);
};

export default api;
