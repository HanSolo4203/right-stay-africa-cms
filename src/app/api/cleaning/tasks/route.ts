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

const createSchema = z.object({
  apartment_id: z.string().uuid(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  task_type: z.enum(['checkout_clean', 'midstay_clean']),
  booking_id: z.string().uuid().nullable().optional(),
  cleaner_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten());
    }

    const {
      apartment_id,
      scheduled_date,
      task_type,
      booking_id,
      cleaner_id,
    } = parsed.data;
    const supabase = createServiceRoleClient();

    if (booking_id) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, apartment_id')
        .eq('id', booking_id)
        .maybeSingle();

      if (bookingError || !booking) {
        return errorResponse('Booking not found', 404);
      }
      if (booking.apartment_id !== apartment_id) {
        return errorResponse('Booking does not belong to this property', 400);
      }
    }

    let payout: number | null = null;
    if (cleaner_id) {
      payout = await resolveCleanerPayout(
        supabase,
        cleaner_id,
        apartment_id,
        task_type
      );
    }

    const { data, error } = await supabase
      .from('cleaning_tasks')
      .insert({
        apartment_id,
        scheduled_date,
        task_type,
        booking_id: booking_id ?? null,
        assigned_cleaner_id: cleaner_id ?? null,
        cleaner_payout: payout,
        auto_assigned: false,
        is_manual: true,
        status: 'pending',
      })
      .select(CLEANING_TASK_SELECT)
      .single();

    if (error) {
      console.error('Error creating cleaning task:', error);
      return serverErrorResponse('Failed to create cleaning task');
    }

    return successResponse(
      mapCleaningTaskRow(data as Record<string, unknown>),
      'Cleaning task created',
      201
    );
  } catch (error) {
    console.error('Error in cleaning tasks POST:', error);
    return serverErrorResponse('Internal server error');
  }
}
