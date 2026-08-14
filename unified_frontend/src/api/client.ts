import axios from 'axios';

// The base URL will point to the backend (e.g. running on port 8000)
// For local development with Vite proxy, we just use /api
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to inject the Authorization header
apiClient.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Intercept responses to handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    if (error.response && error.response.status === 401) {
      // Only redirect to login if we actually had a token (stale/expired)
      const hadToken = !!localStorage.getItem('auth_token');
      localStorage.removeItem('auth_token');
      if (hadToken && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
