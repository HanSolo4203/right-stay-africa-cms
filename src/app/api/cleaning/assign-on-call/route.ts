import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  errorResponse,
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-utils';
import { assignOnCallCleanerToTask } from '@/lib/cleaning-scheduler';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  task_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten());
    }

    const supabase = createServiceRoleClient();
    const result = await assignOnCallCleanerToTask(supabase, parsed.data.task_id);
    return successResponse(result, 'On-call cleaner assigned');
  } catch (error) {
    console.error('Error assigning on-call cleaner:', error);
    const message = error instanceof Error ? error.message : 'Failed to assign on-call cleaner';
    if (message.includes('No active on-call') || message.includes('not found')) {
      return errorResponse(message, 404);
    }
    return serverErrorResponse(message);
  }
}
