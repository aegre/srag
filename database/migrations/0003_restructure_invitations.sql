-- Restructure invitations table - separate basic invitation info from global settings
-- Migration: 0003_restructure_invitations.sql

-- Drop existing tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS rsvp_responses;
DROP TABLE IF EXISTS analytics;
DROP TABLE IF EXISTS invitation_details;
DROP TABLE IF EXISTS invitations;

-- Create new simplified invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE, -- URL slug for the invitation
    
    -- Basic invitation information
    name TEXT NOT NULL,
    lastname TEXT NOT NULL,
    number_of_passes INTEGER DEFAULT 1,
    
    -- Confirmation and status
    is_confirmed BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    view_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create invitation_settings table for global event settings
CREATE TABLE IF NOT EXISTS invitation_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Event information
    event_date DATE,
    event_time TIME,
    
    -- RSVP settings
    rsvp_enabled BOOLEAN DEFAULT 1,
    rsvp_deadline DATE,
    rsvp_phone TEXT,
    rsvp_whatsapp TEXT,
    
    -- Status and metadata
    is_published BOOLEAN DEFAULT 0,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Recreate analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invitation_id INTEGER NOT NULL,
    event_type TEXT NOT NULL, -- 'view', 'music_play', 'music_pause', 'section_view', 'rsvp_click', etc.
    event_data JSON, -- Additional event data (section_id, user_agent, etc.)
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
);

-- Recreate RSVP responses table - simplified
CREATE TABLE IF NOT EXISTS rsvp_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invitation_id INTEGER NOT NULL,
    attendance_status TEXT NOT NULL CHECK (attendance_status IN ('attending', 'not_attending', 'maybe')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_slug ON invitations(slug);
CREATE INDEX IF NOT EXISTS idx_invitations_created_at ON invitations(created_at);
CREATE INDEX IF NOT EXISTS idx_invitations_active ON invitations(is_active);
CREATE INDEX IF NOT EXISTS idx_invitations_confirmed ON invitations(is_confirmed);

CREATE INDEX IF NOT EXISTS idx_analytics_invitation_id ON analytics(invitation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);

CREATE INDEX IF NOT EXISTS idx_rsvp_invitation_id ON rsvp_responses(invitation_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_created_at ON rsvp_responses(created_at);

-- Insert default settings
INSERT INTO invitation_settings (event_date, event_time, rsvp_enabled, rsvp_deadline, rsvp_phone, rsvp_whatsapp, is_published) 
VALUES (NULL, NULL, 1, NULL, NULL, NULL, 0); 