import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface BookingRow {
  id: string;
  apartment_id: string | null;
  check_in_date: string;
  check_out_date: string;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const inMs = new Date(`${checkIn}T00:00:00`).getTime();
  const outMs = new Date(`${checkOut}T00:00:00`).getTime();
  return Math.round((outMs - inMs) / (24 * 60 * 60 * 1000));
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildTasksForBooking(booking: BookingRow): {
  task_type: 'checkout_clean' | 'midstay_clean';
  scheduled_date: string;
}[] {
  const tasks: { task_type: 'checkout_clean' | 'midstay_clean'; scheduled_date: string }[] = [
    { task_type: 'checkout_clean', scheduled_date: booking.check_out_date },
  ];

  if (nightsBetween(booking.check_in_date, booking.check_out_date) > 5) {
    tasks.push({
      task_type: 'midstay_clean',
      scheduled_date: addDays(booking.check_in_date, 5),
    });
  }

  return tasks;
}

export async function POST(request: NextRequest) {
  const syncSecret = process.env.SYNC_SECRET;
  const providedSecret = request.headers.get('x-sync-secret');

  if (!syncSecret || providedSecret !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const today = todayDateString();

  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  const { data: bookings, error: fetchError } = await supabase
    .from('bookings')
    .select('id, apartment_id, check_in_date, check_out_date')
    .neq('booking_status', 'cancelled');

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message, generated: 0, skipped: 0, errors: [] },
      { status: 500 }
    );
  }

  for (const booking of (bookings ?? []) as BookingRow[]) {
    if (booking.check_out_date < today) {
      skipped += 1;
      continue;
    }

    if (!booking.apartment_id) {
      errors.push(`Booking ${booking.id}: missing apartment_id`);
      continue;
    }

    const { error: deleteError } = await supabase
      .from('cleaning_tasks')
      .delete()
      .eq('booking_id', booking.id);

    if (deleteError) {
      errors.push(`Booking ${booking.id}: failed to delete existing tasks — ${deleteError.message}`);
      continue;
    }

    const taskRows = buildTasksForBooking(booking).map((task) => ({
      booking_id: booking.id,
      apartment_id: booking.apartment_id,
      task_type: task.task_type,
      scheduled_date: task.scheduled_date,
    }));

    const { error: insertError } = await supabase.from('cleaning_tasks').insert(taskRows);

    if (insertError) {
      errors.push(`Booking ${booking.id}: failed to insert tasks — ${insertError.message}`);
      continue;
    }

    generated += 1;
  }

  return NextResponse.json({ generated, skipped, errors });
}
