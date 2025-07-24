// Admin user types
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

// Login types
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: AdminUser;
  expiresAt: string;
}

// Invitation types - simplified basic invitation
export interface Invitation {
  id: number;
  slug: string;
  name: string;
  lastname: string;
  number_of_passes: number;
  is_confirmed: boolean;
  is_active: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  // Additional fields from API responses
  rsvp_count?: number;
}

// Global invitation settings - applies to all invitations
export interface InvitationSettings {
  id: number;
  event_date?: string;
  event_time?: string;
  rsvp_enabled: boolean;
  rsvp_deadline?: string;
  rsvp_phone?: string;
  rsvp_whatsapp?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInvitationRequest {
  name: string;
  lastname: string;
  slug: string;
  number_of_passes: number;
  is_confirmed?: boolean;
  is_active?: boolean;
}

export interface UpdateInvitationRequest {
  name?: string;
  lastname?: string;
  number_of_passes?: number;
  is_confirmed?: boolean;
  is_active?: boolean;
}

export interface UpdateSettingsRequest {
  event_date?: string;
  event_time?: string;
  rsvp_enabled?: boolean;
  rsvp_deadline?: string;
  rsvp_phone?: string;
  rsvp_whatsapp?: string;
  is_published?: boolean;
}

// Dashboard statistics types
export interface DashboardStats {
  totals: {
    invitations: number;
    rsvps: number;
    views: number;
    pending_rsvps: number;
  };
  recent: {
    views_last_7_days: number;
    rsvps_last_7_days: number;
  };
  top_invitations: Array<{
    slug: string;
    name: string;
    lastname: string;
    view_count: number;
  }>;
  settings?: {
    is_published: boolean;
  };
}

// RSVP types - simplified
export interface RSVPResponse {
  id: number;
  invitation_id: number;
  attendance_status: 'attending' | 'not_attending' | 'maybe';
  created_at: string;
}

// Analytics types
export interface AnalyticsEvent {
  id: number;
  invitation_id: number;
  event_type: string; // 'view', 'rsvp_start', 'rsvp_complete', 'music_play', etc.
  event_data?: any; // JSON object
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  timestamp: string;
}

// API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types - simplified
export interface InvitationFormData {
  name: string;
  lastname: string;
  slug: string;
  number_of_passes: number;
  is_confirmed: boolean;
  is_active: boolean;
}

export interface SettingsFormData {
  event_date: string;
  event_time: string;
  rsvp_enabled: boolean;
  rsvp_deadline: string;
  rsvp_phone: string;
  rsvp_whatsapp: string;
  is_published: boolean;
}

// Component prop types
export interface AdminDashboardProps {
  initialToken?: string;
}

export interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'purple' | 'green' | 'blue' | 'yellow';
}

export interface InvitationCardProps {
  invitation: Invitation;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

// User management types
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'editor';
}

export interface CreateUserResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    created_at: string;
  };
} 