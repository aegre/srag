-- Cleanup placeholder lastnames saved as '.' from previous limitation

-- Set lastname to NULL when it only contains a single dot (with optional surrounding spaces)
UPDATE invitations
SET lastname = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE lastname IS NOT NULL
  AND TRIM(lastname) = '.';


