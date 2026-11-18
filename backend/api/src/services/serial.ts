import crypto from 'crypto';

export function generateTwinCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

const CAT3_MAP: Record<string, string> = {
  WATCH: 'WCH',
  APPAREL: 'APP',
  FOOTWEAR: 'FTW',
  ACCESSORY: 'ACC',
  OTHER: 'OTH',
};

export function generateSerialNumber(category: string, year: number, seq: number): string {
  const cat3 = CAT3_MAP[category] ?? category.substring(0, 3).toUpperCase();
  return `VT-${cat3}-${year}-${seq.toString().padStart(6, '0')}`;
}
