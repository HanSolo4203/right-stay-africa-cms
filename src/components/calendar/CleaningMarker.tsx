'use client';

import { memo, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CleaningTaskWithDetails } from '@/lib/queries/cleaning';
import {
  formatDisplayDate,
  getCleanerInitials,
  getTaskTypeLabel,
  type CleaningTaskMarker,
} from './calendar-utils';

interface DayCleaningGroupProps {
  dayIdx: number;
  markers: CleaningTaskMarker[];
  dayWidth: number;
  activeCleaningTaskId: string | null;
  onToggle: (task: CleaningTaskWithDetails, anchor: { x: number; y: number }) => void;
}

function MarkerButton({
  task,
  isPopoverOpen,
  onToggle,
}: {
  task: CleaningTaskWithDetails;
  isPopoverOpen: boolean;
  onToggle: (task: CleaningTaskWithDetails, anchor: { x: number; y: number }) => void;
}) {
  const isCompleted = task.status === 'completed';
  const isCheckout = task.task_type === 'checkout_clean';
  const isUnassigned = !task.assigned_cleaner_id;
  const initials = task.cleaner_name ? getCleanerInitials(task.cleaner_name) : null;

  return (
    <button
      type="button"
      data-cleaning-indicator
      aria-label={`${getTaskTypeLabel(task.task_type)} on ${formatDisplayDate(task.scheduled_date)}${task.cleaner_name ? ` — ${task.cleaner_name}` : ' — unassigned'}`}
      aria-expanded={isPopoverOpen}
      onClick={(event) => {
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        onToggle(task, {
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      }}
      className={cn(
        'flex items-center justify-center min-w-5 min-h-5 touch-manipulation rounded-full border shadow-sm',
        'hover:scale-110 transition-transform cursor-pointer',
        isCompleted
          ? 'bg-green-100 border-green-400 text-green-700 px-0.5'
          : isUnassigned
            ? 'bg-amber-50 border-amber-400 text-amber-800'
            : isCheckout
              ? 'bg-red-50 border-red-300 text-[11px]'
              : 'bg-amber-50 border-amber-300 text-[9px] font-bold text-amber-800'
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
    </button>
  );
}

function DayCleaningGroupComponent({
  dayIdx,
  markers,
  dayWidth,
  activeCleaningTaskId,
  onToggle,
}: DayCleaningGroupProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);

  // Rough fit: each marker ~22px + gap; leave room for +N chip
  const maxVisible = useMemo(() => {
    const usable = Math.max(22, dayWidth - 4);
    const count = Math.floor(usable / 22);
    return Math.max(1, count);
  }, [dayWidth]);

  const needsOverflow = markers.length > maxVisible;
  const visible = needsOverflow ? markers.slice(0, 1) : markers;
  const overflowCount = needsOverflow ? markers.length - 1 : 0;

  return (
    <div
      className="absolute bottom-1 z-20 flex items-center justify-center gap-0.5"
      style={{
        left: `calc(${dayIdx} * var(--day-width))`,
        width: 'var(--day-width)',
      }}
    >
      {visible.map((marker) => (
        <MarkerButton
          key={marker.task.id}
          task={marker.task}
          isPopoverOpen={activeCleaningTaskId === marker.task.id}
          onToggle={onToggle}
        />
      ))}
      {needsOverflow && (
        <div className="relative">
          <button
            type="button"
            data-cleaning-indicator
            aria-label={`${overflowCount} more cleanings`}
            onClick={(event) => {
              event.stopPropagation();
              setOverflowOpen((open) => !open);
            }}
            className="min-w-5 min-h-5 px-1 rounded-full border border-gray-300 bg-white text-[9px] font-semibold text-gray-700 shadow-sm"
          >
            +{overflowCount}
          </button>
          {overflowOpen && (
            <div
              data-cleaning-indicator
              className="absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2 rounded-md border border-gray-200 bg-white p-1.5 shadow-lg flex flex-col gap-1 min-w-[2.5rem]"
              onClick={(e) => e.stopPropagation()}
            >
              {markers.slice(1).map((marker) => (
                <MarkerButton
                  key={marker.task.id}
                  task={marker.task}
                  isPopoverOpen={activeCleaningTaskId === marker.task.id}
                  onToggle={(task, anchor) => {
                    setOverflowOpen(false);
                    onToggle(task, anchor);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const DayCleaningGroup = memo(DayCleaningGroupComponent);

interface CleaningMarkerProps {
  marker: CleaningTaskMarker;
  activeCleaningTaskId: string | null;
  onToggle: (task: CleaningTaskWithDetails, anchor: { x: number; y: number }) => void;
}

/** Single marker export kept for compatibility with the requested file name. */
function CleaningMarkerComponent({
  marker,
  activeCleaningTaskId,
  onToggle,
}: CleaningMarkerProps) {
  return (
    <MarkerButton
      task={marker.task}
      isPopoverOpen={activeCleaningTaskId === marker.task.id}
      onToggle={onToggle}
    />
  );
}

export const CleaningMarker = memo(CleaningMarkerComponent);
