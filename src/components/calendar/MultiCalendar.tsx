'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { BookingWithDetails } from '@/lib/queries/bookings';
import type {
  CleaningTaskStatus,
  CleaningTaskType,
  CleaningTaskWithDetails,
} from '@/lib/queries/cleaning';
import toast from 'react-hot-toast';
import { AddCleaningDialog } from './AddCleaningDialog';
import { BookingDetailsDialog } from './BookingDetailsDialog';
import { CalendarToolbar } from './CalendarToolbar';
import { CleaningPopover } from './CleaningPopover';
import { PropertyLabel, PropertyRow } from './PropertyRow';
import { TimelineHeader } from './TimelineHeader';
import {
  buildTimelineDays,
  CLEANING_LEGEND_ITEMS,
  DEFAULT_ZOOM_INDEX,
  easeInOutCubic,
  extendRangeToInclude,
  getCleaningTaskDayIndex,
  getPropertyDisplayName,
  getTimelineSpan,
  INITIAL_DAYS_BEFORE_TODAY,
  INITIAL_MONTHS_AFTER,
  INITIAL_MONTHS_BEFORE,
  isCancelled,
  LEGEND_ITEMS,
  occupancyPercent,
  parseLocalDate,
  propertyHasBookingOverlap,
  resolvePresetRange,
  ROW_HEIGHT,
  toDateString,
  ZOOM_ANIMATION_MS,
  ZOOM_LEVELS,
  type CleaningPopoverAnchor,
  type CleaningTaskMarker,
  type DatePreset,
} from './calendar-utils';
import { useCalendarData } from './useCalendarData';
import { useViewportMetrics } from './useViewportMetrics';

function TimelineSkeleton({ propertyColWidth }: { propertyColWidth: number }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white animate-pulse">
      <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4">
        <div className="h-8 w-8 bg-gray-200 rounded-md" />
        <div className="h-5 w-32 bg-gray-200 rounded" />
        <div className="h-8 w-8 bg-gray-200 rounded-md" />
      </div>
      <div className="flex border-b border-gray-200">
        <div className="shrink-0 h-12 bg-gray-100 border-r" style={{ width: propertyColWidth }} />
        <div className="flex flex-1 gap-px overflow-hidden">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="h-12 w-[72px] shrink-0 bg-gray-50" />
          ))}
        </div>
      </div>
      {Array.from({ length: 8 }).map((_, row) => (
        <div key={row} className="flex border-b border-gray-100" style={{ height: ROW_HEIGHT }}>
          <div
            className="shrink-0 border-r border-gray-100 bg-white p-3 space-y-2"
            style={{ width: propertyColWidth }}
          >
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-2 bg-gray-100 rounded w-1/2" />
          </div>
          <div className="relative flex-1 bg-[linear-gradient(90deg,#f9fafb_1px,transparent_1px)] bg-[length:72px_100%]">
            {row % 2 === 0 && (
              <div
                className="absolute top-2 h-[30px] rounded-sm bg-rose-200/70"
                style={{ left: 40 + row * 24, width: 120 + row * 20 }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MultiCalendar() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const propertyScrollRef = useRef<HTMLDivElement>(null);
  const extendingRef = useRef(false);
  const initialScrollDone = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const zoomAnimationRef = useRef<number | null>(null);
  const isZoomingRef = useRef(false);
  const gridInnerRef = useRef<HTMLDivElement>(null);
  const zoomLabelRef = useRef<HTMLSpanElement>(null);
  const displayMonthRef = useRef(startOfMonth(new Date()));

  const [selectedPropertyId, setSelectedPropertyId] = useState('all');
  const [rangeStart, setRangeStart] = useState(() =>
    startOfMonth(subMonths(new Date(), INITIAL_MONTHS_BEFORE))
  );
  const [rangeEnd, setRangeEnd] = useState(() =>
    endOfMonth(addMonths(new Date(), INITIAL_MONTHS_AFTER))
  );
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()));
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
  const [addCleanOpen, setAddCleanOpen] = useState(false);
  const [addCleanPropertyId, setAddCleanPropertyId] = useState<string | null>(null);
  const [addCleanDate, setAddCleanDate] = useState('');
  const [addCleanType, setAddCleanType] = useState<CleaningTaskType>('midstay_clean');
  const [addCleanBookingId, setAddCleanBookingId] = useState('');
  const [addCleanCleanerId, setAddCleanCleanerId] = useState('');
  const [addingClean, setAddingClean] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [propertyColCollapsed, setPropertyColCollapsed] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [showOccupancy, setShowOccupancy] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('custom');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [legendOpen, setLegendOpen] = useState(false);

  const { isPhone, baseDayWidth, propertyColWidth } = useViewportMetrics(propertyColCollapsed);

  const dayColWidth = Math.round(baseDayWidth * ZOOM_LEVELS[zoomIndex]);
  const scrollExtendThreshold = dayColWidth * 10;

  const {
    bookings,
    cleaningTasks,
    setCleaningTasks,
    apartments,
    cleaners,
    loading,
    error,
    retry,
  } = useCalendarData({
    rangeStart,
    rangeEnd,
    selectedPropertyId,
    showCancelled,
  });

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

  const gridMinWidth = `calc(var(--day-width) * ${totalDays})`;

  const initialScrollLeft = useMemo(() => {
    if (todayIdx < 0) return 0;
    return Math.max(0, (todayIdx - INITIAL_DAYS_BEFORE_TODAY) * dayColWidth);
  }, [todayIdx, dayColWidth]);

  const filterRange = useMemo(() => {
    if (filterStartDate && filterEndDate) {
      return {
        from: parseLocalDate(filterStartDate),
        to: parseLocalDate(filterEndDate),
      };
    }
    return { from: rangeStart, to: rangeEnd };
  }, [filterStartDate, filterEndDate, rangeStart, rangeEnd]);

  useEffect(() => {
    try {
      const collapsed = localStorage.getItem('multi-calendar:listingsCollapsed');
      if (collapsed === '1') setPropertyColCollapsed(true);
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
      // ignore
    }
  }, []);

  useEffect(() => {
    if (loading || initialScrollDone.current || todayIdx < 0) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = initialScrollLeft;
      initialScrollDone.current = true;
    });
  }, [loading, todayIdx, initialScrollLeft]);

  const scrollToDayIndex = useCallback(
    (
      dayIdx: number,
      options: { smooth?: boolean; daysBefore?: number } = {}
    ) => {
      const el = scrollRef.current;
      if (!el || dayIdx < 0) return;
      const { smooth = true, daysBefore = INITIAL_DAYS_BEFORE_TODAY } = options;
      const targetLeft = Math.max(0, (dayIdx - daysBefore) * dayColWidth);
      el.scrollTo({ left: targetLeft, behavior: smooth ? 'smooth' : 'auto' });
    },
    [dayColWidth]
  );

  const jumpToDate = useCallback(
    (date: Date, options: { daysBefore?: number } = {}) => {
      const extended = extendRangeToInclude(rangeStart, rangeEnd, date);
      if (
        extended.start.getTime() !== rangeStart.getTime() ||
        extended.end.getTime() !== rangeEnd.getTime()
      ) {
        setRangeStart(extended.start);
        setRangeEnd(extended.end);
        initialScrollDone.current = false;
      }
      const idx = differenceInCalendarDays(date, extended.start);
      requestAnimationFrame(() =>
        scrollToDayIndex(Math.max(0, idx), { daysBefore: options.daysBefore })
      );
      const month = startOfMonth(date);
      displayMonthRef.current = month;
      setDisplayMonth(month);
    },
    [rangeStart, rangeEnd, scrollToDayIndex]
  );

  const handleStartDateChange = useCallback(
    (value: string) => {
      setFilterStartDate(value);
      setDatePreset('custom');
      if (value) jumpToDate(parseLocalDate(value));
    },
    [jumpToDate]
  );

  const handleEndDateChange = useCallback(
    (value: string) => {
      setFilterEndDate(value);
      setDatePreset('custom');
      if (value) {
        const end = parseLocalDate(value);
        const extended = extendRangeToInclude(rangeStart, rangeEnd, end);
        setRangeStart(extended.start);
        setRangeEnd(extended.end);
      }
    },
    [rangeStart, rangeEnd]
  );

  const handleDatePresetChange = useCallback(
    (preset: DatePreset) => {
      setDatePreset(preset);
      const resolved = resolvePresetRange(preset, today);
      if (!resolved) return;
      setFilterStartDate(toDateString(resolved.start));
      setFilterEndDate(toDateString(resolved.end));
      setRangeStart(startOfMonth(subMonths(resolved.start, INITIAL_MONTHS_BEFORE)));
      setRangeEnd(endOfMonth(addMonths(resolved.end, 1)));
      jumpToDate(resolved.start);
    },
    [today, jumpToDate]
  );

  const syncPropertyScroll = useCallback((scrollTop: number) => {
    const propEl = propertyScrollRef.current;
    if (propEl && propEl.scrollTop !== scrollTop) {
      propEl.scrollTop = scrollTop;
    }
  }, []);

  const updateDisplayMonthFromScroll = useCallback(() => {
    if (isZoomingRef.current) return;
    const el = scrollRef.current;
    if (!el || timelineDays.length === 0) return;

    const visibleCenterIdx = Math.min(
      timelineDays.length - 1,
      Math.max(0, Math.floor((el.scrollLeft + el.clientWidth / 2) / dayColWidth))
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

      syncPropertyScroll(el.scrollTop);

      const gridScrollLeft = el.scrollLeft;
      const gridClientWidth = el.clientWidth;
      const gridScrollWidth = el.scrollWidth;

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
    syncPropertyScroll,
  ]);

  const bookingsByProperty = useMemo(() => {
    const map = new Map<string, BookingWithDetails[]>();
    for (const booking of bookings) {
      if (!booking.apartment_id) continue;
      const list = map.get(booking.apartment_id);
      if (list) list.push(booking);
      else map.set(booking.apartment_id, [booking]);
    }
    return map;
  }, [bookings]);

  const visibleProperties = useMemo(() => {
    let list =
      selectedPropertyId === 'all'
        ? apartments
        : apartments.filter((apt) => apt.id === selectedPropertyId);

    if (showAvailableOnly) {
      list = list.filter((apt) => {
        const propertyBookings = bookingsByProperty.get(apt.id) ?? [];
        return !propertyHasBookingOverlap(
          propertyBookings,
          filterRange.from,
          filterRange.to
        );
      });
    }

    return list;
  }, [
    apartments,
    selectedPropertyId,
    showAvailableOnly,
    bookingsByProperty,
    filterRange,
  ]);

  const occupancyByProperty = useMemo(() => {
    if (!showOccupancy) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const property of visibleProperties) {
      map.set(
        property.id,
        occupancyPercent(
          bookingsByProperty.get(property.id) ?? [],
          filterRange.from,
          filterRange.to
        )
      );
    }
    return map;
  }, [showOccupancy, visibleProperties, bookingsByProperty, filterRange]);

  const bookingSpanById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getTimelineSpan>>();
    for (const booking of bookings) {
      const span = getTimelineSpan(booking, rangeStart, rangeEnd);
      if (span) map.set(booking.id, span);
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
      const dayIdx = getCleaningTaskDayIndex(task, rangeStart, rangeEnd);
      if (dayIdx == null) continue;
      map.get(task.apartment_id)!.push({
        task,
        dayIdx,
        bookingSpan: task.booking_id ? bookingSpanById.get(task.booking_id) ?? null : null,
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
  }, [cleaningTasks, visibleProperties, rangeStart, rangeEnd, bookingSpanById]);

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
        toast.error(err instanceof Error ? err.message : 'Failed to update status');
      } finally {
        setUpdatingCleaningTaskId(null);
      }
    },
    [setCleaningTasks]
  );

  const handleCleaningAssign = useCallback(
    async (taskId: string, cleanerId: string | null) => {
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
                  cleaner_name: cleanerId ? (updated.cleaner_name ?? null) : null,
                  cleaner_payout:
                    cleanerId == null
                      ? null
                      : updated.cleaner_payout != null
                        ? Number(updated.cleaner_payout)
                        : null,
                  auto_assigned: false,
                }
              : task
          )
        );
        toast.success(cleanerId ? 'Cleaner assigned' : 'Cleaner unassigned');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to assign cleaner');
      } finally {
        setAssigningCleaningTaskId(null);
      }
    },
    [setCleaningTasks]
  );

  const overlappingBookingsForAdd = useMemo(() => {
    if (!addCleanPropertyId || !addCleanDate) return [];
    return bookings.filter(
      (booking) =>
        booking.apartment_id === addCleanPropertyId &&
        !isCancelled(booking.booking_status) &&
        booking.check_in_date <= addCleanDate &&
        booking.check_out_date >= addCleanDate
    );
  }, [bookings, addCleanPropertyId, addCleanDate]);

  const openAddClean = useCallback(
    (propertyId: string, dayIdx: number) => {
      const date = timelineDays[dayIdx];
      if (!date) return;
      const dateStr = toDateString(date);
      const overlapping = bookings.filter(
        (booking) =>
          booking.apartment_id === propertyId &&
          !isCancelled(booking.booking_status) &&
          booking.check_in_date <= dateStr &&
          booking.check_out_date >= dateStr
      );
      setAddCleanPropertyId(propertyId);
      setAddCleanDate(dateStr);
      setAddCleanType('midstay_clean');
      setAddCleanBookingId(overlapping[0]?.id ?? '');
      setAddCleanCleanerId('');
      setAddCleanOpen(true);
      setActiveCleaningTaskId(null);
      setCleaningPopoverAnchor(null);
    },
    [bookings, timelineDays]
  );

  const handleCreateClean = useCallback(async () => {
    if (!addCleanPropertyId || !addCleanDate) return;
    try {
      setAddingClean(true);
      const response = await fetch('/api/cleaning/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apartment_id: addCleanPropertyId,
          scheduled_date: addCleanDate,
          task_type: addCleanType,
          booking_id: addCleanBookingId || null,
          ...(addCleanCleanerId ? { cleaner_id: addCleanCleanerId } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to add cleaning day');
      }
      setCleaningTasks((prev) => [...prev, result.data as CleaningTaskWithDetails]);
      setAddCleanOpen(false);
      toast.success('Cleaning day added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add cleaning day');
    } finally {
      setAddingClean(false);
    }
  }, [
    addCleanPropertyId,
    addCleanDate,
    addCleanType,
    addCleanBookingId,
    addCleanCleanerId,
    setCleaningTasks,
  ]);

  const handleUpdateTask = useCallback(
    async (
      taskId: string,
      payload: {
        scheduled_date?: string;
        task_type?: CleaningTaskType;
        booking_id?: string | null;
      }
    ) => {
      try {
        setSavingTaskId(taskId);
        const response = await fetch(`/api/cleaning/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error ?? 'Failed to update cleaning day');
        }
        setCleaningTasks((prev) =>
          prev.map((task) =>
            task.id === taskId ? (result.data as CleaningTaskWithDetails) : task
          )
        );
        toast.success('Cleaning day updated');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update cleaning day');
      } finally {
        setSavingTaskId(null);
      }
    },
    [setCleaningTasks]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        setDeletingTaskId(taskId);
        const response = await fetch(`/api/cleaning/tasks/${taskId}`, {
          method: 'DELETE',
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error ?? 'Failed to delete cleaning day');
        }
        setCleaningTasks((prev) => prev.filter((task) => task.id !== taskId));
        setActiveCleaningTaskId(null);
        setCleaningPopoverAnchor(null);
        toast.success('Cleaning day deleted');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete cleaning day');
      } finally {
        setDeletingTaskId(null);
      }
    },
    [setCleaningTasks]
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

      const gridViewport = el.clientWidth;
      const startWidth = baseDayWidth * startScale;

      const todayVisible =
        todayIdx >= 0 &&
        todayIdx * startWidth + startWidth > el.scrollLeft &&
        todayIdx * startWidth < el.scrollLeft + gridViewport;

      const todayViewportX = todayVisible
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
        const currentWidth = baseDayWidth * currentScale;

        gridEl.style.setProperty('--day-width', `${currentWidth}px`);

        const scrollEl = scrollRef.current;
        if (scrollEl) {
          const viewport = scrollEl.clientWidth;
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
          const finalWidth = Math.round(baseDayWidth * endScale);
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
    [zoomIndex, todayIdx, baseDayWidth]
  );

  useEffect(() => {
    return () => {
      if (zoomAnimationRef.current != null) {
        cancelAnimationFrame(zoomAnimationRef.current);
      }
    };
  }, []);

  const zoomIn = () => {
    if (zoomIndex < ZOOM_LEVELS.length - 1) animateZoomTo(zoomIndex + 1);
  };
  const zoomOut = () => {
    if (zoomIndex > 0) animateZoomTo(zoomIndex - 1);
  };

  const goToToday = () => {
    // Pin today's column to the far left of the timeline (no lead-in days).
    jumpToDate(today, { daysBefore: 0 });
    try {
      localStorage.setItem('bookings-calendar:lastDate', today.toISOString());
    } catch {
      // ignore
    }
  };

  const togglePropertyCol = () => {
    setPropertyColCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('multi-calendar:listingsCollapsed', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
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

  const onSelectBooking = useCallback((booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setDetailsOpen(true);
  }, []);

  const onToggleCleaning = useCallback(
    (task: CleaningTaskWithDetails, anchor: CleaningPopoverAnchor) => {
      if (activeCleaningTaskId === task.id) {
        setActiveCleaningTaskId(null);
        setCleaningPopoverAnchor(null);
      } else {
        setActiveCleaningTaskId(task.id);
        setCleaningPopoverAnchor(anchor);
      }
    },
    [activeCleaningTaskId]
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
                Multi Calendar
              </h1>
              <Breadcrumb className="mt-1">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Multi Calendar</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <CalendarToolbar
              startDate={filterStartDate}
              endDate={filterEndDate}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
              showAvailableOnly={showAvailableOnly}
              onShowAvailableOnlyChange={setShowAvailableOnly}
              showOccupancy={showOccupancy}
              onShowOccupancyChange={setShowOccupancy}
              datePreset={datePreset}
              onDatePresetChange={handleDatePresetChange}
              selectedPropertyId={selectedPropertyId}
              onSelectedPropertyIdChange={setSelectedPropertyId}
              showCancelled={showCancelled}
              onShowCancelledChange={setShowCancelled}
              apartments={apartments}
              isPhone={isPhone}
              zoomIndex={zoomIndex}
              isZooming={isZooming}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              zoomLabelRef={zoomLabelRef}
              summaryText={summaryText}
            />
          </div>

          <div className="border border-gray-200 rounded-lg bg-white">
            <button
              type="button"
              onClick={() => setLegendOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2 text-left text-xs font-medium text-gray-600 hover:bg-gray-50"
              aria-expanded={legendOpen}
            >
              <span>Legend</span>
              {legendOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {legendOpen && (
              <div className="px-4 pb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-2">
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
                <span className="text-xs text-gray-400 ml-1">
                  Tap a day cell to add a clean
                </span>
              </div>
            )}
          </div>

          {error && !loading && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-red-800">{error}</p>
              <Button variant="outline" size="sm" onClick={retry} className="shrink-0">
                Retry
              </Button>
            </div>
          )}

          {loading ? (
            <TimelineSkeleton propertyColWidth={propertyColWidth} />
          ) : (
            <div className="flex flex-col flex-1 min-h-0 gap-3">
              <div className="border border-gray-200 rounded-lg bg-white px-3 py-2 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth(-1)}
                  aria-label="Previous month"
                  className="h-10 w-10 rounded-md border-gray-300"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2 sm:gap-3">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    {format(displayMonth, 'MMMM yyyy')}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className="h-10 text-xs sm:text-sm"
                  >
                    Today
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth(1)}
                  aria-label="Next month"
                  className="h-10 w-10 rounded-md border-gray-300"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-1 min-h-[50dvh] max-h-[calc(100dvh-220px)]">
                {/* Frozen listings column — outside horizontal scroll so it never covers the app sidebar */}
                <div
                  className="shrink-0 flex flex-col border-r border-gray-200 bg-white z-[1]"
                  style={{ width: propertyColWidth }}
                >
                  <div
                    className="shrink-0 border-b border-gray-200 px-2 sm:px-3 py-2 flex items-center gap-1 bg-white"
                    style={{ height: 48 }}
                  >
                    <button
                      type="button"
                      onClick={togglePropertyCol}
                      aria-label={
                        propertyColCollapsed
                          ? 'Expand listings column'
                          : 'Collapse listings column'
                      }
                      className="inline-flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 touch-manipulation"
                    >
                      {propertyColCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronLeft className="w-4 h-4" />
                      )}
                    </button>
                    {!propertyColCollapsed && (
                      <span className="text-xs font-medium text-gray-500">Listings</span>
                    )}
                  </div>
                  <div
                    ref={propertyScrollRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {visibleProperties.map((property) => (
                      <PropertyLabel
                        key={property.id}
                        property={property}
                        propertyColCollapsed={propertyColCollapsed}
                        showOccupancy={showOccupancy}
                        occupancy={occupancyByProperty.get(property.id) ?? null}
                      />
                    ))}
                  </div>
                </div>

                {/* Timeline scrolls horizontally + vertically; vertical scroll syncs with listings */}
                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="relative min-w-0 flex-1 overflow-auto overscroll-x-contain"
                >
                  <div
                    ref={gridInnerRef}
                    style={{
                      minWidth: gridMinWidth,
                      ['--day-width' as string]: `${dayColWidth}px`,
                    }}
                    className="relative"
                  >
                    <TimelineHeader timelineDays={timelineDays} today={today} />

                    {visibleProperties.length === 0 ? (
                      <div className="px-6 py-16 text-center text-gray-500 text-sm">
                        {showAvailableOnly
                          ? 'No available listings in the selected date range.'
                          : 'No properties with bookings found.'}
                      </div>
                    ) : (
                      visibleProperties.map((property) => (
                        <PropertyRow
                          key={property.id}
                          property={property}
                          propertyBookings={bookingsByProperty.get(property.id) ?? []}
                          cleaningMarkers={cleaningTasksByProperty.get(property.id) ?? []}
                          rangeStart={rangeStart}
                          rangeEnd={rangeEnd}
                          totalDays={totalDays}
                          todayIdx={todayIdx}
                          dayWidth={dayColWidth}
                          activeCleaningTaskId={activeCleaningTaskId}
                          onSelectBooking={onSelectBooking}
                          onAddClean={openAddClean}
                          onToggleCleaning={onToggleCleaning}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <BookingDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          booking={selectedBooking}
        />

        <AddCleaningDialog
          open={addCleanOpen}
          onOpenChange={setAddCleanOpen}
          propertyId={addCleanPropertyId}
          apartments={apartments}
          date={addCleanDate}
          onDateChange={setAddCleanDate}
          taskType={addCleanType}
          onTaskTypeChange={setAddCleanType}
          bookingId={addCleanBookingId}
          onBookingIdChange={setAddCleanBookingId}
          cleanerId={addCleanCleanerId}
          onCleanerIdChange={setAddCleanCleanerId}
          overlappingBookings={overlappingBookingsForAdd}
          cleaners={cleaners}
          adding={addingClean}
          onSubmit={handleCreateClean}
        />

        {activeCleaningTask && cleaningPopoverAnchor && (
          <CleaningPopover
            task={activeCleaningTask}
            anchor={cleaningPopoverAnchor}
            cleaners={cleaners}
            updatingStatusId={updatingCleaningTaskId}
            assigningId={assigningCleaningTaskId}
            savingId={savingTaskId}
            deletingId={deletingTaskId}
            onClose={() => {
              setActiveCleaningTaskId(null);
              setCleaningPopoverAnchor(null);
            }}
            onStatusChange={handleCleaningStatusChange}
            onAssign={handleCleaningAssign}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
