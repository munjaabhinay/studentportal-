import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const firstConfiguredValue = (...values) =>
  values
    .map((value) => value?.trim())
    .find((value) => value && !/your[-_ ]|placeholder/i.test(value))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const supabaseUrl = firstConfiguredValue(
    env.VITE_SUPABASE_URL,
    process.env.SUPABASE_URL
  )
  const supabaseAnonKey = firstConfiguredValue(
    env.VITE_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
  }
})