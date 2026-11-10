/** Shared month-range helpers for cleaning schedule UI, PDFs, and live links. */

export const LIVE_SCHEDULE_SPILLOVER_DAYS = 7;

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function getCurrentMonthKey(reference = new Date()): string {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Calendar date in local timezone as YYYY-MM-DD (stable across SSR/client when same TZ). */
export function getTodayIsoDate(reference = new Date()): string {
  return toIsoDate(reference);
}

export function parseMonthKey(monthKey: string): { year: number; monthIndex: number } | null {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

export function formatMonthLabel(monthKey: string): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey;
  return `${MONTHS_LONG[parsed.monthIndex]} ${parsed.year}`;
}

/** Deterministic date label — avoids locale hydration mismatches. */
export function formatCleaningDate(dateString: string, compact = false): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return dateString;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, monthIndex, day));
  const weekday = WEEKDAYS_SHORT[utc.getUTCDay()];
  const month = MONTHS_SHORT[monthIndex];
  if (compact) return `${weekday}, ${String(day).padStart(2, '0')} ${month}`;
  return `${weekday}, ${String(day).padStart(2, '0')} ${month} ${year}`;
}

export function formatClockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const parsed = parseMonthKey(monthKey) ?? parseMonthKey(getCurrentMonthKey())!;
  const date = new Date(parsed.year, parsed.monthIndex + delta, 1);
  return getCurrentMonthKey(date);
}

export function getMonthDateRange(monthKey: string): { start: string; end: string } {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) {
    return getMonthDateRange(getCurrentMonthKey());
  }
  const start = new Date(parsed.year, parsed.monthIndex, 1);
  const end = new Date(parsed.year, parsed.monthIndex + 1, 0);
  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
  };
}

/** Full month plus the first N days of the following month (for live cleaner links). */
export function getLiveScheduleRange(
  monthKey: string,
  spilloverDays = LIVE_SCHEDULE_SPILLOVER_DAYS
): { start: string; end: string; monthEnd: string; spilloverEnd: string } {
  const { start, end: monthEnd } = getMonthDateRange(monthKey);
  const parsed = parseMonthKey(monthKey)!;
  const spilloverEndDate = new Date(parsed.year, parsed.monthIndex + 1, spilloverDays);
  return {
    start,
    end: toIsoDate(spilloverEndDate),
    monthEnd,
    spilloverEnd: toIsoDate(spilloverEndDate),
  };
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildMonthOptions(
  yearsBack = 1,
  yearsForward = 2,
  reference = new Date()
): { value: string; label: string }[] {
  const start = new Date(reference.getFullYear() - yearsBack, 0, 1);
  const end = new Date(reference.getFullYear() + yearsForward, 11, 1);
  const options: { value: string; label: string }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const value = getCurrentMonthKey(cursor);
    options.push({ value, label: formatMonthLabel(value) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return options;
}

export function getCalendarCells(monthKey: string): {
  date: string | null;
  inMonth: boolean;
  dayNumber: number | null;
}[] {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return [];

  const first = new Date(parsed.year, parsed.monthIndex, 1);
  const daysInMonth = new Date(parsed.year, parsed.monthIndex + 1, 0).getDate();
  // Monday-first grid (en-ZA style)
  const mondayIndex = (first.getDay() + 6) % 7;
  const cells: { date: string | null; inMonth: boolean; dayNumber: number | null }[] = [];

  for (let i = 0; i < mondayIndex; i++) {
    cells.push({ date: null, inMonth: false, dayNumber: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = toIsoDate(new Date(parsed.year, parsed.monthIndex, day));
    cells.push({ date, inMonth: true, dayNumber: day });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, inMonth: false, dayNumber: null });
  }
  return cells;
}
