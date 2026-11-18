import { apiClient } from './client';
import {
  ApiResponse,
  RetailerInventoryResponseData,
  TwinStatus,
  RetailerAppendEventRequest,
  TimelineEvent,
  ConsumerLookupResponseData,
  RetailerSellRequest,
  RetailerSellResponseData,
  RetailerSaleHistoryItem,
} from '../types/api';

export const retailerApi = {
  getInventory: async (params?: {
    status?: 'IN_TRANSIT' | 'IN_RETAIL';
    page?: number;
    limit?: number;
    q?: string;
  }) => {
    const res = await apiClient.get<any, ApiResponse<RetailerInventoryResponseData>>(
      '/retailer/inventory',
      { params }
    );
    return res;
  },

  appendEvent: async (
    twinId: string,
    data: RetailerAppendEventRequest
  ): Promise<{ event: TimelineEvent; twin_status: TwinStatus }> => {
    const res = await apiClient.post<
      any,
      ApiResponse<{ event: TimelineEvent; twin_status: TwinStatus }>
    >(`/retailer/twins/${twinId}/events`, data);
    return res.data;
  },

  lookupConsumer: async (email: string): Promise<ConsumerLookupResponseData['consumer']> => {
    const res = await apiClient.get<any, ApiResponse<ConsumerLookupResponseData>>(
      '/retailer/consumers/lookup',
      { params: { email } }
    );
    return res.data.consumer;
  },

  sellTwin: async (twinId: string, data: RetailerSellRequest): Promise<RetailerSellResponseData> => {
    const res = await apiClient.post<any, ApiResponse<RetailerSellResponseData>>(
      `/retailer/twins/${twinId}/sell`,
      data
    );
    return res.data;
  },

  getSalesHistory: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get<any, ApiResponse<{ sales: RetailerSaleHistoryItem[] }>>(
      '/retailer/sales',
      { params }
    );
    return res;
  },
};
