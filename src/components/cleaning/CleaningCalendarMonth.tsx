'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getCalendarCells, getCurrentMonthKey } from '@/lib/cleaning-month';
import {
  capacityBadgeClasses,
  capacityTone,
  formatBookedCapacity,
  overflowHoursLabel,
} from '@/lib/cleaning-capacity-ui';
import {
  getPropertyDisplayName,
  type CleaningTaskWithDetails,
} from '@/lib/queries/cleaning';
import type { CleaningDayCapacity } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CleaningCalendarMonthProps {
  monthKey: string;
  tasks: CleaningTaskWithDetails[];
  capacityByDate?: Record<string, CleaningDayCapacity>;
  today?: string;
  onSelectDate?: (date: string) => void;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CleaningCalendarMonth({
  monthKey,
  tasks,
  capacityByDate = {},
  today,
  onSelectDate,
}: CleaningCalendarMonthProps) {
  const [currentMonthKey, setCurrentMonthKey] = useState<string | null>(null);
  useEffect(() => {
    setCurrentMonthKey(getCurrentMonthKey());
  }, []);

  const cells = getCalendarCells(monthKey);
  const byDate = new Map<string, CleaningTaskWithDetails[]>();
  for (const task of tasks) {
    const list = byDate.get(task.scheduled_date) ?? [];
    list.push(task);
    byDate.set(task.scheduled_date, list);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-600 text-center"
            >
              {name}
            </div>
          ))}
          {cells.map((cell, index) => {
            if (!cell.date) {
              return <div key={`empty-${index}`} className="bg-white min-h-[110px]" />;
            }
            const dayTasks = byDate.get(cell.date) ?? [];
            const capacity = capacityByDate[cell.date];
            const tone = capacity ? capacityTone(capacity) : 'neutral';
            const isToday = Boolean(today && cell.date === today);
            return (
              <button
                type="button"
                key={cell.date}
                onClick={() => onSelectDate?.(cell.date!)}
                className={cn(
                  'bg-white min-h-[110px] p-1.5 flex flex-col gap-1 text-left hover:bg-gray-50 transition-colors',
                  isToday && 'ring-2 ring-inset ring-blue-500'
                )}
              >
                <div className="flex items-center justify-between px-0.5 gap-1">
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      isToday ? 'text-blue-700' : 'text-gray-700'
                    )}
                  >
                    {cell.dayNumber}
                  </span>
                  {capacity && capacity.booked_minutes > 0 && (
                    <span
                      className={cn(
                        'text-[10px] px-1 py-0.5 rounded border font-medium whitespace-nowrap',
                        capacityBadgeClasses(tone)
                      )}
                    >
                      {formatBookedCapacity(capacity)}
                    </span>
                  )}
                </div>
                {capacity && capacity.overflow_minutes > 0 && (
                  <div className="text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 rounded px-1 py-0.5">
                    Extra cleaner needed: {overflowHoursLabel(capacity.overflow_minutes)}
                  </div>
                )}
                <div className="space-y-1 overflow-hidden">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        'rounded px-1.5 py-1 text-[10px] leading-tight border',
                        task.task_type === 'checkout_clean'
                          ? 'bg-orange-50 border-orange-200 text-orange-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      )}
                      title={`${getPropertyDisplayName(task)} · ${task.cleaner_name ?? 'Unassigned'}`}
                    >
                      <div className="font-medium truncate">
                        {task.task_type === 'checkout_clean' ? 'Checkout' : 'Mid-stay'}
                        {task.duration_minutes != null
                          ? ` · ${Math.round(task.duration_minutes / 6) / 10}h`
                          : ''}
                      </div>
                      <div className="truncate opacity-80">{getPropertyDisplayName(task)}</div>
                      <div className="truncate opacity-70">
                        {task.cleaner_name ?? 'Unassigned'}
                      </div>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-[10px] text-gray-500 px-1">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <Badge className="bg-orange-100 text-orange-900 border-orange-200 hover:bg-orange-100">
            Checkout Clean
          </Badge>
          <Badge className="bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100">
            Mid-Stay Clean
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
            &lt;80% capacity
          </Badge>
          <Badge className="bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100">
            80–100%
          </Badge>
          <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
            Over capacity
          </Badge>
          {currentMonthKey && monthKey === currentMonthKey && (
            <span className="text-xs text-gray-500 self-center">Blue ring = today</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
