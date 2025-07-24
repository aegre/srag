import { useEffect, useState } from 'react';

interface UseAdminAuthOptions {
  redirectTo?: string;
  requireAuth?: boolean;
}

interface UseAdminAuthReturn {
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAdminAuth = (options: UseAdminAuthOptions = {}): UseAdminAuthReturn => {
  const { redirectTo = '/admin/login', requireAuth = true } = options;

  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setIsAuthenticated(false);
    window.location.href = redirectTo;
  };

  const checkAuth = async (): Promise<boolean> => {
    const storedToken = localStorage.getItem('admin_token');

    if (!storedToken) {
      if (requireAuth) {
        window.location.href = redirectTo;
      }
      setToken(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }

    // Optionally validate token with server
    try {
      const response = await fetch('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      });

      if (response.status === 401) {
        // Token is invalid, clear it and redirect
        logout();
        return false;
      }

      // Token is valid
      setToken(storedToken);
      setIsAuthenticated(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Auth validation error:', error);
      // On network error, assume token is valid for now
      setToken(storedToken);
      setIsAuthenticated(true);
      setIsLoading(false);
      return true;
    }
  };

  useEffect(() => {
    checkAuth();
  }, [requireAuth, redirectTo]);

  return {
    token,
    isLoading,
    isAuthenticated,
    logout,
    checkAuth
  };
}; 