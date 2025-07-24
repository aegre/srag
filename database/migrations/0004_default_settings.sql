-- Default invitation settings seed
-- Migration: 0004_default_settings.sql

-- Insert default settings if none exist
INSERT OR IGNORE INTO invitation_settings (
    event_date,
    event_time,
    rsvp_enabled,
    rsvp_deadline,
    rsvp_phone,
    rsvp_whatsapp,
    is_published,
    created_at,
    updated_at
) VALUES (
    '2025-09-13',           -- Event date: September 13, 2024
    '19:00',                -- Event time: 7:00 PM
    1,                      -- RSVP enabled: true
    '2025-09-01',           -- RSVP deadline: September 1, 2024
    '+525555555555',        -- Default phone number
    '+525555555555',        -- Default WhatsApp number
    0,                      -- Not published by default
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
); 