import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-utils';
import { z } from 'zod';

const assignmentSchema = z.object({
  cleaner_id: z.string().uuid(),
  apartment_id: z.string().uuid(),
  is_primary: z.boolean().default(true),
});

const deleteSchema = z.object({
  cleaner_id: z.string().uuid(),
  apartment_id: z.string().uuid(),
});

function mapAssignment(row: Record<string, unknown>) {
  const cleanersRaw = row.cleaners as { name: string } | { name: string }[] | null;
  const apartmentsRaw = row.apartments as
    | { apartment_number: string; uplisting_name: string | null }
    | { apartment_number: string; uplisting_name: string | null }[]
    | null;
  const cleaner = Array.isArray(cleanersRaw) ? cleanersRaw[0] : cleanersRaw;
  const apartment = Array.isArray(apartmentsRaw) ? apartmentsRaw[0] : apartmentsRaw;

  return {
    ...row,
    cleaner_name: cleaner?.name ?? null,
    apartment_name: apartment?.uplisting_name || apartment?.apartment_number || null,
  };
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('cleaner_apartment_assignments')
      .select(
        `
        *,
        cleaners ( name ),
        apartments ( apartment_number, uplisting_name )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assignments:', error);
      return serverErrorResponse('Failed to fetch assignments');
    }

    return successResponse(
      (data ?? []).map((row) => mapAssignment(row as Record<string, unknown>)),
      'Assignments retrieved'
    );
  } catch (error) {
    console.error('Error in cleaning assignments GET:', error);
    return serverErrorResponse('Internal server error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = assignmentSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten());
    }

    const { cleaner_id, apartment_id, is_primary } = parsed.data;
    const supabase = createServiceRoleClient();

    if (is_primary) {
      await supabase
        .from('cleaner_apartment_assignments')
        .update({ is_primary: false })
        .eq('apartment_id', apartment_id)
        .neq('cleaner_id', cleaner_id);
    }

    const { data, error } = await supabase
      .from('cleaner_apartment_assignments')
      .upsert(
        { cleaner_id, apartment_id, is_primary },
        { onConflict: 'apartment_id,cleaner_id' }
      )
      .select(
        `
        *,
        cleaners ( name ),
        apartments ( apartment_number, uplisting_name )
      `
      )
      .single();

    if (error) {
      console.error('Error upserting assignment:', error);
      return serverErrorResponse('Failed to save assignment');
    }

    return successResponse(mapAssignment(data as Record<string, unknown>), 'Assignment saved');
  } catch (error) {
    console.error('Error in cleaning assignments POST:', error);
    return serverErrorResponse('Internal server error');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten());
    }

    const { cleaner_id, apartment_id } = parsed.data;
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('cleaner_apartment_assignments')
      .delete()
      .eq('cleaner_id', cleaner_id)
      .eq('apartment_id', apartment_id);

    if (error) {
      console.error('Error deleting assignment:', error);
      return serverErrorResponse('Failed to delete assignment');
    }

    return successResponse(null, 'Assignment removed');
  } catch (error) {
    console.error('Error in cleaning assignments DELETE:', error);
    return serverErrorResponse('Internal server error');
  }
}
