'use client';

import { format, getDay, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { TODAY_COLUMN_COLOR, WEEKDAY_LABELS } from './calendar-utils';

interface TimelineHeaderProps {
  timelineDays: Date[];
  today: Date;
}

export function TimelineHeader({ timelineDays, today }: TimelineHeaderProps) {
  return (
    <div className="flex sticky top-0 z-20 bg-white border-b border-gray-200">
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
              height: 48,
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
  );
}
