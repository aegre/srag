import { useEffect, useState } from 'react';

interface UseAdminAuthOptions {
  redirectTo?: string;
  requireAuth?: boolean;
}

interface UseAdminAuthReturn {
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: any | null;
  isAdmin: boolean;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAdminAuth = (options: UseAdminAuthOptions = {}): UseAdminAuthReturn => {
  const { redirectTo = '/admin/login', requireAuth = true } = options;

  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setIsAdmin(false);
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
      setUser(null);
      setIsAdmin(false);
      setIsLoading(false);
      return false;
    }

    // Validate token with server
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

      if (!response.ok) {
        // Other error, clear token and redirect
        logout();
        return false;
      }

      // Token is valid, get response data
      const data = await response.json();

      if (data.success && data.user) {
        // Update localStorage with fresh user data from server
        localStorage.setItem('admin_user', JSON.stringify(data.user));

        setToken(storedToken);
        setIsAuthenticated(true);
        setUser(data.user);
        setIsAdmin(data.user.role === 'admin');
      } else {
        // Invalid response, clear token and redirect
        logout();
        return false;
      }

      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Auth validation error:', error);
      // On network error, be more conservative and require re-authentication
      // This prevents security issues when the server is unreachable
      logout();
      return false;
    }
  };

  useEffect(() => {
    checkAuth();
  }, [requireAuth, redirectTo]);

  return {
    token,
    isLoading,
    isAuthenticated,
    user,
    isAdmin,
    logout,
    checkAuth
  };
}; 