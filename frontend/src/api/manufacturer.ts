import { apiClient } from './client';
import {
  ApiResponse,
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  ProductDetailResponseData,
  Batch,
  CreateBatchRequest,
  CreateTwinsResponseData,
  ManufacturerTwinListItem,
  TwinDetailWithAssetsResponseData,
  AppendTwinEventRequest,
  TimelineEvent,
  TwinStatus,
  BulkBatchEventRequest,
  BulkBatchEventResponseData,
  RetailerOption,
  ManufacturerAnalytics,
  AuditFeedResponse,
  IntegrityCheckResponseData,
} from '../types/api';

export const manufacturerApi = {
  // Products
  getProducts: async (params?: { page?: number; limit?: number; q?: string; category?: string }) => {
    const res = await apiClient.get<any, ApiResponse<{ products: Product[] }>>(
      '/manufacturer/products',
      { params }
    );
    return res;
  },

  createProduct: async (data: CreateProductRequest): Promise<Product> => {
    const res = await apiClient.post<any, ApiResponse<{ product: Product }>>(
      '/manufacturer/products',
      data
    );
    return res.data.product;
  },

  getProductDetail: async (productId: string): Promise<ProductDetailResponseData> => {
    const res = await apiClient.get<any, ApiResponse<ProductDetailResponseData>>(
      `/manufacturer/products/${productId}`
    );
    return res.data;
  },

  updateProduct: async (productId: string, data: UpdateProductRequest): Promise<Product> => {
    const res = await apiClient.patch<any, ApiResponse<{ product: Product }>>(
      `/manufacturer/products/${productId}`,
      data
    );
    return res.data.product;
  },

  // Batches
  getBatches: async (params?: { page?: number; limit?: number; product_id?: string }) => {
    const res = await apiClient.get<any, ApiResponse<{ batches: Batch[] }>>(
      '/manufacturer/batches',
      { params }
    );
    return res;
  },

  createBatch: async (data: CreateBatchRequest): Promise<Batch> => {
    const res = await apiClient.post<any, ApiResponse<{ batch: Batch }>>(
      '/manufacturer/batches',
      data
    );
    return res.data.batch;
  },

  // Twins
  createTwins: async (formData: FormData | object): Promise<CreateTwinsResponseData> => {
    const res = await apiClient.post<any, ApiResponse<CreateTwinsResponseData>>(
      '/manufacturer/twins',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  },

  getTwins: async (params?: {
    page?: number;
    limit?: number;
    status?: TwinStatus;
    product_id?: string;
    batch_id?: string;
    q?: string;
  }) => {
    const res = await apiClient.get<any, ApiResponse<{ twins: ManufacturerTwinListItem[] }>>(
      '/manufacturer/twins',
      { params }
    );
    return res;
  },

  getTwinDetail: async (twinId: string): Promise<TwinDetailWithAssetsResponseData> => {
    const res = await apiClient.get<any, ApiResponse<TwinDetailWithAssetsResponseData>>(
      `/manufacturer/twins/${twinId}`
    );
    return res.data;
  },

  appendTwinEvent: async (
    twinId: string,
    data: AppendTwinEventRequest
  ): Promise<{ event: TimelineEvent; twin_status: TwinStatus }> => {
    const res = await apiClient.post<
      any,
      ApiResponse<{ event: TimelineEvent; twin_status: TwinStatus }>
    >(`/manufacturer/twins/${twinId}/events`, data);
    return res.data;
  },

  bulkBatchEvents: async (
    batchId: string,
    data: BulkBatchEventRequest
  ): Promise<BulkBatchEventResponseData> => {
    const res = await apiClient.post<any, ApiResponse<BulkBatchEventResponseData>>(
      `/manufacturer/batches/${batchId}/events`,
      data
    );
    return res.data;
  },

  getRetailers: async (): Promise<RetailerOption[]> => {
    const res = await apiClient.get<any, ApiResponse<{ retailers: RetailerOption[] }>>(
      '/manufacturer/retailers'
    );
    return res.data.retailers;
  },

  getAnalyticsOverview: async (days: number = 30): Promise<ManufacturerAnalytics> => {
    const res = await apiClient.get<any, ApiResponse<ManufacturerAnalytics>>(
      '/manufacturer/analytics/overview',
      { params: { days } }
    );
    return res.data;
  },

  getAuditFeed: async (params?: {
    page?: number;
    limit?: number;
    twin_id?: string;
    event_type?: string;
  }) => {
    const res = await apiClient.get<any, ApiResponse<{ events: any[] }>>(
      '/manufacturer/audit',
      { params }
    );
    return res;
  },

  checkIntegrity: async (twinId: string): Promise<IntegrityCheckResponseData> => {
    const res = await apiClient.get<any, ApiResponse<IntegrityCheckResponseData>>(
      `/manufacturer/twins/${twinId}/integrity`
    );
    return res.data;
  },
};
