'use client';

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { Check, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import {
  addMonths,
  endOfMonth,
  format,
  getDay,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from './button';
import { CalendarSkeleton } from './LoadingSkeleton';
import { BookingDetailsDialog } from '@/components/calendar/BookingDetailsDialog';
import { AddCleaningDialog } from '@/components/calendar/AddCleaningDialog';
import { CleaningPopover } from '@/components/calendar/CleaningPopover';
import { useCalendarData } from '@/components/calendar/useCalendarData';
import type { BookingWithDetails } from '@/lib/queries/bookings';
import {
  getPropertyDisplayName as getCleaningPropertyDisplayName,
  type CleaningTaskStatus,
  type CleaningTaskType,
  type CleaningTaskWithDetails,
} from '@/lib/queries/cleaning';
import {
  CLEANING_LEGEND_ITEMS,
  getChannelColor,
  getChannelInitial,
  getCleanerInitials,
  getGuestFullName,
  getPropertyDisplayName,
  getTaskTypeLabel,
  isCancelled,
  LEGEND_ITEMS,
  parseLocalDate,
  toDateString,
  type CleaningPopoverAnchor,
} from '@/components/calendar/calendar-utils';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const locales: Record<string, unknown> = {};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type CalendarEventKind = 'booking' | 'cleaning';

type CalendarEventItem = {
  id: string;
  title: string;
  allDay: boolean;
  start: Date;
  end: Date;
  resource: {
    kind: CalendarEventKind;
    booking?: BookingWithDetails;
    task?: CleaningTaskWithDetails;
  };
};

function BookingEventChip({ booking }: { booking: BookingWithDetails }) {
  const cancelled = isCancelled(booking.booking_status);
  const channelName = booking.booking_channels?.name;
  const guestName = getGuestFullName(booking.guests?.name);
  const propertyName = getPropertyDisplayName(booking.apartments);
  const initial = getChannelInitial(channelName);

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-1 h-full min-h-[18px] text-[10px] sm:text-[11px] font-medium leading-tight',
        cancelled && 'line-through opacity-80'
      )}
      title={`${propertyName} · ${guestName}`}
    >
      <span
        className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full border border-white/80 text-[8px] font-bold bg-black/15"
        aria-hidden
      >
        {initial}
      </span>
      <span className="truncate min-w-0">
        <span className="opacity-90">{propertyName}</span>
        <span className="opacity-70"> · </span>
        {guestName}
      </span>
    </div>
  );
}

function CleaningEventChip({ task }: { task: CleaningTaskWithDetails }) {
  const isCompleted = task.status === 'completed';
  const isCheckout = task.task_type === 'checkout_clean';
  const isUnassigned = !task.assigned_cleaner_id;
  const initials = task.cleaner_name ? getCleanerInitials(task.cleaner_name) : null;
  const propertyName = getCleaningPropertyDisplayName(task);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-0.5 h-full min-h-[18px] text-[10px] font-semibold leading-none',
        isCompleted && 'text-green-700',
        !isCompleted && isUnassigned && 'text-amber-800',
        !isCompleted && !isUnassigned && isCheckout && 'text-red-700',
        !isCompleted && !isUnassigned && !isCheckout && 'text-amber-800'
      )}
      title={`${getTaskTypeLabel(task.task_type)} · ${propertyName}${task.cleaner_name ? ` · ${task.cleaner_name}` : ' · unassigned'}`}
    >
      <span
        className={cn(
          'flex items-center justify-center min-w-5 min-h-5 rounded-full border shadow-sm',
          isCompleted
            ? 'bg-green-100 border-green-400'
            : isUnassigned
              ? 'bg-amber-50 border-amber-400'
              : isCheckout
                ? 'bg-red-50 border-red-300'
                : 'bg-amber-50 border-amber-300'
        )}
      >
        {isCompleted ? (
          <span className="flex flex-col items-center leading-none">
            <Check className="w-2.5 h-2.5" strokeWidth={3} />
            {initials && <span className="text-[7px] font-bold">{initials}</span>}
          </span>
        ) : isUnassigned ? (
          <span className="text-[10px] font-bold leading-none">!</span>
        ) : isCheckout ? (
          <span className="flex flex-col items-center leading-none py-0.5">
            <span aria-hidden className="text-[10px]">
              🧹
            </span>
            {initials && <span className="text-[7px] font-bold">{initials}</span>}
          </span>
        ) : (
          <span className="flex flex-col items-center leading-none py-0.5">
            <span aria-hidden className="text-[8px]">
              MID
            </span>
            {initials && <span className="text-[7px] font-bold">{initials}</span>}
          </span>
        )}
      </span>
      <span className="truncate max-w-[7rem] sm:max-w-[10rem]">{propertyName}</span>
    </div>
  );
}

function EventComponent({ event }: { event: CalendarEventItem }) {
  if (event.resource.kind === 'booking' && event.resource.booking) {
    return <BookingEventChip booking={event.resource.booking} />;
  }
  if (event.resource.kind === 'cleaning' && event.resource.task) {
    return <CleaningEventChip task={event.resource.task} />;
  }
  return <span className="truncate text-[11px] px-1">{event.title}</span>;
}

function CustomToolbar({
  label,
  onNavigate,
  onView,
  currentView,
  onAdd,
  apartments,
  selectedPropertyId,
  onPropertyChange,
  showCancelled,
  onShowCancelledChange,
}: {
  label: string;
  onNavigate: (direction: 'PREV' | 'NEXT' | 'TODAY') => void;
  onView: (view: View) => void;
  currentView: View;
  onAdd: () => void;
  apartments: { id: string; label: string }[];
  selectedPropertyId: string;
  onPropertyChange: (id: string) => void;
  showCancelled: boolean;
  onShowCancelledChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 mb-4 p-3 sm:p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between sm:justify-start">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mr-3 sm:mr-4">
            {label}
          </h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('PREV')}
              aria-label="Previous"
              className="h-10 w-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('TODAY')}
              className="whitespace-nowrap h-10"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('NEXT')}
              aria-label="Next"
              className="h-10 w-10"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-md p-1 overflow-x-auto whitespace-nowrap gap-1">
            {[
              { view: Views.MONTH, label: 'Month' },
              { view: Views.WEEK, label: 'Week' },
              { view: Views.DAY, label: 'Day' },
              { view: Views.AGENDA, label: 'Agenda' },
            ].map(({ view, label: viewLabel }) => (
              <Button
                key={view}
                variant={currentView === view ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onView(view)}
                className="text-xs sm:text-sm h-9"
              >
                {viewLabel}
              </Button>
            ))}
          </div>

          <Button onClick={onAdd} className="w-full sm:w-auto h-10">
            <Plus className="w-4 h-4 mr-2" />
            Add Clean
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <select
          value={selectedPropertyId}
          onChange={(e) => onPropertyChange(e.target.value)}
          className="w-full sm:w-auto min-w-[12rem] text-sm rounded-md border border-gray-200 px-3 py-2 bg-white min-h-10"
          aria-label="Filter by property"
        >
          <option value="all">All properties</option>
          {apartments.map((apt) => (
            <option key={apt.id} value={apt.id}>
              {apt.label}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 min-h-10 px-1">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => onShowCancelledChange(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show cancelled
        </label>
      </div>
    </div>
  );
}

export default function CalendarView() {
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');
  const [showCancelled, setShowCancelled] = useState(false);
  const [rangeStart, setRangeStart] = useState(() =>
    startOfMonth(subMonths(new Date(), 1))
  );
  const [rangeEnd, setRangeEnd] = useState(() => endOfMonth(addMonths(new Date(), 2)));

  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeCleaningTaskId, setActiveCleaningTaskId] = useState<string | null>(null);
  const [cleaningPopoverAnchor, setCleaningPopoverAnchor] =
    useState<CleaningPopoverAnchor | null>(null);
  const [updatingCleaningTaskId, setUpdatingCleaningTaskId] = useState<string | null>(null);
  const [assigningCleaningTaskId, setAssigningCleaningTaskId] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const [addCleanOpen, setAddCleanOpen] = useState(false);
  const [addCleanPropertyId, setAddCleanPropertyId] = useState<string | null>(null);
  const [addCleanDate, setAddCleanDate] = useState('');
  const [addCleanType, setAddCleanType] = useState<CleaningTaskType>('midstay_clean');
  const [addCleanBookingId, setAddCleanBookingId] = useState('');
  const [addCleanCleanerId, setAddCleanCleanerId] = useState('');
  const [addingClean, setAddingClean] = useState(false);

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

  useEffect(() => {
    try {
      const savedView = localStorage.getItem('calendar:lastView');
      const savedDate = localStorage.getItem('calendar:lastDate');
      const isNarrow = window.matchMedia('(max-width: 639px)').matches;

      if (isNarrow) {
        setCurrentView(Views.AGENDA);
      } else if (savedView) {
        setCurrentView(savedView as View);
      }

      if (savedDate) {
        const parsed = new Date(savedDate);
        if (!Number.isNaN(parsed.getTime())) {
          setCurrentDate(parsed);
          setRangeStart(startOfMonth(subMonths(parsed, 1)));
          setRangeEnd(endOfMonth(addMonths(parsed, 2)));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const syncRangeToDate = useCallback((date: Date) => {
    setRangeStart(startOfMonth(subMonths(date, 1)));
    setRangeEnd(endOfMonth(addMonths(date, 2)));
  }, []);

  const apartmentOptions = useMemo(
    () =>
      apartments.map((apt) => ({
        id: apt.id,
        label: getPropertyDisplayName(apt),
      })),
    [apartments]
  );

  const calendarEvents = useMemo(() => {
    const bookingEvents: CalendarEventItem[] = bookings.map((booking) => {
      const propertyName = getPropertyDisplayName(booking.apartments);
      const guestName = getGuestFullName(booking.guests?.name);
      return {
        id: `booking-${booking.id}`,
        title: `${propertyName} · ${guestName}`,
        allDay: true,
        start: parseLocalDate(booking.check_in_date),
        // Checkout is exclusive (same as Timeline nights model)
        end: parseLocalDate(booking.check_out_date),
        resource: { kind: 'booking' as const, booking },
      };
    });

    const cleaningEvents: CalendarEventItem[] = cleaningTasks.map((task) => {
      const day = parseLocalDate(task.scheduled_date);
      const propertyName = getCleaningPropertyDisplayName(task);
      return {
        id: `cleaning-${task.id}`,
        title: `${getTaskTypeLabel(task.task_type)} · ${propertyName}`,
        allDay: true,
        start: day,
        end: day,
        resource: { kind: 'cleaning' as const, task },
      };
    });

    return [...bookingEvents, ...cleaningEvents];
  }, [bookings, cleaningTasks]);

  const propertiesInView = useMemo(() => {
    const ids = new Set<string>();
    for (const booking of bookings) {
      if (booking.apartment_id) ids.add(booking.apartment_id);
    }
    for (const task of cleaningTasks) {
      ids.add(task.apartment_id);
    }
    return apartments.filter((apt) => ids.has(apt.id));
  }, [apartments, bookings, cleaningTasks]);

  const activeCleaningTask = useMemo(
    () => cleaningTasks.find((task) => task.id === activeCleaningTaskId) ?? null,
    [cleaningTasks, activeCleaningTaskId]
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
    (date?: Date) => {
      const dateStr = toDateString(date ?? currentDate);
      const propertyId =
        selectedPropertyId !== 'all' ? selectedPropertyId : (apartments[0]?.id ?? null);
      const overlapping = propertyId
        ? bookings.filter(
            (booking) =>
              booking.apartment_id === propertyId &&
              !isCancelled(booking.booking_status) &&
              booking.check_in_date <= dateStr &&
              booking.check_out_date >= dateStr
          )
        : [];
      setAddCleanPropertyId(propertyId);
      setAddCleanDate(dateStr);
      setAddCleanType('midstay_clean');
      setAddCleanBookingId(overlapping[0]?.id ?? '');
      setAddCleanCleanerId('');
      setAddCleanOpen(true);
      setActiveCleaningTaskId(null);
      setCleaningPopoverAnchor(null);
    },
    [apartments, bookings, currentDate, selectedPropertyId]
  );

  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      openAddClean(start);
    },
    [openAddClean]
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEventItem, e: SyntheticEvent) => {
      if (event.resource.kind === 'booking' && event.resource.booking) {
        setSelectedBooking(event.resource.booking);
        setDetailsOpen(true);
        setActiveCleaningTaskId(null);
        setCleaningPopoverAnchor(null);
        return;
      }

      if (event.resource.kind === 'cleaning' && event.resource.task) {
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        setActiveCleaningTaskId(event.resource.task.id);
        setCleaningPopoverAnchor({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
        setDetailsOpen(false);
        setSelectedBooking(null);
      }
    },
    []
  );

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    try {
      localStorage.setItem('calendar:lastView', String(view));
    } catch {
      // ignore
    }
  };

  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
    syncRangeToDate(date);
    try {
      localStorage.setItem('calendar:lastDate', date.toISOString());
    } catch {
      // ignore
    }
  };

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
                  completed_at: status === 'completed' ? new Date().toISOString() : null,
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

  const toolbar = useCallback(
    (props: {
      label: string;
      onNavigate: (direction: 'PREV' | 'NEXT' | 'TODAY') => void;
      onView: (view: View) => void;
    }) => (
      <CustomToolbar
        {...props}
        currentView={currentView}
        onAdd={() => openAddClean()}
        apartments={apartmentOptions}
        selectedPropertyId={selectedPropertyId}
        onPropertyChange={setSelectedPropertyId}
        showCancelled={showCancelled}
        onShowCancelledChange={setShowCancelled}
      />
    ),
    [apartmentOptions, currentView, openAddClean, selectedPropertyId, showCancelled]
  );

  const components = useMemo(
    () => ({
      event: EventComponent,
      toolbar,
    }),
    [toolbar]
  );

  if (loading && apartments.length === 0) {
    return (
      <div className="space-y-6">
        <CalendarSkeleton />
      </div>
    );
  }

  if (error && apartments.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center space-y-3">
        <p className="text-sm text-gray-700">{error}</p>
        <Button onClick={retry}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2 sm:p-4">
        <BigCalendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{
            height: 'min(75dvh, 900px)',
            minHeight: 420,
          }}
          view={currentView}
          date={currentDate}
          onView={handleViewChange}
          onNavigate={handleNavigate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          components={components}
          eventPropGetter={(event) => {
            if (event.resource.kind === 'cleaning') {
              return {
                className: 'rbc-cleaning-event',
                style: {
                  backgroundColor: 'transparent',
                  borderColor: 'transparent',
                  color: '#111827',
                  padding: 0,
                },
              };
            }

            const booking = event.resource.booking;
            if (!booking) return {};

            const cancelled = isCancelled(booking.booking_status);
            const bg = cancelled ? '#fecdd3' : getChannelColor(booking.booking_channels?.name);
            return {
              className: 'rbc-booking-event',
              style: {
                backgroundColor: bg,
                borderColor: bg,
                color: cancelled ? '#9f1239' : '#ffffff',
              },
            };
          }}
          popup
          showMultiDayTimes
          messages={{
            showMore: (count) => `+${count} more`,
          }}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Channel Legend</h3>
          <div className="flex flex-wrap gap-3">
            {LEGEND_ITEMS.filter((item) => item.type === 'channel').map((item) => (
              <div key={item.key} className="flex items-center gap-2 text-sm text-gray-700">
                <span
                  className="w-3.5 h-3.5 rounded-sm border border-black/10"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Cleaning Legend</h3>
          <div className="flex flex-wrap gap-4">
            {CLEANING_LEGEND_ITEMS.map((item) => (
              <div key={item.key} className="flex items-center gap-2 text-sm text-gray-700">
                <span
                  className="inline-flex items-center justify-center min-w-6 min-h-6 rounded-full border text-[11px]"
                  style={{ borderColor: item.color, backgroundColor: `${item.color}22` }}
                >
                  {item.key === 'checkout_clean' ? '🧹' : 'MID'}
                </span>
                {item.label}
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="inline-flex items-center justify-center min-w-6 min-h-6 rounded-full border border-amber-400 bg-amber-50 text-[10px] font-bold text-amber-800">
                !
              </span>
              Unassigned
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="inline-flex items-center justify-center min-w-6 min-h-6 rounded-full border border-green-400 bg-green-100 text-green-700">
                <Check className="w-3 h-3" strokeWidth={3} />
              </span>
              Completed
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Properties in view
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({propertiesInView.length})
            </span>
          </h3>
          {propertiesInView.length === 0 ? (
            <p className="text-sm text-gray-500">
              No bookings or cleaning tasks in this date range.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {propertiesInView.map((apartment) => (
                <div key={apartment.id} className="text-sm text-gray-700 truncate">
                  {getPropertyDisplayName(apartment)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BookingDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        booking={selectedBooking}
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

      <AddCleaningDialog
        open={addCleanOpen}
        onOpenChange={setAddCleanOpen}
        propertyId={addCleanPropertyId}
        apartments={apartments}
        onPropertyChange={(value) => {
          setAddCleanPropertyId(value);
          if (addCleanDate) {
            const overlapping = bookings.filter(
              (booking) =>
                booking.apartment_id === value &&
                !isCancelled(booking.booking_status) &&
                booking.check_in_date <= addCleanDate &&
                booking.check_out_date >= addCleanDate
            );
            setAddCleanBookingId(overlapping[0]?.id ?? '');
          }
        }}
        date={addCleanDate}
        onDateChange={(value) => {
          setAddCleanDate(value);
          if (addCleanPropertyId) {
            const overlapping = bookings.filter(
              (booking) =>
                booking.apartment_id === addCleanPropertyId &&
                !isCancelled(booking.booking_status) &&
                booking.check_in_date <= value &&
                booking.check_out_date >= value
            );
            setAddCleanBookingId(overlapping[0]?.id ?? '');
          }
        }}
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
    </div>
  );
}
