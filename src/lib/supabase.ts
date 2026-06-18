import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True when both Supabase env vars are present at build time. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * The Supabase client, or `null` when the app hasn't been configured yet.
 * Keeping it nullable lets the UI render a helpful setup screen instead of
 * crashing, and lets the production build succeed without secrets.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
