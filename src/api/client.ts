import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorResponse } from '../types';

export const AUTH_TOKEN_KEY = 'jungle_auth_token';

const getBaseURL = (): string => {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  return 'http://localhost:5173/api';
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  adapter: 'fetch',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de Requisição: Injeta token de autenticação se presente
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Resposta: Tratamento de sessão e erros padronizados
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('jungle:session-expired', {
            detail: error.response.data?.error || { code: 'UNAUTHORIZED', message: 'Sessão expirada' },
          })
        );
      }
    }
    return Promise.reject(error);
  }
);
