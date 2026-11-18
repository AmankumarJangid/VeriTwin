import crypto from 'crypto';
import QRCode from 'qrcode';

export const DEMO_ACCOUNTS = {
  manufacturer: {
    email: 'maker@veritwin.dev',
    password: 'Maker@123',
    role: 'MANUFACTURER',
    org: 'Aurelia Watches',
  },
  retailer: {
    email: 'retail@veritwin.dev',
    password: 'Retail@123',
    role: 'RETAILER',
    org: 'TimeHouse Retail',
  },
  consumer: {
    email: 'riya@veritwin.dev',
    password: 'Riya@123',
    role: 'CONSUMER',
    name: 'Riya Sharma',
  },
  consumer2: {
    email: 'arjun@veritwin.dev',
    password: 'Arjun@123',
    role: 'CONSUMER',
    name: 'Arjun Verma',
  },
};

export async function generateTestLogo(): Promise<Buffer> {
  return QRCode.toBuffer('VERITWIN_TEST_IMAGE_512x512', {
    width: 512,
    margin: 4,
    errorCorrectionLevel: 'M',
  });
}

export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function canonicalJson(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

export function randomEmail(): string {
  return `test-${crypto.randomBytes(4).toString('hex')}@veritwin-test.dev`;
}

export function randomSku(): string {
  return `TEST-SKU-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function randomBatchNo(): string {
  return `B-TEST-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}
