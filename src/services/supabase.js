import { createClient } from '@supabase/supabase-js'

// Supabase client configuration
// These values come from your Supabase project dashboard
// VITE_ prefix makes them available to the frontend code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if required environment variables are present
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase environment variables are not configured. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment platform.'
  )
}

// Create Supabase client only if configured, otherwise create a safe fallback
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Helper to check if Supabase is ready
export const isSupabaseReady = () => isSupabaseConfigured