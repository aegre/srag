-- Migration: 0010_separate_conjugated_names.sql
-- Separate conjugated names into proper columns for couple invitations

-- Note: secondary_name and secondary_lastname columns were already added in migration 0009_add_couple_fields.sql
-- This migration focuses on separating the conjugated names data

-- Update records where name contains conjugated patterns
-- Pattern 1: "Name y" in name field, second person in lastname field
UPDATE invitations 
SET 
    name = TRIM(SUBSTR(name, 1, LENGTH(name) - 2)), -- Remove " y" from end
    secondary_name = lastname,
    secondary_lastname = NULL,
    lastname = '' -- Clear the lastname field to avoid duplication
WHERE name LIKE '% y' AND lastname IS NOT NULL AND lastname != '';

-- Pattern 2: "Name e" in name field, second person in lastname field  
UPDATE invitations 
SET 
    name = TRIM(SUBSTR(name, 1, LENGTH(name) - 2)), -- Remove " e" from end
    secondary_name = lastname,
    secondary_lastname = NULL,
    lastname = '' -- Clear the lastname field to avoid duplication
WHERE name LIKE '% e' AND lastname IS NOT NULL AND lastname != '';

-- Pattern 3: Handle cases where the second person might have a lastname
-- For example: "Maru y" with "Juan Carlos" - split "Juan Carlos" into name and lastname
UPDATE invitations 
SET 
    secondary_name = CASE 
        WHEN secondary_name LIKE '% %' THEN TRIM(SUBSTR(secondary_name, 1, INSTR(secondary_name, ' ') - 1))
        ELSE secondary_name 
    END,
    secondary_lastname = CASE 
        WHEN secondary_name LIKE '% %' THEN TRIM(SUBSTR(secondary_name, INSTR(secondary_name, ' ') + 1))
        ELSE NULL 
    END
WHERE secondary_name IS NOT NULL AND secondary_name LIKE '% %';

-- Clean up any remaining conjugated patterns that might have been missed
-- Look for any remaining " y" or " e" patterns and handle them
UPDATE invitations 
SET 
    name = TRIM(SUBSTR(name, 1, LENGTH(name) - 2)),
    secondary_name = COALESCE(secondary_name, lastname),
    secondary_lastname = COALESCE(secondary_lastname, NULL),
    lastname = '' -- Clear the lastname field to avoid duplication
WHERE (name LIKE '% y' OR name LIKE '% e') 
    AND secondary_name IS NULL 
    AND lastname IS NOT NULL 
    AND lastname != '';

-- Final cleanup: remove the conjunction from any remaining cases
UPDATE invitations 
SET name = TRIM(REPLACE(REPLACE(name, ' y', ''), ' e', ''))
WHERE name LIKE '% y' OR name LIKE '% e';
