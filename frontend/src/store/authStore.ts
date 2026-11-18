import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { User, AuthTokens, UserRole } from '../types/api';

const ACCESS_TOKEN_KEY = 'vt_access_token';
const REFRESH_TOKEN_KEY = 'vt_refresh_token';
const USER_KEY = 'vt_user_profile';

// Cross-platform secure storage helper (falls back to localStorage or memory on web)
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn('Storage set error:', e);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('Storage remove error:', e);
    }
  },
};

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  initialize: () => Promise<void>;
  setAuth: (user: User, tokens: AuthTokens) => Promise<void>;
  updateTokens: (tokens: AuthTokens) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoUser: (role: UserRole) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    try {
      const accessToken = await storage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
      const userJson = await storage.getItem(USER_KEY);

      if (accessToken && refreshToken && userJson) {
        const user = JSON.parse(userJson) as User;
        const tokens: AuthTokens = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 900,
        };
        set({ user, tokens, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
    }
  },

  setAuth: async (user: User, tokens: AuthTokens) => {
    await storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    await storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    await storage.setItem(USER_KEY, JSON.stringify(user));

    set({ user, tokens, isAuthenticated: true });
  },

  updateTokens: async (tokens: AuthTokens) => {
    await storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    await storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    set({ tokens });
  },

  updateUser: async (user: User) => {
    await storage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    await storage.removeItem(ACCESS_TOKEN_KEY);
    await storage.removeItem(REFRESH_TOKEN_KEY);
    await storage.removeItem(USER_KEY);

    set({ user: null, tokens: null, isAuthenticated: false });
  },

  switchDemoUser: async (role: UserRole) => {
    let mockUser: User;
    if (role === 'MANUFACTURER') {
      mockUser = {
        user_id: 'mfg-001-uuid',
        full_name: 'Aurelia Manufacturer Admin',
        email: 'maker@veritwin.dev',
        role: 'MANUFACTURER',
        organization_name: 'Aurelia Watches Ltd.',
        created_at: new Date().toISOString(),
      };
    } else if (role === 'RETAILER') {
      mockUser = {
        user_id: 'ret-001-uuid',
        full_name: 'TimeHouse Retailer Manager',
        email: 'retail@veritwin.dev',
        role: 'RETAILER',
        organization_name: 'TimeHouse Retail',
        created_at: new Date().toISOString(),
      };
    } else {
      mockUser = {
        user_id: 'con-001-uuid',
        full_name: 'Riya Sharma',
        email: 'riya@veritwin.dev',
        role: 'CONSUMER',
        organization_name: null,
        created_at: new Date().toISOString(),
      };
    }

    const mockTokens: AuthTokens = {
      access_token: `mock_jwt_access_${role.toLowerCase()}`,
      refresh_token: `mock_jwt_refresh_${role.toLowerCase()}`,
      expires_in: 900,
    };

    await get().setAuth(mockUser, mockTokens);
  },
}));
