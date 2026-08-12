import type { SupabaseClient } from '@supabase/supabase-js';
import type { CleaningTaskType } from '@/lib/types';

export const DEFAULT_MIDSTAY_MIN_NIGHTS = 5;
export const DEFAULT_MIDSTAY_INTERVAL_NIGHTS = 5;

export interface MidstaySettings {
  minNights: number;
  intervalNights: number;
}

export interface GeneratedCleaningTask {
  task_type: CleaningTaskType;
  scheduled_date: string;
}

export interface PrimaryCleanerAssignment {
  cleanerId: string | null;
  checkoutRate: number | null;
  midstayRate: number | null;
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const inMs = new Date(`${checkIn}T00:00:00`).getTime();
  const outMs = new Date(`${checkOut}T00:00:00`).getTime();
  return Math.round((outMs - inMs) / (24 * 60 * 60 * 1000));
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function normalizeMidstaySettings(
  minNights: unknown,
  intervalNights: unknown
): MidstaySettings {
  return {
    minNights: toPositiveInt(minNights, DEFAULT_MIDSTAY_MIN_NIGHTS),
    intervalNights: toPositiveInt(intervalNights, DEFAULT_MIDSTAY_INTERVAL_NIGHTS),
  };
}

export async function getMidstaySettings(
  supabase: SupabaseClient
): Promise<MidstaySettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['midstay_min_nights', 'midstay_interval_nights']);

  if (error) {
    throw new Error(error.message);
  }

  const byKey = new Map((data ?? []).map((row) => [row.key as string, row.value]));
  return normalizeMidstaySettings(
    byKey.get('midstay_min_nights'),
    byKey.get('midstay_interval_nights')
  );
}

export async function saveMidstaySettings(
  supabase: SupabaseClient,
  settings: MidstaySettings
): Promise<MidstaySettings> {
  const normalized = normalizeMidstaySettings(settings.minNights, settings.intervalNights);
  const updatedAt = new Date().toISOString();

  const { error } = await supabase.from('app_settings').upsert(
    [
      {
        key: 'midstay_min_nights',
        value: normalized.minNights,
        updated_at: updatedAt,
      },
      {
        key: 'midstay_interval_nights',
        value: normalized.intervalNights,
        updated_at: updatedAt,
      },
    ],
    { onConflict: 'key' }
  );

  if (error) {
    throw new Error(error.message);
  }

  return normalized;
}

export function buildTasksForBooking(
  booking: { check_in_date: string; check_out_date: string },
  settings: MidstaySettings
): GeneratedCleaningTask[] {
  const tasks: GeneratedCleaningTask[] = [
    { task_type: 'checkout_clean', scheduled_date: booking.check_out_date },
  ];

  const nights = nightsBetween(booking.check_in_date, booking.check_out_date);
  if (nights <= settings.minNights) {
    return tasks;
  }

  for (
    let offset = settings.intervalNights;
    offset < nights;
    offset += settings.intervalNights
  ) {
    tasks.push({
      task_type: 'midstay_clean',
      scheduled_date: addDays(booking.check_in_date, offset),
    });
  }

  return tasks;
}

export function payoutForTaskType(
  taskType: string,
  rates: { checkout_clean_rate: number; midstay_clean_rate: number } | null
): number | null {
  if (!rates) return null;
  return taskType === 'checkout_clean'
    ? Number(rates.checkout_clean_rate)
    : Number(rates.midstay_clean_rate);
}

export async function resolveCleanerPayout(
  supabase: SupabaseClient,
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

  return payoutForTaskType(taskType, rate);
}

export async function getPrimaryCleanerAssignment(
  supabase: SupabaseClient,
  apartmentId: string
): Promise<PrimaryCleanerAssignment> {
  const { data: assignment } = await supabase
    .from('cleaner_apartment_assignments')
    .select('cleaner_id')
    .eq('apartment_id', apartmentId)
    .eq('is_primary', true)
    .maybeSingle();

  const cleanerId = assignment?.cleaner_id ?? null;
  if (!cleanerId) {
    return { cleanerId: null, checkoutRate: null, midstayRate: null };
  }

  const { data: rate } = await supabase
    .from('cleaner_payout_rates')
    .select('checkout_clean_rate, midstay_clean_rate')
    .eq('cleaner_id', cleanerId)
    .eq('apartment_id', apartmentId)
    .maybeSingle();

  return {
    cleanerId,
    checkoutRate: rate ? Number(rate.checkout_clean_rate) : 0,
    midstayRate: rate ? Number(rate.midstay_clean_rate) : 0,
  };
}

export function assignmentFieldsForTask(
  taskType: CleaningTaskType,
  assignment: PrimaryCleanerAssignment
): {
  assigned_cleaner_id: string | null;
  cleaner_payout: number | null;
  auto_assigned: boolean;
} {
  if (!assignment.cleanerId) {
    return {
      assigned_cleaner_id: null,
      cleaner_payout: null,
      auto_assigned: false,
    };
  }

  return {
    assigned_cleaner_id: assignment.cleanerId,
    cleaner_payout:
      taskType === 'checkout_clean' ? assignment.checkoutRate : assignment.midstayRate,
    auto_assigned: true,
  };
}
