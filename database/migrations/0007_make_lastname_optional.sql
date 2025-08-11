-- Make invitations.lastname optional (nullable)
-- SQLite requires table recreation to change column nullability
-- This migration includes backup and restore of analytics data

PRAGMA foreign_keys=OFF;

-- Backup analytics data
CREATE TABLE IF NOT EXISTS analytics_backup AS SELECT * FROM analytics;

-- Create new table with lastname nullable
CREATE TABLE IF NOT EXISTS invitations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  lastname TEXT, -- now nullable
  number_of_passes INTEGER DEFAULT 1,
  is_confirmed BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data
INSERT INTO invitations_new (
  id, slug, name, lastname, number_of_passes, is_confirmed, is_active, view_count, created_at, updated_at
)
SELECT id, slug, name, lastname, number_of_passes, is_confirmed, is_active, view_count, created_at, updated_at
FROM invitations;

-- Replace old table
DROP TABLE invitations;
ALTER TABLE invitations_new RENAME TO invitations;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_invitations_slug ON invitations(slug);
CREATE INDEX IF NOT EXISTS idx_invitations_created_at ON invitations(created_at);
CREATE INDEX IF NOT EXISTS idx_invitations_active ON invitations(is_active);
CREATE INDEX IF NOT EXISTS idx_invitations_confirmed ON invitations(is_confirmed);

-- Restore analytics data
INSERT INTO analytics SELECT * FROM analytics_backup;
DROP TABLE analytics_backup;

PRAGMA foreign_keys=ON;


