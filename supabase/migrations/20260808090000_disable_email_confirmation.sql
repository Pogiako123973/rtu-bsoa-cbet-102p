-- Disable Supabase email confirmation requirement.
-- After this migration, signups are auto-confirmed and can log in immediately.
-- This is appropriate for development and demos where a real email isn't required.
-- For production, set this to true and configure a real SMTP provider.

-- Try the new GoTrue v2 location first.
UPDATE auth.config
SET enable_confirmations = false
WHERE enable_confirmations IS NOT NULL;

-- Fall back to the legacy GOTRUE_SITE_URL based settings (newer Supabase uses raw_config).
DO $$
BEGIN
  -- Some Supabase versions store these in auth.raw_config (jsonb) rather than columns.
  BEGIN
    UPDATE auth.config
    SET raw_config = jsonb_set(COALESCE(raw_config, '{}'::jsonb), '{enable_confirmations}', 'false'::jsonb, true);
  EXCEPTION WHEN OTHERS THEN
    -- ignore if column doesn't exist
    NULL;
  END;
END $$;