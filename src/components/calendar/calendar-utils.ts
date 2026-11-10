import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
} from 'date-fns';
import type { BookingWithDetails, PropertyWithBookings } from '@/lib/queries/bookings';
import type {
  CleaningTaskStatus,
  CleaningTaskType,
  CleaningTaskWithDetails,
} from '@/lib/queries/cleaning';

export const CHANNEL_COLORS: Record<string, string> = {
  airbnb_official: '#FF5A5F',
  bookingcom: '#003580',
  direct: '#1db954',
  vrbo: '#1B468F',
  google: '#4285F4',
};

export const DEFAULT_CHANNEL_COLOR = '#666666';
export const TODAY_COLUMN_COLOR = '#bfe0de';
export const BOOKING_BAR_HEIGHT = 30;
export const BOOKING_CLIP_SKEW = 10;
/** Inset from each mid-day anchor so back-to-back same-channel bookings don't merge visually. */
export const BOOKING_BAR_END_INSET = 4;
export const ROW_HEIGHT = 72;
export const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 2] as const;
export const DEFAULT_ZOOM_INDEX = 1;
export const ZOOM_ANIMATION_MS = 420;
export const INITIAL_MONTHS_BEFORE = 1;
export const INITIAL_MONTHS_AFTER = 3;
export const INITIAL_DAYS_BEFORE_TODAY = 10;

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

export const LEGEND_ITEMS = [
  { key: 'airbnb_official', label: 'Airbnb', color: '#FF5A5F', type: 'channel' as const },
  { key: 'bookingcom', label: 'Booking.com', color: '#003580', type: 'channel' as const },
  { key: 'direct', label: 'Direct', color: '#1db954', type: 'channel' as const },
  { key: 'vrbo', label: 'Vrbo', color: '#1B468F', type: 'channel' as const },
  { key: 'google', label: 'Google', color: '#4285F4', type: 'channel' as const },
  { key: 'available', label: 'Available', color: '#e5e7eb', type: 'state' as const },
  { key: 'cancelled', label: 'Cancelled', color: '#fecdd3', type: 'state' as const },
  { key: 'short_gap', label: 'Short gap (≤3 nights)', color: '#f59e0b', type: 'state' as const },
];

export const CLEANING_LEGEND_ITEMS = [
  { key: 'checkout_clean', label: 'Checkout Clean', emoji: '🧹', color: '#f87171' },
  { key: 'midstay_clean', label: 'Mid-Stay Clean', emoji: '🔄', color: '#fbbf24' },
] as const;

export const CLEANING_STATUS_OPTIONS: { value: CleaningTaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
];

export type DatePreset = 'custom' | 'this_month' | 'next_30' | 'next_90';

export interface BookingSpan {
  booking: BookingWithDetails;
  startIdx: number;
  endIdx: number;
  clippedStart: boolean;
  clippedEnd: boolean;
}

export interface GapMarker {
  dayIdx: number;
}

export interface CleaningTaskMarker {
  task: CleaningTaskWithDetails;
  dayIdx: number;
  bookingSpan: BookingSpan | null;
  stackIndex: number;
}

export interface CleaningPopoverAnchor {
  x: number;
  y: number;
}

export const APARTMENT_EVENT_COLORS = [
  { backgroundColor: '#dbeafe', borderColor: '#3b82f6', color: '#1e40af' },
  { backgroundColor: '#dcfce7', borderColor: '#22c55e', color: '#166534' },
  { backgroundColor: '#f3e8ff', borderColor: '#a855f7', color: '#7c3aed' },
  { backgroundColor: '#fed7aa', borderColor: '#f97316', color: '#ea580c' },
  { backgroundColor: '#fce7f3', borderColor: '#ec4899', color: '#be185d' },
  { backgroundColor: '#e0e7ff', borderColor: '#6366f1', color: '#4338ca' },
  { backgroundColor: '#fef3c7', borderColor: '#eab308', color: '#a16207' },
  { backgroundColor: '#fee2e2', borderColor: '#ef4444', color: '#dc2626' },
] as const;

export const APARTMENT_TAILWIND_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-red-100 text-red-800 border-red-200',
] as const;

export const APARTMENT_LEGEND_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
  { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800' },
  { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
  { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
] as const;

export function hashString(value: string): number {
  return value.split('').reduce((acc, char) => {
    const next = (acc << 5) - acc + char.charCodeAt(0);
    return next & next;
  }, 0);
}

export function getApartmentColorIndex(key: string): number {
  return Math.abs(hashString(String(key))) % APARTMENT_EVENT_COLORS.length;
}

export function getApartmentEventStyle(key: string) {
  return APARTMENT_EVENT_COLORS[getApartmentColorIndex(key)];
}

export function getApartmentTailwindColor(key: string) {
  return APARTMENT_TAILWIND_COLORS[getApartmentColorIndex(key)];
}

export function getApartmentLegendColor(key: string) {
  return APARTMENT_LEGEND_COLORS[getApartmentColorIndex(key)];
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatCurrency(amount: number) {
  return `R ${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDisplayDate(dateString: string) {
  return parseLocalDate(dateString).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatZAR(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

export function getPropertyDisplayName(
  apartment: PropertyWithBookings | BookingWithDetails['apartments'] | null | undefined
) {
  if (!apartment) return 'Unknown property';
  return apartment.uplisting_name || apartment.apartment_number;
}

export function getPropertyUnitNumber(
  apartment: PropertyWithBookings | BookingWithDetails['apartments'] | null | undefined
) {
  if (!apartment) return '';
  return apartment.apartment_number;
}

export function normalizeChannelKey(channelName: string | null | undefined): string {
  if (!channelName?.trim()) return 'other';
  const raw = channelName.trim().toLowerCase();
  const compact = raw.replace(/[^a-z0-9]/g, '');

  if (compact in CHANNEL_COLORS) return compact;
  if (raw.includes('airbnb') || compact.includes('airbnb')) return 'airbnb_official';
  if (raw.includes('booking') || compact.includes('bookingcom')) return 'bookingcom';
  if (raw === 'direct' || raw.includes('direct') || compact === 'uplisting') return 'direct';
  if (raw.includes('vrbo') || raw.includes('homeaway')) return 'vrbo';
  if (raw.includes('google')) return 'google';

  return 'other';
}

export function getChannelColor(channelName: string | null | undefined): string {
  const key = normalizeChannelKey(channelName);
  return CHANNEL_COLORS[key] ?? DEFAULT_CHANNEL_COLOR;
}

export function getChannelDisplayName(channelName: string | null | undefined): string {
  return channelName?.trim() || 'Unknown channel';
}

export function getChannelInitial(channelName: string | null | undefined): string {
  const key = normalizeChannelKey(channelName);
  switch (key) {
    case 'airbnb_official':
      return 'A';
    case 'bookingcom':
      return 'B';
    case 'vrbo':
      return 'V';
    case 'google':
      return 'G';
    case 'direct':
      return 'D';
    default:
      return (channelName?.trim()?.[0] ?? '?').toUpperCase();
  }
}

export function getStatusBadgeClass(status: string) {
  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };
  return statusColors[status] ?? 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getGuestFullName(name: string | null | undefined): string {
  if (!name?.trim()) return 'Guest';
  return name.trim();
}

export function getGuestFirstName(name: string | null | undefined): string {
  if (!name?.trim()) return 'Guest';
  return name.trim().split(/\s+/)[0];
}

export function isCancelled(status: string): boolean {
  return status.toLowerCase() === 'cancelled';
}

export function getTaskTypeLabel(taskType: CleaningTaskType): string {
  return taskType === 'checkout_clean' ? 'Checkout Clean' : 'Mid-Stay Clean';
}

export function getCleaningStatusBadgeClass(status: CleaningTaskStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'skipped':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getCleanerInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function buildTimelineDays(rangeStart: Date, rangeEnd: Date): Date[] {
  const days: Date[] = [];
  let cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function getTimelineSpan(
  booking: BookingWithDetails,
  timelineStart: Date,
  timelineEnd: Date
): BookingSpan | null {
  const checkIn = parseLocalDate(booking.check_in_date);
  const checkOut = parseLocalDate(booking.check_out_date);

  if (checkOut <= timelineStart || checkIn > timelineEnd) return null;

  const clippedStart = checkIn < timelineStart;
  const clippedEnd = checkOut > addDays(timelineEnd, 1);

  const visibleStart = clippedStart ? timelineStart : checkIn;
  const visibleEndExclusive = clippedEnd ? addDays(timelineEnd, 2) : checkOut;

  const startIdx = differenceInCalendarDays(visibleStart, timelineStart);
  let endIdx = differenceInCalendarDays(visibleEndExclusive, timelineStart);

  if (endIdx <= startIdx) endIdx = startIdx + 1;

  return { booking, startIdx, endIdx, clippedStart, clippedEnd };
}

/** Mid-check-in to mid-check-out geometry using CSS --day-width. */
export function bookingBarStyle(
  startIdx: number,
  endIdx: number,
  clippedStart: boolean,
  clippedEnd: boolean
): { left: string; width: string; clipPath: string } {
  // Mid-day anchors; clipped edges pin to the column edge and stay square.
  const leftOffset = clippedStart ? 0 : 0.5;
  const rightOffset = clippedEnd ? 0 : 0.5;
  const insetStart = clippedStart ? 0 : BOOKING_BAR_END_INSET;
  const insetEnd = clippedEnd ? 0 : BOOKING_BAR_END_INSET;
  const left = `calc((${startIdx} + ${leftOffset}) * var(--day-width) + ${insetStart}px)`;
  const width = `calc((${endIdx + rightOffset} - ${startIdx + leftOffset}) * var(--day-width) - ${insetStart + insetEnd}px)`;
  const s = `${BOOKING_CLIP_SKEW}px`;
  const leftSkew = clippedStart ? '0' : s;
  const rightSkew = clippedEnd ? '0' : s;
  const clipPath = `polygon(${leftSkew} 0, 100% 0, calc(100% - ${rightSkew}) 100%, 0 100%)`;
  return { left, width, clipPath };
}

/**
 * Only mark gaps between consecutive bookings — never treat the loaded
 * range edges as booking boundaries (avoids false gap markers).
 */
export function computeShortGaps(
  bookings: BookingWithDetails[],
  timelineStart: Date,
  timelineEnd: Date
): GapMarker[] {
  const spans = bookings
    .filter((b) => !isCancelled(b.booking_status))
    .map((b) => getTimelineSpan(b, timelineStart, timelineEnd))
    .filter((s): s is BookingSpan => s !== null)
    .sort((a, b) => a.startIdx - b.startIdx);

  const gaps: GapMarker[] = [];

  const addGapRange = (gapStart: number, gapEnd: number) => {
    const nights = gapEnd - gapStart;
    if (nights <= 0 || nights > 3) return;
    for (let idx = gapStart; idx < gapEnd; idx++) {
      gaps.push({ dayIdx: idx });
    }
  };

  for (let i = 0; i < spans.length - 1; i++) {
    addGapRange(spans[i].endIdx, spans[i + 1].startIdx);
  }

  return gaps;
}

export function getCleaningTaskDayIndex(
  task: CleaningTaskWithDetails,
  timelineStart: Date,
  timelineEnd: Date
): number | null {
  const scheduled = parseLocalDate(task.scheduled_date);
  if (scheduled < timelineStart || scheduled > timelineEnd) return null;
  return differenceInCalendarDays(scheduled, timelineStart);
}

export function dayIndexFromPointer(
  clientX: number,
  gridLeft: number,
  scrollLeft: number,
  dayWidth: number,
  totalDays: number
): number | null {
  if (dayWidth <= 0 || totalDays <= 0) return null;
  const x = clientX - gridLeft + scrollLeft;
  const idx = Math.floor(x / dayWidth);
  if (idx < 0 || idx >= totalDays) return null;
  return idx;
}

export function occupancyPercent(
  bookings: BookingWithDetails[],
  rangeFrom: Date,
  rangeTo: Date
): number {
  const totalNights = differenceInCalendarDays(addDays(rangeTo, 1), rangeFrom);
  if (totalNights <= 0) return 0;

  let booked = 0;
  for (const booking of bookings) {
    if (isCancelled(booking.booking_status)) continue;
    const checkIn = parseLocalDate(booking.check_in_date);
    const checkOut = parseLocalDate(booking.check_out_date);
    const start = checkIn < rangeFrom ? rangeFrom : checkIn;
    const end = checkOut > addDays(rangeTo, 1) ? addDays(rangeTo, 1) : checkOut;
    const nights = differenceInCalendarDays(end, start);
    if (nights > 0) booked += nights;
  }

  return Math.min(100, Math.round((booked / totalNights) * 100));
}

export function propertyHasBookingOverlap(
  bookings: BookingWithDetails[],
  rangeFrom: Date,
  rangeTo: Date
): boolean {
  for (const booking of bookings) {
    if (isCancelled(booking.booking_status)) continue;
    const checkIn = parseLocalDate(booking.check_in_date);
    const checkOut = parseLocalDate(booking.check_out_date);
    if (checkOut > rangeFrom && checkIn <= rangeTo) return true;
  }
  return false;
}

export function resolvePresetRange(preset: DatePreset, today = new Date()): {
  start: Date;
  end: Date;
} | null {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'this_month':
      return { start: startOfMonth(start), end: endOfMonth(start) };
    case 'next_30':
      return { start, end: addDays(start, 29) };
    case 'next_90':
      return { start, end: addDays(start, 89) };
    case 'custom':
    default:
      return null;
  }
}

export function getBaseDayWidth(viewportWidth: number): number {
  if (viewportWidth < 640) return 48;
  if (viewportWidth < 1024) return 56;
  return 72;
}

export function getPropertyColWidth(viewportWidth: number, collapsed: boolean): number {
  if (collapsed) return 48;
  if (viewportWidth < 640) return 120;
  if (viewportWidth < 1024) return 160;
  return 200;
}

export function clampPopoverPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  padding = 8
): { left: number; top: number; placement: 'above' | 'below' } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  let left = x - width / 2;
  left = Math.max(padding, Math.min(left, vw - width - padding));

  const aboveTop = y - height - 8;
  if (aboveTop >= padding) {
    return { left, top: aboveTop, placement: 'above' };
  }

  const belowTop = y + 8;
  return {
    left,
    top: Math.min(belowTop, vh - height - padding),
    placement: 'below',
  };
}

export function extendRangeToInclude(
  currentStart: Date,
  currentEnd: Date,
  target: Date
): { start: Date; end: Date } {
  let start = currentStart;
  let end = currentEnd;
  if (target < start) {
    start = startOfMonth(addMonths(target, -INITIAL_MONTHS_BEFORE));
  }
  if (target > end) {
    end = endOfMonth(addMonths(target, INITIAL_MONTHS_AFTER));
  }
  return { start, end };
}
