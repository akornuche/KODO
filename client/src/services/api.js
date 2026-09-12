import axios from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const baseURL = configuredBaseUrl.replace(/\/$/, '').endsWith('/api')
  ? configuredBaseUrl.replace(/\/$/, '')
  : `${configuredBaseUrl.replace(/\/$/, '')}/api`;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // The client base URL already includes /api. Normalize legacy callers
  // that still pass paths such as /api/auth/register.
  if (typeof config.url === 'string' && config.url.startsWith('/api/')) {
    config.url = config.url.slice(4);
  }

  return config;
});

export default api;
