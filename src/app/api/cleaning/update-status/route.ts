import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  errorResponse,
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-utils';
import { z } from 'zod';

const updateStatusSchema = z.object({
  task_id: z.string().uuid(),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
  cleaner_payout: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten());
    }

    const { task_id, status, cleaner_payout } = parsed.data;
    const supabase = createServiceRoleClient();

    const updatePayload: {
      status: string;
      completed_at: string | null;
      cleaner_payout?: number;
    } = {
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    };

    if (cleaner_payout !== undefined) {
      updatePayload.cleaner_payout = cleaner_payout;
    }

    const { data, error } = await supabase
      .from('cleaning_tasks')
      .update(updatePayload)
      .eq('id', task_id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating cleaning task status:', error);
      if (error.code === 'PGRST116') {
        return errorResponse('Cleaning task not found', 404);
      }
      return serverErrorResponse('Failed to update cleaning task status');
    }

    return successResponse(data, 'Cleaning task status updated');
  } catch (error) {
    console.error('Error in cleaning update-status POST:', error);
    return serverErrorResponse('Internal server error');
  }
}
