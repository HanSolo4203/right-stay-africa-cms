'use client';

import { memo, useCallback, useMemo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { BookingWithDetails, PropertyWithBookings } from '@/lib/queries/bookings';
import type { CleaningTaskWithDetails } from '@/lib/queries/cleaning';
import { BookingBar } from './BookingBar';
import { DayCleaningGroup } from './CleaningMarker';
import {
  computeShortGaps,
  dayIndexFromPointer,
  getPropertyDisplayName,
  getPropertyUnitNumber,
  getTimelineSpan,
  ROW_HEIGHT,
  TODAY_COLUMN_COLOR,
  type BookingSpan,
  type CleaningTaskMarker,
} from './calendar-utils';

interface PropertyLabelProps {
  property: PropertyWithBookings;
  propertyColCollapsed: boolean;
  showOccupancy: boolean;
  occupancy: number | null;
}

function PropertyLabelComponent({
  property,
  propertyColCollapsed,
  showOccupancy,
  occupancy,
}: PropertyLabelProps) {
  const propertyName = getPropertyDisplayName(property);
  const unitNumber = getPropertyUnitNumber(property);

  return (
    <div
      className="w-full border-b border-gray-200 bg-white px-2 sm:px-3 py-2 flex flex-col justify-center"
      style={{ height: ROW_HEIGHT, minHeight: ROW_HEIGHT }}
    >
      {propertyColCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs font-semibold text-gray-900 truncate text-center">
              {propertyName.slice(0, 1)}
            </p>
          </TooltipTrigger>
          <TooltipContent side="right">{propertyName}</TooltipContent>
        </Tooltip>
      ) : (
        <>
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
          {showOccupancy && occupancy != null && (
            <p className="text-[10px] text-teal-700 font-medium mt-0.5 tabular-nums">
              {occupancy}% occ.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export const PropertyLabel = memo(PropertyLabelComponent);

interface PropertyRowProps {
  property: PropertyWithBookings;
  propertyBookings: BookingWithDetails[];
  cleaningMarkers: CleaningTaskMarker[];
  rangeStart: Date;
  rangeEnd: Date;
  totalDays: number;
  todayIdx: number;
  dayWidth: number;
  activeCleaningTaskId: string | null;
  onSelectBooking: (booking: BookingWithDetails) => void;
  onAddClean: (propertyId: string, dayIdx: number) => void;
  onToggleCleaning: (
    task: CleaningTaskWithDetails,
    anchor: { x: number; y: number }
  ) => void;
}

function PropertyRowComponent({
  property,
  propertyBookings,
  cleaningMarkers,
  rangeStart,
  rangeEnd,
  totalDays,
  todayIdx,
  dayWidth,
  activeCleaningTaskId,
  onSelectBooking,
  onAddClean,
  onToggleCleaning,
}: PropertyRowProps) {
  const propertyName = getPropertyDisplayName(property);

  const spans = useMemo(
    () =>
      propertyBookings
        .map((b) => getTimelineSpan(b, rangeStart, rangeEnd))
        .filter((s): s is BookingSpan => s !== null),
    [propertyBookings, rangeStart, rangeEnd]
  );

  const gapMarkers = useMemo(
    () => computeShortGaps(propertyBookings, rangeStart, rangeEnd),
    [propertyBookings, rangeStart, rangeEnd]
  );

  const markersByDay = useMemo(() => {
    const map = new Map<number, CleaningTaskMarker[]>();
    for (const marker of cleaningMarkers) {
      const list = map.get(marker.dayIdx);
      if (list) list.push(marker);
      else map.set(marker.dayIdx, [marker]);
    }
    return map;
  }, [cleaningMarkers]);

  const handleGridClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (
        target.closest('[data-cleaning-indicator]') ||
        target.closest('[data-booking-bar]') ||
        target.closest('button')
      ) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const idx = dayIndexFromPointer(event.clientX, rect.left, 0, dayWidth, totalDays);
      if (idx != null) onAddClean(property.id, idx);
    },
    [dayWidth, totalDays, onAddClean, property.id]
  );

  return (
    <div
      className="relative border-b border-gray-200"
      style={{
        width: `calc(var(--day-width) * ${totalDays})`,
        height: ROW_HEIGHT,
        minHeight: ROW_HEIGHT,
      }}
      role="grid"
      aria-label={`${propertyName} timeline`}
      onClick={handleGridClick}
    >
      <div className="absolute inset-0 flex pointer-events-none">
        {Array.from({ length: totalDays }, (_, idx) => (
          <div
            key={idx}
            className="shrink-0 border-l border-gray-100 h-full"
            style={{
              width: 'var(--day-width)',
              backgroundColor: idx === todayIdx ? TODAY_COLUMN_COLOR : undefined,
            }}
          />
        ))}
      </div>

      {gapMarkers.map(({ dayIdx }) => (
        <div
          key={`gap-${property.id}-${dayIdx}`}
          className="absolute top-[22px] z-[6] pointer-events-none"
          style={{
            left: `calc((${dayIdx} + 0.5) * var(--day-width))`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span className="block w-2 h-0.5 rounded-full bg-[#f59e0b]" />
        </div>
      ))}

      {spans.map(({ booking, startIdx, endIdx, clippedStart, clippedEnd }) => (
        <BookingBar
          key={booking.id}
          booking={booking}
          startIdx={startIdx}
          endIdx={endIdx}
          clippedStart={clippedStart}
          clippedEnd={clippedEnd}
          onSelect={onSelectBooking}
        />
      ))}

      {Array.from(markersByDay.entries()).map(([dayIdx, markers]) => (
        <DayCleaningGroup
          key={`clean-${property.id}-${dayIdx}`}
          dayIdx={dayIdx}
          markers={markers}
          dayWidth={dayWidth}
          activeCleaningTaskId={activeCleaningTaskId}
          onToggle={onToggleCleaning}
        />
      ))}
    </div>
  );
}

export const PropertyRow = memo(PropertyRowComponent);
