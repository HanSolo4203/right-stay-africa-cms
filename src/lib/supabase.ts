import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Single client instance for client-side operations
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export const createClientComponentClient = () => {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
};

// For backward compatibility, export the client instance
export const supabase = createClientComponentClient();

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

// App settings table
export const SETTINGS = {
  APP_SETTINGS: 'app_settings',
} as const;
