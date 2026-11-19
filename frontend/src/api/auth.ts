import { apiClient } from './client';
import { ApiResponse, AuthResponseData, User, AuthTokens } from '../types/api';

export async function loginApi(email: string, password: string): Promise<AuthResponseData> {
  const res = (await apiClient.post('/auth/login', { email, password })) as ApiResponse<AuthResponseData>;
  return res.data;
}

export async function registerApi(data: {
  full_name: string;
  email: string;
  password: string;
  role?: string;
  organization_name?: string;
  invite_code?: string;
}): Promise<AuthResponseData> {
  const res = (await apiClient.post('/auth/register', data)) as ApiResponse<AuthResponseData>;
  return res.data;
}

export async function refreshApi(refreshToken: string): Promise<{ tokens: AuthTokens }> {
  const res = (await apiClient.post('/auth/refresh', { refresh_token: refreshToken })) as ApiResponse<{ tokens: AuthTokens }>;
  return res.data;
}

export async function logoutApi(refreshToken: string): Promise<{ logged_out: boolean }> {
  const res = (await apiClient.post('/auth/logout', { refresh_token: refreshToken })) as ApiResponse<{ logged_out: boolean }>;
  return res.data;
}

export async function getMeApi(): Promise<{ user: User }> {
  const res = (await apiClient.get('/auth/me')) as ApiResponse<{ user: User }>;
  return res.data;
}
