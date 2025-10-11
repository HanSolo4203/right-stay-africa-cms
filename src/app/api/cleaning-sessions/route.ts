import { NextRequest } from 'next/server';
import { cleaningSessionsApi, apartmentsApi, cleanersApi } from '@/lib/database';
import { 
  createCleaningSessionSchema, 
  cleaningSessionQuerySchema
} from '@/lib/validations';
import type { CreateCleaningSessionData } from '@/lib/types';
import {
  successResponse,
  successPaginatedResponse,
  errorResponse,
  handleApiError,
  validateRequest
} from '@/lib/api-utils';

// GET /api/cleaning-sessions - Get all cleaning sessions with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const validation = validateRequest(cleaningSessionQuerySchema, queryParams);
    if (!validation.success) {
      return validation.error;
    }
    
    const { apartment_id, apartment, cleaner_id, month, year, start_date, end_date, limit = 50, offset = 0, upcoming } = validation.data;
    
    // Get all sessions
    const sessions = await cleaningSessionsApi.getAll();
    
    // Apply filters
    let filteredSessions = sessions;
    
    if (apartment_id) {
      // For apartment_id filtering, we need to get the apartment number first
      const apartmentData = await apartmentsApi.getById(apartment_id);
      if (apartmentData) {
        filteredSessions = filteredSessions.filter(session => session.apartment_number === apartmentData.apartment_number);
      }
    }
    
    if (apartment) {
      filteredSessions = filteredSessions.filter(session => session.apartment_number === apartment);
    }
    
    if (cleaner_id) {
      // For cleaner_id filtering, we need to get the cleaner name first
      const cleanerData = await cleanersApi.getById(cleaner_id);
      if (cleanerData) {
        filteredSessions = filteredSessions.filter(session => session.cleaner_name === cleanerData.name);
      }
    }
    
    if (month) {
      filteredSessions = filteredSessions.filter(session => session.cleaning_date.startsWith(month));
    }
    
    if (year) {
      filteredSessions = filteredSessions.filter(session => session.cleaning_date.startsWith(year));
    }
    
    if (start_date) {
      filteredSessions = filteredSessions.filter(session => session.cleaning_date >= start_date);
    }
    
    if (end_date) {
      filteredSessions = filteredSessions.filter(session => session.cleaning_date <= end_date);
    }
    
    // Handle upcoming filter - get next 7 days of cleanings
    if (upcoming === 'true') {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      
      const todayStr = today.toISOString().split('T')[0];
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      
      filteredSessions = filteredSessions.filter(session => 
        session.cleaning_date >= todayStr && session.cleaning_date <= nextWeekStr
      );
    }
    
    // Apply pagination
    const total = filteredSessions.length;
    const paginatedSessions = filteredSessions.slice(offset, offset + limit);
    const hasMore = offset + limit < total;
    
    return successPaginatedResponse(
      paginatedSessions,
      { total, limit, offset, hasMore },
      'Cleaning sessions retrieved successfully'
    );
  } catch (error) {
    return handleApiError(error, 'fetching cleaning sessions');
  }
}

// POST /api/cleaning-sessions - Create new cleaning session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest(createCleaningSessionSchema, body);
    if (!validation.success) {
      return validation.error;
    }
    
    const sessionData = validation.data;

    // Check if property exists using the unified schedulable properties approach
    const { createServerComponentClient } = await import('@/lib/supabase-server');
    const supabase = await createServerComponentClient();
    
    const { data: property, error: propertyError } = await supabase
      .from('all_schedulable_properties')
      .select('*')
      .eq('id', sessionData.apartment_id)
      .single();
    
    if (propertyError || !property) {
      return errorResponse('Property not found', 404);
    }
    
    const propertyCategory = property.property_category;

    // Check if primary cleaner exists
    const cleaner = await cleanersApi.getById(sessionData.cleaner_id);
    if (!cleaner) {
      return errorResponse('Primary cleaner not found', 404);
    }

    // Check if second cleaner exists (if provided)
    let cleaner2 = null;
    if (sessionData.cleaner_2_id) {
      cleaner2 = await cleanersApi.getById(sessionData.cleaner_2_id);
      if (!cleaner2) {
        return errorResponse('Second cleaner not found', 404);
      }
    }

    // Note: Removed conflict checking to allow cleaners to work multiple sessions per day
    // This supports multi-cleaner sessions and allows cleaners to work multiple apartments

    // Prepare session data with multi-cleaner support
    const sessionToCreate: CreateCleaningSessionData & { 
      welcome_pack_fee?: number | null;
      property_category: 'apartment' | 'internal_asset' | 'rsa_asset';
      property_id: string;
      cleaner_1_name?: string;
      cleaner_2_name?: string | null;
      is_multi_cleaner?: boolean;
      cleaner_count?: number;
      total_cleaning_fee?: number;
    } = { 
      ...sessionData,
      property_category: propertyCategory as 'apartment' | 'internal_asset' | 'rsa_asset',
      property_id: sessionData.apartment_id,
      cleaner_1_name: cleaner.name,
      cleaner_2_name: cleaner2?.name,
      is_multi_cleaner: !!sessionData.cleaner_2_id,
      cleaner_count: sessionData.cleaner_2_id ? 2 : 1
    };
    
    // Apply Welcome pack fee separately (do NOT add to price)
    if (sessionData.include_welcome_pack && sessionData.welcome_pack_fee) {
      sessionToCreate.welcome_pack_fee = sessionData.welcome_pack_fee;
    }
    
    // For internal assets, ensure the price is set (daily payment amount)
    if (propertyCategory === 'internal_asset' && !sessionToCreate.price) {
      return errorResponse('Payment amount is required for internal asset services', 400);
    }
    
    // For multi-cleaner sessions, set individual fees to apartment's cleaner payout amount
    if (sessionData.cleaner_2_id && propertyCategory === 'apartment') {
      // Get the apartment's cleaner payout amount
      const apartmentPayout = (property as { cleaner_payout?: number }).cleaner_payout;
      if (!apartmentPayout) {
        return errorResponse('Apartment cleaner payout amount not found', 400);
      }
      
      // Set individual cleaner fees to apartment payout amount only if not manually provided
      if (sessionData.cleaner_1_fee === undefined || sessionData.cleaner_1_fee === null) {
        sessionToCreate.cleaner_1_fee = apartmentPayout;
      }
      if (sessionData.cleaner_2_fee === undefined || sessionData.cleaner_2_fee === null) {
        sessionToCreate.cleaner_2_fee = apartmentPayout;
      }
      
      // Calculate total cleaning fee as sum of both cleaner fees
      sessionToCreate.total_cleaning_fee = (sessionToCreate.cleaner_1_fee || 0) + (sessionToCreate.cleaner_2_fee || 0);
    } else if (propertyCategory === 'apartment' && (sessionData.cleaner_1_fee !== undefined && sessionData.cleaner_1_fee !== null)) {
      // For single cleaner sessions, only set total_cleaning_fee if cleaner_1_fee was explicitly provided
      sessionToCreate.total_cleaning_fee = sessionData.cleaner_1_fee;
    }
    
    // Remove flag before persisting
    delete sessionToCreate.include_welcome_pack;

    const newSession = await cleaningSessionsApi.create(sessionToCreate as CreateCleaningSessionData);
    
    const successMessage = sessionData.cleaner_2_id 
      ? 'Multi-cleaner session created successfully'
      : 'Cleaning session created successfully';
    
    return successResponse(newSession, successMessage, 201);
  } catch (error) {
    return handleApiError(error, 'creating cleaning session');
  }
}