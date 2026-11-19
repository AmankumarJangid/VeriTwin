// Auth Store (Zustand) with SecureStore token persistence and Dev Menu mock control
import { create } from 'zustand';
import { User, AuthTokens } from '../types/api';
import { storage } from '../utils/storage';

export type ScanOutcomeScenario = 'GENUINE' | 'ALREADY_CLAIMED' | 'FAKE' | 'LOW_CONFIDENCE' | 'SERVICE_DOWN';
export type TransferScenario = 'CLAIMED_AFTER_5S' | 'EXPIRES' | 'ALREADY_USED';

export interface DevMenuSettings {
  isOpen: boolean;
  scanOutcome: ScanOutcomeScenario;
  transferBehavior: TransferScenario;
  latencyMs: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  devMenu: DevMenuSettings;

  // Actions
  initialize: () => Promise<void>;
  setAuth: (user: User, tokens: AuthTokens) => Promise<void>;
  updateTokens: (tokens: Partial<AuthTokens>) => Promise<void>;
  logout: () => Promise<void>;
  setDevMenu: (settings: Partial<DevMenuSettings>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  devMenu: {
    isOpen: false,
    scanOutcome: 'GENUINE',
    transferBehavior: 'CLAIMED_AFTER_5S',
    latencyMs: 300,
  },

  initialize: async () => {
    try {
      const [accessToken, refreshToken, user] = await Promise.all([
        storage.getAccessToken(),
        storage.getRefreshToken(),
        storage.getUser(),
      ]);

      if (accessToken && user) {
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setAuth: async (user: User, tokens: AuthTokens) => {
    await Promise.all([
      storage.setAccessToken(tokens.access_token),
      storage.setRefreshToken(tokens.refresh_token),
      storage.setUser(user),
    ]);

    set({
      user,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  updateTokens: async (tokens: Partial<AuthTokens>) => {
    const currentRefresh = get().refreshToken;
    const newAccess = tokens.access_token;
    const newRefresh = tokens.refresh_token || currentRefresh;

    if (newAccess) {
      await storage.setAccessToken(newAccess);
    }
    if (newRefresh) {
      await storage.setRefreshToken(newRefresh);
    }

    set({
      accessToken: newAccess || get().accessToken,
      refreshToken: newRefresh,
    });
  },

  logout: async () => {
    await storage.clearAll();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setDevMenu: (settings: Partial<DevMenuSettings>) => {
    set((state) => ({
      devMenu: {
        ...state.devMenu,
        ...settings,
      },
    }));
  },
}));
