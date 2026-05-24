import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, UserRole, AuthState } from '@/types';
import { authApi, setToken as setApiToken, removeToken as removeApiToken } from '@/lib/api';

interface AuthStore extends AuthState {
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;

  // Auth flows
  requestOTP: (phone: string, role?: UserRole) => Promise<{ requestId: string; expiresIn: number }>;
  verifyOTP: (phone: string, otp: string, role?: UserRole) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;

  // Role check
  hasRole: (roles: UserRole[]) => boolean;
  isAdmin: () => boolean;
  isInstructor: () => boolean;
  isVolunteer: () => boolean;
  isAssessmentAdmin: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Setters
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

      setLoading: (loading) => set({ isLoading: loading }),

      // OTP Flow
      requestOTP: async (phone, role = 'volunteer') => {
        const result = await authApi.requestOTP(phone, role);
        return result;
      },

      verifyOTP: async (phone, otp, role = 'volunteer') => {
        const result = await authApi.verifyOTP(phone, otp, role);
        setApiToken(result.token);
        set({
          user: result.user,
          token: result.token,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      // Demo Login - bypass OTP for testing
      demoLogin: async (role = 'volunteer') => {
        const result = await authApi.demoLogin(role);
        setApiToken(result.token);
        set({
          user: result.user,
          token: result.token,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      // Fetch current user
      fetchUser: async () => {
        try {
          set({ isLoading: true });
          const user = await authApi.me();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          removeApiToken();
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          throw error;
        }
      },

      // Logout
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore
        } finally {
          removeApiToken();
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          if (typeof window !== 'undefined') {
            localStorage.removeItem('vkumb_sync_queue');
          }
        }
      },

      // Role helpers
      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },

      isInstructor: () => {
        const { user } = get();
        return user?.role === 'instructor';
      },

      isVolunteer: () => {
        const { user } = get();
        return user?.role === 'volunteer';
      },

      isAssessmentAdmin: () => {
        const { user } = get();
        return user?.role === 'assessment_admin';
      },
    }),
    {
      name: 'vkumb_auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setApiToken(state.token);
      },
    }
  )
);
