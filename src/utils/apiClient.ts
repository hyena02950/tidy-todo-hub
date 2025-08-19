
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getToken, removeToken } from './auth';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: '/api', // This will use the backend running on the same domain
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and non-JSON responses
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Check if response is HTML instead of JSON
    if (error.response?.headers['content-type']?.includes('text/html')) {
      console.error('Received HTML response instead of JSON:', error.response.data);
      return Promise.reject(new Error('Server returned HTML instead of JSON. Check if backend is running correctly.'));
    }

    if (error.response?.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
