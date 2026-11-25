-- Fresh-install base schema for the Student Course Management Portal.
-- For existing installations, apply the timestamped custom-auth migration
-- instead; it preserves existing profiles and courses.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON public.users (created_at DESC);

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name TEXT NOT NULL,
  trainer_name TEXT NOT NULL,
  duration TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_created_at ON public.courses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_course_name ON public.courses (course_name);
CREATE INDEX IF NOT EXISTS idx_courses_trainer_name ON public.courses (trainer_name);

CREATE TABLE IF NOT EXISTS public.portal_sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS portal_sessions_expire_idx ON public.portal_sessions (expire);

CREATE TABLE IF NOT EXISTS public.portal_activation_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portal_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL CHECK (hit_count > 0)
);

CREATE TABLE IF NOT EXISTS public.portal_bootstrap_state (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  completed_at TIMESTAMPTZ
);
INSERT INTO public.portal_bootstrap_state (id, completed_at)
VALUES (TRUE, NULL)
ON CONFLICT (id) DO NOTHING;
