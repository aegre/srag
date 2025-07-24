-- Update admin_users table to support 'editor' role and add is_active field
-- Migration: 0005_update_admin_users_role.sql

-- Disable foreign key constraints temporarily
PRAGMA foreign_keys=off;

-- Drop existing sessions table to avoid foreign key constraint issues
DROP TABLE IF EXISTS sessions;

-- Create a new table with the updated schema
CREATE TABLE IF NOT EXISTS admin_users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Copy data from the old table to the new one
INSERT INTO admin_users_new (id, username, email, password_hash, role, is_active, created_at, last_login)
SELECT id, username, email, password_hash, 
       CASE 
         WHEN role = 'user' THEN 'editor' 
         ELSE role 
       END as role,
       1 as is_active,
       created_at, last_login
FROM admin_users;

-- Drop the old table
DROP TABLE admin_users;

-- Rename the new table to the original name
ALTER TABLE admin_users_new RENAME TO admin_users;

-- Recreate the sessions table with proper foreign key constraint
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Re-enable foreign key constraints
PRAGMA foreign_keys=on; 