import axios, { AxiosInstance, AxiosResponse } from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class TestApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string = BASE_URL) {
    this.client = axios.create({
      baseURL,
      validateStatus: () => true, // Don't throw on 4xx/5xx so tests can assert status codes
    });
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private headers(extra: Record<string, string> = {}) {
    const h: Record<string, string> = {
      'x-test-suite': 'true',
      ...extra,
    };
    if (this.token) {
      h['Authorization'] = `Bearer ${this.token}`;
    }
    return h;
  }

  async get<T = any>(url: string, params?: Record<string, any>): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.client.get(url, { headers: this.headers(), params });
  }

  async post<T = any>(url: string, body?: any): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.client.post(url, body, {
      headers: this.headers({ 'Content-Type': 'application/json' }),
    });
  }

  async patch<T = any>(url: string, body?: any): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.client.patch(url, body, {
      headers: this.headers({ 'Content-Type': 'application/json' }),
    });
  }

  async delete<T = any>(url: string): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.client.delete(url, { headers: this.headers() });
  }

  async postMultipart<T = any>(
    url: string,
    fields: Record<string, any>,
    files: Record<string, { buffer: Buffer; filename: string; contentType: string }>,
    extraHeaders?: Record<string, string>,
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    const form = new FormData();
    for (const [key, val] of Object.entries(fields)) {
      form.append(key, String(val));
    }
    for (const [key, file] of Object.entries(files)) {
      form.append(key, file.buffer, {
        filename: file.filename,
        contentType: file.contentType,
      });
    }

    return this.client.post(url, form, {
      headers: this.headers({
        ...form.getHeaders(),
        ...(extraHeaders ?? {}),
      }),
    });
  }
}
