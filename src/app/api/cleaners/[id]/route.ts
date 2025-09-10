import { NextRequest } from 'next/server';
import { cleanersApi, cleaningSessionsApi } from '@/lib/database';
import { 
  updateCleanerSchema
} from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  handleApiError,
  validateRequest
} from '@/lib/api-utils';
import { z } from 'zod';

// GET /api/cleaners/[id] - Get cleaner by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Validate UUID format
    const uuidSchema = z.string().uuid('Invalid cleaner ID format');
    const validation = validateRequest(uuidSchema, id, 'cleaner ID');
    if (!validation.success) {
      return validation.error;
    }

    const cleaner = await cleanersApi.getById(id);
    
    if (!cleaner) {
      return notFoundResponse('Cleaner');
    }

    return successResponse(cleaner, 'Cleaner retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'fetching cleaner');
  }
}

// PUT /api/cleaners/[id] - Update cleaner
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Validate UUID format
    const uuidSchema = z.string().uuid('Invalid cleaner ID format');
    const idValidation = validateRequest(uuidSchema, id, 'cleaner ID');
    if (!idValidation.success) {
      return idValidation.error;
    }

    // Validate request body
    const validation = validateRequest(updateCleanerSchema, body, 'cleaner update data');
    if (!validation.success) {
      return validation.error;
    }
    
    const updateData = validation.data;
    
    // Check if cleaner exists
    const existingCleaner = await cleanersApi.getById(id);
    if (!existingCleaner) {
      return notFoundResponse('Cleaner');
    }

    const updatedCleaner = await cleanersApi.update({ id, ...updateData });
    
    return successResponse(updatedCleaner, 'Cleaner updated successfully');
  } catch (error) {
    return handleApiError(error, 'updating cleaner');
  }
}

// DELETE /api/cleaners/[id] - Delete cleaner
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Validate UUID format
    const uuidSchema = z.string().uuid('Invalid cleaner ID format');
    const validation = validateRequest(uuidSchema, id, 'cleaner ID');
    if (!validation.success) {
      return validation.error;
    }

    // Check if cleaner exists
    const cleaner = await cleanersApi.getById(id);
    if (!cleaner) {
      return notFoundResponse('Cleaner');
    }

    // Check for existing cleaning sessions
    const allSessions = await cleaningSessionsApi.getAll();
    const cleanerSessions = allSessions.filter(session => session.cleaner_name === cleaner.name);

    if (cleanerSessions.length > 0) {
      return errorResponse(
        `Cannot delete cleaner. They have ${cleanerSessions.length} cleaning session(s). Please reassign or delete the sessions first.`,
        409,
        { sessionCount: cleanerSessions.length }
      );
    }

    await cleanersApi.delete(id);
    
    return successResponse(null, 'Cleaner deleted successfully');
  } catch (error) {
    return handleApiError(error, 'deleting cleaner');
  }
}
