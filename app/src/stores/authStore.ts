import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';
import { authApi, setToken as setApiToken, removeToken as removeApiToken } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  requestOTP: (phone: string, role?: UserRole) => Promise<{ requestId: string; expiresIn: number }>;
  verifyOTP: (phone: string, otp: string, role?: UserRole) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setToken: (token) => {
        if (token) {
          setApiToken(token);
          set({ token, isAuthenticated: true });
        } else {
          removeApiToken();
          set({ token: null, isAuthenticated: false });
        }
      },

      requestOTP: async (phone, role = 'volunteer') => {
        return await authApi.requestOTP(phone, role);
      },

      verifyOTP: async (phone, otp, role = 'volunteer') => {
        const result = await authApi.verifyOTP(phone, otp, role);
        setApiToken(result.token);
        set({ user: result.user, token: result.token, isAuthenticated: true, isLoading: false });
      },

      demoLogin: async (role = 'volunteer') => {
        const result = await authApi.demoLogin(role);
        setApiToken(result.token);
        set({ user: result.user, token: result.token, isAuthenticated: true, isLoading: false });
      },

      fetchUser: async () => {
        const user = await authApi.me();
        set({ user, isAuthenticated: true, isLoading: false });
      },

      logout: async () => {
        try { await authApi.logout(); } catch { /* ignore */ }
        removeApiToken();
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },
    }),
    {
      name: 'vkumb_auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
