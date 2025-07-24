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

      // Get user info from localStorage
      const userStr = localStorage.getItem('admin_user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
          setIsAdmin(userData.role === 'admin');
        } catch (err) {
          console.error('Error parsing user data:', err);
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }

      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Auth validation error:', error);
      // On network error, assume token is valid for now
      setToken(storedToken);
      setIsAuthenticated(true);

      // Get user info from localStorage
      const userStr = localStorage.getItem('admin_user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
          setIsAdmin(userData.role === 'admin');
        } catch (err) {
          console.error('Error parsing user data:', err);
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }

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
    user,
    isAdmin,
    logout,
    checkAuth
  };
}; 