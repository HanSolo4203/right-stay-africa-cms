import { NextRequest } from 'next/server';
import { cleanersApi } from '@/lib/database';
import { 
  createCleanerSchema, 
  cleanerQuerySchema
} from '@/lib/validations';
import {
  successResponse,
  successPaginatedResponse,
  handleApiError,
  validateRequest
} from '@/lib/api-utils';

// GET /api/cleaners - Get all cleaners with optional search and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const validation = validateRequest(cleanerQuerySchema, queryParams, 'query parameters');
    if (!validation.success) {
      return validation.error;
    }
    
    const { search, limit = 50, offset = 0 } = validation.data;
    
    // Get all cleaners
    const cleaners = await cleanersApi.getAll();
    
    // Apply search filter if provided
    let filteredCleaners = cleaners;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredCleaners = cleaners.filter(cleaner => 
        cleaner.name.toLowerCase().includes(searchLower) ||
        (cleaner.email && cleaner.email.toLowerCase().includes(searchLower)) ||
        (cleaner.phone && cleaner.phone.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply pagination
    const total = filteredCleaners.length;
    const paginatedCleaners = filteredCleaners.slice(offset, offset + limit);
    const hasMore = offset + limit < total;
    
    return successPaginatedResponse(
      paginatedCleaners,
      { total, limit, offset, hasMore },
      'Cleaners retrieved successfully'
    );
  } catch (error) {
    return handleApiError(error, 'fetching cleaners');
  }
}

// POST /api/cleaners - Create new cleaner
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest(createCleanerSchema, body, 'cleaner data');
    if (!validation.success) {
      return validation.error;
    }
    
    const cleanerData = validation.data;
    const newCleaner = await cleanersApi.create(cleanerData);
    
    return successResponse(newCleaner, 'Cleaner created successfully', 201);
  } catch (error) {
    return handleApiError(error, 'creating cleaner');
  }
}
