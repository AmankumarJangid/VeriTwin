import { apiClient } from './client';
import {
  ApiResponse,
  ConsumerVaultItem,
  TwinView,
  TransferInitiateResponse,
  TransferPollResponse,
  TransferClaimResponse,
} from '../types/api';

export async function getConsumerVaultApi(params?: {
  page?: number;
  limit?: number;
}): Promise<{ items: ConsumerVaultItem[]; meta?: any }> {
  const res = (await apiClient.get('/consumer/vault', { params })) as ApiResponse<{ items: ConsumerVaultItem[] }>;
  return { items: res.data.items, meta: res.meta };
}

export async function getConsumerVaultItemApi(twinId: string): Promise<TwinView> {
  const res = (await apiClient.get(`/consumer/vault/${twinId}`)) as ApiResponse<{ twin: TwinView }>;
  return res.data.twin;
}

export async function initiateTransferApi(twinId: string): Promise<TransferInitiateResponse> {
  const res = (await apiClient.post('/consumer/transfers', { twin_id: twinId })) as ApiResponse<TransferInitiateResponse>;
  return res.data;
}

export async function pollTransferApi(transferId: string): Promise<TransferPollResponse> {
  const res = (await apiClient.get(`/consumer/transfers/${transferId}`)) as ApiResponse<TransferPollResponse>;
  return res.data;
}

export async function cancelTransferApi(transferId: string): Promise<{ transfer_id: string; status: string }> {
  const res = (await apiClient.delete(`/consumer/transfers/${transferId}`)) as ApiResponse<{
    transfer_id: string;
    status: string;
  }>;
  return res.data;
}

export async function claimTransferApi(qrPayload: string): Promise<TransferClaimResponse> {
  const res = (await apiClient.post('/consumer/transfers/claim', { qr_payload: qrPayload })) as ApiResponse<TransferClaimResponse>;
  return res.data;
}
