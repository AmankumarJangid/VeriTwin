// Scan result transient store
import { create } from 'zustand';
import { ScanResponseData } from '../types/api';

interface ScanStoreState {
  currentResult: ScanResponseData | null;
  setCurrentResult: (result: ScanResponseData | null) => void;
}

export const useScanStore = create<ScanStoreState>((set) => ({
  currentResult: null,
  setCurrentResult: (result) => set({ currentResult: result }),
}));
