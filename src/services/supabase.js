import { createClient } from '@supabase/supabase-js'

// Supabase client configuration
// These values come from your Supabase project dashboard
// VITE_ prefix makes them available to the frontend code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. ' +
    'Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  )
}

// Create and export the Supabase client
// The anon key is safe to use in frontend code - it has Row Level Security policies
// protecting the database. Never use the service_role key in frontend code.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)