-- ============================================
-- Student Course Management Portal - Database Schema
-- Supabase PostgreSQL
-- ============================================

-- Enable UUID extension (required for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: profiles
-- ============================================
-- Stores user profile information linked to Supabase Auth users.
-- id references auth.users.id from Supabase Authentication.
-- ============================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- ============================================
-- TABLE: courses
-- ============================================
-- Stores course information managed by administrators.
-- ============================================

CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_name TEXT NOT NULL,
  trainer_name TEXT NOT NULL,
  duration TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Index on courses.created_at for sorting by newest first
CREATE INDEX idx_courses_created_at ON courses(created_at DESC);

-- Index on courses.course_name for search performance
CREATE INDEX idx_courses_course_name ON courses(course_name);

-- Index on courses.trainer_name for search performance
CREATE INDEX idx_courses_trainer_name ON courses(trainer_name);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- RLS ensures that database operations are secure even if
-- the frontend is compromised. Policies are evaluated on
-- the server side by Supabase.

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on courses table
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: profiles table
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (but NOT their role)
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Restrict profile updates to editable fields so users cannot change their role.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (full_name, email) ON TABLE public.profiles TO authenticated;

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- RLS POLICIES: courses table
-- ============================================

-- Anyone (authenticated or not) can view courses
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  USING (true);

-- Only authenticated users with admin role can insert courses
CREATE POLICY "Only admins can insert courses"
  ON courses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only authenticated users with admin role can update courses
CREATE POLICY "Only admins can update courses"
  ON courses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only authenticated users with admin role can delete courses
CREATE POLICY "Only admins can delete courses"
  ON courses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- TRIGGER: Auto-update updated_at on courses
-- ============================================

CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_courses_updated_at();

-- ============================================
-- TRIGGER: Auto-update updated_at on profiles
-- ============================================

CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- ============================================
-- TRIGGER: Auto-create profile when new user signs up
-- ============================================
-- When Supabase Auth creates a new user, this trigger
-- automatically creates a matching row in the profiles table.
-- This ensures every authenticated user has a profile record.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    'student'  -- Default role: student. Only admins can assign admin role.
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- END OF SCHEMA
-- ============================================