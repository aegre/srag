import type { APIResponse } from '../types/admin';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiCall = async <T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> => {
  const { method = 'GET', body, headers = {} } = options;

  const token = localStorage.getItem('admin_token');

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, config);
  const data = await response.json();

  if (!response.ok) {
    // Handle authentication errors
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login';
      throw new ApiError('Authentication required', 401);
    }

    throw new ApiError(
      data.error || `HTTP ${response.status}`,
      response.status,
      data
    );
  }

  return data;
};

// Convenience functions for common API operations
export const api = {
  get: <T = any>(endpoint: string) => apiCall<T>(endpoint),

  post: <T = any>(endpoint: string, data: any) =>
    apiCall<T>(endpoint, { method: 'POST', body: data }),

  put: <T = any>(endpoint: string, data: any) =>
    apiCall<T>(endpoint, { method: 'PUT', body: data }),

  delete: <T = any>(endpoint: string) =>
    apiCall<T>(endpoint, { method: 'DELETE' }),
};

// Admin-specific API functions
export const adminApi = {
  // Dashboard
  getStats: () => api.get<APIResponse<any>>('/api/dashboard/stats'),

  // Invitations
  getInvitations: () => api.get<APIResponse<any[]>>('/api/invitations'),
  getInvitation: (id: number) => api.get<APIResponse<any>>(`/api/invitations/${id}`),
  getAnalytics: () => api.get<APIResponse<any>>('/api/analytics/dashboard'),
  createInvitation: (data: any) => api.post<APIResponse<any>>('/api/invitations', data),
  updateInvitation: (id: number, data: any) => api.put<APIResponse<any>>(`/api/invitations/${id}`, data),
  deleteInvitation: (id: number) => api.delete<APIResponse<void>>(`/api/invitations/${id}`),

  // Settings
  getSettings: () => api.get<APIResponse<any>>('/api/settings'),
  updateSettings: (data: any) => api.put<APIResponse<any>>('/api/settings', data),

  // Export
  exportInvitations: () => {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch('/api/invitations/export', {
      method: 'GET',
      headers
    });
  },

  // Auth
  validateToken: () => api.get<APIResponse<any>>('/api/auth/validate'),
}; 