import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database table names
export const TABLES = {
  APARTMENTS: 'apartments',
  CLEANERS: 'cleaners',
  CLEANING_SESSIONS: 'cleaning_sessions',
  CLEANING_SESSIONS_DETAILED: 'cleaning_sessions_detailed',
} as const;

// Database views
export const VIEWS = {
  CLEANING_SESSIONS_DETAILED: 'cleaning_sessions_detailed',
} as const;
