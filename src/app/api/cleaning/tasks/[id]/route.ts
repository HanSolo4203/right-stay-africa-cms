import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  errorResponse,
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-utils';
import { resolveCleanerPayout } from '@/lib/cleaning-schedule';
import {
  CLEANING_TASK_SELECT,
  mapCleaningTaskRow,
} from '@/lib/queries/cleaning';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  task_type: z.enum(['checkout_clean', 'midstay_clean']).optional(),
  booking_id: z.string().uuid().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten());
    }

    if (
      parsed.data.scheduled_date === undefined &&
      parsed.data.task_type === undefined &&
      parsed.data.booking_id === undefined
    ) {
      return errorResponse('No fields to update', 400);
    }

    const supabase = createServiceRoleClient();

    const { data: existing, error: fetchError } = await supabase
      .from('cleaning_tasks')
      .select('id, apartment_id, task_type, assigned_cleaner_id, booking_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !existing) {
      return errorResponse('Cleaning task not found', 404);
    }

    const nextBookingId =
      parsed.data.booking_id !== undefined
        ? parsed.data.booking_id
        : existing.booking_id;
    const nextTaskType = parsed.data.task_type ?? existing.task_type;

    if (nextBookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, apartment_id')
        .eq('id', nextBookingId)
        .maybeSingle();

      if (bookingError || !booking) {
        return errorResponse('Booking not found', 404);
      }
      if (booking.apartment_id !== existing.apartment_id) {
        return errorResponse('Booking does not belong to this property', 400);
      }
    }

    const updatePayload: {
      scheduled_date?: string;
      task_type?: string;
      booking_id?: string | null;
      is_manual: boolean;
      is_locked: boolean;
      cleaner_payout?: number | null;
    } = {
      is_manual: true,
      is_locked: true,
    };

    if (parsed.data.scheduled_date !== undefined) {
      updatePayload.scheduled_date = parsed.data.scheduled_date;
    }
    if (parsed.data.task_type !== undefined) {
      updatePayload.task_type = parsed.data.task_type;
    }
    if (parsed.data.booking_id !== undefined) {
      updatePayload.booking_id = parsed.data.booking_id;
    }

    if (parsed.data.task_type !== undefined && existing.assigned_cleaner_id) {
      updatePayload.cleaner_payout = await resolveCleanerPayout(
        supabase,
        existing.assigned_cleaner_id,
        existing.apartment_id,
        nextTaskType
      );
    }

    const { data, error } = await supabase
      .from('cleaning_tasks')
      .update(updatePayload)
      .eq('id', id)
      .select(CLEANING_TASK_SELECT)
      .single();

    if (error) {
      console.error('Error updating cleaning task:', error);
      return serverErrorResponse('Failed to update cleaning task');
    }

    return successResponse(
      mapCleaningTaskRow(data as Record<string, unknown>),
      'Cleaning task updated'
    );
  } catch (error) {
    console.error('Error in cleaning tasks PATCH:', error);
    return serverErrorResponse('Internal server error');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('cleaning_tasks')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error deleting cleaning task:', error);
      return serverErrorResponse('Failed to delete cleaning task');
    }

    if (!data) {
      return errorResponse('Cleaning task not found', 404);
    }

    return successResponse({ id }, 'Cleaning task deleted');
  } catch (error) {
    console.error('Error in cleaning tasks DELETE:', error);
    return serverErrorResponse('Internal server error');
  }
}
