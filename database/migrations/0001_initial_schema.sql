-- Initial database schema for Quinceañera CMS
-- Migration: 0001_initial_schema.sql

-- Invitations table - stores individual invitation instances
CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE, -- URL slug for the invitation
    
    -- Personal information
    celebrant_name TEXT NOT NULL,
    celebrant_lastname TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    
    -- Venue information
    venue_name TEXT NOT NULL,
    venue_address TEXT NOT NULL,
    venue_coordinates TEXT, -- lat,lng format
    
    -- Party details
    dress_code TEXT,
    max_passes INTEGER DEFAULT 1,
    
    -- Content customization
    personal_message TEXT,
    parents_message TEXT,
    itinerary JSON, -- Stores event schedule
    important_info JSON, -- Stores rules and important information
    
    -- Settings
    music_enabled BOOLEAN DEFAULT 1,
    music_url TEXT,
    background_music_volume REAL DEFAULT 0.3,
    
    -- Gift registry
    gift_registry_url TEXT,
    gift_registry_message TEXT,
    
    -- RSVP settings
    rsvp_enabled BOOLEAN DEFAULT 1,
    rsvp_deadline DATE,
    rsvp_phone TEXT,
    rsvp_whatsapp TEXT,
    
    -- Status and metadata
    is_published BOOLEAN DEFAULT 0,
    password_protected BOOLEAN DEFAULT 0,
    password_hash TEXT,
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analytics table - tracks invitation views and interactions
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invitation_id INTEGER NOT NULL,
    event_type TEXT NOT NULL, -- 'view', 'music_play', 'music_pause', 'section_view', 'rsvp_click', etc.
    event_data JSON, -- Additional event data (section_id, user_agent, etc.)
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (invitation_id) REFERENCES invitations(id)
);

-- RSVP responses table - stores guest responses
CREATE TABLE IF NOT EXISTS rsvp_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invitation_id INTEGER NOT NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone TEXT,
    attendance_status TEXT NOT NULL CHECK (attendance_status IN ('attending', 'not_attending', 'maybe')),
    number_of_guests INTEGER DEFAULT 1,
    dietary_restrictions TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (invitation_id) REFERENCES invitations(id)
);

-- Admin users table - for CMS access control
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Sessions table - for admin authentication
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES admin_users(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_slug ON invitations(slug);
CREATE INDEX IF NOT EXISTS idx_invitations_created_at ON invitations(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_invitation_id ON analytics(invitation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_rsvp_invitation_id ON rsvp_responses(invitation_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at); 