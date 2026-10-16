import { createClient } from '@supabase/supabase-js'
import { requireEnv } from '@/lib/env'

export const supabase = createClient(
  requireEnv('VITE_SUPABASE_URL'),
  requireEnv('VITE_SUPABASE_ANON_KEY'),
)
