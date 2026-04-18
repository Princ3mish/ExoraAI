import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:4000/api',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth_unauthorized'));
    }
    return Promise.reject(error);
  }
);
