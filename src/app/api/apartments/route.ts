import { NextRequest } from 'next/server';
import { apartmentsApi } from '@/lib/database';
import { 
  createApartmentSchema, 
  apartmentQuerySchema
} from '@/lib/validations';
import {
  successResponse,
  successPaginatedResponse,
  errorResponse,
  handleApiError,
  validateRequest
} from '@/lib/api-utils';

// GET /api/apartments - Get all apartments with optional search and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const validation = validateRequest(apartmentQuerySchema, queryParams, 'query parameters');
    if (!validation.success) {
      return validation.error;
    }
    
    const { search, limit = 50, offset = 0 } = validation.data;
    
    // Get all apartments (we'll implement search in the database layer if needed)
    const apartments = await apartmentsApi.getAll();
    
    // Apply search filter if provided
    let filteredApartments = apartments;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredApartments = apartments.filter(apt => 
        apt.apartment_number.toLowerCase().includes(searchLower) ||
        apt.owner_name.toLowerCase().includes(searchLower) ||
        (apt.owner_email && apt.owner_email.toLowerCase().includes(searchLower)) ||
        (apt.address && apt.address.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply pagination
    const total = filteredApartments.length;
    const paginatedApartments = filteredApartments.slice(offset, offset + limit);
    const hasMore = offset + limit < total;
    
    return successPaginatedResponse(
      paginatedApartments,
      { total, limit, offset, hasMore },
      'Apartments retrieved successfully'
    );
  } catch (error) {
    return handleApiError(error, 'fetching apartments');
  }
}

// POST /api/apartments - Create new apartment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest(createApartmentSchema, body, 'apartment data');
    if (!validation.success) {
      return validation.error;
    }
    
    const apartmentData = validation.data;
    
    // Check for duplicate apartment number
    const existingApartments = await apartmentsApi.getAll();
    const duplicateApartment = existingApartments.find(
      apt => apt.apartment_number.toLowerCase() === apartmentData.apartment_number.toLowerCase()
    );

    if (duplicateApartment) {
      return errorResponse('Apartment number already exists', 409);
    }

    const newApartment = await apartmentsApi.create(apartmentData);
    
    return successResponse(newApartment, 'Apartment created successfully', 201);
  } catch (error) {
    return handleApiError(error, 'creating apartment');
  }
}
