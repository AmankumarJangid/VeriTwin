import { apiClient } from './client';
import {
  ApiResponse,
  Product,
  Batch,
  CreatedTwin,
  TwinListItem,
  TwinView,
  RetailerListItem,
  AnalyticsOverview,
  TimelineEvent,
  TwinStatus,
} from '../types/api';

export async function getAnalyticsOverviewApi(days: number = 30): Promise<AnalyticsOverview> {
  const res = (await apiClient.get(`/manufacturer/analytics/overview?days=${days}`)) as ApiResponse<AnalyticsOverview>;
  return res.data;
}

export async function getProductsApi(params?: {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
}): Promise<{ products: Product[]; meta?: any }> {
  const res = (await apiClient.get('/manufacturer/products', { params })) as ApiResponse<{ products: Product[] }>;
  return { products: res.data.products, meta: res.meta };
}

export async function getProductApi(id: string): Promise<{ product: Product; stats: any }> {
  const res = (await apiClient.get(`/manufacturer/products/${id}`)) as ApiResponse<{ product: Product; stats: any }>;
  return res.data;
}

export async function createProductApi(data: Partial<Product>): Promise<{ product: Product }> {
  const res = (await apiClient.post('/manufacturer/products', data)) as ApiResponse<{ product: Product }>;
  return res.data;
}

export async function updateProductApi(id: string, data: Partial<Product>): Promise<{ product: Product }> {
  const res = (await apiClient.patch(`/manufacturer/products/${id}`, data)) as ApiResponse<{ product: Product }>;
  return res.data;
}

export async function getBatchesApi(params?: {
  page?: number;
  limit?: number;
  product_id?: string;
}): Promise<{ batches: Batch[]; meta?: any }> {
  const res = (await apiClient.get('/manufacturer/batches', { params })) as ApiResponse<{ batches: Batch[] }>;
  return { batches: res.data.batches, meta: res.meta };
}

export async function createBatchApi(data: {
  product_id: string;
  batch_no: string;
  planned_quantity: number;
  manufactured_on: string;
  factory_location: string;
  notes?: string;
}): Promise<{ batch: Batch }> {
  const res = (await apiClient.post('/manufacturer/batches', data)) as ApiResponse<{ batch: Batch }>;
  return res.data;
}

export async function createTwinsApi(formData: FormData): Promise<{ count: number; twins: CreatedTwin[] }> {
  const res = (await apiClient.post('/manufacturer/twins', formData)) as ApiResponse<{ count: number; twins: CreatedTwin[] }>;
  return res.data;
}

export async function getTwinsApi(params?: {
  page?: number;
  limit?: number;
  status?: string;
  product_id?: string;
  batch_id?: string;
  q?: string;
}): Promise<{ twins: TwinListItem[]; meta?: any }> {
  const res = (await apiClient.get('/manufacturer/twins', { params })) as ApiResponse<{ twins: TwinListItem[] }>;
  return { twins: res.data.twins, meta: res.meta };
}

export async function getTwinApi(id: string): Promise<{
  twin: TwinView;
  assets?: {
    watermarked_logo_url: string;
    fallback_qr_url: string;
    fallback_qr_payload: string;
  };
}> {
  const res = (await apiClient.get(`/manufacturer/twins/${id}`)) as ApiResponse<{
    twin: TwinView;
    assets?: any;
  }>;
  return res.data;
}

export async function appendTwinEventApi(
  twinId: string,
  data: {
    event_type: 'QA_PASSED' | 'DISPATCHED_TO_RETAIL';
    notes?: string;
    metadata?: { retailer_id?: string };
  }
): Promise<{ event: TimelineEvent; twin_status: TwinStatus }> {
  const res = (await apiClient.post(`/manufacturer/twins/${twinId}/events`, data)) as ApiResponse<{
    event: TimelineEvent;
    twin_status: TwinStatus;
  }>;
  return res.data;
}

export async function appendBatchEventApi(
  batchId: string,
  data: {
    event_type: 'QA_PASSED' | 'DISPATCHED_TO_RETAIL';
    notes?: string;
    retailer_id?: string;
  }
): Promise<{ updated: number; skipped: Array<{ twin_id: string; reason: string; current_status: string }> }> {
  const res = (await apiClient.post(`/manufacturer/batches/${batchId}/events`, data)) as ApiResponse<{
    updated: number;
    skipped: any[];
  }>;
  return res.data;
}

export async function getRetailersApi(): Promise<{ retailers: RetailerListItem[] }> {
  const res = (await apiClient.get('/manufacturer/retailers')) as ApiResponse<{ retailers: RetailerListItem[] }>;
  return res.data;
}

export async function getAuditApi(params?: {
  page?: number;
  limit?: number;
  twin_id?: string;
  event_type?: string;
}): Promise<{ events: TimelineEvent[]; meta?: any }> {
  const res = (await apiClient.get('/manufacturer/audit', { params })) as ApiResponse<{ events: TimelineEvent[] }>;
  return { events: res.data.events, meta: res.meta };
}

export async function getTwinIntegrityApi(twinId: string): Promise<{
  valid: boolean;
  events_checked: number;
  broken_at_event_id: string | null;
}> {
  const res = (await apiClient.get(`/manufacturer/twins/${twinId}/integrity`)) as ApiResponse<{
    valid: boolean;
    events_checked: number;
    broken_at_event_id: string | null;
  }>;
  return res.data;
}
