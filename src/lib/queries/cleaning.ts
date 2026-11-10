import type { SupabaseClient } from '@supabase/supabase-js';

export type CleaningTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type CleaningTaskType = 'checkout_clean' | 'midstay_clean';

export interface CleaningTaskWithDetails {
  id: string;
  booking_id: string | null;
  apartment_id: string;
  task_type: CleaningTaskType;
  scheduled_date: string;
  status: CleaningTaskStatus;
  notes: string | null;
  assigned_cleaner_id: string | null;
  cleaner_payout: number | null;
  auto_assigned: boolean;
  is_manual: boolean;
  cleaner_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  apartment_name: string;
  uplisting_name: string | null;
  guest_name: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  nights: number;
  booking_reference: string | null;
}

export interface CleaningTaskFilters {
  fromDate?: string;
  toDate?: string;
  apartmentId?: string;
  taskType?: CleaningTaskType | 'all';
  status?: CleaningTaskStatus | 'all';
  unassignedOnly?: boolean;
}

export interface CleaningStats {
  pendingThisWeek: number;
  completedThisMonth: number;
  backToBackProperties: BackToBackProperty[];
  weekPayoutTotal: number;
  monthPayoutTotal: number;
  unassignedCount: number;
}

export interface BackToBackProperty {
  apartment_id: string;
  property_name: string;
  date: string;
  checkout_booking_reference: string;
  checkin_booking_reference: string;
}

export const CLEANING_TASK_SELECT = `
  id,
  booking_id,
  apartment_id,
  task_type,
  scheduled_date,
  status,
  notes,
  assigned_cleaner_id,
  cleaner_payout,
  auto_assigned,
  is_manual,
  completed_at,
  created_at,
  updated_at,
  cleaners (
    name
  ),
  apartments!inner (
    apartment_number,
    uplisting_name
  ),
  bookings (
    check_in_date,
    check_out_date,
    nights,
    booking_reference,
    guests (
      name
    )
  )
`;

export function mapCleaningTaskRow(row: Record<string, unknown>): CleaningTaskWithDetails {
  const apartments = row.apartments as {
    apartment_number: string;
    uplisting_name: string | null;
  } | null;
  const bookings = row.bookings as {
    check_in_date: string;
    check_out_date: string;
    nights: number;
    booking_reference: string;
    guests: { name: string } | { name: string }[] | null;
  } | null;
  const cleanersRaw = row.cleaners as { name: string } | { name: string }[] | null;
  const cleaner =
    cleanersRaw == null
      ? null
      : Array.isArray(cleanersRaw)
        ? cleanersRaw[0] ?? null
        : cleanersRaw;

  const guestRaw = bookings?.guests;
  const guest =
    guestRaw == null
      ? null
      : Array.isArray(guestRaw)
        ? guestRaw[0] ?? null
        : guestRaw;

  const apartmentNumber = apartments?.apartment_number ?? 'Unknown';
  const uplistingName = apartments?.uplisting_name ?? null;

  return {
    id: row.id as string,
    booking_id: (row.booking_id as string | null) ?? null,
    apartment_id: row.apartment_id as string,
    task_type: row.task_type as CleaningTaskType,
    scheduled_date: row.scheduled_date as string,
    status: row.status as CleaningTaskStatus,
    notes: (row.notes as string | null) ?? null,
    assigned_cleaner_id: (row.assigned_cleaner_id as string | null) ?? null,
    cleaner_payout: row.cleaner_payout != null ? Number(row.cleaner_payout) : null,
    auto_assigned: Boolean(row.auto_assigned),
    is_manual: Boolean(row.is_manual),
    cleaner_name: cleaner?.name ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    apartment_name: apartmentNumber,
    uplisting_name: uplistingName,
    guest_name: guest?.name ?? null,
    check_in_date: bookings?.check_in_date ?? null,
    check_out_date: bookings?.check_out_date ?? null,
    nights: bookings?.nights ?? 0,
    booking_reference: bookings?.booking_reference ?? null,
  };
}

export function getPropertyDisplayName(task: CleaningTaskWithDetails): string {
  return task.uplisting_name || task.apartment_name;
}

export async function getCleaningTasksWithDetails(
  supabase: SupabaseClient,
  filters?: CleaningTaskFilters
): Promise<CleaningTaskWithDetails[]> {
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('cleaning_tasks')
    .select(CLEANING_TASK_SELECT)
    .gte('scheduled_date', filters?.fromDate ?? today)
    .order('scheduled_date', { ascending: true });

  if (filters?.toDate) {
    query = query.lte('scheduled_date', filters.toDate);
  }
  if (filters?.apartmentId && filters.apartmentId !== 'all') {
    query = query.eq('apartment_id', filters.apartmentId);
  }
  if (filters?.taskType && filters.taskType !== 'all') {
    query = query.eq('task_type', filters.taskType);
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.unassignedOnly) {
    query = query.is('assigned_cleaner_id', null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const mapped = (data ?? []).map((row) => mapCleaningTaskRow(row as Record<string, unknown>));

  return mapped.sort((a, b) => {
    const dateCmp = a.scheduled_date.localeCompare(b.scheduled_date);
    if (dateCmp !== 0) return dateCmp;
    return getPropertyDisplayName(a).localeCompare(getPropertyDisplayName(b));
  });
}

function getMondayWeekRange(reference = new Date()): { start: string; end: string } {
  const d = new Date(reference);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function getMonthRange(reference = new Date()): { start: string; end: string } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export async function getCleaningStats(
  supabase: SupabaseClient
): Promise<CleaningStats> {
  const week = getMondayWeekRange();
  const month = getMonthRange();
  const today = new Date().toISOString().split('T')[0];

  const [pendingResult, completedResult, backToBack, weekPayoutResult, monthPayoutResult, unassignedResult] =
    await Promise.all([
    supabase
      .from('cleaning_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('scheduled_date', week.start)
      .lte('scheduled_date', week.end),
    supabase
      .from('cleaning_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('scheduled_date', month.start)
      .lte('scheduled_date', month.end),
    getBackToBackProperties(supabase, today),
    supabase
      .from('cleaning_tasks')
      .select('cleaner_payout')
      .gte('scheduled_date', week.start)
      .lte('scheduled_date', week.end)
      .neq('status', 'skipped'),
    supabase
      .from('cleaning_tasks')
      .select('cleaner_payout')
      .gte('scheduled_date', month.start)
      .lte('scheduled_date', month.end)
      .neq('status', 'skipped'),
    supabase
      .from('cleaning_tasks')
      .select('id', { count: 'exact', head: true })
      .is('assigned_cleaner_id', null)
      .neq('status', 'completed')
      .neq('status', 'skipped')
      .gte('scheduled_date', today),
  ]);

  if (pendingResult.error) {
    throw new Error(pendingResult.error.message);
  }
  if (completedResult.error) {
    throw new Error(completedResult.error.message);
  }

  const weekPayoutTotal = (weekPayoutResult.data ?? []).reduce(
    (sum, row) => sum + (row.cleaner_payout != null ? Number(row.cleaner_payout) : 0),
    0
  );
  const monthPayoutTotal = (monthPayoutResult.data ?? []).reduce(
    (sum, row) => sum + (row.cleaner_payout != null ? Number(row.cleaner_payout) : 0),
    0
  );

  return {
    pendingThisWeek: pendingResult.count ?? 0,
    completedThisMonth: completedResult.count ?? 0,
    backToBackProperties: backToBack,
    weekPayoutTotal,
    monthPayoutTotal,
    unassignedCount: unassignedResult.count ?? 0,
  };
}

async function getBackToBackProperties(
  supabase: SupabaseClient,
  fromDate: string
): Promise<BackToBackProperty[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      id,
      apartment_id,
      check_in_date,
      check_out_date,
      booking_reference,
      booking_status,
      apartments (
        apartment_number,
        uplisting_name
      )
    `
    )
    .neq('booking_status', 'cancelled')
    .not('apartment_id', 'is', null)
    .or(`check_out_date.gte.${fromDate},check_in_date.gte.${fromDate}`);

  if (error) {
    throw new Error(error.message);
  }

  const checkouts = new Map<string, { booking_reference: string; apartment_id: string }>();
  const checkins = new Map<string, { booking_reference: string; apartment_id: string }>();
  const apartmentMeta = new Map<
    string,
    { apartment_number: string; uplisting_name: string | null }
  >();

  for (const row of data ?? []) {
    const aptId = row.apartment_id as string;
    const aptRaw = row.apartments as
      | { apartment_number: string; uplisting_name: string | null }
      | { apartment_number: string; uplisting_name: string | null }[]
      | null;
    const apt = Array.isArray(aptRaw) ? aptRaw[0] ?? null : aptRaw;
    if (apt) {
      apartmentMeta.set(aptId, apt);
    }
    const outKey = `${aptId}|${row.check_out_date}`;
    checkouts.set(outKey, {
      booking_reference: row.booking_reference as string,
      apartment_id: aptId,
    });
    const inKey = `${aptId}|${row.check_in_date}`;
    checkins.set(inKey, {
      booking_reference: row.booking_reference as string,
      apartment_id: aptId,
    });
  }

  const results: BackToBackProperty[] = [];

  for (const [key, checkout] of checkouts) {
    const checkin = checkins.get(key);
    if (!checkin || checkout.booking_reference === checkin.booking_reference) {
      continue;
    }
    const [, date] = key.split('|');
    const aptId = checkout.apartment_id;
    const meta = apartmentMeta.get(aptId);
    results.push({
      apartment_id: aptId,
      property_name: meta?.uplisting_name || meta?.apartment_number || 'Unknown',
      date,
      checkout_booking_reference: checkout.booking_reference,
      checkin_booking_reference: checkin.booking_reference,
    });
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCleaningTaskApartments(
  supabase: SupabaseClient
): Promise<{ id: string; apartment_number: string; uplisting_name: string | null }[]> {
  const { data, error } = await supabase
    .from('apartments')
    .select('id, apartment_number, uplisting_name')
    .eq('is_active', true)
    .order('apartment_number');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
