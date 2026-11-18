import { apiClient } from './client';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponseData,
  ApiResponse,
  User,
  AuthTokens,
} from '../types/api';

export const authApi = {
  login: async (payload: LoginRequest): Promise<AuthResponseData> => {
    const res = await apiClient.post<any, ApiResponse<AuthResponseData>>('/auth/login', payload);
    return res.data;
  },

  register: async (payload: RegisterRequest): Promise<AuthResponseData> => {
    const res = await apiClient.post<any, ApiResponse<AuthResponseData>>('/auth/register', payload);
    return res.data;
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const res = await apiClient.post<any, ApiResponse<{ tokens: AuthTokens }>>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return res.data.tokens;
  },

  logout: async (refreshToken?: string): Promise<void> => {
    try {
      await apiClient.post('/auth/logout', { refresh_token: refreshToken });
    } catch {
      // Ignored on logout
    }
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<any, ApiResponse<{ user: User }>>('/auth/me');
    return res.data.user;
  },
};
