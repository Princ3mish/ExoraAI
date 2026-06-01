import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : 'http://localhost:4000/api',
});

// Attach JWT to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401: clear auth state and redirect to /login
// On 402: dispatch credits-exhausted event for CreditsExhaustedModal
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Dispatch for AuthContext listener, then hard-navigate
      window.dispatchEvent(new Event('auth_unauthorized'));
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    if (error.response?.status === 402) {
      window.dispatchEvent(new CustomEvent('credits-exhausted', {
        detail: { message: error.response.data?.message ?? 'Insufficient credits.' },
      }));
    }
    return Promise.reject(error);
  },
);

export default api;
