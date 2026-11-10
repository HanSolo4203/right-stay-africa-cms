'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getBookingsWithDetails,
  getPropertiesWithBookings,
  type BookingWithDetails,
  type PropertyWithBookings,
} from '@/lib/queries/bookings';
import {
  getCleaningTasksWithDetails,
  type CleaningTaskWithDetails,
} from '@/lib/queries/cleaning';
import { createClientComponentClient } from '@/lib/supabase';
import { toDateString } from './calendar-utils';
import toast from 'react-hot-toast';

export interface UseCalendarDataParams {
  rangeStart: Date;
  rangeEnd: Date;
  selectedPropertyId: string;
  showCancelled: boolean;
}

export function useCalendarData({
  rangeStart,
  rangeEnd,
  selectedPropertyId,
  showCancelled,
}: UseCalendarDataParams) {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [cleaningTasks, setCleaningTasks] = useState<CleaningTaskWithDetails[]>([]);
  const [apartments, setApartments] = useState<PropertyWithBookings[]>([]);
  const [cleaners, setCleaners] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const hasLoadedOnce = useRef(false);
  const requestIdRef = useRef(0);
  const cleanersLoadedRef = useRef(false);

  const retry = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const loadCleanersOnce = useCallback(async () => {
    if (cleanersLoadedRef.current) return;
    try {
      const res = await fetch('/api/cleaners');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success || json.data) {
        setCleaners(json.data ?? []);
        cleanersLoadedRef.current = true;
      }
    } catch {
      // non-fatal — assign UI can still open empty
    }
  }, []);

  useEffect(() => {
    loadCleanersOnce();
  }, [loadCleanersOnce]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const run = async () => {
      try {
        if (!hasLoadedOnce.current) setLoading(true);
        setError(null);

        const supabase = createClientComponentClient();
        const properties = await getPropertiesWithBookings(supabase);

        if (cancelled || requestId !== requestIdRef.current) return;
        setApartments(properties);

        if (properties.length === 0) {
          setBookings([]);
          setCleaningTasks([]);
          return;
        }

        const propertyIds = new Set(properties.map((property) => property.id));
        const [data, taskData] = await Promise.all([
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
        ]);

        if (cancelled || requestId !== requestIdRef.current) return;

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
        if (cancelled || requestId !== requestIdRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to load bookings';
        setError(message);
        toast.error(`${message}. Use Retry to try again.`, {
          id: 'calendar-load-error',
        });
        // Keep existing bookings/tasks on refresh failure
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setLoading(false);
          hasLoadedOnce.current = true;
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [rangeStart, rangeEnd, selectedPropertyId, showCancelled, refreshKey]);

  return {
    bookings,
    setBookings,
    cleaningTasks,
    setCleaningTasks,
    apartments,
    cleaners,
    loading,
    error,
    retry,
    hasLoadedOnce: hasLoadedOnce.current,
  };
}
