import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  errorResponse,
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-utils';
import {
  getMidstaySettings,
  saveMidstaySettings,
} from '@/lib/cleaning-schedule';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  minNights: z.number().int().min(1).max(365),
  intervalNights: z.number().int().min(1).max(365),
});

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const settings = await getMidstaySettings(supabase);
    return successResponse(settings);
  } catch (error) {
    console.error('Error loading cleaning schedule settings:', error);
    return serverErrorResponse('Failed to load cleaning schedule settings');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten());
    }

    const supabase = createServiceRoleClient();
    const settings = await saveMidstaySettings(supabase, parsed.data);
    return successResponse(settings, 'Cleaning schedule saved');
  } catch (error) {
    console.error('Error saving cleaning schedule settings:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to save cleaning schedule settings',
      500
    );
  }
}
