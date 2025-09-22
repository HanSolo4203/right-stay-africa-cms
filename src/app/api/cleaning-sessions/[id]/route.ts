import { NextRequest } from 'next/server';
import { cleaningSessionsApi, cleanersApi, settingsApi } from '@/lib/database';
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

    // Check if property exists if being changed
    if (updateData.apartment_id) {
      const { createServerComponentClient } = await import('@/lib/supabase-server');
      const supabase = await createServerComponentClient();
      const { data: property } = await supabase
        .from('all_schedulable_properties')
        .select('*')
        .eq('id', updateData.apartment_id)
        .single();
      
      if (!property) {
        return errorResponse('Property not found', 404);
      }
    }

    // Check if primary cleaner exists if being changed
    if (updateData.cleaner_id) {
      const cleaner = await cleanersApi.getById(updateData.cleaner_id);
      if (!cleaner) {
        console.log('Primary cleaner not found, but continuing with update');
        // Don't return error, just log it for now
      }
    }

    // Check if second cleaner exists if being changed (and not being removed)
    if (updateData.cleaner_2_id !== null && updateData.cleaner_2_id !== undefined) {
      const cleaner2 = await cleanersApi.getById(updateData.cleaner_2_id);
      if (!cleaner2) {
        console.log('Second cleaner not found, but continuing with update');
        // Don't return error, just log it for now
      }
    }

    // Note: Removed conflict checking to allow cleaners to work multiple sessions per day
    // This supports multi-cleaner sessions and allows cleaners to work multiple apartments

    // Handle welcome pack fee
    if (updateData.include_welcome_pack !== undefined) {
      if (updateData.include_welcome_pack) {
        const welcomeFee = await settingsApi.getWelcomePackFee();
        updateData.welcome_pack_fee = Number(welcomeFee);
        console.log(`[AUDIT] Adding welcome pack fee: R${welcomeFee} to session ${id}`);
      } else {
        // Set welcome pack fee to null when not included
        updateData.welcome_pack_fee = null;
        console.log(`[AUDIT] Removing welcome pack fee from session ${id}`);
      }
      // Remove include_welcome_pack from updateData since it's not a database column
      delete updateData.include_welcome_pack;
    }

    // Handle cleaner fees based on whether this is a multi-cleaner session
    if (updateData.cleaner_2_id !== null && updateData.cleaner_2_id !== undefined) {
      // Multi-cleaner session: set individual fees to apartment's cleaner payout amount
      const session = await cleaningSessionsApi.getById(id);
      if (!session) {
        return errorResponse('Session not found', 404);
      }
      
      const { createServerComponentClient } = await import('@/lib/supabase-server');
      const supabase = await createServerComponentClient();
      const { data: property } = await supabase
        .from('all_schedulable_properties')
        .select('cleaner_payout')
        .eq('id', session.apartment_id)
        .single();
      
      if (!property?.cleaner_payout) {
        return errorResponse('Property cleaner payout amount not found', 400);
      }
      
      // Set individual cleaner fees to property payout amount only if not manually provided
      if (updateData.cleaner_1_fee === undefined || updateData.cleaner_1_fee === null) {
        updateData.cleaner_1_fee = property.cleaner_payout;
      }
      if (updateData.cleaner_2_fee === undefined || updateData.cleaner_2_fee === null) {
        updateData.cleaner_2_fee = property.cleaner_payout;
      }
      
      // Calculate total cleaning fee as sum of both cleaner fees
      updateData.total_cleaning_fee = (updateData.cleaner_1_fee || 0) + (updateData.cleaner_2_fee || 0);
      
      // Set cleaner names from the validation we did earlier
      if (updateData.cleaner_id) {
        const cleaner1 = await cleanersApi.getById(updateData.cleaner_id);
        if (cleaner1) {
          updateData.cleaner_1_name = cleaner1.name;
        } else {
          // If cleaner doesn't exist, try to get name from existing session
          const existingSession = await cleaningSessionsApi.getById(id);
          if (existingSession && existingSession.cleaner_name) {
            updateData.cleaner_1_name = existingSession.cleaner_name;
          }
        }
      }
      if (updateData.cleaner_2_id !== null && updateData.cleaner_2_id !== undefined) {
        const cleaner2 = await cleanersApi.getById(updateData.cleaner_2_id);
        if (cleaner2) {
          updateData.cleaner_2_name = cleaner2.name;
        } else {
          // If cleaner doesn't exist, try to get name from existing session
          const existingSession = await cleaningSessionsApi.getById(id);
          if (existingSession && existingSession.cleaner_2_name) {
            updateData.cleaner_2_name = existingSession.cleaner_2_name;
          }
        }
      }
      
      // Total cleaning fee is the amount entered in popup (price field)
      // This is already set in updateData.price, so we keep it as is
    } else {
      // Single-cleaner session: clear second cleaner fee and name
      updateData.cleaner_2_fee = null;
      updateData.cleaner_2_name = null;
      
      // Only set total_cleaning_fee if cleaner_1_fee was explicitly provided
      if (updateData.cleaner_1_fee !== undefined && updateData.cleaner_1_fee !== null) {
        updateData.total_cleaning_fee = updateData.cleaner_1_fee;
      }
      
      // Set cleaner name for primary cleaner
      if (updateData.cleaner_id) {
        const cleaner1 = await cleanersApi.getById(updateData.cleaner_id);
        if (cleaner1) {
          updateData.cleaner_1_name = cleaner1.name;
        } else {
          // If cleaner doesn't exist, try to get name from existing session
          const existingSession = await cleaningSessionsApi.getById(id);
          if (existingSession && existingSession.cleaner_name) {
            updateData.cleaner_1_name = existingSession.cleaner_name;
          }
        }
      }
    }

    // Log audit information for multi-cleaner sessions or cleaner changes
    if (updateData.cleaner_2_id !== undefined || updateData.cleaner_1_fee !== undefined || updateData.cleaner_2_fee !== undefined) {
      console.log(`[AUDIT] Cleaning session update for session ${id}:`, {
        cleaner_1_id: updateData.cleaner_id,
        cleaner_2_id: updateData.cleaner_2_id,
        cleaner_1_fee: updateData.cleaner_1_fee,
        cleaner_2_fee: updateData.cleaner_2_fee,
        total_cleaning_fee: updateData.total_cleaning_fee,
        is_multi_cleaner: updateData.is_multi_cleaner,
        cleaner_count: updateData.cleaner_count,
        timestamp: new Date().toISOString()
      });
    }

    // Ensure null values are converted to undefined for type compatibility
    const cleanedUpdateData = { ...updateData };
    if (cleanedUpdateData.cleaner_2_name === null) {
      cleanedUpdateData.cleaner_2_name = undefined;
    }
    if (cleanedUpdateData.cleaner_2_id === null) {
      cleanedUpdateData.cleaner_2_id = undefined;
    }
    if (cleanedUpdateData.cleaner_2_fee === null) {
      cleanedUpdateData.cleaner_2_fee = undefined;
    }
    if (cleanedUpdateData.welcome_pack_fee === null) {
      cleanedUpdateData.welcome_pack_fee = undefined;
    }
    
    const updatedSession = await cleaningSessionsApi.update({ id, ...cleanedUpdateData });
    
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

    // Log audit information for deletion
    console.log(`[AUDIT] Cleaning session deletion for session ${id}:`, {
      session_date: session.cleaning_date,
      apartment_number: session.apartment_number,
      cleaner_1_name: session.cleaner_1_name || session.cleaner_name,
      cleaner_2_name: session.cleaner_2_name,
      cleaner_1_fee: session.cleaner_1_fee,
      cleaner_2_fee: session.cleaner_2_fee,
      total_cleaning_fee: session.total_cleaning_fee,
      price: session.price,
      is_multi_cleaner: session.is_multi_cleaner,
      timestamp: new Date().toISOString()
    });

    await cleaningSessionsApi.delete(id);
    
    return successResponse(null, 'Cleaning session deleted successfully');
  } catch (error) {
    return handleApiError(error, 'deleting cleaning session');
  }
}
