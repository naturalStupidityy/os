import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { UserRole } from '@/types';
import { useAuthStore } from '@/stores/authStore';

const PUBLIC_ROUTES = ['/login', '/register'];

export function useAuthGuard(requiredRoles?: UserRole[]) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !PUBLIC_ROUTES.includes(location.pathname)) {
      navigate('/login', { replace: true });
      return;
    }

    if (isAuthenticated && location.pathname === '/login') {
      navigate(getDefaultRoute(user!.role), { replace: true });
      return;
    }

    if (isAuthenticated && user && requiredRoles && !requiredRoles.includes(user.role)) {
      navigate(getDefaultRoute(user.role), { replace: true });
    }
  }, [isAuthenticated, isLoading, user, location.pathname, navigate, requiredRoles]);

  return { user, isAuthenticated, isLoading };
}

export function getDefaultRoute(role: UserRole): string {
  switch (role) {
    case 'admin': return '/command-center';
    case 'instructor': return '/dashboard';
    case 'assessment_admin': return '/dashboard';
    default: return '/dashboard';
  }
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return async () => {
    await logout();
    navigate('/login');
  };
}
