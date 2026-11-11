import type { SupabaseClient } from '@supabase/supabase-js';
import {
  addDays,
  assignmentFieldsForTask,
  buildTasksForBooking,
  getMidstaySettings,
  getPrimaryCleanerAssignment,
  payoutForTaskType,
  resolveCleanerPayout,
} from '@/lib/cleaning-schedule';
import type {
  ApartmentSizeType,
  CleaningDayCapacity,
  CleaningTaskType,
} from '@/lib/types';

export const DEFAULT_DAILY_CAPACITY_MINUTES = 450;

export const DEFAULT_DURATION_MINUTES = {
  '1_bed': { checkout: 150, midstay: 90 },
  '2_bed_luxury': { checkout: 180, midstay: 120 },
} as const;

export interface DurationDefaults {
  oneBedCheckout: number;
  oneBedMidstay: number;
  twoBedLuxuryCheckout: number;
  twoBedLuxuryMidstay: number;
}

export interface CapacitySchedulerSettings {
  flexDays: number;
  blockedWeekdays: number[];
  autoUseOnCall: boolean;
  durations: DurationDefaults;
}

export interface SchedulerCleaner {
  id: string;
  name?: string;
  daily_capacity_minutes: number;
  is_on_call: boolean;
  is_active: boolean;
}

export interface SchedulerApartment {
  id: string;
  size_type: ApartmentSizeType;
  checkout_minutes: number | null;
  midstay_minutes: number | null;
}

export interface SchedulerTaskInput {
  id: string;
  apartment_id: string;
  task_type: CleaningTaskType;
  scheduled_date: string;
  ideal_date: string | null;
  status: string;
  is_locked: boolean;
  assigned_cleaner_id: string | null;
  duration_minutes: number | null;
  cleaner_payout?: number | null;
  auto_assigned?: boolean;
  check_in_date?: string | null;
  check_out_date?: string | null;
}

export interface ScheduledTaskResult {
  id: string;
  apartment_id: string;
  task_type: CleaningTaskType;
  scheduled_date: string;
  ideal_date: string;
  assigned_cleaner_id: string | null;
  duration_minutes: number;
  cleaner_payout: number | null;
  auto_assigned: boolean;
  moved: boolean;
  reassigned: boolean;
}

export interface DayLoadSummary {
  date: string;
  capacity_minutes: number;
  booked_minutes: number;
  overflow_minutes: number;
  overloaded: boolean;
  cleanerLoads: Record<string, number>;
}

export interface ScheduleCapacityResult {
  tasks: ScheduledTaskResult[];
  days: DayLoadSummary[];
}

export interface PrimaryCleanerMap {
  [apartmentId: string]: string | null;
}

export interface PayoutRateMap {
  /** key: `${cleanerId}:${apartmentId}` */
  [key: string]: {
    checkout_clean_rate: number;
    midstay_clean_rate: number;
  };
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function weekdayIndex(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getDay();
}

function daysBetweenAbs(a: string, b: string): number {
  const aMs = new Date(`${a}T00:00:00`).getTime();
  const bMs = new Date(`${b}T00:00:00`).getTime();
  return Math.abs(Math.round((bMs - aMs) / (24 * 60 * 60 * 1000)));
}

export function normalizeDurationDefaults(
  partial?: Partial<DurationDefaults> | null
): DurationDefaults {
  return {
    oneBedCheckout: toPositiveInt(
      partial?.oneBedCheckout,
      DEFAULT_DURATION_MINUTES['1_bed'].checkout
    ),
    oneBedMidstay: toPositiveInt(
      partial?.oneBedMidstay,
      DEFAULT_DURATION_MINUTES['1_bed'].midstay
    ),
    twoBedLuxuryCheckout: toPositiveInt(
      partial?.twoBedLuxuryCheckout,
      DEFAULT_DURATION_MINUTES['2_bed_luxury'].checkout
    ),
    twoBedLuxuryMidstay: toPositiveInt(
      partial?.twoBedLuxuryMidstay,
      DEFAULT_DURATION_MINUTES['2_bed_luxury'].midstay
    ),
  };
}

export function parseBlockedWeekdays(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  }
  if (typeof value === 'string') {
    try {
      return parseBlockedWeekdays(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

export function resolveTaskDurationMinutes(
  taskType: CleaningTaskType,
  apartment: Pick<
    SchedulerApartment,
    'size_type' | 'checkout_minutes' | 'midstay_minutes'
  > | null | undefined,
  durations: DurationDefaults = normalizeDurationDefaults()
): number {
  if (apartment) {
    if (taskType === 'checkout_clean' && apartment.checkout_minutes != null) {
      return toPositiveInt(apartment.checkout_minutes, durations.oneBedCheckout);
    }
    if (taskType === 'midstay_clean' && apartment.midstay_minutes != null) {
      return toPositiveInt(apartment.midstay_minutes, durations.oneBedMidstay);
    }

    if (apartment.size_type === '2_bed_luxury') {
      return taskType === 'checkout_clean'
        ? durations.twoBedLuxuryCheckout
        : durations.twoBedLuxuryMidstay;
    }
  }

  return taskType === 'checkout_clean'
    ? durations.oneBedCheckout
    : durations.oneBedMidstay;
}

export function isTaskFixed(task: {
  task_type: CleaningTaskType;
  is_locked: boolean;
  status: string;
}): boolean {
  if (task.task_type === 'checkout_clean') return true;
  if (task.is_locked) return true;
  if (task.status === 'completed' || task.status === 'skipped' || task.status === 'in_progress') {
    return true;
  }
  return false;
}

/**
 * Candidate dates for an unlocked mid-stay: ideal ± flexDays, excluding
 * check-in, checkout, the day before checkout, and blocked weekdays.
 */
export function midstayCandidateDates(input: {
  idealDate: string;
  flexDays: number;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  blockedWeekdays?: number[];
}): string[] {
  const blocked = new Set(input.blockedWeekdays ?? []);
  const excluded = new Set<string>();
  if (input.checkInDate) excluded.add(input.checkInDate);
  if (input.checkOutDate) {
    excluded.add(input.checkOutDate);
    excluded.add(addDays(input.checkOutDate, -1));
  }

  const flex = Math.max(0, Math.floor(input.flexDays));
  const candidates: string[] = [];
  for (let delta = -flex; delta <= flex; delta++) {
    const date = addDays(input.idealDate, delta);
    if (excluded.has(date)) continue;
    if (blocked.has(weekdayIndex(date))) continue;
    candidates.push(date);
  }

  // Prefer ideal first, then by distance, then chronological for stability.
  candidates.sort((a, b) => {
    if (a === input.idealDate) return -1;
    if (b === input.idealDate) return 1;
    const da = daysBetweenAbs(a, input.idealDate);
    const db = daysBetweenAbs(b, input.idealDate);
    if (da !== db) return da - db;
    return a.localeCompare(b);
  });

  return candidates;
}

function regularActiveCleaners(cleaners: SchedulerCleaner[]): SchedulerCleaner[] {
  return cleaners.filter((c) => c.is_active && !c.is_on_call);
}

function teamCapacityMinutes(cleaners: SchedulerCleaner[]): number {
  return regularActiveCleaners(cleaners).reduce(
    (sum, c) => sum + Math.max(0, c.daily_capacity_minutes),
    0
  );
}

function ensureDayState(
  dayStates: Map<
    string,
    {
      cleanerRemaining: Map<string, number>;
      booked: number;
      capacity: number;
    }
  >,
  date: string,
  cleaners: SchedulerCleaner[]
) {
  let state = dayStates.get(date);
  if (!state) {
    const cleanerRemaining = new Map<string, number>();
    for (const cleaner of cleaners) {
      if (!cleaner.is_active) continue;
      cleanerRemaining.set(cleaner.id, Math.max(0, cleaner.daily_capacity_minutes));
    }
    state = {
      cleanerRemaining,
      booked: 0,
      capacity: teamCapacityMinutes(cleaners),
    };
    dayStates.set(date, state);
  }
  return state;
}

/** Team free minutes = regular capacity − all booked work (including unassigned). */
function remainingTeamMinutes(state: {
  booked: number;
  capacity: number;
}): number {
  return state.capacity - state.booked;
}

function assignCleanerForTask(input: {
  state: { cleanerRemaining: Map<string, number> };
  duration: number;
  primaryCleanerId: string | null;
  cleaners: SchedulerCleaner[];
  autoUseOnCall: boolean;
}): string | null {
  const { state, duration, primaryCleanerId, cleaners, autoUseOnCall } = input;
  const byId = new Map(cleaners.map((c) => [c.id, c]));

  if (primaryCleanerId) {
    const primary = byId.get(primaryCleanerId);
    const remaining = state.cleanerRemaining.get(primaryCleanerId) ?? 0;
    if (primary?.is_active && !primary.is_on_call && remaining >= duration) {
      return primaryCleanerId;
    }
  }

  const regulars = regularActiveCleaners(cleaners)
    .map((c) => ({
      id: c.id,
      remaining: state.cleanerRemaining.get(c.id) ?? 0,
    }))
    .filter((c) => c.remaining >= duration)
    .sort((a, b) => b.remaining - a.remaining || a.id.localeCompare(b.id));

  if (regulars.length > 0) {
    return regulars[0].id;
  }

  if (autoUseOnCall) {
    const onCall = cleaners
      .filter((c) => c.is_active && c.is_on_call)
      .map((c) => ({
        id: c.id,
        remaining: state.cleanerRemaining.get(c.id) ?? 0,
      }))
      .filter((c) => c.remaining >= duration)
      .sort((a, b) => b.remaining - a.remaining || a.id.localeCompare(b.id));
    if (onCall.length > 0) return onCall[0].id;
  }

  return null;
}

function consumeLoad(
  state: { cleanerRemaining: Map<string, number>; booked: number },
  cleanerId: string | null,
  duration: number
) {
  state.booked += duration;
  if (!cleanerId) return;
  const remaining = state.cleanerRemaining.get(cleanerId) ?? 0;
  state.cleanerRemaining.set(cleanerId, remaining - duration);
}

function resolvePayout(
  cleanerId: string | null,
  apartmentId: string,
  taskType: CleaningTaskType,
  rates: PayoutRateMap
): number | null {
  if (!cleanerId) return null;
  const rate = rates[`${cleanerId}:${apartmentId}`];
  return payoutForTaskType(taskType, rate ?? null);
}

/**
 * Pure capacity scheduler: fixes locked/completed/checkouts, flexes unlocked
 * mid-stays, then assigns cleaners by remaining daily minutes.
 */
export function scheduleCleaningCapacity(input: {
  tasks: SchedulerTaskInput[];
  cleaners: SchedulerCleaner[];
  apartments: SchedulerApartment[];
  primaryByApartment: PrimaryCleanerMap;
  payoutRates?: PayoutRateMap;
  settings: CapacitySchedulerSettings;
}): ScheduleCapacityResult {
  const durations = normalizeDurationDefaults(input.settings.durations);
  const apartments = new Map(input.apartments.map((a) => [a.id, a]));
  const payoutRates = input.payoutRates ?? {};
  const dayStates = new Map<
    string,
    {
      cleanerRemaining: Map<string, number>;
      booked: number;
      capacity: number;
    }
  >();

  const results = new Map<string, ScheduledTaskResult>();

  const enriched = input.tasks.map((task) => {
    const apartment = apartments.get(task.apartment_id);
    const duration =
      task.duration_minutes != null && task.duration_minutes > 0
        ? task.duration_minutes
        : resolveTaskDurationMinutes(task.task_type, apartment, durations);
    const ideal = task.ideal_date ?? task.scheduled_date;
    return { ...task, duration, ideal };
  });

  const fixed = enriched.filter((t) => isTaskFixed(t));
  const movable = enriched.filter((t) => !isTaskFixed(t));

  for (const task of fixed) {
    const state = ensureDayState(dayStates, task.scheduled_date, input.cleaners);
    let cleanerId = task.assigned_cleaner_id;
    // Locked/completed keep their cleaner. Checkouts stay on their date; only
    // fill an unassigned pending checkout via capacity rules.
    let autoAssigned = Boolean(task.auto_assigned);
    let reassigned = false;

    if (
      !task.is_locked &&
      task.status === 'pending' &&
      task.task_type === 'checkout_clean' &&
      !cleanerId
    ) {
      cleanerId = assignCleanerForTask({
        state,
        duration: task.duration,
        primaryCleanerId: input.primaryByApartment[task.apartment_id] ?? null,
        cleaners: input.cleaners,
        autoUseOnCall: input.settings.autoUseOnCall,
      });
      autoAssigned = cleanerId != null;
      reassigned = cleanerId != null;
    }

    consumeLoad(state, cleanerId, task.duration);

    results.set(task.id, {
      id: task.id,
      apartment_id: task.apartment_id,
      task_type: task.task_type,
      scheduled_date: task.scheduled_date,
      ideal_date: task.ideal,
      assigned_cleaner_id: cleanerId,
      duration_minutes: task.duration,
      cleaner_payout: resolvePayout(
        cleanerId,
        task.apartment_id,
        task.task_type,
        payoutRates
      ),
      auto_assigned: autoAssigned,
      moved: false,
      reassigned,
    });
  }

  // Least flexible first, then longer tasks, then stable id.
  const ranked = [...movable].sort((a, b) => {
    const aCandidates = midstayCandidateDates({
      idealDate: a.ideal,
      flexDays: input.settings.flexDays,
      checkInDate: a.check_in_date,
      checkOutDate: a.check_out_date,
      blockedWeekdays: input.settings.blockedWeekdays,
    }).length;
    const bCandidates = midstayCandidateDates({
      idealDate: b.ideal,
      flexDays: input.settings.flexDays,
      checkInDate: b.check_in_date,
      checkOutDate: b.check_out_date,
      blockedWeekdays: input.settings.blockedWeekdays,
    }).length;
    if (aCandidates !== bCandidates) return aCandidates - bCandidates;
    if (a.duration !== b.duration) return b.duration - a.duration;
    return a.id.localeCompare(b.id);
  });

  for (const task of ranked) {
    const candidates = midstayCandidateDates({
      idealDate: task.ideal,
      flexDays: input.settings.flexDays,
      checkInDate: task.check_in_date,
      checkOutDate: task.check_out_date,
      blockedWeekdays: input.settings.blockedWeekdays,
    });

    const usable = candidates.length > 0 ? candidates : [task.ideal];

    let chosen = usable[0];
    const idealState = ensureDayState(dayStates, task.ideal, input.cleaners);
    const idealHasRoom =
      usable.includes(task.ideal) &&
      remainingTeamMinutes(idealState) >= task.duration;

    if (idealHasRoom) {
      chosen = task.ideal;
    } else {
      let bestDate = usable[0];
      let bestFree = -Infinity;
      let bestDistance = Infinity;
      for (const date of usable) {
        const state = ensureDayState(dayStates, date, input.cleaners);
        const free = remainingTeamMinutes(state);
        const distance = daysBetweenAbs(date, task.ideal);
        if (
          free > bestFree ||
          (free === bestFree && distance < bestDistance) ||
          (free === bestFree && distance === bestDistance && date.localeCompare(bestDate) < 0)
        ) {
          bestFree = free;
          bestDistance = distance;
          bestDate = date;
        }
      }
      // If no candidate can absorb the task without overload, keep ideal
      // so overflow concentrates on the preferred day (and the UI flags it).
      if (bestFree < task.duration && usable.includes(task.ideal)) {
        chosen = task.ideal;
      } else {
        chosen = bestDate;
      }
    }

    const state = ensureDayState(dayStates, chosen, input.cleaners);
    const cleanerId = assignCleanerForTask({
      state,
      duration: task.duration,
      primaryCleanerId: input.primaryByApartment[task.apartment_id] ?? null,
      cleaners: input.cleaners,
      autoUseOnCall: input.settings.autoUseOnCall,
    });

    consumeLoad(state, cleanerId, task.duration);

    results.set(task.id, {
      id: task.id,
      apartment_id: task.apartment_id,
      task_type: task.task_type,
      scheduled_date: chosen,
      ideal_date: task.ideal,
      assigned_cleaner_id: cleanerId,
      duration_minutes: task.duration,
      cleaner_payout: resolvePayout(
        cleanerId,
        task.apartment_id,
        task.task_type,
        payoutRates
      ),
      auto_assigned: cleanerId != null,
      moved: chosen !== task.scheduled_date,
      reassigned: cleanerId !== task.assigned_cleaner_id,
    });
  }

  const allDates = new Set<string>([
    ...dayStates.keys(),
    ...enriched.map((t) => results.get(t.id)?.scheduled_date ?? t.scheduled_date),
  ]);

  const days: DayLoadSummary[] = [...allDates]
    .sort((a, b) => a.localeCompare(b))
    .map((date) => {
      const state = ensureDayState(dayStates, date, input.cleaners);
      const cleanerLoads: Record<string, number> = {};
      for (const cleaner of input.cleaners) {
        if (!cleaner.is_active) continue;
        const remaining = state.cleanerRemaining.get(cleaner.id) ?? 0;
        cleanerLoads[cleaner.id] = Math.max(0, cleaner.daily_capacity_minutes) - remaining;
      }
      const overflow = Math.max(0, state.booked - state.capacity);
      return {
        date,
        capacity_minutes: state.capacity,
        booked_minutes: state.booked,
        overflow_minutes: overflow,
        overloaded: overflow > 0,
        cleanerLoads,
      };
    });

  return {
    tasks: enriched.map((t) => results.get(t.id)!),
    days,
  };
}

export async function getCapacitySchedulerSettings(
  supabase: SupabaseClient
): Promise<CapacitySchedulerSettings> {
  const midstay = await getMidstaySettings(supabase);
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value, text_value')
    .in('key', [
      'cleaning_minutes_1_bed_checkout',
      'cleaning_minutes_1_bed_midstay',
      'cleaning_minutes_2_bed_luxury_checkout',
      'cleaning_minutes_2_bed_luxury_midstay',
      'auto_use_on_call',
      'midstay_blocked_weekdays',
    ]);

  if (error) {
    throw new Error(error.message);
  }

  const byKey = new Map(
    (data ?? []).map((row) => [
      row.key as string,
      { value: row.value, text_value: row.text_value as string | null },
    ])
  );

  const blockedRaw =
    byKey.get('midstay_blocked_weekdays')?.text_value ??
    byKey.get('midstay_blocked_weekdays')?.value;

  return {
    flexDays: midstay.flexDays,
    blockedWeekdays: parseBlockedWeekdays(blockedRaw),
    autoUseOnCall: Number(byKey.get('auto_use_on_call')?.value ?? 0) === 1,
    durations: normalizeDurationDefaults({
      oneBedCheckout: byKey.get('cleaning_minutes_1_bed_checkout')?.value,
      oneBedMidstay: byKey.get('cleaning_minutes_1_bed_midstay')?.value,
      twoBedLuxuryCheckout: byKey.get('cleaning_minutes_2_bed_luxury_checkout')
        ?.value,
      twoBedLuxuryMidstay: byKey.get('cleaning_minutes_2_bed_luxury_midstay')
        ?.value,
    }),
  };
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadSchedulerContext(
  supabase: SupabaseClient,
  fromDate: string,
  toDate: string
) {
  const settings = await getCapacitySchedulerSettings(supabase);

  const [tasksRes, cleanersRes, apartmentsRes, assignmentsRes, ratesRes] =
    await Promise.all([
      supabase
        .from('cleaning_tasks')
        .select(
          `
          id,
          apartment_id,
          task_type,
          scheduled_date,
          ideal_date,
          status,
          is_locked,
          assigned_cleaner_id,
          duration_minutes,
          cleaner_payout,
          auto_assigned,
          bookings ( check_in_date, check_out_date )
        `
        )
        .gte('scheduled_date', fromDate)
        .lte('scheduled_date', toDate),
      supabase
        .from('cleaners')
        .select('id, name, daily_capacity_minutes, is_on_call, is_active'),
      supabase
        .from('apartments')
        .select('id, size_type, checkout_minutes, midstay_minutes'),
      supabase
        .from('cleaner_apartment_assignments')
        .select('apartment_id, cleaner_id')
        .eq('is_primary', true),
      supabase
        .from('cleaner_payout_rates')
        .select('cleaner_id, apartment_id, checkout_clean_rate, midstay_clean_rate'),
    ]);

  for (const res of [tasksRes, cleanersRes, apartmentsRes, assignmentsRes, ratesRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const cleaners: SchedulerCleaner[] = (cleanersRes.data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    daily_capacity_minutes: toPositiveInt(
      row.daily_capacity_minutes,
      DEFAULT_DAILY_CAPACITY_MINUTES
    ),
    is_on_call: Boolean(row.is_on_call),
    is_active: row.is_active !== false,
  }));

  const apartments: SchedulerApartment[] = (apartmentsRes.data ?? []).map((row) => ({
    id: row.id as string,
    size_type: (row.size_type as ApartmentSizeType) || '1_bed',
    checkout_minutes:
      row.checkout_minutes == null ? null : Number(row.checkout_minutes),
    midstay_minutes:
      row.midstay_minutes == null ? null : Number(row.midstay_minutes),
  }));

  const primaryByApartment: PrimaryCleanerMap = {};
  for (const row of assignmentsRes.data ?? []) {
    primaryByApartment[row.apartment_id as string] = row.cleaner_id as string;
  }

  const payoutRates: PayoutRateMap = {};
  for (const row of ratesRes.data ?? []) {
    payoutRates[`${row.cleaner_id}:${row.apartment_id}`] = {
      checkout_clean_rate: Number(row.checkout_clean_rate),
      midstay_clean_rate: Number(row.midstay_clean_rate),
    };
  }

  const tasks: SchedulerTaskInput[] = (tasksRes.data ?? []).map((row) => {
    const bookings = row.bookings as
      | { check_in_date: string; check_out_date: string }
      | { check_in_date: string; check_out_date: string }[]
      | null;
    const booking = Array.isArray(bookings) ? bookings[0] : bookings;
    return {
      id: row.id as string,
      apartment_id: row.apartment_id as string,
      task_type: row.task_type as CleaningTaskType,
      scheduled_date: row.scheduled_date as string,
      ideal_date: (row.ideal_date as string | null) ?? null,
      status: row.status as string,
      is_locked: Boolean(row.is_locked),
      assigned_cleaner_id: (row.assigned_cleaner_id as string | null) ?? null,
      duration_minutes:
        row.duration_minutes == null ? null : Number(row.duration_minutes),
      cleaner_payout:
        row.cleaner_payout == null ? null : Number(row.cleaner_payout),
      auto_assigned: Boolean(row.auto_assigned),
      check_in_date: booking?.check_in_date ?? null,
      check_out_date: booking?.check_out_date ?? null,
    };
  });

  // Also include movable mid-stays whose ideal falls in range but scheduled date may be outside
  // after a previous move — expand query window via flex when needed by caller.

  return { settings, cleaners, apartments, primaryByApartment, payoutRates, tasks };
}

async function persistScheduleResult(
  supabase: SupabaseClient,
  result: ScheduleCapacityResult,
  originalById: Map<string, SchedulerTaskInput>
): Promise<number> {
  let updated = 0;
  for (const task of result.tasks) {
    const original = originalById.get(task.id);
    if (!original) continue;

    const changed =
      task.scheduled_date !== original.scheduled_date ||
      task.assigned_cleaner_id !== original.assigned_cleaner_id ||
      task.duration_minutes !== (original.duration_minutes ?? task.duration_minutes) ||
      task.cleaner_payout !== (original.cleaner_payout ?? null) ||
      task.auto_assigned !== Boolean(original.auto_assigned);

    if (!changed) continue;
    if (original.is_locked || original.status !== 'pending') {
      // Only allow duration backfill on locked/completed; never move/reassign.
      if (
        original.duration_minutes == null &&
        task.duration_minutes != null &&
        task.scheduled_date === original.scheduled_date &&
        task.assigned_cleaner_id === original.assigned_cleaner_id
      ) {
        const { error } = await supabase
          .from('cleaning_tasks')
          .update({ duration_minutes: task.duration_minutes })
          .eq('id', task.id);
        if (error) throw new Error(error.message);
        updated += 1;
      }
      continue;
    }

    const { error } = await supabase
      .from('cleaning_tasks')
      .update({
        scheduled_date: task.scheduled_date,
        ideal_date: task.ideal_date,
        assigned_cleaner_id: task.assigned_cleaner_id,
        duration_minutes: task.duration_minutes,
        cleaner_payout: task.cleaner_payout,
        auto_assigned: task.auto_assigned,
      })
      .eq('id', task.id)
      .eq('is_locked', false)
      .eq('status', 'pending');

    if (error) throw new Error(error.message);
    updated += 1;
  }
  return updated;
}

/** Rebalance all tasks in [fromDate, toDate] and persist unlocked changes. */
export async function rebalanceCleaningCapacity(
  supabase: SupabaseClient,
  fromDate: string,
  toDate: string
): Promise<{ updated: number; days: DayLoadSummary[] }> {
  const ctx = await loadSchedulerContext(supabase, fromDate, toDate);
  const originalById = new Map(ctx.tasks.map((t) => [t.id, t]));
  const result = scheduleCleaningCapacity({
    tasks: ctx.tasks,
    cleaners: ctx.cleaners,
    apartments: ctx.apartments,
    primaryByApartment: ctx.primaryByApartment,
    payoutRates: ctx.payoutRates,
    settings: ctx.settings,
  });
  const updated = await persistScheduleResult(supabase, result, originalById);
  return { updated, days: result.days };
}

/**
 * Regenerate future unlocked auto tasks for one booking, then rebalance around
 * its checkout date (± flex window).
 */
export async function regenerateBookingCleaningTasks(
  supabase: SupabaseClient,
  bookingId: string,
  options?: { today?: string }
): Promise<{ generated: boolean; updated: number; deleted?: number }> {
  const today = options?.today ?? todayDateString();
  const settings = await getCapacitySchedulerSettings(supabase);
  const midstay = await getMidstaySettings(supabase);

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, apartment_id, check_in_date, check_out_date, booking_status')
    .eq('id', bookingId)
    .maybeSingle();

  if (bookingError) throw new Error(bookingError.message);
  if (!booking) return { generated: false, updated: 0 };

  if (booking.booking_status === 'cancelled' || !booking.apartment_id) {
    const { data: deletedRows, error: deleteError } = await supabase
      .from('cleaning_tasks')
      .delete()
      .eq('booking_id', bookingId)
      .eq('is_manual', false)
      .eq('is_locked', false)
      .eq('status', 'pending')
      .gte('scheduled_date', today)
      .select('id');

    if (deleteError) throw new Error(deleteError.message);

    const checkout = booking.check_out_date as string;
    const from = addDays(checkout, -settings.flexDays - 1);
    const to = addDays(checkout, settings.flexDays + 1);
    const { updated } = await rebalanceCleaningCapacity(supabase, from, to);
    return {
      generated: false,
      updated,
      deleted: deletedRows?.length ?? 0,
    };
  }

  const { error: deleteError } = await supabase
    .from('cleaning_tasks')
    .delete()
    .eq('booking_id', bookingId)
    .eq('is_manual', false)
    .eq('is_locked', false)
    .eq('status', 'pending')
    .gte('scheduled_date', today);

  if (deleteError) throw new Error(deleteError.message);

  const { data: remaining, error: remainingError } = await supabase
    .from('cleaning_tasks')
    .select('scheduled_date')
    .eq('booking_id', bookingId);

  if (remainingError) throw new Error(remainingError.message);

  const existingDates = new Set(
    (remaining ?? []).map((row) => row.scheduled_date as string)
  );

  const assignment = await getPrimaryCleanerAssignment(
    supabase,
    booking.apartment_id as string
  );

  const { data: apartment } = await supabase
    .from('apartments')
    .select('id, size_type, checkout_minutes, midstay_minutes')
    .eq('id', booking.apartment_id)
    .maybeSingle();

  const apt: SchedulerApartment = {
    id: booking.apartment_id as string,
    size_type: (apartment?.size_type as ApartmentSizeType) || '1_bed',
    checkout_minutes:
      apartment?.checkout_minutes == null ? null : Number(apartment.checkout_minutes),
    midstay_minutes:
      apartment?.midstay_minutes == null ? null : Number(apartment.midstay_minutes),
  };

  const taskRows = buildTasksForBooking(
    {
      check_in_date: booking.check_in_date as string,
      check_out_date: booking.check_out_date as string,
    },
    midstay
  )
    .filter((task) => !existingDates.has(task.scheduled_date))
    .filter((task) => task.scheduled_date >= today)
    .map((task) => ({
      booking_id: bookingId,
      apartment_id: booking.apartment_id,
      task_type: task.task_type,
      scheduled_date: task.scheduled_date,
      ideal_date: task.ideal_date,
      is_manual: false,
      is_locked: false,
      duration_minutes: resolveTaskDurationMinutes(
        task.task_type,
        apt,
        settings.durations
      ),
      ...assignmentFieldsForTask(task.task_type, assignment),
    }));

  if (taskRows.length > 0) {
    const { error: insertError } = await supabase.from('cleaning_tasks').insert(taskRows);
    if (insertError) throw new Error(insertError.message);
  }

  const checkout = booking.check_out_date as string;
  const from = addDays(checkout, -(settings.flexDays + midstay.flexDays + 1));
  const checkIn = booking.check_in_date as string;
  const rangeStart = checkIn < from ? checkIn : from;
  const rangeEnd = addDays(checkout, settings.flexDays + 1);
  const { updated } = await rebalanceCleaningCapacity(
    supabase,
    rangeStart < today ? today : rangeStart,
    rangeEnd
  );

  return { generated: true, updated };
}

export async function getCleaningCapacityOverview(
  supabase: SupabaseClient,
  fromDate: string,
  toDate: string
): Promise<CleaningDayCapacity[]> {
  const ctx = await loadSchedulerContext(supabase, fromDate, toDate);
  const result = scheduleCleaningCapacity({
    tasks: ctx.tasks,
    cleaners: ctx.cleaners,
    apartments: ctx.apartments,
    primaryByApartment: ctx.primaryByApartment,
    payoutRates: ctx.payoutRates,
    settings: ctx.settings,
  });

  const cleanerName = new Map(ctx.cleaners.map((c) => [c.id, c.name ?? 'Cleaner']));
  const cleanerMeta = new Map(ctx.cleaners.map((c) => [c.id, c]));

  // Fill every date in range for the UI, even with zero bookings.
  const days: CleaningDayCapacity[] = [];
  for (let date = fromDate; date <= toDate; date = addDays(date, 1)) {
    const summary =
      result.days.find((d) => d.date === date) ??
      ({
        date,
        capacity_minutes: teamCapacityMinutes(ctx.cleaners),
        booked_minutes: 0,
        overflow_minutes: 0,
        overloaded: false,
        cleanerLoads: {},
      } satisfies DayLoadSummary);

    days.push({
      date: summary.date,
      capacity_minutes: summary.capacity_minutes,
      booked_minutes: summary.booked_minutes,
      overflow_minutes: summary.overflow_minutes,
      overloaded: summary.overloaded,
      cleaners: ctx.cleaners
        .filter((c) => c.is_active)
        .map((c) => ({
          cleaner_id: c.id,
          cleaner_name: cleanerName.get(c.id) ?? c.id,
          capacity_minutes: c.daily_capacity_minutes,
          booked_minutes: summary.cleanerLoads[c.id] ?? 0,
          is_on_call: cleanerMeta.get(c.id)?.is_on_call ?? false,
        })),
    });
  }

  return days;
}

export async function assignOnCallCleanerToTask(
  supabase: SupabaseClient,
  taskId: string
): Promise<{ cleaner_id: string; cleaner_name: string; cleaner_payout: number | null }> {
  const { data: onCall, error: onCallError } = await supabase
    .from('cleaners')
    .select('id, name')
    .eq('is_on_call', true)
    .eq('is_active', true)
    .order('name')
    .limit(1)
    .maybeSingle();

  if (onCallError) throw new Error(onCallError.message);
  if (!onCall) throw new Error('No active on-call cleaner configured');

  const { data: task, error: taskError } = await supabase
    .from('cleaning_tasks')
    .select('id, apartment_id, task_type')
    .eq('id', taskId)
    .single();

  if (taskError || !task) throw new Error(taskError?.message ?? 'Task not found');

  const payout = await resolveCleanerPayout(
    supabase,
    onCall.id as string,
    task.apartment_id as string,
    task.task_type as string
  );

  const { error: updateError } = await supabase
    .from('cleaning_tasks')
    .update({
      assigned_cleaner_id: onCall.id,
      cleaner_payout: payout,
      auto_assigned: false,
      is_locked: true,
    })
    .eq('id', taskId);

  if (updateError) throw new Error(updateError.message);

  return {
    cleaner_id: onCall.id as string,
    cleaner_name: onCall.name as string,
    cleaner_payout: payout,
  };
}
