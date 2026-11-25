import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

const missingVariables = [
  !supabaseUrl && 'VITE_SUPABASE_URL',
  !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean)

let configurationError = ''

if (missingVariables.length) {
  configurationError = `Missing required environment variable(s): ${missingVariables.join(', ')}.`
} else {
  try {
    const url = new URL(supabaseUrl)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
      configurationError = 'VITE_SUPABASE_URL must be a valid HTTP or HTTPS URL.'
    } else if (/your[-_ ]|placeholder/i.test(supabaseUrl) || /your[-_ ]|placeholder/i.test(supabaseAnonKey)) {
      configurationError = 'Supabase environment variables still contain example placeholder values.'
    } else if (supabaseAnonKey.startsWith('sb_secret_') || hasServiceRoleClaim(supabaseAnonKey)) {
      configurationError = 'VITE_SUPABASE_ANON_KEY must be a public anon or publishable key, not a service_role or secret key.'
    }
  } catch {
    configurationError = 'VITE_SUPABASE_URL must be a valid HTTP or HTTPS URL.'
  }
}

function hasServiceRoleClaim(key) {
  const parts = key.split('.')
  if (parts.length !== 3) return false

  try {
    const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '=')
    return JSON.parse(atob(payload)).role === 'service_role'
  } catch {
    return false
  }
}

export const supabaseConfigError = configurationError
export const isSupabaseReady = () => !configurationError
export const supabase = isSupabaseReady()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null