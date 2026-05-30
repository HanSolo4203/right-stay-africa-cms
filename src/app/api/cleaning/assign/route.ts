import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  errorResponse,
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-utils';
import { z } from 'zod';

const assignSchema = z.object({
  task_id: z.string().uuid(),
  cleaner_id: z.string().uuid(),
  cleaner_payout: z.number().optional(),
});

async function resolvePayout(
  supabase: ReturnType<typeof createServiceRoleClient>,
  cleanerId: string,
  apartmentId: string,
  taskType: string
): Promise<number | null> {
  const { data: rate } = await supabase
    .from('cleaner_payout_rates')
    .select('checkout_clean_rate, midstay_clean_rate')
    .eq('cleaner_id', cleanerId)
    .eq('apartment_id', apartmentId)
    .maybeSingle();

  if (!rate) return null;

  return taskType === 'checkout_clean'
    ? Number(rate.checkout_clean_rate)
    : Number(rate.midstay_clean_rate);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten());
    }

    const { task_id, cleaner_id, cleaner_payout: payoutOverride } = parsed.data;
    const supabase = createServiceRoleClient();

    const { data: task, error: fetchError } = await supabase
      .from('cleaning_tasks')
      .select('id, apartment_id, task_type')
      .eq('id', task_id)
      .single();

    if (fetchError || !task) {
      return errorResponse('Cleaning task not found', 404);
    }

    const payout =
      payoutOverride !== undefined
        ? payoutOverride
        : await resolvePayout(supabase, cleaner_id, task.apartment_id, task.task_type);

    const { data, error } = await supabase
      .from('cleaning_tasks')
      .update({
        assigned_cleaner_id: cleaner_id,
        cleaner_payout: payout,
        auto_assigned: false,
      })
      .eq('id', task_id)
      .select(
        `
        *,
        cleaners ( name ),
        apartments ( apartment_number, uplisting_name )
      `
      )
      .single();

    if (error) {
      console.error('Error assigning cleaner:', error);
      return serverErrorResponse('Failed to assign cleaner');
    }

    const cleanersRaw = data.cleaners as { name: string } | { name: string }[] | null;
    const cleaner = Array.isArray(cleanersRaw) ? cleanersRaw[0] : cleanersRaw;

    return successResponse(
      {
        ...data,
        cleaner_name: cleaner?.name ?? null,
      },
      'Cleaner assigned successfully'
    );
  } catch (error) {
    console.error('Error in cleaning assign POST:', error);
    return serverErrorResponse('Internal server error');
  }
}
