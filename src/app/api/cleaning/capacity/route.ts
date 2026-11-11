import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  errorResponse,
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-utils';
import { getCleaningCapacityOverview } from '@/lib/cleaning-scheduler';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      from: searchParams.get('from'),
      to: searchParams.get('to'),
    });

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten());
    }

    const { from, to } = parsed.data;
    if (from > to) {
      return errorResponse('"from" must be on or before "to"', 400);
    }

    const supabase = createServiceRoleClient();
    const days = await getCleaningCapacityOverview(supabase, from, to);
    return successResponse({ from, to, days });
  } catch (error) {
    console.error('Error loading cleaning capacity:', error);
    return serverErrorResponse(
      error instanceof Error ? error.message : 'Failed to load cleaning capacity'
    );
  }
}
