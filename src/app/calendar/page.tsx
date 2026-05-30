'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { Check, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import { CalendarSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getBookingsWithDetails,
  getPropertiesWithBookings,
  type BookingWithDetails,
  type PropertyWithBookings,
} from '@/lib/queries/bookings';
import {
  getCleaningTasksWithDetails,
  getPropertyDisplayName as getCleaningPropertyDisplayName,
  type CleaningTaskStatus,
  type CleaningTaskType,
  type CleaningTaskWithDetails,
} from '@/lib/queries/cleaning';
import { createClientComponentClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import toast, { Toaster } from 'react-hot-toast';

const CHANNEL_COLORS: Record<string, string> = {
  airbnb_official: '#FF5A5F',
  bookingcom: '#003580',
  direct: '#1db954',
  vrbo: '#1B468F',
  google: '#4285F4',
};

const DEFAULT_CHANNEL_COLOR = '#666666';

const LEGEND_ITEMS = [
  { key: 'airbnb_official', label: 'Airbnb', color: '#FF5A5F', type: 'channel' as const },
  { key: 'bookingcom', label: 'Booking.com', color: '#1a1a2e', type: 'channel' as const },
  { key: 'direct', label: 'Direct', color: '#1db954', type: 'channel' as const },
  { key: 'vrbo', label: 'Vrbo', color: '#1B468F', type: 'channel' as const },
  { key: 'google', label: 'Google', color: '#4285F4', type: 'channel' as const },
  { key: 'available', label: 'Available', color: '#e5e7eb', type: 'state' as const },
  { key: 'cancelled', label: 'Cancelled', color: '#fecdd3', type: 'state' as const },
  { key: 'short_gap', label: 'Short gap (≤3 nights)', color: '#f59e0b', type: 'state' as const },
];

const CLEANING_LEGEND_ITEMS = [
  { key: 'checkout_clean', label: 'Checkout Clean', emoji: '🧹', color: '#f87171' },
  { key: 'midstay_clean', label: 'Mid-Stay Clean', emoji: '🔄', color: '#fbbf24' },
] as const;

const CLEANING_STATUS_OPTIONS: { value: CleaningTaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
];

const ROW_HEIGHT = 44;
const PROPERTY_COL_WIDTH = 200;
const BASE_DAY_COL_WIDTH = 32;
const INITIAL_MONTHS_BEFORE = 1;
const INITIAL_MONTHS_AFTER = 3;
const INITIAL_DAYS_BEFORE_TODAY = 10;
const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 2] as const;
const DEFAULT_ZOOM_INDEX = 1;
const ZOOM_ANIMATION_MS = 420;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function formatCurrency(amount: number) {
  return `R ${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDisplayDate(dateString: string) {
  return parseLocalDate(dateString).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getPropertyDisplayName(apartment: PropertyWithBookings | BookingWithDetails['apartments']) {
  if (!apartment) return 'Unknown property';
  return apartment.uplisting_name || apartment.apartment_number;
}

function getPropertyUnitNumber(apartment: PropertyWithBookings | BookingWithDetails['apartments']) {
  if (!apartment) return '';
  return apartment.apartment_number;
}

function normalizeChannelKey(channelName: string | null | undefined): string {
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

function getChannelColor(channelName: string | null | undefined): string {
  const key = normalizeChannelKey(channelName);
  return CHANNEL_COLORS[key] ?? DEFAULT_CHANNEL_COLOR;
}

function getChannelDisplayName(channelName: string | null | undefined): string {
  return channelName?.trim() || 'Unknown channel';
}

function getChannelTextColor(channelName: string | null | undefined): string {
  return normalizeChannelKey(channelName) === 'bookingcom' ? '#ffffff' : '#ffffff';
}

function getStatusBadgeClass(status: string) {
  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };
  return statusColors[status] ?? 'bg-gray-100 text-gray-800 border-gray-200';
}

function getGuestFirstName(name: string | null | undefined): string {
  if (!name?.trim()) return 'Guest';
  return name.trim().split(/\s+/)[0];
}

function isCancelled(status: string): boolean {
  return status.toLowerCase() === 'cancelled';
}

interface BookingSpan {
  booking: BookingWithDetails;
  startIdx: number;
  endIdx: number;
}

interface GapMarker {
  dayIdx: number;
}

interface CleaningTaskMarker {
  task: CleaningTaskWithDetails;
  dayIdx: number;
  bookingSpan: BookingSpan | null;
  stackIndex: number;
}

interface CleaningPopoverAnchor {
  x: number;
  y: number;
}

function getTaskTypeLabel(taskType: CleaningTaskType): string {
  return taskType === 'checkout_clean' ? 'Checkout Clean' : 'Mid-Stay Clean';
}

function getCleaningTaskDayIndex(
  task: CleaningTaskWithDetails,
  timelineStart: Date,
  timelineEnd: Date
): number | null {
  const scheduled = parseLocalDate(task.scheduled_date);
  if (scheduled < timelineStart || scheduled > timelineEnd) return null;
  return differenceInCalendarDays(scheduled, timelineStart);
}

function isTaskWithinBookingStay(task: CleaningTaskWithDetails): boolean {
  if (!task.check_in_date || !task.check_out_date) return false;
  const scheduled = parseLocalDate(task.scheduled_date);
  const checkIn = parseLocalDate(task.check_in_date);
  const checkOut = parseLocalDate(task.check_out_date);
  return scheduled >= checkIn && scheduled <= checkOut;
}

function getCleaningMarkerPosition(
  marker: CleaningTaskMarker,
  totalDays: number
): { left: string; bottom: string; transform: string } {
  const { task, dayIdx, bookingSpan, stackIndex } = marker;
  const bottom = `${2 + stackIndex * 18}px`;

  if (bookingSpan) {
    if (task.task_type === 'checkout_clean') {
      const endFraction = bookingSpan.endIdx / totalDays;
      return {
        left: `${endFraction * 100}%`,
        bottom,
        transform: 'translate(-50%, 0)',
      };
    }

    const dayFraction = (dayIdx + 0.5) / totalDays;
    return {
      left: `${dayFraction * 100}%`,
      bottom,
      transform: 'translate(-50%, 0)',
    };
  }

  return {
    left: `calc((${dayIdx} + 0.5) * var(--day-width))`,
    bottom,
    transform: 'translate(-50%, 0)',
  };
}

function getCleaningStatusBadgeClass(status: CleaningTaskStatus): string {
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

function getCleanerInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatZAR(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

function buildTimelineDays(rangeStart: Date, rangeEnd: Date): Date[] {
  const days: Date[] = [];
  let cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

function getTimelineSpan(
  booking: BookingWithDetails,
  timelineStart: Date,
  timelineEnd: Date
): BookingSpan | null {
  const checkIn = parseLocalDate(booking.check_in_date);
  const checkOut = parseLocalDate(booking.check_out_date);

  if (checkOut <= timelineStart || checkIn > timelineEnd) return null;

  const visibleStart = checkIn < timelineStart ? timelineStart : checkIn;
  const visibleEndExclusive =
    checkOut > addDays(timelineEnd, 1) ? addDays(timelineEnd, 2) : checkOut;

  const startIdx = differenceInCalendarDays(visibleStart, timelineStart);
  let endIdx = differenceInCalendarDays(visibleEndExclusive, timelineStart);

  if (endIdx <= startIdx) endIdx = startIdx + 1;

  return { booking, startIdx, endIdx };
}

function computeShortGaps(
  bookings: BookingWithDetails[],
  timelineStart: Date,
  timelineEnd: Date
): GapMarker[] {
  const totalDays = differenceInCalendarDays(addDays(timelineEnd, 1), timelineStart);

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

  if (spans.length === 0) {
    addGapRange(0, totalDays);
    return gaps;
  }

  addGapRange(0, spans[0].startIdx);

  for (let i = 0; i < spans.length - 1; i++) {
    addGapRange(spans[i].endIdx, spans[i + 1].startIdx);
  }

  addGapRange(spans[spans.length - 1].endIdx, totalDays);

  return gaps;
}

function spanToStyle(startIdx: number, endIdx: number, totalDays: number) {
  const left = (startIdx / totalDays) * 100;
  const width = ((endIdx - startIdx) / totalDays) * 100;
  return { left: `${left}%`, width: `${width}%` };
}

function BookingsCalendarContent() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const extendingRef = useRef(false);
  const initialScrollDone = useRef(false);
  const hasLoadedOnce = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const zoomAnimationRef = useRef<number | null>(null);
  const isZoomingRef = useRef(false);
  const gridInnerRef = useRef<HTMLDivElement>(null);
  const zoomLabelRef = useRef<HTMLSpanElement>(null);
  const displayMonthRef = useRef(startOfMonth(new Date()));

  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [cleaningTasks, setCleaningTasks] = useState<CleaningTaskWithDetails[]>([]);
  const [apartments, setApartments] = useState<PropertyWithBookings[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [rangeStart, setRangeStart] = useState(() =>
    startOfMonth(subMonths(new Date(), INITIAL_MONTHS_BEFORE))
  );
  const [rangeEnd, setRangeEnd] = useState(() =>
    endOfMonth(addMonths(new Date(), INITIAL_MONTHS_AFTER))
  );
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [isZooming, setIsZooming] = useState(false);
  const [activeCleaningTaskId, setActiveCleaningTaskId] = useState<string | null>(null);
  const [cleaningPopoverAnchor, setCleaningPopoverAnchor] =
    useState<CleaningPopoverAnchor | null>(null);
  const [updatingCleaningTaskId, setUpdatingCleaningTaskId] = useState<string | null>(null);
  const [assigningCleaningTaskId, setAssigningCleaningTaskId] = useState<string | null>(null);
  const [cleaners, setCleaners] = useState<{ id: string; name: string }[]>([]);

  const dayColWidth = Math.round(BASE_DAY_COL_WIDTH * ZOOM_LEVELS[zoomIndex]);
  const scrollExtendThreshold = dayColWidth * 10;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const timelineDays = useMemo(
    () => buildTimelineDays(rangeStart, rangeEnd),
    [rangeStart, rangeEnd]
  );
  const totalDays = timelineDays.length;
  const todayIdx = useMemo(
    () => timelineDays.findIndex((d) => isSameDay(d, today)),
    [timelineDays, today]
  );

  const gridMinWidth = `calc(${PROPERTY_COL_WIDTH}px + var(--day-width) * ${totalDays})`;

  const initialScrollLeft = useMemo(() => {
    if (todayIdx < 0) return 0;
    return Math.max(0, (todayIdx - INITIAL_DAYS_BEFORE_TODAY) * dayColWidth);
  }, [todayIdx, dayColWidth]);

  const loadData = useCallback(async () => {
    try {
      if (!hasLoadedOnce.current) setLoading(true);
      const supabase = createClientComponentClient();
      const properties = await getPropertiesWithBookings(supabase);
      setApartments(properties);

      if (properties.length === 0) {
        setBookings([]);
        setCleaningTasks([]);
        return;
      }

      const propertyIds = new Set(properties.map((property) => property.id));
      const [data, taskData, cleanersRes] = await Promise.all([
        getBookingsWithDetails(supabase, {
          ...(selectedPropertyId !== 'all' ? { apartmentId: selectedPropertyId } : {}),
          overlapFrom: toDateString(rangeStart),
          overlapTo: toDateString(rangeEnd),
          includeCancel: showCancelled,
        }),
        getCleaningTasksWithDetails(supabase, {
          fromDate: toDateString(rangeStart),
          toDate: toDateString(rangeEnd),
          ...(selectedPropertyId !== 'all' ? { apartmentId: selectedPropertyId } : {}),
          status: 'all',
        }),
        fetch('/api/cleaners'),
      ]);

      const cleanersJson = await cleanersRes.json();
      if (cleanersJson.success || cleanersJson.data) {
        setCleaners(cleanersJson.data ?? []);
      }

      const visibleBookings =
        selectedPropertyId === 'all'
          ? data.filter(
              (booking) =>
                booking.apartment_id != null && propertyIds.has(booking.apartment_id)
            )
          : data;

      const visibleTasks =
        selectedPropertyId === 'all'
          ? taskData.filter((task) => propertyIds.has(task.apartment_id))
          : taskData;

      setBookings(visibleBookings);
      setCleaningTasks(visibleTasks);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load bookings';
      toast.error(message);
      setBookings([]);
      setCleaningTasks([]);
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, [selectedPropertyId, rangeStart, rangeEnd, showCancelled]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!activeCleaningTaskId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest('[data-cleaning-indicator]') ||
        target.closest('[data-cleaning-popover]')
      ) {
        return;
      }
      setActiveCleaningTaskId(null);
      setCleaningPopoverAnchor(null);
    };

    const handleScroll = () => {
      setActiveCleaningTaskId(null);
      setCleaningPopoverAnchor(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    const scrollEl = scrollRef.current;
    scrollEl?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      scrollEl?.removeEventListener('scroll', handleScroll);
    };
  }, [activeCleaningTaskId]);

  useEffect(() => {
    try {
      const savedDate = localStorage.getItem('bookings-calendar:lastDate');
      if (savedDate) {
        const parsed = new Date(savedDate);
        if (!Number.isNaN(parsed.getTime())) {
          const month = startOfMonth(parsed);
          displayMonthRef.current = month;
          setDisplayMonth(month);
          setRangeStart(startOfMonth(subMonths(parsed, INITIAL_MONTHS_BEFORE)));
          setRangeEnd(endOfMonth(addMonths(parsed, INITIAL_MONTHS_AFTER)));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Default view: today with 10 prior days visible on first load
  useEffect(() => {
    if (loading || initialScrollDone.current || todayIdx < 0) return;
    const el = scrollRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollLeft = initialScrollLeft;
      initialScrollDone.current = true;
    });
  }, [loading, todayIdx, initialScrollLeft]);

  // Vertical wheel → horizontal scroll for mouse users
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY, behavior: 'auto' });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [loading]);

  const scrollToDayIndex = useCallback(
    (dayIdx: number, smooth = true) => {
      const el = scrollRef.current;
      if (!el || dayIdx < 0) return;
      const targetLeft = Math.max(
        0,
        (dayIdx - INITIAL_DAYS_BEFORE_TODAY) * dayColWidth
      );
      el.scrollTo({ left: targetLeft, behavior: smooth ? 'smooth' : 'auto' });
    },
    [dayColWidth]
  );

  const updateDisplayMonthFromScroll = useCallback(() => {
    if (isZoomingRef.current) return;
    const el = scrollRef.current;
    if (!el || timelineDays.length === 0) return;

    const visibleCenterIdx = Math.min(
      timelineDays.length - 1,
      Math.max(
        0,
        Math.floor((el.scrollLeft + (el.clientWidth - PROPERTY_COL_WIDTH) / 2) / dayColWidth)
      )
    );
    const centerDate = timelineDays[visibleCenterIdx];
    const month = startOfMonth(centerDate);
    if (displayMonthRef.current.getTime() === month.getTime()) return;
    displayMonthRef.current = month;
    setDisplayMonth(month);
    try {
      localStorage.setItem('bookings-calendar:lastDate', month.toISOString());
    } catch {
      // ignore
    }
  }, [timelineDays, dayColWidth]);

  const extendTimelineForward = useCallback(() => {
    if (extendingRef.current) return;
    extendingRef.current = true;
    setRangeEnd((prev) => endOfMonth(addMonths(prev, 1)));
    requestAnimationFrame(() => {
      extendingRef.current = false;
    });
  }, []);

  const extendTimelineBackward = useCallback(() => {
    const el = scrollRef.current;
    if (extendingRef.current || !el) return;

    extendingRef.current = true;
    const prevScrollWidth = el.scrollWidth;
    const prevScrollLeft = el.scrollLeft;

    setRangeStart((prev) => startOfMonth(subMonths(prev, 1)));

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const addedWidth = el.scrollWidth - prevScrollWidth;
        el.scrollLeft = prevScrollLeft + addedWidth;
        extendingRef.current = false;
      });
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRafRef.current != null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      updateDisplayMonthFromScroll();

      const el = scrollRef.current;
      if (!el) return;

      const gridScrollLeft = el.scrollLeft;
      const gridClientWidth = el.clientWidth - PROPERTY_COL_WIDTH;
      const gridScrollWidth = el.scrollWidth - PROPERTY_COL_WIDTH;

      if (gridScrollLeft + gridClientWidth > gridScrollWidth - scrollExtendThreshold) {
        extendTimelineForward();
      }
      if (gridScrollLeft < scrollExtendThreshold) {
        extendTimelineBackward();
      }
    });
  }, [
    updateDisplayMonthFromScroll,
    extendTimelineForward,
    extendTimelineBackward,
    scrollExtendThreshold,
  ]);

  const visibleProperties = useMemo(() => {
    if (selectedPropertyId === 'all') return apartments;
    return apartments.filter((apt) => apt.id === selectedPropertyId);
  }, [apartments, selectedPropertyId]);

  const bookingsByProperty = useMemo(() => {
    const map = new Map<string, BookingWithDetails[]>();
    for (const property of visibleProperties) {
      map.set(property.id, []);
    }
    for (const booking of bookings) {
      if (booking.apartment_id && map.has(booking.apartment_id)) {
        map.get(booking.apartment_id)!.push(booking);
      }
    }
    return map;
  }, [bookings, visibleProperties]);

  const visibleBookingIds = useMemo(
    () => new Set(bookings.map((booking) => booking.id)),
    [bookings]
  );

  const bookingSpanById = useMemo(() => {
    const map = new Map<string, BookingSpan>();
    for (const booking of bookings) {
      const span = getTimelineSpan(booking, rangeStart, rangeEnd);
      if (span) {
        map.set(booking.id, span);
      }
    }
    return map;
  }, [bookings, rangeStart, rangeEnd]);

  const cleaningTasksByProperty = useMemo(() => {
    const map = new Map<string, CleaningTaskMarker[]>();
    for (const property of visibleProperties) {
      map.set(property.id, []);
    }
    for (const task of cleaningTasks) {
      if (!map.has(task.apartment_id)) continue;
      if (!visibleBookingIds.has(task.booking_id)) continue;
      if (!isTaskWithinBookingStay(task)) continue;

      const dayIdx = getCleaningTaskDayIndex(task, rangeStart, rangeEnd);
      if (dayIdx == null) continue;

      map.get(task.apartment_id)!.push({
        task,
        dayIdx,
        bookingSpan: bookingSpanById.get(task.booking_id) ?? null,
        stackIndex: 0,
      });
    }
    for (const markers of map.values()) {
      markers.sort(
        (a, b) =>
          a.dayIdx - b.dayIdx ||
          a.task.task_type.localeCompare(b.task.task_type) ||
          a.task.id.localeCompare(b.task.id)
      );
      const dayCounts = new Map<number, number>();
      for (const marker of markers) {
        const count = dayCounts.get(marker.dayIdx) ?? 0;
        marker.stackIndex = count;
        dayCounts.set(marker.dayIdx, count + 1);
      }
    }
    return map;
  }, [
    cleaningTasks,
    visibleProperties,
    rangeStart,
    rangeEnd,
    visibleBookingIds,
    bookingSpanById,
  ]);

  const activeCleaningTask = useMemo(
    () => cleaningTasks.find((task) => task.id === activeCleaningTaskId) ?? null,
    [cleaningTasks, activeCleaningTaskId]
  );

  const handleCleaningStatusChange = useCallback(
    async (taskId: string, status: CleaningTaskStatus) => {
      try {
        setUpdatingCleaningTaskId(taskId);
        const response = await fetch('/api/cleaning/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: taskId, status }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error ?? 'Failed to update status');
        }

        setCleaningTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status,
                  completed_at:
                    status === 'completed' ? new Date().toISOString() : null,
                }
              : task
          )
        );
        toast.success('Cleaning task updated');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update status';
        toast.error(message);
      } finally {
        setUpdatingCleaningTaskId(null);
      }
    },
    []
  );

  const handleCleaningAssign = useCallback(
    async (taskId: string, cleanerId: string) => {
      try {
        setAssigningCleaningTaskId(taskId);
        const response = await fetch('/api/cleaning/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: taskId, cleaner_id: cleanerId }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error ?? 'Failed to assign cleaner');
        }
        const updated = result.data;
        setCleaningTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  assigned_cleaner_id: cleanerId,
                  cleaner_name: updated.cleaner_name ?? null,
                  cleaner_payout:
                    updated.cleaner_payout != null ? Number(updated.cleaner_payout) : null,
                  auto_assigned: false,
                }
              : task
          )
        );
        toast.success('Cleaner assigned');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to assign cleaner';
        toast.error(message);
      } finally {
        setAssigningCleaningTaskId(null);
      }
    },
    []
  );

  const navigateMonth = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollBy({
      left: direction * 30 * dayColWidth,
      behavior: 'smooth',
    });
  };

  const animateZoomTo = useCallback(
    (targetIndex: number) => {
      if (isZoomingRef.current || zoomAnimationRef.current != null) return;
      if (targetIndex === zoomIndex) return;

      const endScale = ZOOM_LEVELS[targetIndex];
      const startScale = ZOOM_LEVELS[zoomIndex];
      const el = scrollRef.current;
      const gridEl = gridInnerRef.current;
      if (!el || !gridEl) {
        setZoomIndex(targetIndex);
        return;
      }

      const gridViewport = el.clientWidth - PROPERTY_COL_WIDTH;
      const startWidth = BASE_DAY_COL_WIDTH * startScale;

      const todayViewportX =
        todayIdx >= 0
          ? todayIdx * startWidth + startWidth / 2 - el.scrollLeft
          : null;
      const centerDayFraction =
        startWidth > 0 ? (el.scrollLeft + gridViewport / 2) / startWidth : 0;

      isZoomingRef.current = true;
      setIsZooming(true);
      const startTime = performance.now();

      const tick = (now: number) => {
        const progress = Math.min(1, (now - startTime) / ZOOM_ANIMATION_MS);
        const eased = easeInOutCubic(progress);
        const currentScale = startScale + (endScale - startScale) * eased;
        const currentWidth = BASE_DAY_COL_WIDTH * currentScale;

        gridEl.style.setProperty('--day-width', `${currentWidth}px`);

        const scrollEl = scrollRef.current;
        if (scrollEl) {
          const viewport = scrollEl.clientWidth - PROPERTY_COL_WIDTH;
          if (todayViewportX != null) {
            scrollEl.scrollLeft = Math.max(
              0,
              (todayIdx + 0.5) * currentWidth - todayViewportX
            );
          } else {
            scrollEl.scrollLeft = Math.max(
              0,
              centerDayFraction * currentWidth - viewport / 2
            );
          }
        }

        if (zoomLabelRef.current) {
          zoomLabelRef.current.textContent = `${Math.round(currentScale * 100)}%`;
        }

        if (progress < 1) {
          zoomAnimationRef.current = requestAnimationFrame(tick);
        } else {
          const finalWidth = Math.round(BASE_DAY_COL_WIDTH * endScale);
          gridEl.style.setProperty('--day-width', `${finalWidth}px`);
          setZoomIndex(targetIndex);
          isZoomingRef.current = false;
          setIsZooming(false);
          zoomAnimationRef.current = null;
          if (zoomLabelRef.current) {
            zoomLabelRef.current.textContent = `${Math.round(endScale * 100)}%`;
          }
        }
      };

      zoomAnimationRef.current = requestAnimationFrame(tick);
    },
    [zoomIndex, todayIdx]
  );

  useEffect(() => {
    return () => {
      if (zoomAnimationRef.current != null) {
        cancelAnimationFrame(zoomAnimationRef.current);
      }
    };
  }, []);

  const zoomIn = () => {
    if (zoomIndex < ZOOM_LEVELS.length - 1) {
      animateZoomTo(zoomIndex + 1);
    }
  };

  const zoomOut = () => {
    if (zoomIndex > 0) {
      animateZoomTo(zoomIndex - 1);
    }
  };

  const goToToday = () => {
    if (todayIdx >= 0) {
      scrollToDayIndex(todayIdx);
      const month = startOfMonth(today);
      displayMonthRef.current = month;
      setDisplayMonth(month);
      try {
        localStorage.setItem('bookings-calendar:lastDate', today.toISOString());
      } catch {
        // ignore
      }
      return;
    }

    const now = new Date();
    setRangeStart(startOfMonth(subMonths(now, INITIAL_MONTHS_BEFORE)));
    setRangeEnd(endOfMonth(addMonths(now, INITIAL_MONTHS_AFTER)));
    const month = startOfMonth(now);
    displayMonthRef.current = month;
    setDisplayMonth(month);
    initialScrollDone.current = false;
  };

  const summaryText = useMemo(() => {
    const propertyLabel =
      selectedPropertyId === 'all'
        ? 'all linked properties'
        : getPropertyDisplayName(
            apartments.find((apt) => apt.id === selectedPropertyId) ?? null
          );

    return `${bookings.length} booking${bookings.length === 1 ? '' : 's'} for ${propertyLabel}`;
  }, [apartments, bookings.length, selectedPropertyId]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-white">
        <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Calendar</h1>
            <p className="text-sm text-gray-600 mt-1">
              Scroll horizontally to browse dates — arrow buttons jump by month
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label htmlFor="property-filter" className="text-gray-700">
                Property
              </Label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger id="property-filter" className="w-full bg-white border-gray-300">
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {apartments.map((apt) => (
                    <SelectItem key={apt.id} value={apt.id}>
                      {getPropertyDisplayName(apt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pb-0.5">
              <Switch
                id="show-cancelled"
                checked={showCancelled}
                onCheckedChange={setShowCancelled}
              />
              <Label htmlFor="show-cancelled" className="text-sm text-gray-700 cursor-pointer">
                Show cancelled bookings
              </Label>
            </div>

            <p className="text-sm text-gray-600 sm:ml-auto">{summaryText}</p>
          </div>

          {loading ? (
            <CalendarSkeleton />
          ) : (
            <div className="bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden border border-gray-200 ring-1 ring-gray-100">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateMonth(-1)}
                  aria-label="Previous month"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <h2 className="text-lg font-semibold text-gray-900">
                  {format(displayMonth, 'MMMM yyyy')}
                </h2>

                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="flex items-center rounded-md border border-gray-200 bg-gray-50">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={zoomOut}
                      disabled={zoomIndex === 0 || isZooming}
                      aria-label="Zoom out"
                      className="h-8 w-8 text-gray-600 hover:text-gray-900"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span
                      ref={zoomLabelRef}
                      className="text-xs text-gray-500 tabular-nums min-w-[3rem] text-center"
                    >
                      {Math.round(ZOOM_LEVELS[zoomIndex] * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={zoomIn}
                      disabled={zoomIndex === ZOOM_LEVELS.length - 1 || isZooming}
                      aria-label="Zoom in"
                      className="h-8 w-8 text-gray-600 hover:text-gray-900"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className="text-xs sm:text-sm"
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateMonth(1)}
                    aria-label="Next month"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Legend */}
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/80 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-xs font-medium text-gray-500 mr-1">Platforms:</span>
                {LEGEND_ITEMS.map(({ key, label, color, type }) => (
                  <div key={key} className="flex items-center gap-1.5">
                    {type === 'state' && key === 'short_gap' ? (
                      <span
                        className="inline-block w-3 h-0.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ) : type === 'state' && key === 'available' ? (
                      <span className="inline-block w-3 h-3 rounded-sm border border-gray-300 bg-white" />
                    ) : (
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    )}
                    <span className="text-xs text-gray-600">{label}</span>
                  </div>
                ))}
                <span className="hidden sm:inline w-px h-4 bg-gray-300 mx-1" aria-hidden />
                <span className="text-xs font-medium text-gray-500 mr-1">Cleaning:</span>
                {CLEANING_LEGEND_ITEMS.map(({ key, label, emoji, color }) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-gray-600">
                      {emoji} {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Timeline grid — horizontal + vertical scroll */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] overscroll-x-contain"
              >
                <div
                  ref={gridInnerRef}
                  style={{
                    minWidth: gridMinWidth,
                    ['--day-width' as string]: `${dayColWidth}px`,
                  }}
                  className="relative"
                >
                  {/* Day header row */}
                  <div className="flex sticky top-0 z-30 bg-white border-b border-gray-200">
                    <div
                      className="shrink-0 sticky left-0 z-50 bg-white border-r border-gray-200 px-3 py-1.5 flex flex-col justify-end shadow-[4px_0_12px_-4px_rgba(0,0,0,0.15)]"
                      style={{ width: PROPERTY_COL_WIDTH }}
                    >
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Property
                      </span>
                    </div>
                    <div className="flex relative">
                      {timelineDays.map((date, idx) => {
                        const dayOfWeek = getDay(date);
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const isToday = isSameDay(date, today);
                        const isMonthStart = date.getDate() === 1;

                        return (
                          <div
                            key={idx}
                            className={cn(
                              'shrink-0 flex flex-col items-center justify-end py-1 border-l border-gray-100',
                              isWeekend && 'bg-gray-50/90',
                              isMonthStart && 'border-l-gray-300'
                            )}
                            style={{ width: 'var(--day-width)' }}
                          >
                            {isMonthStart && (
                              <span className="text-[9px] font-semibold text-gray-400 uppercase leading-none mb-0.5">
                                {format(date, 'MMM')}
                              </span>
                            )}
                            {isToday ? (
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#f59e0b] text-white font-semibold text-[11px]">
                                {date.getDate()}
                              </span>
                            ) : (
                              <span className="text-gray-500 font-medium text-[11px] leading-6">
                                {date.getDate()}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {todayIdx >= 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-0 border-l-2 border-dashed border-[#f59e0b] pointer-events-none z-10"
                          style={{
                            left: `calc((${todayIdx} + 0.5) * var(--day-width))`,
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Property rows */}
                  {visibleProperties.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500 text-sm">
                      No properties with bookings found.
                    </div>
                  ) : (
                    visibleProperties.map((property, rowIndex) => {
                      const propertyBookings = bookingsByProperty.get(property.id) ?? [];
                      const spans = propertyBookings
                        .map((b) => getTimelineSpan(b, rangeStart, rangeEnd))
                        .filter((s): s is BookingSpan => s !== null);
                      const gapMarkers = computeShortGaps(
                        propertyBookings,
                        rangeStart,
                        rangeEnd
                      );
                      const cleaningMarkers = cleaningTasksByProperty.get(property.id) ?? [];

                      const propertyName = getPropertyDisplayName(property);
                      const unitNumber = getPropertyUnitNumber(property);

                      return (
                        <div
                          key={property.id}
                          className={cn(
                            'flex border-b border-gray-100',
                            rowIndex % 2 === 1 && 'bg-gray-50'
                          )}
                          style={{ minHeight: ROW_HEIGHT }}
                        >
                          <div
                            className={cn(
                              'shrink-0 sticky left-0 z-50 border-r border-gray-200 px-3 py-2 flex flex-col justify-center shadow-[4px_0_12px_-4px_rgba(0,0,0,0.15)]',
                              rowIndex % 2 === 1 ? 'bg-gray-50' : 'bg-white'
                            )}
                            style={{ width: PROPERTY_COL_WIDTH }}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                  {propertyName}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="right">{propertyName}</TooltipContent>
                            </Tooltip>
                            {unitNumber && (
                              <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">
                                {unitNumber}
                              </p>
                            )}
                          </div>

                          <div
                            className="relative shrink-0"
                            style={{ width: `calc(var(--day-width) * ${totalDays})`, minHeight: ROW_HEIGHT }}
                          >
                            {/* Day column backgrounds */}
                            <div className="absolute inset-0 flex">
                              {timelineDays.map((date, idx) => {
                                const dayOfWeek = getDay(date);
                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                const isMonthStart = date.getDate() === 1;

                                return (
                                  <div
                                    key={idx}
                                    className={cn(
                                      'shrink-0 border-l border-gray-100',
                                      isWeekend && 'bg-gray-50/60',
                                      isMonthStart && 'border-l-gray-200'
                                    )}
                                    style={{ width: 'var(--day-width)' }}
                                  />
                                );
                              })}
                            </div>

                            {/* Today line */}
                            {todayIdx >= 0 && (
                              <div
                                className="absolute top-0 bottom-0 w-0 border-l-2 border-dashed border-[#f59e0b] pointer-events-none z-[5]"
                                style={{
                                  left: `calc((${todayIdx} + 0.5) * var(--day-width))`,
                                }}
                              />
                            )}

                            {/* Short gap markers */}
                            {gapMarkers.map(({ dayIdx }) => (
                              <div
                                key={`gap-${property.id}-${dayIdx}`}
                                className="absolute top-1/2 z-[6] pointer-events-none"
                                style={{
                                  left: `calc((${dayIdx} + 0.5) * var(--day-width))`,
                                  transform: 'translate(-50%, -50%)',
                                }}
                              >
                                <span className="block w-2 h-0.5 rounded-full bg-[#f59e0b]" />
                              </div>
                            ))}

                            {/* Booking pills */}
                            {spans.map(({ booking, startIdx, endIdx }) => {
                              const cancelled = isCancelled(booking.booking_status);
                              const channelName = booking.booking_channels?.name;
                              const bgColor = cancelled ? '#fecdd3' : getChannelColor(channelName);
                              const textColor = cancelled ? '#9f1239' : getChannelTextColor(channelName);
                              const guestName = booking.guests?.name ?? 'Guest';
                              const firstName = getGuestFirstName(guestName);
                              const style = spanToStyle(startIdx, endIdx, totalDays);

                              return (
                                <Tooltip key={booking.id}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedBooking(booking);
                                        setDetailsOpen(true);
                                      }}
                                      className={cn(
                                        'absolute top-1.5 bottom-1.5 rounded-full px-2 flex items-center z-10',
                                        'text-[11px] font-medium leading-none truncate cursor-pointer',
                                        'hover:brightness-95 transition-[filter] shadow-sm',
                                        cancelled && 'line-through opacity-80'
                                      )}
                                      style={{
                                        ...style,
                                        backgroundColor: bgColor,
                                        color: textColor,
                                        marginLeft: '1px',
                                        marginRight: '1px',
                                        width: `calc(${style.width} - 2px)`,
                                      }}
                                    >
                                      <span className="truncate">{firstName}</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium">{guestName}</p>
                                    <p className="text-muted-foreground">
                                      {formatDisplayDate(booking.check_in_date)} →{' '}
                                      {formatDisplayDate(booking.check_out_date)}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}

                            {/* Cleaning task indicators */}
                            {cleaningMarkers.map((marker) => {
                              const { task, stackIndex } = marker;
                              const isCompleted = task.status === 'completed';
                              const isCheckout = task.task_type === 'checkout_clean';
                              const isUnassigned = !task.assigned_cleaner_id;
                              const isPopoverOpen = activeCleaningTaskId === task.id;
                              const position = getCleaningMarkerPosition(marker, totalDays);
                              const initials = task.cleaner_name
                                ? getCleanerInitials(task.cleaner_name)
                                : null;

                              return (
                                <div
                                  key={task.id}
                                  className="absolute z-20"
                                  style={{
                                    left: position.left,
                                    bottom: position.bottom,
                                    transform: position.transform,
                                  }}
                                >
                                  <button
                                    type="button"
                                    data-cleaning-indicator
                                    aria-label={`${getTaskTypeLabel(task.task_type)} on ${formatDisplayDate(task.scheduled_date)}${task.cleaner_name ? ` — ${task.cleaner_name}` : ' — unassigned'}`}
                                    aria-expanded={isPopoverOpen}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      const rect = event.currentTarget.getBoundingClientRect();
                                      if (activeCleaningTaskId === task.id) {
                                        setActiveCleaningTaskId(null);
                                        setCleaningPopoverAnchor(null);
                                      } else {
                                        setActiveCleaningTaskId(task.id);
                                        setCleaningPopoverAnchor({
                                          x: rect.left + rect.width / 2,
                                          y: rect.top,
                                        });
                                      }
                                    }}
                                    className={cn(
                                      'flex flex-col items-center justify-center min-w-5 rounded-full border shadow-sm',
                                      'hover:scale-110 transition-transform cursor-pointer',
                                      isCompleted
                                        ? 'bg-green-100 border-green-400 text-green-700 px-0.5'
                                        : isUnassigned
                                          ? 'bg-amber-50 border-amber-400 text-amber-800'
                                          : isCheckout
                                            ? 'bg-red-50 border-red-300 text-[11px]'
                                            : 'bg-amber-50 border-amber-300 text-[9px] font-bold text-amber-800'
                                    )}
                                    style={stackIndex > 0 ? { marginTop: 0 } : undefined}
                                  >
                                    {isCompleted ? (
                                      <span className="flex flex-col items-center leading-none">
                                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                        {initials && (
                                          <span className="text-[7px] font-bold">{initials}</span>
                                        )}
                                      </span>
                                    ) : isUnassigned ? (
                                      <span className="text-[10px] font-bold leading-none">!</span>
                                    ) : isCheckout ? (
                                      <span className="flex flex-col items-center leading-none py-0.5">
                                        <span aria-hidden className="text-[10px]">🧹</span>
                                        {initials && (
                                          <span className="text-[7px] font-bold">{initials}</span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="flex flex-col items-center leading-none py-0.5">
                                        <span aria-hidden className="text-[8px]">MID</span>
                                        {initials && (
                                          <span className="text-[7px] font-bold">{initials}</span>
                                        )}
                                      </span>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}

                </div>
              </div>
            </div>
          )}
        </div>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            {selectedBooking && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-left">
                    {getPropertyDisplayName(selectedBooking.apartments)}
                  </DialogTitle>
                  <p className="text-sm text-gray-600 text-left">
                    {selectedBooking.guests?.name ?? 'Guest'}
                  </p>
                </DialogHeader>

                <div className="space-y-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClass(selectedBooking.booking_status)}
                    >
                      {selectedBooking.booking_status}
                    </Badge>
                    <Badge variant="outline">
                      {getChannelDisplayName(selectedBooking.booking_channels?.name)}
                    </Badge>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <dt className="text-gray-500">Guest phone</dt>
                      <dd className="font-medium text-gray-900">
                        {selectedBooking.guests?.phone || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Booking reference</dt>
                      <dd className="font-medium text-gray-900 break-all">
                        {selectedBooking.booking_reference}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Check-in</dt>
                      <dd className="font-medium text-gray-900">
                        {formatDisplayDate(selectedBooking.check_in_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Check-out</dt>
                      <dd className="font-medium text-gray-900">
                        {formatDisplayDate(selectedBooking.check_out_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Nights</dt>
                      <dd className="font-medium text-gray-900">{selectedBooking.nights}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Channel</dt>
                      <dd className="font-medium text-gray-900">
                        {getChannelDisplayName(selectedBooking.booking_channels?.name)}
                      </dd>
                    </div>
                  </dl>

                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <h4 className="font-semibold text-gray-900">Financials (ZAR)</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">Accommodation total</dt>
                        <dd className="font-medium text-gray-900">
                          {formatCurrency(Number(selectedBooking.accommodation_total))}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">Cleaning fee</dt>
                        <dd className="font-medium text-gray-900">
                          {formatCurrency(Number(selectedBooking.cleaning_fee))}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">Discounts</dt>
                        <dd className="font-medium text-gray-900">
                          {formatCurrency(Number(selectedBooking.discount_amount))}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">Commission</dt>
                        <dd className="font-medium text-gray-900">
                          {formatCurrency(Number(selectedBooking.channel_commission))}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-gray-100 pt-2">
                        <dt className="font-semibold text-gray-900">Total payout</dt>
                        <dd className="font-semibold text-gray-900">
                          {formatCurrency(Number(selectedBooking.total_payout))}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {activeCleaningTask &&
          cleaningPopoverAnchor &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              data-cleaning-popover
              className="fixed z-[100] w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-xl"
              style={{
                left: cleaningPopoverAnchor.x,
                top: cleaningPopoverAnchor.y - 8,
                transform: 'translate(-50%, -100%)',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">
                    {getTaskTypeLabel(activeCleaningTask.task_type)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDisplayDate(activeCleaningTask.scheduled_date)}
                  </p>
                </div>

                <dl className="space-y-1.5 text-xs">
                  <div>
                    <dt className="text-gray-500">Property</dt>
                    <dd className="font-medium text-gray-900">
                      {getCleaningPropertyDisplayName(activeCleaningTask)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Guest</dt>
                    <dd className="font-medium text-gray-900">
                      {activeCleaningTask.guest_name ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Cleaner</dt>
                    <dd className="font-medium text-gray-900">
                      {activeCleaningTask.cleaner_name ?? (
                        <span className="text-amber-700">Unassigned</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Payout</dt>
                    <dd className="font-medium text-gray-900">
                      {activeCleaningTask.cleaner_payout == null ? (
                        <span className="text-red-600">No rate</span>
                      ) : (
                        formatZAR(activeCleaningTask.cleaner_payout)
                      )}
                    </dd>
                  </div>
                  {activeCleaningTask.assigned_cleaner_id && (
                    <div>
                      <dt className="text-gray-500">Assignment</dt>
                      <dd className="font-medium text-gray-900">
                        {activeCleaningTask.auto_assigned ? 'Auto-assigned' : 'Manually assigned'}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="space-y-1 border-t border-gray-100 pt-2">
                  <Label className="text-xs text-gray-500">Assign cleaner</Label>
                  <select
                    value={activeCleaningTask.assigned_cleaner_id ?? ''}
                    disabled={assigningCleaningTaskId === activeCleaningTask.id}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleCleaningAssign(activeCleaningTask.id, e.target.value);
                      }
                    }}
                    className="w-full text-xs rounded-md border border-gray-200 px-2 py-1.5 bg-white disabled:opacity-50"
                  >
                    <option value="">Select cleaner…</option>
                    {cleaners.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {activeCleaningTask.task_type === 'midstay_clean' && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                    Includes linen change
                  </p>
                )}

                <div className="space-y-2 border-t border-gray-100 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500">Status</span>
                    <Badge
                      variant="outline"
                      className={getCleaningStatusBadgeClass(activeCleaningTask.status)}
                    >
                      {activeCleaningTask.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <select
                    value={activeCleaningTask.status}
                    disabled={updatingCleaningTaskId === activeCleaningTask.id}
                    onChange={(e) =>
                      handleCleaningStatusChange(
                        activeCleaningTask.id,
                        e.target.value as CleaningTaskStatus
                      )
                    }
                    className="w-full text-xs rounded-md border border-gray-200 px-2 py-1.5 bg-white disabled:opacity-50"
                    aria-label={`Update status for ${getTaskTypeLabel(activeCleaningTask.task_type)}`}
                  >
                    {CLEANING_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {activeCleaningTask.status !== 'completed' && (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full h-8 text-xs"
                      disabled={updatingCleaningTaskId === activeCleaningTask.id}
                      onClick={() =>
                        handleCleaningStatusChange(activeCleaningTask.id, 'completed')
                      }
                    >
                      Mark complete
                    </Button>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </TooltipProvider>
  );
}

export default function Calendar() {
  return (
    <AuthWrapper>
      <BookingsCalendarContent />
    </AuthWrapper>
  );
}
