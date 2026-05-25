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
        const apiUser = result.user;

        // Normalize user from API response
        const user: User = {
          id: apiUser.id,
          name: apiUser.name || apiUser.fullName || `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim(),
          email: apiUser.email,
          phone: apiUser.mobileNumber || apiUser.phone || phone,
          role: apiUser.role,
          avatar: apiUser.avatar || apiUser.photoUrl || null,
          isActive: apiUser.isActive ?? true,
          status: apiUser.status || 'active',
          createdAt: apiUser.createdAt || new Date().toISOString(),
          updatedAt: apiUser.updatedAt || new Date().toISOString(),
          unit: apiUser.unit,
          designation: apiUser.designation,
        };

        setApiToken(result.token);
        set({ user, token: result.token, isAuthenticated: true, isLoading: false });
      },

      demoLogin: async (role = 'volunteer') => {
        const result = await authApi.demoLogin(role);
        const apiUser = result.user;

        // Normalize user from API response
        const user: User = {
          id: apiUser.id,
          name: apiUser.name || apiUser.fullName || `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim(),
          email: apiUser.email,
          phone: apiUser.mobileNumber || apiUser.phone || '',
          role: apiUser.role,
          avatar: apiUser.avatar || apiUser.photoUrl || null,
          isActive: apiUser.isActive ?? true,
          status: apiUser.status || 'active',
          createdAt: apiUser.createdAt || new Date().toISOString(),
          updatedAt: apiUser.updatedAt || new Date().toISOString(),
          unit: apiUser.unit,
          designation: apiUser.designation,
        };

        setApiToken(result.token);
        set({ user, token: result.token, isAuthenticated: true, isLoading: false });
      },

      fetchUser: async () => {
        try {
          const apiUser = await authApi.me();

          // Normalize user from API response
          const user: User = {
            id: apiUser.id,
            name: apiUser.name || apiUser.fullName || `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim(),
            email: apiUser.email,
            phone: apiUser.mobileNumber || apiUser.phone || '',
            role: apiUser.role,
            avatar: apiUser.avatar || apiUser.photoUrl || null,
            isActive: apiUser.isActive ?? true,
            status: apiUser.status || 'active',
            createdAt: apiUser.createdAt || new Date().toISOString(),
            updatedAt: apiUser.updatedAt || new Date().toISOString(),
            unit: apiUser.unit,
            designation: apiUser.designation,
          };

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (e) {
          console.error('Failed to fetch user:', e);
          // If fetch fails, clear auth state
          removeApiToken();
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
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
