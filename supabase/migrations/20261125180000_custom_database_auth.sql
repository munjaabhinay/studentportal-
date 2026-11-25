-- Move application accounts to the portal API while preserving legacy profile data.
-- Existing Supabase Auth passwords are not readable/migratable; imported users
-- receive a NULL password_hash and must activate with a one-time admin-issued code.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE email IS NULL OR btrim(email) = ''
    ) THEN
      RAISE EXCEPTION
        'Cannot import profiles: one or more rows have no email. Resolve those rows before applying this migration.';
    END IF;

    IF EXISTS (
      SELECT lower(btrim(email))
      FROM public.profiles
      GROUP BY lower(btrim(email))
      HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION
        'Cannot import profiles: duplicate email addresses exist (case-insensitive). Resolve duplicates before applying this migration.';
    END IF;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'student'
    CONSTRAINT users_role_check CHECK (role IN ('admin', 'student')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_password_hash_nonempty
    CHECK (password_hash IS NULL OR length(password_hash) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx
  ON public.users (lower(email));
CREATE INDEX IF NOT EXISTS users_role_idx
  ON public.users (role);
CREATE INDEX IF NOT EXISTS users_created_at_idx
  ON public.users (created_at DESC);

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    INSERT INTO public.users (id, full_name, email, role, created_at, updated_at)
    SELECT
      id,
      COALESCE(NULLIF(btrim(full_name), ''), 'Student'),
      lower(btrim(email)),
      CASE WHEN role = 'admin' THEN 'admin' ELSE 'student' END,
      COALESCE(created_at, NOW()),
      COALESCE(updated_at, NOW())
    FROM public.profiles
    ON CONFLICT (id) DO NOTHING;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.portal_sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS portal_sessions_expire_idx
  ON public.portal_sessions (expire);

CREATE TABLE IF NOT EXISTS public.portal_activation_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_activation_tokens_expires_idx
  ON public.portal_activation_tokens (expires_at);

CREATE TABLE IF NOT EXISTS public.portal_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL CHECK (hit_count > 0)
);
CREATE INDEX IF NOT EXISTS portal_rate_limits_window_idx
  ON public.portal_rate_limits (window_started_at);

CREATE TABLE IF NOT EXISTS public.portal_bootstrap_state (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  completed_at TIMESTAMPTZ
);
INSERT INTO public.portal_bootstrap_state (id, completed_at)
VALUES (TRUE, NULL)
ON CONFLICT (id) DO NOTHING;

-- Reference auth.users only to detach legacy profile dependencies.
-- No new tables, foreign keys, functions, or triggers depend on Supabase Auth.
DO $$
DECLARE
  legacy_fk RECORD;
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users';

    IF to_regclass('public.profiles') IS NOT NULL THEN
      FOR legacy_fk IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND contype = 'f'
          AND confrelid = 'auth.users'::regclass
      LOOP
        EXECUTE format(
          'ALTER TABLE public.profiles DROP CONSTRAINT %I',
          legacy_fk.conname
        );
      END LOOP;
    END IF;
  END IF;
END
$$;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- The API connects with a dedicated role, not the anon/authenticated roles.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portal_api') THEN
    CREATE ROLE portal_api NOLOGIN;
  END IF;
END
$$;
ALTER ROLE portal_api
  NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.users, public.courses, public.portal_sessions,
   public.portal_activation_tokens, public.portal_rate_limits,
   public.portal_bootstrap_state
TO portal_api;
GRANT USAGE ON SCHEMA public TO portal_api;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Portal API manages custom users'
  ) THEN
    CREATE POLICY "Portal API manages custom users"
      ON public.users
      FOR ALL
      TO portal_api
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courses'
      AND policyname = 'Portal API manages courses'
  ) THEN
    CREATE POLICY "Portal API manages courses"
      ON public.courses
      FOR ALL
      TO portal_api
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

REVOKE ALL ON public.users, public.portal_sessions,
  public.portal_activation_tokens, public.portal_rate_limits,
  public.portal_bootstrap_state
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.courses FROM anon, authenticated;
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON public.profiles FROM anon, authenticated';
  END IF;
END
$$;

COMMIT;
