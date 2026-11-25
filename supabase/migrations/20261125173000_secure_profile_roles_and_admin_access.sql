-- Secure existing profile roles and enable admin-only profile visibility.
-- This migration is additive: it preserves existing tables, rows, and policies.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('admin', 'student')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name TEXT NOT NULL,
  trainer_name TEXT NOT NULL,
  duration TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (id = (SELECT auth.uid()))
      WITH CHECK (id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (
        id = (SELECT auth.uid())
        AND role = 'student'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'f'
      AND confrelid = 'auth.users'::regclass
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'public.profiles'::regclass AND attname = 'id')
      ]::smallint[]
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_auth_users_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('admin', 'student')) NOT VALID;
  END IF;
END
$$;

UPDATE public.profiles
SET role = 'student'
WHERE role IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN role SET DEFAULT 'student',
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_role_check;

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role);

CREATE INDEX IF NOT EXISTS idx_courses_created_at
  ON public.courses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_course_name
  ON public.courses (course_name);
CREATE INDEX IF NOT EXISTS idx_courses_trainer_name
  ON public.courses (trainer_name);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- A SECURITY DEFINER lookup avoids recursive profile RLS evaluation.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
  );
$function$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Ensure every pre-existing Auth user has a profile; preserve existing profiles.
INSERT INTO public.profiles (id, full_name, email, role)
SELECT
  u.id,
  u.raw_user_meta_data ->> 'full_name',
  u.email,
  'student'
FROM auth.users AS u
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    'student'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
      AND tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- Keep the existing self-profile policy and add admin visibility.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING ((SELECT public.is_admin()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Profile select scope guard'
  ) THEN
    CREATE POLICY "Profile select scope guard"
      ON public.profiles
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (
        id = (SELECT auth.uid())
        OR (SELECT public.is_admin())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Profile insert role guard'
  ) THEN
    CREATE POLICY "Profile insert role guard"
      ON public.profiles
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (
        id = (SELECT auth.uid())
        AND role = 'student'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Profile update scope guard'
  ) THEN
    CREATE POLICY "Profile update scope guard"
      ON public.profiles
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (
        id = (SELECT auth.uid())
        OR (SELECT public.is_admin())
      )
      WITH CHECK (
        id = (SELECT auth.uid())
        OR (SELECT public.is_admin())
      );
  END IF;
END
$$;

-- Clients may edit profile text, never the role column.
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON TABLE public.profiles FROM PUBLIC, anon;
REVOKE UPDATE (role) ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, email) ON TABLE public.profiles TO authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Existing course RLS policies remain intact. Restrictive guards ensure that
-- any permissive course policy cannot grant writes to a non-admin.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courses'
      AND policyname = 'Anyone can view courses'
  ) THEN
    CREATE POLICY "Anyone can view courses"
      ON public.courses
      FOR SELECT
      TO PUBLIC
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courses'
      AND policyname = 'Only admins can insert courses'
  ) THEN
    CREATE POLICY "Only admins can insert courses"
      ON public.courses
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT public.is_admin()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courses'
      AND policyname = 'Only admins can update courses'
  ) THEN
    CREATE POLICY "Only admins can update courses"
      ON public.courses
      FOR UPDATE
      TO authenticated
      USING ((SELECT public.is_admin()))
      WITH CHECK ((SELECT public.is_admin()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courses'
      AND policyname = 'Only admins can delete courses'
  ) THEN
    CREATE POLICY "Only admins can delete courses"
      ON public.courses
      FOR DELETE
      TO authenticated
      USING ((SELECT public.is_admin()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courses'
      AND policyname = 'Course insert admin guard'
  ) THEN
    CREATE POLICY "Course insert admin guard"
      ON public.courses
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT public.is_admin()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courses'
      AND policyname = 'Course update admin guard'
  ) THEN
    CREATE POLICY "Course update admin guard"
      ON public.courses
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING ((SELECT public.is_admin()))
      WITH CHECK ((SELECT public.is_admin()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'courses'
      AND policyname = 'Course delete admin guard'
  ) THEN
    CREATE POLICY "Course delete admin guard"
      ON public.courses
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING ((SELECT public.is_admin()));
  END IF;
END
$$;

GRANT SELECT ON TABLE public.courses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.courses TO authenticated;
