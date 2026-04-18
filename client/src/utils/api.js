import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('psc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response && err.response.status === 401) {
      // Token expired — clear local state
      localStorage.removeItem('psc_token');
      localStorage.removeItem('psc_nid_data');
      localStorage.removeItem('psc_exam_data');
    }
    return Promise.reject(err);
  }
);

export default api;
