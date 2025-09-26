export interface Apartment {
  id: string;
  apartment_number: string;
  owner_name: string;
  owner_email?: string;
  address?: string;
  // Amount paid to cleaner for a cleaning at this apartment (not customer price)
  cleaner_payout?: number;
  created_at: string;
  updated_at: string;
}

export interface RSALaundryAsset {
  id: string;
  asset_name: string;
  asset_type: 'LAUNDRY_SERVICE' | 'MAINTENANCE_SERVICE' | 'OTHER_SERVICE';
  owner_name: string;
  owner_email?: string;
  location?: string;
  daily_payment_rate: number;
  service_description?: string;
  cleaner_payout: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cleaner {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface CleaningSession {
  id: string;
  apartment_id: string;
  cleaner_id: string;
  cleaning_date: string;
  notes?: string;
  price?: number;
  created_at: string;
  updated_at: string;
  apartment?: Apartment;
  cleaner?: Cleaner;
}

// Detailed view that includes apartment and cleaner information
export interface CleaningSessionDetailed {
  id: string;
  apartment_id: string;
  cleaner_id: string;
  cleaner_2_id?: string | null;
  cleaning_date: string;
  notes?: string;
  price?: number;
  // Optional: present when welcome pack fee is applied
  welcome_pack_fee?: number | null;
  // Multi-cleaner fields
  cleaner_1_name?: string;
  cleaner_2_name?: string;
  cleaner_1_fee?: number;
  cleaner_2_fee?: number | null;
  total_cleaning_fee?: number;
  is_multi_cleaner?: boolean;
  cleaner_count?: number;
  // Property type fields
  property_category?: 'apartment' | 'internal_asset' | 'rsa_asset';
  property_id?: string;
  created_at: string;
  updated_at: string;
  apartment_number: string;
  owner_name: string;
  owner_email?: string;
  address?: string;
  cleaner_name: string;
  cleaner_phone?: string;
  cleaner_email?: string;
  // Additional cleaner details
  cleaner_2_name_view?: string;
  cleaner_2_email?: string;
  cleaner_2_phone?: string;
}

// Union type for all schedulable properties (apartments and RSA assets)
export interface SchedulableProperty {
  property_category: 'apartment' | 'internal_asset' | 'rsa_asset';
  id: string;
  property_name: string;
  owner_name: string;
  owner_email?: string;
  location?: string;
  cleaner_payout?: number;
  asset_type?: string;
  service_description?: string;
  daily_payment_rate?: number;
}

export interface DashboardStats {
  total_apartments: number;
  total_cleaners: number;
  total_sessions: number;
  sessions_this_month: number;
  upcoming_sessions: number;
}

// Form types for creating/updating records
export interface CreateApartmentData {
  apartment_number: string;
  owner_name: string;
  owner_email?: string;
  address?: string;
  cleaner_payout?: number;
}

export interface CreateRSALaundryAssetData {
  asset_name: string;
  asset_type: 'LAUNDRY_SERVICE' | 'MAINTENANCE_SERVICE' | 'OTHER_SERVICE';
  owner_name?: string;
  owner_email?: string;
  location?: string;
  daily_payment_rate: number;
  service_description?: string;
  cleaner_payout: number;
  is_active?: boolean;
}

export interface UpdateApartmentData extends Partial<CreateApartmentData> {
  id: string;
}

export interface UpdateRSALaundryAssetData extends Partial<CreateRSALaundryAssetData> {
  id: string;
}

export interface CreateCleanerData {
  name: string;
  phone?: string;
  email?: string;
}

export interface UpdateCleanerData extends Partial<CreateCleanerData> {
  id: string;
}

export interface CreateCleaningSessionData {
  apartment_id: string; // Keep for backward compatibility, maps to property_id
  property_category?: 'apartment' | 'rsa_asset' | 'internal_asset'; // Optional for backward compatibility
  cleaner_id: string;
  cleaner_2_id?: string | null; // Second cleaner for multi-cleaner sessions
  cleaning_date: string;
  notes?: string;
  price?: number; // Total price for the session (should not be duplicated)
  // Individual cleaner fees (for multi-cleaner sessions)
  cleaner_1_fee?: number;
  cleaner_2_fee?: number | null;
  // Multi-cleaner session flag
  is_multi_cleaner?: boolean;
  include_welcome_pack?: boolean;
}

export interface UpdateCleaningSessionData extends Partial<CreateCleaningSessionData> {
  id: string;
  // Additional fields for updating multi-cleaner sessions
  cleaner_1_name?: string;
  cleaner_2_name?: string | null;
  total_cleaning_fee?: number;
  cleaner_count?: number;
}

// RSA Laundry Room Expense types
export interface RSALaundryExpense {
  id: string;
  asset_id: string;
  cleaner_id: string;
  service_date: string;
  daily_payment_amount: number;
  service_description?: string;
  notes?: string;
  is_paid: boolean;
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

// Detailed view that includes asset and cleaner information
export interface RSALaundryExpenseDetailed extends RSALaundryExpense {
  asset_name: string;
  asset_type: string;
  asset_owner: string;
  asset_location?: string;
  cleaner_name: string;
  cleaner_phone?: string;
  cleaner_email?: string;
}

// Form types for creating/updating RSA laundry expenses
export interface CreateRSALaundryExpenseData {
  cleaner_id: string;
  service_date: string;
  daily_payment_amount: number;
  service_description?: string;
  notes?: string;
}

export interface UpdateRSALaundryExpenseData extends Partial<CreateRSALaundryExpenseData> {
  id: string;
  is_paid?: boolean;
  payment_date?: string;
}

// Welcome Pack Item types
export interface WelcomePackItem {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWelcomePackItemData {
  name: string;
  price: number;
  is_active?: boolean;
}

export interface UpdateWelcomePackItemData extends Partial<CreateWelcomePackItemData> {
  id: string;
}
