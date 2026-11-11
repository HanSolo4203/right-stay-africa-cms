import type { SupabaseClient } from '@supabase/supabase-js';
import type { CleaningTaskType } from '@/lib/types';

export const DEFAULT_MIDSTAY_MIN_NIGHTS = 5;
export const DEFAULT_MIDSTAY_TARGET_GAP = 7;
export const DEFAULT_MIDSTAY_MAX_GAP = 8;
export const DEFAULT_MIDSTAY_FLEX_DAYS = 1;

/** @deprecated Kept for older settings rows; prefer targetGap/maxGap. */
export const DEFAULT_MIDSTAY_INTERVAL_NIGHTS = 5;

export interface MidstaySettings {
  minNights: number;
  targetGap: number;
  maxGap: number;
  flexDays: number;
}

export interface GeneratedCleaningTask {
  task_type: CleaningTaskType;
  scheduled_date: string;
  ideal_date: string;
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

function toNonNegativeInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeMidstaySettings(
  minNights: unknown,
  targetGap: unknown,
  maxGap: unknown = DEFAULT_MIDSTAY_MAX_GAP,
  flexDays: unknown = DEFAULT_MIDSTAY_FLEX_DAYS
): MidstaySettings {
  const normalized: MidstaySettings = {
    minNights: toPositiveInt(minNights, DEFAULT_MIDSTAY_MIN_NIGHTS),
    targetGap: toPositiveInt(targetGap, DEFAULT_MIDSTAY_TARGET_GAP),
    maxGap: toPositiveInt(maxGap, DEFAULT_MIDSTAY_MAX_GAP),
    flexDays: toNonNegativeInt(flexDays, DEFAULT_MIDSTAY_FLEX_DAYS),
  };

  if (normalized.maxGap < normalized.targetGap) {
    normalized.maxGap = normalized.targetGap;
  }

  return normalized;
}

/**
 * Evenly spaced mid-stay night offsets from check-in.
 * Never places on check-in (0), checkout (nights), or the night before checkout (nights-1).
 */
export function planMidstayNights(
  nights: number,
  settings: MidstaySettings
): number[] {
  if (!Number.isFinite(nights) || nights <= settings.minNights) {
    return [];
  }

  const count = Math.max(
    1,
    Math.round(nights / settings.targetGap) - 1,
    Math.ceil(nights / settings.maxGap) - 1
  );

  const minOffset = 1;
  const maxOffset = nights - 2;
  if (maxOffset < minOffset) {
    return [];
  }

  const offsets: number[] = [];
  const seen = new Set<number>();

  for (let k = 1; k <= count; k++) {
    let offset = Math.round((k * nights) / (count + 1));
    offset = Math.min(maxOffset, Math.max(minOffset, offset));
    if (seen.has(offset)) {
      continue;
    }
    seen.add(offset);
    offsets.push(offset);
  }

  return offsets;
}

export async function getMidstaySettings(
  supabase: SupabaseClient
): Promise<MidstaySettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', [
      'midstay_min_nights',
      'midstay_target_gap',
      'midstay_max_gap',
      'midstay_flex_days',
      'midstay_interval_nights',
    ]);

  if (error) {
    throw new Error(error.message);
  }

  const byKey = new Map((data ?? []).map((row) => [row.key as string, row.value]));
  const targetGap =
    byKey.get('midstay_target_gap') ?? byKey.get('midstay_interval_nights');

  return normalizeMidstaySettings(
    byKey.get('midstay_min_nights'),
    targetGap,
    byKey.get('midstay_max_gap'),
    byKey.get('midstay_flex_days')
  );
}

export async function saveMidstaySettings(
  supabase: SupabaseClient,
  settings: MidstaySettings
): Promise<MidstaySettings> {
  const normalized = normalizeMidstaySettings(
    settings.minNights,
    settings.targetGap,
    settings.maxGap,
    settings.flexDays
  );
  const updatedAt = new Date().toISOString();

  const { error } = await supabase.from('app_settings').upsert(
    [
      {
        key: 'midstay_min_nights',
        value: normalized.minNights,
        updated_at: updatedAt,
      },
      {
        key: 'midstay_target_gap',
        value: normalized.targetGap,
        updated_at: updatedAt,
      },
      {
        key: 'midstay_max_gap',
        value: normalized.maxGap,
        updated_at: updatedAt,
      },
      {
        key: 'midstay_flex_days',
        value: normalized.flexDays,
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
  const checkout: GeneratedCleaningTask = {
    task_type: 'checkout_clean',
    scheduled_date: booking.check_out_date,
    ideal_date: booking.check_out_date,
  };

  const nights = nightsBetween(booking.check_in_date, booking.check_out_date);
  const midStayOffsets = planMidstayNights(nights, settings);

  const midStays = midStayOffsets.map((offset) => {
    const date = addDays(booking.check_in_date, offset);
    return {
      task_type: 'midstay_clean' as const,
      scheduled_date: date,
      ideal_date: date,
    };
  });

  return [checkout, ...midStays];
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
