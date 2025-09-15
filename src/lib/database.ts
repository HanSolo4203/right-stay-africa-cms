import { supabase, TABLES, VIEWS } from './supabase';
import { createServerComponentClient } from './supabase-server';
import {
  Apartment,
  Cleaner,
  CleaningSession,
  CleaningSessionDetailed,
  CreateApartmentData,
  UpdateApartmentData,
  CreateCleanerData,
  UpdateCleanerData,
  CreateCleaningSessionData,
  UpdateCleaningSessionData,
  DashboardStats,
} from './types';

// Helper function to get authenticated Supabase client
const getSupabaseClient = async () => {
  try {
    return await createServerComponentClient();
  } catch (error) {
    console.warn('Failed to create server client, falling back to client:', error);
    return supabase;
  }
};

// Apartments CRUD operations
export const apartmentsApi = {
  // Get all apartments
  async getAll(): Promise<Apartment[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.APARTMENTS)
      .select('*')
      .order('apartment_number');
    
    if (error) throw error;
    return data || [];
  },

  // Get apartment by ID
  async getById(id: string): Promise<Apartment | null> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.APARTMENTS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create new apartment
  async create(apartment: CreateApartmentData): Promise<Apartment> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.APARTMENTS)
      .insert(apartment)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update apartment
  async update(apartment: UpdateApartmentData): Promise<Apartment> {
    const { id, ...updateData } = apartment;
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.APARTMENTS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete apartment
  async delete(id: string): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(TABLES.APARTMENTS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Cleaners CRUD operations
export const cleanersApi = {
  // Get all cleaners
  async getAll(): Promise<Cleaner[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.CLEANERS)
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  // Get cleaner by ID
  async getById(id: string): Promise<Cleaner | null> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.CLEANERS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create new cleaner
  async create(cleaner: CreateCleanerData): Promise<Cleaner> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.CLEANERS)
      .insert(cleaner)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update cleaner
  async update(cleaner: UpdateCleanerData): Promise<Cleaner> {
    const { id, ...updateData } = cleaner;
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.CLEANERS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete cleaner
  async delete(id: string): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(TABLES.CLEANERS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Cleaning Sessions CRUD operations
export const cleaningSessionsApi = {
  // Get all cleaning sessions with apartment and cleaner details
  async getAll(): Promise<CleaningSessionDetailed[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(VIEWS.CLEANING_SESSIONS_DETAILED)
      .select('*')
      .order('cleaning_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get all cleaning sessions (basic type for conflict checking)
  async getAllBasic(): Promise<CleaningSession[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .select('*')
      .order('cleaning_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get cleaning session by ID
  async getById(id: string): Promise<CleaningSessionDetailed | null> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(VIEWS.CLEANING_SESSIONS_DETAILED)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get cleaning sessions by date range
  async getByDateRange(startDate: string, endDate: string): Promise<CleaningSessionDetailed[]> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(VIEWS.CLEANING_SESSIONS_DETAILED)
      .select('*')
      .gte('cleaning_date', startDate)
      .lte('cleaning_date', endDate)
      .order('cleaning_date');
    
    if (error) throw error;
    return data || [];
  },

  // Get upcoming cleaning sessions
  async getUpcoming(): Promise<CleaningSessionDetailed[]> {
    const today = new Date().toISOString().split('T')[0];
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(VIEWS.CLEANING_SESSIONS_DETAILED)
      .select('*')
      .gte('cleaning_date', today)
      .order('cleaning_date');
    
    if (error) throw error;
    return data || [];
  },

  // Create new cleaning session
  async create(session: CreateCleaningSessionData): Promise<CleaningSession> {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .insert(session)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update cleaning session
  async update(session: UpdateCleaningSessionData): Promise<CleaningSession> {
    const { id, ...updateData } = session;
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete cleaning session
  async delete(id: string): Promise<void> {
    const client = await getSupabaseClient();
    const { error } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// Dashboard statistics
export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const client = await getSupabaseClient();
    
    // Get total apartments
    const { count: totalApartments } = await client
      .from(TABLES.APARTMENTS)
      .select('*', { count: 'exact', head: true });

    // Get total cleaners
    const { count: totalCleaners } = await client
      .from(TABLES.CLEANERS)
      .select('*', { count: 'exact', head: true });

    // Get total sessions
    const { count: totalSessions } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .select('*', { count: 'exact', head: true });

    // Get sessions this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    
    const { count: sessionsThisMonth } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .select('*', { count: 'exact', head: true })
      .gte('cleaning_date', startOfMonth.toISOString().split('T')[0])
      .lte('cleaning_date', endOfMonth.toISOString().split('T')[0]);

    // Get upcoming sessions (next 7 days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const { count: upcomingSessions } = await client
      .from(TABLES.CLEANING_SESSIONS)
      .select('*', { count: 'exact', head: true })
      .gte('cleaning_date', today.toISOString().split('T')[0])
      .lte('cleaning_date', nextWeek.toISOString().split('T')[0]);

    return {
      total_apartments: totalApartments || 0,
      total_cleaners: totalCleaners || 0,
      total_sessions: totalSessions || 0,
      sessions_this_month: sessionsThisMonth || 0,
      upcoming_sessions: upcomingSessions || 0,
    };
  },
};
