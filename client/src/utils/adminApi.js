import axios from 'axios';

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 15000
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('psc_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('psc_admin_token');
      localStorage.removeItem('psc_admin_user');
    }
    return Promise.reject(err);
  }
);

export default adminApi;
