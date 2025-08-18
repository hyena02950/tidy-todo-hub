
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Define a type for the request interceptor
type RequestInterceptor = (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>;

// Define a type for the response interceptor
type ResponseInterceptor = (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;

// Define a type for the error interceptor
type ErrorInterceptor = (error: any) => any;

// Get the API base URL from environment variables, ensuring HTTP protocol
const getApiBaseUrl = (): string => {
  let baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  
  // Force HTTP for specific IPs to prevent SSL errors
  if (baseUrl.includes('43.205.255.233') || 
      baseUrl.includes('13.235.100.18') || 
      baseUrl.includes('localhost') || 
      baseUrl.includes('127.0.0.1')) {
    baseUrl = baseUrl.replace('https://', 'http://');
    if (!baseUrl.startsWith('http://')) {
      baseUrl = 'http://' + baseUrl.replace(/^https?:\/\//, '');
    }
  }
  
  console.log('🔧 API Base URL:', baseUrl);
  return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Create a new Axios instance with default configurations
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // Adjust the timeout as needed
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Enable sending cookies with the requests
});

// Function to set the authorization header
const setAuthHeader = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Request interceptor
const onRequest: RequestInterceptor = (config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
};

// Response interceptor
const onResponse: ResponseInterceptor = (response) => {
  return response;
};

// Error interceptor
const onError: ErrorInterceptor = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('Data:', error.response.data);
    console.error('Status:', error.response.status);
    console.error('Headers:', error.response.headers);
  } else if (error.request) {
    // The request was made but no response was received
    console.error('Request:', error.request);
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('Message:', error.message);
  }
  
  return Promise.reject(error);
};

// Apply interceptors
apiClient.interceptors.request.use(onRequest, onError);
apiClient.interceptors.response.use(onResponse, onError);

export { apiClient, setAuthHeader };
