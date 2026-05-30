import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-utils';
import { z } from 'zod';

const rateSchema = z.object({
  cleaner_id: z.string().uuid(),
  apartment_id: z.string().uuid(),
  checkout_clean_rate: z.number().min(0),
  midstay_clean_rate: z.number().min(0),
});

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('cleaner_payout_rates')
      .select(
        `
        *,
        cleaners ( name ),
        apartments ( apartment_number, uplisting_name )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payout rates:', error);
      return serverErrorResponse('Failed to fetch payout rates');
    }

    const mapped = (data ?? []).map((row) => {
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
    });

    return successResponse(mapped, 'Payout rates retrieved');
  } catch (error) {
    console.error('Error in cleaning rates GET:', error);
    return serverErrorResponse('Internal server error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = rateSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten());
    }

    const { cleaner_id, apartment_id, checkout_clean_rate, midstay_clean_rate } = parsed.data;
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('cleaner_payout_rates')
      .upsert(
        {
          cleaner_id,
          apartment_id,
          checkout_clean_rate,
          midstay_clean_rate,
          currency: 'ZAR',
        },
        { onConflict: 'cleaner_id,apartment_id' }
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
      console.error('Error upserting payout rate:', error);
      return serverErrorResponse('Failed to save payout rate');
    }

    const cleanersRaw = data.cleaners as { name: string } | { name: string }[] | null;
    const apartmentsRaw = data.apartments as
      | { apartment_number: string; uplisting_name: string | null }
      | { apartment_number: string; uplisting_name: string | null }[]
      | null;
    const cleaner = Array.isArray(cleanersRaw) ? cleanersRaw[0] : cleanersRaw;
    const apartment = Array.isArray(apartmentsRaw) ? apartmentsRaw[0] : apartmentsRaw;

    return successResponse(
      {
        ...data,
        cleaner_name: cleaner?.name ?? null,
        apartment_name: apartment?.uplisting_name || apartment?.apartment_number || null,
      },
      'Payout rate saved'
    );
  } catch (error) {
    console.error('Error in cleaning rates POST:', error);
    return serverErrorResponse('Internal server error');
  }
}
