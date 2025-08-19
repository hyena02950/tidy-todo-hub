
import { Cookies } from 'react-cookie';

const cookies = new Cookies();

const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const setToken = (token: string, options?: any) => {
  cookies.set(TOKEN_KEY, token, { path: '/', ...options });
};

export const getToken = () => {
  return cookies.get(TOKEN_KEY);
};

export const clearToken = () => {
  cookies.remove(TOKEN_KEY, { path: '/' });
};

export const setRefreshToken = (refreshToken: string, options?: any) => {
  cookies.set(REFRESH_TOKEN_KEY, refreshToken, { path: '/', ...options });
};

export const getRefreshToken = () => {
  return cookies.get(REFRESH_TOKEN_KEY);
};

export const clearRefreshToken = () => {
  cookies.remove(REFRESH_TOKEN_KEY, { path: '/' });
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://13.235.100.18:3001';
const baseURL = API_BASE_URL.replace(/\/$/, '');

export const login = async (email: string, password: string) => {
  console.log('Attempting login with:', { email, baseURL });
  
  try {
    const response = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    console.log('Login response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    console.log('Login successful:', data);

    if (data.accessToken) {
      setToken(data.accessToken);
    }
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = async () => {
  console.log('Attempting logout...');
  
  try {
    const token = getToken();
    if (token) {
      await fetch(`${baseURL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear tokens locally
    clearToken();
    clearRefreshToken();
    console.log('Logout completed');
  }
};

export const register = async (userData: {
  email: string;
  password: string;
  fullName?: string;
  companyName?: string;
}) => {
  console.log('Attempting registration with:', { email: userData.email, baseURL });
  
  try {
    const response = await fetch(`${baseURL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        contactPerson: userData.fullName,
        companyName: userData.companyName,
      }),
    });

    console.log('Registration response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(errorData.message || 'Registration failed');
    }

    const data = await response.json();
    console.log('Registration successful:', data);

    // Store tokens
    if (data.accessToken) {
      setToken(data.accessToken);
    }
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }

    return data;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

export const isLoggedIn = () => {
  const token = getToken();
  return !!token;
};

export const clearAuthData = () => {
  clearToken();
  clearRefreshToken();
};
