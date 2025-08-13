// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Missing Supabase env vars.
Make sure you set these (in Vercel envs and your local .env.local):
  VITE_SUPABASE_URL=https://<your-ref>.supabase.co
  VITE_SUPABASE_ANON_KEY=<the long anon public JWT>`
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // If you send password-reset emails, uncomment and set your deployed URL:
    // redirectTo: `${window.location.origin}/reset-password`,
  },
})
