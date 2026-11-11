import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  assignmentFieldsForTask,
  buildTasksForBooking,
  getMidstaySettings,
  getPrimaryCleanerAssignment,
  type PrimaryCleanerAssignment,
} from '@/lib/cleaning-schedule';
import {
  getCapacitySchedulerSettings,
  rebalanceCleaningCapacity,
  resolveTaskDurationMinutes,
  type SchedulerApartment,
} from '@/lib/cleaning-scheduler';
import type { ApartmentSizeType } from '@/lib/types';

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
  let rebalanced = 0;
  const errors: string[] = [];

  let settings;
  let capacitySettings;
  try {
    settings = await getMidstaySettings(supabase);
    capacitySettings = await getCapacitySchedulerSettings(supabase);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load schedule settings';
    return NextResponse.json(
      { error: message, generated: 0, skipped: 0, rebalanced: 0, errors: [] },
      { status: 500 }
    );
  }

  const { data: bookings, error: fetchError } = await supabase
    .from('bookings')
    .select('id, apartment_id, check_in_date, check_out_date')
    .neq('booking_status', 'cancelled');

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message, generated: 0, skipped: 0, rebalanced: 0, errors: [] },
      { status: 500 }
    );
  }

  const assignmentByApartment = new Map<string, PrimaryCleanerAssignment>();
  const apartmentById = new Map<string, SchedulerApartment>();
  let minDate = today;
  let maxDate = today;

  for (const booking of (bookings ?? []) as BookingRow[]) {
    if (booking.check_out_date < today) {
      skipped += 1;
      continue;
    }

    if (!booking.apartment_id) {
      errors.push(`Booking ${booking.id}: missing apartment_id`);
      continue;
    }

    // Only replace future pending unlocked auto tasks; keep locked/completed/manual/past.
    const { error: deleteError } = await supabase
      .from('cleaning_tasks')
      .delete()
      .eq('booking_id', booking.id)
      .eq('is_manual', false)
      .eq('is_locked', false)
      .eq('status', 'pending')
      .gte('scheduled_date', today);

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

    let apartment = apartmentById.get(booking.apartment_id);
    if (!apartment) {
      const { data: aptRow } = await supabase
        .from('apartments')
        .select('id, size_type, checkout_minutes, midstay_minutes')
        .eq('id', booking.apartment_id)
        .maybeSingle();
      apartment = {
        id: booking.apartment_id,
        size_type: (aptRow?.size_type as ApartmentSizeType) || '1_bed',
        checkout_minutes:
          aptRow?.checkout_minutes == null ? null : Number(aptRow.checkout_minutes),
        midstay_minutes:
          aptRow?.midstay_minutes == null ? null : Number(aptRow.midstay_minutes),
      };
      apartmentById.set(booking.apartment_id, apartment);
    }

    const taskRows = buildTasksForBooking(booking, settings)
      .filter((task) => !existingDates.has(task.scheduled_date))
      .filter((task) => task.scheduled_date >= today)
      .map((task) => ({
        booking_id: booking.id,
        apartment_id: booking.apartment_id,
        task_type: task.task_type,
        scheduled_date: task.scheduled_date,
        ideal_date: task.ideal_date,
        is_manual: false,
        is_locked: false,
        duration_minutes: resolveTaskDurationMinutes(
          task.task_type,
          apartment,
          capacitySettings.durations
        ),
        ...assignmentFieldsForTask(task.task_type, assignment),
      }));

    if (taskRows.length > 0) {
      const { error: insertError } = await supabase.from('cleaning_tasks').insert(taskRows);
      if (insertError) {
        errors.push(`Booking ${booking.id}: failed to insert tasks — ${insertError.message}`);
        continue;
      }
    }

    if (booking.check_in_date < minDate) minDate = booking.check_in_date;
    if (booking.check_out_date > maxDate) maxDate = booking.check_out_date;
    generated += 1;
  }

  try {
    const rangeStart = minDate < today ? today : minDate;
    const { updated } = await rebalanceCleaningCapacity(supabase, rangeStart, maxDate);
    rebalanced = updated;
  } catch (error) {
    errors.push(
      `Rebalance failed — ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }

  return NextResponse.json({ generated, skipped, rebalanced, errors });
}
