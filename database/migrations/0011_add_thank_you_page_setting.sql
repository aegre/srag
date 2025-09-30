-- Migration: 0011_add_thank_you_page_setting.sql
-- Add thank you page setting to invitation_settings table

-- Add the new column to invitation_settings table
ALTER TABLE invitation_settings ADD COLUMN thank_you_page_enabled BOOLEAN DEFAULT 0;

-- Update existing records to have the default value
UPDATE invitation_settings SET thank_you_page_enabled = 0 WHERE thank_you_page_enabled IS NULL;
