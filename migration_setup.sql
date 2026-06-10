-- This migration uses Supabase's built-in auth.users table with user_metadata
-- instead of creating a separate profile table, simplifying the architecture.

-- Note: For fresh Supabase projects, no cleanup is needed
-- The following drops are safe for existing projects migrating to this setup

-- Drop existing objects if they exist (in case we're migrating from a previous setup)
-- Note: These may not exist in fresh Supabase projects, that's okay
DO $$
BEGIN
    -- Drop trigger if it exists
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_fullname') THEN
        EXECUTE 'DROP TRIGGER set_fullname ON users';
    END IF;

    -- Drop function if it exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_fullname') THEN
        EXECUTE 'DROP FUNCTION update_fullname()';
    END IF;

    -- Drop table if it exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public') THEN
        EXECUTE 'DROP TABLE users';
    END IF;
END $$;

-- Create a view that makes user metadata more accessible in SQL
CREATE OR REPLACE VIEW user_profiles AS
SELECT
  id,
  email,
  raw_user_meta_data->>'username' AS username,
  raw_user_meta_data->>'first_name' AS first_name,
  raw_user_meta_data->>'last_name' AS last_name,
  raw_user_meta_data->>'fullname' AS fullname,
  raw_user_meta_data->>'occupation' AS occupation,
  raw_user_meta_data->>'company_name' AS company_name,
  raw_user_meta_data->>'phone' AS phone,
  raw_user_meta_data->>'pic' AS pic,
  raw_user_meta_data->>'language' AS language,
  (raw_user_meta_data->>'is_admin')::boolean AS is_admin,
  raw_user_meta_data->'roles' AS roles,
  created_at,
  updated_at
FROM auth.users;

-- Create a function to add or update a user's metadata via SQL
-- This is helpful for admin operations and initial setup
CREATE OR REPLACE FUNCTION update_user_metadata(
  user_id UUID,
  metadata JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data =
    COALESCE(raw_user_meta_data, '{}'::jsonb) || metadata
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;