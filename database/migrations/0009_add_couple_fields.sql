-- Add optional secondary guest fields for couple invitations
ALTER TABLE invitations ADD COLUMN secondary_name TEXT;
ALTER TABLE invitations ADD COLUMN secondary_lastname TEXT;


