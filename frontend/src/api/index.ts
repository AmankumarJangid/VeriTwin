import { apiClient } from './client';
import { setupMockAdapter } from './mocks/mockAdapter';

// Automatically activate mock adapter when EXPO_PUBLIC_USE_MOCKS is enabled or by default
const useMocks = process.env.EXPO_PUBLIC_USE_MOCKS !== 'false';

if (useMocks) {
  setupMockAdapter(apiClient);
  console.log('[VeriTwin] Mock Adapter active (EXPO_PUBLIC_USE_MOCKS=true)');
}

export * from './client';
export * from './auth';
export * from './manufacturer';
export * from './retailer';
export * from './consumer';
export * from './scan';
export { devSettings } from './mocks/mockDatabase';
