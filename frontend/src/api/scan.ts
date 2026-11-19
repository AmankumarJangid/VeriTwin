import { apiClient } from './client';
import { ApiResponse, ScanResponseData, TwinView, LimitedTwinView, AllowedAction } from '../types/api';

export async function scanLogoApi(formData: FormData): Promise<ScanResponseData> {
  const res = (await apiClient.post('/products/scan-logo', formData)) as ApiResponse<ScanResponseData>;
  return res.data;
}

export async function scanQrApi(qrPayload: string): Promise<ScanResponseData> {
  const res = (await apiClient.post('/products/scan-qr', { qr_payload: qrPayload })) as ApiResponse<ScanResponseData>;
  return res.data;
}

export async function getScannedTwinDetailApi(twinId: string): Promise<{
  twin: TwinView | LimitedTwinView;
  role_view: 'FULL' | 'LIMITED';
  allowed_actions: AllowedAction[];
}> {
  const res = (await apiClient.get(`/products/twins/${twinId}`)) as ApiResponse<{
    twin: TwinView | LimitedTwinView;
    role_view: 'FULL' | 'LIMITED';
    allowed_actions: AllowedAction[];
  }>;
  return res.data;
}
