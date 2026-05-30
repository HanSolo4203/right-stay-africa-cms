import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

/**
 * Service-role Supabase client (bypasses RLS).
 * Uses `SUPABASE_SERVICE_ROLE_KEY` — not the anon key.
 *
 * **Server-only:** use in API routes and server-side code only.
 * Never import this function from client components.
 */
export function createServiceClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Database table names
export const TABLES = {
  APARTMENTS: 'apartments',
  CLEANERS: 'cleaners',
  CLEANING_SESSIONS: 'cleaning_sessions',
  CLEANING_SESSIONS_DETAILED: 'cleaning_sessions_detailed',
  WELCOME_PACK_ITEMS: 'welcome_pack_items',
  INVENTORY_ITEMS: 'inventory_items',
  WELCOME_PACK_CONFIGURATIONS: 'welcome_pack_configurations',
  WELCOME_PACK_CONFIGURATION_ITEMS: 'welcome_pack_configuration_items',
  WELCOME_PACK_DISTRIBUTIONS: 'welcome_pack_distributions',
  WELCOME_PACK_DISTRIBUTION_ITEMS: 'welcome_pack_distribution_items',
  WELCOME_PACK_ALERTS: 'welcome_pack_alerts',
  BOOKINGS: 'bookings',
  INVOICES: 'invoices',
  BANK_ACCOUNT_DETAILS: 'bank_account_details',
} as const;

// Database views
export const VIEWS = {
  CLEANING_SESSIONS_DETAILED: 'cleaning_sessions_detailed',
} as const;

// App settings table
export const SETTINGS = {
  APP_SETTINGS: 'app_settings',
} as const;
