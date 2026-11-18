import axios from 'axios';
import FormData from 'form-data';
import { env } from '../config/env';

export async function encode(imageBuffer: Buffer, twinCode: string): Promise<Buffer> {
  if (env.IMAGE_SERVICE_MOCK) {
    return imageBuffer;
  }

  const form = new FormData();
  form.append('image', imageBuffer, { filename: 'image.png', contentType: 'image/png' });
  form.append('twin_code', twinCode);

  const response = await axios.post(`${env.IMAGE_SERVICE_URL}/internal/watermark/encode`, form, {
    headers: {
      ...form.getHeaders(),
      'X-Internal-Key': env.IMAGE_SERVICE_KEY,
    },
    responseType: 'arraybuffer',
  });

  return Buffer.from(response.data as ArrayBuffer);
}

export interface DecodeResult {
  decoded: boolean;
  twin_code?: string;
  confidence?: number;
  [key: string]: unknown;
}

export async function decode(imageBuffer: Buffer, mockTwinCode?: string): Promise<DecodeResult> {
  if (mockTwinCode) {
    return { decoded: true, twin_code: mockTwinCode.toUpperCase(), confidence: 1.0 };
  }

  if (env.IMAGE_SERVICE_MOCK) {
    return { decoded: false, confidence: 0 };
  }

  const form = new FormData();
  form.append('image', imageBuffer, { filename: 'image.png', contentType: 'image/png' });

  const response = await axios.post<DecodeResult>(
    `${env.IMAGE_SERVICE_URL}/internal/watermark/decode`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        'X-Internal-Key': env.IMAGE_SERVICE_KEY,
      },
    },
  );

  return response.data;
}

export async function healthCheck(): Promise<'ok' | 'error'> {
  try {
    const res = await axios.get(`${env.IMAGE_SERVICE_URL}/health`, { timeout: 2000 });
    return res.status === 200 && res.data?.status === 'ok' ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}
