import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  assignmentFieldsForTask,
  buildTasksForBooking,
  getMidstaySettings,
  getPrimaryCleanerAssignment,
  type PrimaryCleanerAssignment,
} from '@/lib/cleaning-schedule';

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

  let settings;
  try {
    settings = await getMidstaySettings(supabase);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load schedule settings';
    return NextResponse.json(
      { error: message, generated: 0, skipped: 0, errors: [] },
      { status: 500 }
    );
  }

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

  const assignmentByApartment = new Map<string, PrimaryCleanerAssignment>();

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
      .eq('booking_id', booking.id)
      .eq('is_manual', false)
      .in('status', ['pending', 'in_progress']);

    if (deleteError) {
      errors.push(
        `Booking ${booking.id}: failed to delete existing auto tasks — ${deleteError.message}`
      );
      continue;
    }

    const { data: remaining, error: remainingError } = await supabase
      .from('cleaning_tasks')
      .select('scheduled_date')
      .eq('booking_id', booking.id);

    if (remainingError) {
      errors.push(
        `Booking ${booking.id}: failed to load remaining tasks — ${remainingError.message}`
      );
      continue;
    }

    const existingDates = new Set(
      (remaining ?? []).map((row) => row.scheduled_date as string)
    );

    let assignment = assignmentByApartment.get(booking.apartment_id);
    if (!assignment) {
      assignment = await getPrimaryCleanerAssignment(supabase, booking.apartment_id);
      assignmentByApartment.set(booking.apartment_id, assignment);
    }

    const taskRows = buildTasksForBooking(booking, settings)
      .filter((task) => !existingDates.has(task.scheduled_date))
      .map((task) => ({
        booking_id: booking.id,
        apartment_id: booking.apartment_id,
        task_type: task.task_type,
        scheduled_date: task.scheduled_date,
        is_manual: false,
        ...assignmentFieldsForTask(task.task_type, assignment),
      }));

    if (taskRows.length > 0) {
      const { error: insertError } = await supabase.from('cleaning_tasks').insert(taskRows);
      if (insertError) {
        errors.push(`Booking ${booking.id}: failed to insert tasks — ${insertError.message}`);
        continue;
      }
    }

    generated += 1;
  }

  return NextResponse.json({ generated, skipped, errors });
}
