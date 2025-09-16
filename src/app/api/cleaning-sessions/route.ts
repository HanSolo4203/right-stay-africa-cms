import { NextRequest } from 'next/server';
import { cleaningSessionsApi, apartmentsApi, cleanersApi, settingsApi } from '@/lib/database';
import { 
  createCleaningSessionSchema, 
  cleaningSessionQuerySchema
} from '@/lib/validations';
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
    
    const { apartment_id, apartment, cleaner_id, month, year, start_date, end_date, limit = 50, offset = 0 } = validation.data;
    
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

    // Check if apartment exists
    const apartment = await apartmentsApi.getById(sessionData.apartment_id);
    if (!apartment) {
      return errorResponse('Apartment not found', 404);
    }

    // Check if cleaner exists
    const cleaner = await cleanersApi.getById(sessionData.cleaner_id);
    if (!cleaner) {
      return errorResponse('Cleaner not found', 404);
    }

    // Check for conflicts (same cleaner, same date)
    const existingSessions = await cleaningSessionsApi.getAllBasic();
    const conflict = existingSessions.find(session => 
      session.cleaner_id === sessionData.cleaner_id && 
      session.cleaning_date === sessionData.cleaning_date
    );

    if (conflict) {
      return errorResponse('Cleaner is already scheduled for this date', 409);
    }

    // Apply Welcome pack fee if requested
    let sessionToCreate = { ...sessionData } as any;
    if (sessionData.include_welcome_pack) {
      const welcomeFee = await settingsApi.getWelcomePackFee();
      const basePrice = typeof sessionData.price === 'number' ? sessionData.price : 0;
      sessionToCreate.price = basePrice + Number(welcomeFee);
    }
    // Remove flag before persisting
    delete sessionToCreate.include_welcome_pack;

    const newSession = await cleaningSessionsApi.create(sessionToCreate);
    
    return successResponse(newSession, 'Cleaning session created successfully', 201);
  } catch (error) {
    return handleApiError(error, 'creating cleaning session');
  }
}