import type { APIResponse, PaginatedResponse } from '../types/admin';

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
  // Fetch a larger page by default so the admin can see all invitations
  getInvitations: (params?: { page?: number; limit?: number }) => {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 1000;
    return api.get<APIResponse<any[]>>(`/api/invitations?page=${page}&limit=${limit}`);
  },
  getInvitation: (id: number) => api.get<APIResponse<any>>(`/api/invitations/${id}`),
  getAnalytics: (timezone?: string) => {
    const url = new URL('/api/analytics/dashboard', window.location.origin);
    if (timezone) {
      url.searchParams.set('timezone', timezone);
    }
    return api.get<APIResponse<any>>(url.toString());
  },
  createInvitation: (data: any) => api.post<APIResponse<any>>('/api/invitations', data),
  updateInvitation: (id: number, data: any) => api.put<APIResponse<any>>(`/api/invitations/${id}`, data),
  deleteInvitation: (id: number) => api.delete<APIResponse<void>>(`/api/invitations/${id}`),

  // Settings
  getSettings: () => api.get<APIResponse<any>>('/api/settings'),
  updateSettings: (data: any) => api.put<APIResponse<any>>('/api/settings', data),

  // Export
  exportInvitations: (timezone?: string) => {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = new URL('/api/invitations/export', window.location.origin);
    if (timezone) {
      url.searchParams.set('timezone', timezone);
    }

    return fetch(url.toString(), {
      method: 'GET',
      headers
    });
  },

  exportMessages: (timezone?: string) => {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = new URL('/api/analytics/export-messages', window.location.origin);
    if (timezone) {
      url.searchParams.set('timezone', timezone);
    }

    return fetch(url.toString(), {
      method: 'GET',
      headers
    });
  },

  // Messages visibility
  hideMessage: (analyticsId: number) =>
    api.post<APIResponse>('/api/analytics/messages', { analytics_id: analyticsId }),
  unhideMessage: (analyticsId: number) =>
    api.delete<APIResponse>(`/api/analytics/messages?analytics_id=${analyticsId}`),

  // Auth
  validateToken: () => api.get<APIResponse<any>>('/api/auth/validate'),
  createUser: (data: any) => api.post<APIResponse<any>>('/api/auth/create-user', data),
  getUsers: () => api.get<PaginatedResponse<any>>('/api/auth/users'),
  getUser: (id: number) => api.get<APIResponse<any>>(`/api/auth/users/${id}`),
  updateUser: (id: number, data: any) => api.put<APIResponse<any>>(`/api/auth/users/${id}`, data),
  deleteUser: (id: number) => api.delete<APIResponse<void>>(`/api/auth/users/${id}`),
}; 