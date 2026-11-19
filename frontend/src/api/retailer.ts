import { apiClient } from './client';
import {
  ApiResponse,
  RetailerInventoryResponse,
  RetailerSaleItem,
  ConsumerLookupResult,
  TimelineEvent,
  TwinStatus,
} from '../types/api';

export async function getRetailerInventoryApi(params?: {
  status?: string;
  page?: number;
  limit?: number;
  q?: string;
}): Promise<RetailerInventoryResponse & { meta?: any }> {
  const res = (await apiClient.get('/retailer/inventory', { params })) as ApiResponse<RetailerInventoryResponse>;
  return { ...res.data, meta: res.meta };
}

export async function appendRetailerEventApi(
  twinId: string,
  data: {
    event_type: 'RECEIVED_AT_RETAIL' | 'INSPECTED';
    notes?: string;
    metadata?: { condition?: 'OK' | 'DAMAGED' | 'SUSPICIOUS' };
  }
): Promise<{ event: TimelineEvent; twin_status: TwinStatus }> {
  const res = (await apiClient.post(`/retailer/twins/${twinId}/events`, data)) as ApiResponse<{
    event: TimelineEvent;
    twin_status: TwinStatus;
  }>;
  return res.data;
}

export async function lookupConsumerApi(email: string): Promise<ConsumerLookupResult> {
  const res = (await apiClient.get(`/retailer/consumers/lookup?email=${encodeURIComponent(email)}`)) as ApiResponse<{
    consumer: ConsumerLookupResult;
  }>;
  return res.data.consumer;
}

export async function sellTwinApi(
  twinId: string,
  data: {
    consumer_id: string;
    sale_price: number;
    invoice_no: string;
    notes?: string;
  }
): Promise<{
  twin_id: string;
  status: TwinStatus;
  owner: { user_id: string; full_name: string };
  event: TimelineEvent;
}> {
  const res = (await apiClient.post(`/retailer/twins/${twinId}/sell`, data)) as ApiResponse<{
    twin_id: string;
    status: TwinStatus;
    owner: { user_id: string; full_name: string };
    event: TimelineEvent;
  }>;
  return res.data;
}

export async function getRetailerSalesApi(params?: {
  page?: number;
  limit?: number;
}): Promise<{ sales: RetailerSaleItem[]; meta?: any }> {
  const res = (await apiClient.get('/retailer/sales', { params })) as ApiResponse<{ sales: RetailerSaleItem[] }>;
  return { sales: res.data.sales, meta: res.meta };
}
