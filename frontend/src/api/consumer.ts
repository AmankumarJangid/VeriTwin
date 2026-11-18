import { apiClient } from './client';
import {
  ApiResponse,
  ConsumerVaultItem,
  TwinView,
  CreateTransferResponseData,
  TransferStatusResponseData,
  ClaimTransferResponseData,
} from '../types/api';

export const consumerApi = {
  getVault: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get<any, ApiResponse<{ items: ConsumerVaultItem[] }>>(
      '/consumer/vault',
      { params }
    );
    return res;
  },

  getVaultItem: async (twinId: string): Promise<TwinView> => {
    const res = await apiClient.get<any, ApiResponse<{ twin: TwinView }>>(
      `/consumer/vault/${twinId}`
    );
    return res.data.twin;
  },

  createTransfer: async (twinId: string): Promise<CreateTransferResponseData> => {
    const res = await apiClient.post<any, ApiResponse<CreateTransferResponseData>>(
      '/consumer/transfers',
      { twin_id: twinId }
    );
    return res.data;
  },

  getTransferStatus: async (transferId: string): Promise<TransferStatusResponseData> => {
    const res = await apiClient.get<any, ApiResponse<TransferStatusResponseData>>(
      `/consumer/transfers/${transferId}`
    );
    return res.data;
  },

  cancelTransfer: async (transferId: string): Promise<void> => {
    await apiClient.delete(`/consumer/transfers/${transferId}`);
  },

  claimTransfer: async (qrPayload: string): Promise<ClaimTransferResponseData> => {
    const res = await apiClient.post<any, ApiResponse<ClaimTransferResponseData>>(
      '/consumer/transfers/claim',
      { qr_payload: qrPayload }
    );
    return res.data;
  },
};
