-- Seed data for Quinceañera CMS
-- Migration: 0002_seed_data.sql

-- Insert default admin user (password: admin123 - should be changed immediately)
-- Password hash for 'admin123' using bcrypt
INSERT INTO admin_users (username, email, password_hash, role) VALUES (
    'admin',
    'admin@example.com',
    '$2b$10$rBV2HQ/qjKlbcl6KH.7/m.YXsG9JStE6RdYsHUDSYKZCRWKJhP8iO',
    'admin'
); 