-- Seed data for Quinceañera CMS
-- Migration: 0002_seed_data.sql

-- Insert default admin user (password: admin123 - should be changed immediately)
-- Password hash for 'admin123' using bcrypt
INSERT INTO admin_users (username, email, password_hash, role) VALUES (
    'admin',
    'admin@example.com',
    '$2b$10$3g0RBd8Q/3dxDbA.Km8ntuRqhcN50jKhSPiQousJJ8LRFeOvV78wG',
    'admin'
); 