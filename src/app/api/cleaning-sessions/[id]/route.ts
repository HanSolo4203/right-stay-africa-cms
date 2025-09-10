import { NextRequest } from 'next/server';
import { cleaningSessionsApi, apartmentsApi, cleanersApi } from '@/lib/database';
import { 
  updateCleaningSessionSchema
} from '@/lib/validations';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  handleApiError,
  validateRequest
} from '@/lib/api-utils';
import { z } from 'zod';

// GET /api/cleaning-sessions/[id] - Get cleaning session by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    const uuidSchema = z.string().uuid('Invalid session ID format');
    const validation = validateRequest(uuidSchema, id);
    if (!validation.success) {
      return validation.error;
    }

    const session = await cleaningSessionsApi.getById(id);
    
    if (!session) {
      return notFoundResponse('Cleaning session');
    }

    return successResponse(session, 'Cleaning session retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'fetching cleaning session');
  }
}

// PUT /api/cleaning-sessions/[id] - Update cleaning session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate UUID format
    const uuidSchema = z.string().uuid('Invalid session ID format');
    const idValidation = validateRequest(uuidSchema, id);
    if (!idValidation.success) {
      return idValidation.error;
    }

    // Validate request body
    const validation = validateRequest(updateCleaningSessionSchema, body);
    if (!validation.success) {
      return validation.error;
    }
    
    const updateData = validation.data;
    
    // Check if session exists
    const existingSession = await cleaningSessionsApi.getById(id);
    if (!existingSession) {
      return notFoundResponse('Cleaning session');
    }

    // Check if apartment exists if being changed
    if (updateData.apartment_id) {
      const apartment = await apartmentsApi.getById(updateData.apartment_id);
      if (!apartment) {
        return errorResponse('Apartment not found', 404);
      }
    }

    // Check if cleaner exists if being changed
    if (updateData.cleaner_id) {
      const cleaner = await cleanersApi.getById(updateData.cleaner_id);
      if (!cleaner) {
        return errorResponse('Cleaner not found', 404);
      }
    }

    // Check for conflicts if cleaner or date is being changed
    if (updateData.cleaner_id || updateData.cleaning_date) {
      const existingSessions = await cleaningSessionsApi.getAllBasic();
      const existingSessionBasic = existingSessions.find(s => s.id === id);
      
      if (existingSessionBasic) {
        const conflict = existingSessions.find(session => 
          session.cleaner_id === (updateData.cleaner_id || existingSessionBasic.cleaner_id) && 
          session.cleaning_date === (updateData.cleaning_date || existingSessionBasic.cleaning_date) &&
          session.id !== id
        );

        if (conflict) {
          return errorResponse('Cleaner is already scheduled for this date', 409);
        }
      }
    }

    const updatedSession = await cleaningSessionsApi.update({ id, ...updateData });
    
    return successResponse(updatedSession, 'Cleaning session updated successfully');
  } catch (error) {
    return handleApiError(error, 'updating cleaning session');
  }
}

// DELETE /api/cleaning-sessions/[id] - Delete cleaning session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    const uuidSchema = z.string().uuid('Invalid session ID format');
    const validation = validateRequest(uuidSchema, id);
    if (!validation.success) {
      return validation.error;
    }

    // Check if session exists
    const session = await cleaningSessionsApi.getById(id);
    if (!session) {
      return notFoundResponse('Cleaning session');
    }

    await cleaningSessionsApi.delete(id);
    
    return successResponse(null, 'Cleaning session deleted successfully');
  } catch (error) {
    return handleApiError(error, 'deleting cleaning session');
  }
}
