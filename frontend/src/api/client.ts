import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { ApiError } from '../utils/errors';
import { ApiResponse, ApiErrorResponse, AuthTokens } from '../types/api';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { tokens } = useAuthStore.getState();
    if (tokens?.access_token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Concurrency lock for token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: auto-refresh on 401 & error unwrapping
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    // If the backend wraps in { success: true, data, meta }
    if (body && typeof body === 'object' && 'success' in body) {
      if (body.success === true) {
        // Return full body so callers can access data & meta
        return body;
      } else {
        // success === false returned with 200
        const errBody = body as ApiErrorResponse;
        throw new ApiError(
          errBody.error?.message || 'Request failed',
          errBody.error?.code || 'INTERNAL_ERROR',
          errBody.error?.details,
          response.status
        );
      }
    }
    return body;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check for 401 TOKEN_EXPIRED
    const errorCode = error.response?.data?.error?.code;
    const isTokenExpired =
      error.response?.status === 401 &&
      (errorCode === 'TOKEN_EXPIRED' || error.response?.data?.error?.message?.includes('expired'));

    if (isTokenExpired && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { tokens, updateTokens, logout } = useAuthStore.getState();

      if (!tokens?.refresh_token) {
        isRefreshing = false;
        await logout();
        return Promise.reject(new ApiError('Unauthenticated', 'UNAUTHENTICATED', undefined, 401));
      }

      try {
        const refreshRes = await axios.post<ApiResponse<{ tokens: AuthTokens }>>(
          `${BASE_URL}/auth/refresh`,
          { refresh_token: tokens.refresh_token },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newTokens = refreshRes.data.data.tokens;
        await updateTokens(newTokens);
        processQueue(null, newTokens.access_token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await logout();
        return Promise.reject(new ApiError('Session expired', 'TOKEN_EXPIRED', undefined, 401));
      } finally {
        isRefreshing = false;
      }
    }

    // Normal error unwrap
    if (error.response?.data?.error) {
      const err = error.response.data.error;
      throw new ApiError(err.message, err.code, err.details, error.response.status);
    }

    throw new ApiError(
      error.message || 'Network request failed',
      'INTERNAL_ERROR',
      undefined,
      error.response?.status
    );
  }
);
