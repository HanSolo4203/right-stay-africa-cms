import { NextRequest } from 'next/server';
import { apartmentsApi, cleaningSessionsApi } from '@/lib/database';
import { 
  updateApartmentSchema
} from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  handleApiError,
  validateRequest
} from '@/lib/api-utils';
import { z } from 'zod';

// GET /api/apartments/[id] - Get apartment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    const uuidSchema = z.string().uuid('Invalid apartment ID format');
    const validation = validateRequest(uuidSchema, id, 'apartment ID');
    if (!validation.success) {
      return validation.error;
    }

    const apartment = await apartmentsApi.getById(id);
    
    if (!apartment) {
      return notFoundResponse('Apartment');
    }

    return successResponse(apartment, 'Apartment retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'fetching apartment');
  }
}

// PUT /api/apartments/[id] - Update apartment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate UUID format
    const uuidSchema = z.string().uuid('Invalid apartment ID format');
    const idValidation = validateRequest(uuidSchema, id, 'apartment ID');
    if (!idValidation.success) {
      return idValidation.error;
    }

    // Validate request body
    const validation = validateRequest(updateApartmentSchema, body, 'apartment update data');
    if (!validation.success) {
      return validation.error;
    }
    
    const updateData = validation.data;
    
    // Check if apartment exists
    const existingApartment = await apartmentsApi.getById(id);
    if (!existingApartment) {
      return notFoundResponse('Apartment');
    }

    // Check for duplicate apartment number if it's being changed
    if (updateData.apartment_number) {
      const existingApartments = await apartmentsApi.getAll();
      const duplicateApartment = existingApartments.find(
        apt => apt.apartment_number.toLowerCase() === updateData.apartment_number!.toLowerCase() && apt.id !== id
      );

      if (duplicateApartment) {
        return errorResponse('Apartment number already exists', 409);
      }
    }

    const updatedApartment = await apartmentsApi.update({ id, ...updateData });
    
    return successResponse(updatedApartment, 'Apartment updated successfully');
  } catch (error) {
    return handleApiError(error, 'updating apartment');
  }
}

// DELETE /api/apartments/[id] - Delete apartment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    const uuidSchema = z.string().uuid('Invalid apartment ID format');
    const validation = validateRequest(uuidSchema, id, 'apartment ID');
    if (!validation.success) {
      return validation.error;
    }

    // Check if apartment exists
    const apartment = await apartmentsApi.getById(id);
    if (!apartment) {
      return notFoundResponse('Apartment');
    }

    // Check for existing cleaning sessions
    const allSessions = await cleaningSessionsApi.getAll();
    const apartmentSessions = allSessions.filter(session => session.apartment_number === apartment.apartment_number);

    if (apartmentSessions.length > 0) {
      return errorResponse(
        `Cannot delete apartment. It has ${apartmentSessions.length} cleaning session(s). Please delete the sessions first.`,
        409,
        { sessionCount: apartmentSessions.length }
      );
    }

    await apartmentsApi.delete(id);
    
    return successResponse(null, 'Apartment deleted successfully');
  } catch (error) {
    return handleApiError(error, 'deleting apartment');
  }
}
