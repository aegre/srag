// Database types for Quinceañera CMS
// Generated from database schema

// Cloudflare D1 types
declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<D1Result>;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run(): Promise<D1Result>;
    all<T = unknown>(): Promise<D1Result<T>>;
  }

  interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    meta: {
      changed_db: boolean;
      changes: number;
      duration: number;
      last_row_id: number;
      rows_read: number;
      rows_written: number;
      size_after: number;
    };
  }
}

export interface ItineraryItem {
  time: string;
  event: string;
  icon: string;
}

export interface Invitation {
  id: number;
  slug: string;

  // Personal information
  celebrant_name: string;
  celebrant_lastname: string | null;
  event_date: string;
  event_time: string;

  // Venue information
  venue_name: string;
  venue_address: string;
  venue_coordinates: string | null;

  // Party details
  dress_code: string | null;
  max_passes: number;

  // Content customization
  personal_message: string | null;
  parents_message: string | null;
  itinerary: ItineraryItem[] | null;
  important_info: string[] | null;

  // Settings
  music_enabled: boolean;
  music_url: string | null;
  background_music_volume: number;

  // Gift registry
  gift_registry_url: string | null;
  gift_registry_message: string | null;

  // RSVP settings
  rsvp_enabled: boolean;
  rsvp_deadline: string | null;
  rsvp_phone: string | null;
  rsvp_whatsapp: string | null;

  // Status and metadata
  is_published: boolean;
  password_protected: boolean;
  password_hash: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface Analytics {
  id: number;
  invitation_id: number;
  event_type: string;
  event_data: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  timestamp: string;
}

export interface RsvpResponse {
  id: number;
  invitation_id: number;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  attendance_status: 'attending' | 'not_attending' | 'maybe';
  number_of_guests: number;
  dietary_restrictions: string | null;
  message: string | null;
  created_at: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'editor';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

// Input types for creating new records
export type CreateInvitationInput = Omit<
  Invitation,
  'id' | 'view_count' | 'created_at' | 'updated_at'
>;

export type UpdateInvitationInput = Partial<
  Omit<Invitation, 'id' | 'created_at' | 'updated_at'>
>;



export type CreateRsvpInput = Omit<RsvpResponse, 'id' | 'created_at'>;

export type CreateAnalyticsInput = Omit<Analytics, 'id' | 'timestamp'>;

// Cloudflare D1 binding type
export interface Env {
  DB: D1Database;
  [key: string]: any;
}

// Helper type for database queries
export interface DatabaseResult<T = any> {
  success: boolean;
  meta: {
    changed_db: boolean;
    changes: number;
    duration: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
    size_after: number;
  };
  results: T[];
} 