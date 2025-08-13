// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Missing Supabase env vars.
Make sure you have a .env or .env.local in the project root:

VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...`
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // good for prod
    // If you want password reset links to land on your app, you can set:
    // redirectTo: `${window.location.origin}/reset-password`,
  },
})
