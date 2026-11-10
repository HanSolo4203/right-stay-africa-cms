'use client';

import { format, getDay, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TODAY_COLUMN_COLOR, WEEKDAY_LABELS } from './calendar-utils';

interface TimelineHeaderProps {
  timelineDays: Date[];
  today: Date;
  propertyColWidth: number;
  propertyColCollapsed: boolean;
  onTogglePropertyCol: () => void;
}

export function TimelineHeader({
  timelineDays,
  today,
  propertyColWidth,
  propertyColCollapsed,
  onTogglePropertyCol,
}: TimelineHeaderProps) {
  return (
    <div className="flex sticky top-0 z-30 bg-white border-b border-gray-200">
      <div
        className="shrink-0 sticky left-0 z-50 bg-white border-r border-gray-200 px-2 sm:px-3 py-2 flex items-center gap-1"
        style={{ width: propertyColWidth }}
      >
        <button
          type="button"
          onClick={onTogglePropertyCol}
          aria-label={propertyColCollapsed ? 'Expand listings column' : 'Collapse listings column'}
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

      <div className="flex relative">
        {timelineDays.map((date, idx) => {
          const isToday = isSameDay(date, today);
          const isMonthStart = date.getDate() === 1;
          const weekday = WEEKDAY_LABELS[getDay(date)];

          return (
            <div
              key={idx}
              className={cn(
                'shrink-0 flex flex-col items-center justify-center py-1.5 border-l border-gray-100',
                isMonthStart && 'border-l-gray-300'
              )}
              style={{
                width: 'var(--day-width)',
                backgroundColor: isToday ? TODAY_COLUMN_COLOR : undefined,
              }}
            >
              {isMonthStart && (
                <span className="text-[9px] font-semibold text-gray-400 uppercase leading-none mb-0.5">
                  {format(date, 'MMM')}
                </span>
              )}
              <span
                className={cn(
                  'text-[12px] font-semibold leading-none',
                  isToday ? 'text-teal-900' : 'text-gray-800'
                )}
              >
                {date.getDate()}
              </span>
              <span className="text-[10px] text-gray-500 mt-0.5 leading-none">{weekday}</span>
            </div>
          );
        })}

      </div>
    </div>
  );
}
