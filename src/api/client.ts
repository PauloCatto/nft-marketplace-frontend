import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorResponse } from '../types';
import { enableMocking } from '../mocks/browser';

export const AUTH_TOKEN_KEY = 'jungle_auth_token';

export interface RequireAuthDetail {
  message?: string;
  redirectTo?:
    | '/cart'
    | '/checkout'
    | '/profile'
    | '/market'
    | '/wishlist'
    | '/offers'
    | '/downloads'
    | '/support'
    | '/creators'
    | '/learn'
    | '/';
  onSuccess?: () => void;
}

export function isAuthenticated(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage.getItem(AUTH_TOKEN_KEY));
}

let pendingRequireAuth: RequireAuthDetail | null = null;

export function consumePendingRequireAuth(): RequireAuthDetail | null {
  const pending = pendingRequireAuth;
  pendingRequireAuth = null;
  return pending;
}

export function triggerRequireAuth(detail: RequireAuthDetail): void {
  if (typeof window !== 'undefined') {
    pendingRequireAuth = detail;
    window.dispatchEvent(new CustomEvent<RequireAuthDetail>('jungle:require-auth', { detail }));
  }
}

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

apiClient.interceptors.response.use(
  async (response) => {
    const retryCfg = response.config as InternalAxiosRequestConfig & { _swRetried?: boolean };
    if (
      typeof response.data === 'string' &&
      response.data.trim().startsWith('<') &&
      !retryCfg._swRetried
    ) {
      retryCfg._swRetried = true;
      await enableMocking();
      return apiClient.request(retryCfg);
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const retryCfg = error.config as
      | (InternalAxiosRequestConfig & { _swRetried?: boolean })
      | undefined;
    const isUnhandledBySw =
      error.response &&
      (typeof error.response.data === 'string' || !error.response.data?.error) &&
      error.response.status === 404;

    if (retryCfg && !retryCfg._swRetried && isUnhandledBySw) {
      retryCfg._swRetried = true;
      await enableMocking();
      return apiClient.request(retryCfg);
    }

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
