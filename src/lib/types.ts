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
  cleaning_date: string;
  notes?: string;
  price?: number;
  created_at: string;
  updated_at: string;
  apartment_number: string;
  owner_name: string;
  owner_email?: string;
  address?: string;
  cleaner_name: string;
  cleaner_phone?: string;
  cleaner_email?: string;
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

export interface UpdateApartmentData extends Partial<CreateApartmentData> {
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
  apartment_id: string;
  cleaner_id: string;
  cleaning_date: string;
  notes?: string;
  price?: number;
}

export interface UpdateCleaningSessionData extends Partial<CreateCleaningSessionData> {
  id: string;
}
