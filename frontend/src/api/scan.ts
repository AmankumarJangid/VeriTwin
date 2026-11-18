import { apiClient } from './client';
import { ApiResponse, ScanResponseData, TwinView, LimitedTwinView, AllowedAction, RoleView } from '../types/api';

export const scanApi = {
  scanLogo: async (imageUri: string): Promise<ScanResponseData> => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'scan.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const res = await apiClient.post<any, ApiResponse<ScanResponseData>>(
      '/products/scan-logo',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  },

  scanQr: async (qrPayload: string): Promise<ScanResponseData> => {
    const res = await apiClient.post<any, ApiResponse<ScanResponseData>>('/products/scan-qr', {
      qr_payload: qrPayload,
    });
    return res.data;
  },

  getScannedTwin: async (
    twinId: string
  ): Promise<{
    twin: TwinView | LimitedTwinView;
    role_view: RoleView;
    allowed_actions: AllowedAction[];
  }> => {
    const res = await apiClient.get<
      any,
      ApiResponse<{
        twin: TwinView | LimitedTwinView;
        role_view: RoleView;
        allowed_actions: AllowedAction[];
      }>
    >(`/products/twins/${twinId}`);
    return res.data;
  },
};
