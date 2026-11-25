-- Run once in Supabase SQL Editor as an authorized project/database administrator.
-- Replace the placeholder with the existing user's confirmed email address.
DO $promotion$
DECLARE
  target_email TEXT := lower('REPLACE_WITH_CONFIRMED_EMAIL');
  target_user_id UUID;
  target_full_name TEXT;
  target_user_email TEXT;
BEGIN
  IF target_email = 'replace_with_confirmed_email' THEN
    RAISE EXCEPTION 'Replace the email placeholder before running this script.';
  END IF;

  SELECT u.id, u.raw_user_meta_data ->> 'full_name', u.email
    INTO target_user_id, target_full_name, target_user_email
  FROM auth.users AS u
  WHERE lower(u.email) = target_email
    AND u.email_confirmed_at IS NOT NULL;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No confirmed Supabase Auth account exists for the supplied email.';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (target_user_id, target_full_name, target_user_email, 'admin')
  ON CONFLICT (id) DO UPDATE
    SET role = 'admin',
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        email = EXCLUDED.email;
END
$promotion$;
