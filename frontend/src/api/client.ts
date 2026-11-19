// VeriTwin API Client with Axios, Auth Interceptors, Refresh-on-401 & Mock Adapter
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError, ApiResponse, ApiErrorResponse } from '../types/api';
import { useAuthStore } from '../store/authStore';
import { setupMockAdapter } from './mocks/mockAdapter';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';
const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (USE_MOCKS) {
  setupMockAdapter(apiClient);
}

// Queue for pending requests during token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Bearer Token & handle FormData boundaries
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      if (typeof (config.headers as any).set === 'function') {
        (config.headers as any).set('Authorization', `Bearer ${token}`);
      } else {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    // On web, if data is FormData, remove Content-Type so browser can set boundary
    if (typeof window !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Unwrap envelopes and handle 401 refresh
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && !(body instanceof Blob) && 'success' in body) {
      if (body.success) {
        // Return full body or data with meta
        return body;
      } else {
        const errPayload = body as ApiErrorResponse;
        throw new ApiError(
          errPayload.error.message,
          errPayload.error.code,
          response.status,
          errPayload.error.details
        );
      }
    }
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if error is 401 and not already retrying
    const status = error.response?.status;
    const data = error.response?.data as ApiErrorResponse | undefined;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise<any>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        isRefreshing = false;
        return Promise.reject(
          new ApiError('No refresh token available', 'UNAUTHENTICATED', 401)
        );
      }

      try {
        const refreshRes = await axios.post<ApiResponse<{ tokens: { access_token: string; refresh_token: string } }>>(
          `${BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        if (refreshRes.data.success && refreshRes.data.data?.tokens) {
          const { access_token, refresh_token } = refreshRes.data.data.tokens;
          await useAuthStore.getState().updateTokens({
            access_token,
            refresh_token,
          });

          apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;

          processQueue(null, access_token);
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh response invalid');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await useAuthStore.getState().logout();
        return Promise.reject(
          new ApiError('Session expired. Please log in again.', 'UNAUTHENTICATED', 401)
        );
      } finally {
        isRefreshing = false;
      }
    }

    // Normal error unwrap
    if (data?.error) {
      throw new ApiError(
        data.error.message,
        data.error.code,
        status,
        data.error.details
      );
    }

    const fallbackMsg = error.message || 'Request failed';
    throw new ApiError(fallbackMsg, 'INTERNAL_ERROR', status);
  }
);
