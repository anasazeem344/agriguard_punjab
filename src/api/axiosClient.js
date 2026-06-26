import axios from 'axios';
import { emitUnauthorized } from './authEvents';

const axiosClient = axios.create({ baseURL: '/api' });

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadAuthHeader = Boolean(error.config?.headers?.Authorization);
    // Only treat this as "session expired" if the failed request was actually
    // authenticated - a 401 from /auth/login itself just means wrong credentials.
    if (error.response?.status === 401 && hadAuthHeader) {
      emitUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
