-- Invited users are created with a temporary password the admin shares out of
-- band. This flag forces rotation before the account can be used.
ALTER TABLE identity."User"
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
