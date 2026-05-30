import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  errorResponse,
  successResponse,
  serverErrorResponse,
} from '@/lib/api-utils';
import type { CleanerPayoutSummary, CleaningTask } from '@/lib/types';

function mapTaskRow(row: Record<string, unknown>): CleaningTask {
  const cleanersRaw = row.cleaners as { name: string } | { name: string }[] | null;
  const apartmentsRaw = row.apartments as
    | { apartment_number: string; uplisting_name: string | null }
    | { apartment_number: string; uplisting_name: string | null }[]
    | null;
  const bookingsRaw = row.bookings as
    | {
        check_in_date: string;
        check_out_date: string;
        booking_reference: string;
        guests: { name: string } | { name: string }[] | null;
      }
    | null;

  const cleaner = Array.isArray(cleanersRaw) ? cleanersRaw[0] : cleanersRaw;
  const apartment = Array.isArray(apartmentsRaw) ? apartmentsRaw[0] : apartmentsRaw;
  const guestRaw = bookingsRaw?.guests;
  const guest =
    guestRaw == null ? null : Array.isArray(guestRaw) ? guestRaw[0] : guestRaw;

  return {
    id: row.id as string,
    booking_id: row.booking_id as string,
    apartment_id: row.apartment_id as string,
    task_type: row.task_type as CleaningTask['task_type'],
    scheduled_date: row.scheduled_date as string,
    status: row.status as CleaningTask['status'],
    notes: (row.notes as string | null) ?? null,
    assigned_cleaner_id: (row.assigned_cleaner_id as string | null) ?? null,
    cleaner_payout: row.cleaner_payout != null ? Number(row.cleaner_payout) : null,
    auto_assigned: Boolean(row.auto_assigned),
    completed_at: (row.completed_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    cleaner_name: cleaner?.name ?? undefined,
    apartment_name: apartment?.uplisting_name || apartment?.apartment_number || undefined,
    guest_name: guest?.name ?? undefined,
    check_in_date: bookingsRaw?.check_in_date,
    check_out_date: bookingsRaw?.check_out_date,
    booking_reference: bookingsRaw?.booking_reference,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const cleanerId = searchParams.get('cleaner_id');

    if (!fromDate || !toDate) {
      return errorResponse('from_date and to_date are required', 400);
    }

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('cleaning_tasks')
      .select(
        `
        *,
        cleaners ( name ),
        apartments ( apartment_number, uplisting_name ),
        bookings (
          check_in_date,
          check_out_date,
          booking_reference,
          guests ( name )
        )
      `
      )
      .eq('status', 'completed')
      .gte('scheduled_date', fromDate)
      .lte('scheduled_date', toDate)
      .order('scheduled_date', { ascending: true });

    if (cleanerId) {
      query = query.eq('assigned_cleaner_id', cleanerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payout report:', error);
      return serverErrorResponse('Failed to fetch payout report');
    }

    const tasks = (data ?? []).map((row) => mapTaskRow(row as Record<string, unknown>));

    const byCleaner = new Map<string, CleanerPayoutSummary>();

    for (const task of tasks) {
      const cid = task.assigned_cleaner_id ?? 'unassigned';
      const cname = task.cleaner_name ?? 'Unassigned';

      if (!byCleaner.has(cid)) {
        byCleaner.set(cid, {
          cleaner_id: cid,
          cleaner_name: cname,
          checkout_count: 0,
          midstay_count: 0,
          total_payout: 0,
          tasks: [],
        });
      }

      const summary = byCleaner.get(cid)!;
      summary.tasks.push(task);
      if (task.task_type === 'checkout_clean') {
        summary.checkout_count += 1;
      } else {
        summary.midstay_count += 1;
      }
      summary.total_payout += task.cleaner_payout ?? 0;
    }

    const summaries = Array.from(byCleaner.values())
      .filter((s) => s.cleaner_id !== 'unassigned')
      .sort((a, b) => a.cleaner_name.localeCompare(b.cleaner_name));

    const grandTotal = summaries.reduce((sum, s) => sum + s.total_payout, 0);

    return successResponse(
      {
        from_date: fromDate,
        to_date: toDate,
        summaries,
        grand_total: grandTotal,
      },
      'Payout report retrieved'
    );
  } catch (error) {
    console.error('Error in cleaning payouts GET:', error);
    return serverErrorResponse('Internal server error');
  }
}
