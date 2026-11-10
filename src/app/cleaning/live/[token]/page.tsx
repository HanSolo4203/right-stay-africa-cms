'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  buildMonthOptions,
  formatCleaningDate,
  formatClockTime,
  formatMonthLabel,
  getCalendarCells,
  getCurrentMonthKey,
  getTodayIsoDate,
  shiftMonthKey,
} from '@/lib/cleaning-month';
import { cn } from '@/lib/utils';

interface LiveTask {
  id: string;
  scheduled_date: string;
  task_type: 'checkout_clean' | 'midstay_clean';
  status: string;
  property_name: string;
  guest_name: string | null;
  nights: number;
  cleaner_name: string | null;
  booking_reference: string | null;
  notes: string | null;
  is_spillover: boolean;
}

type ViewMode = 'list' | 'calendar';

function TaskTypePill({ taskType }: { taskType: LiveTask['task_type'] }) {
  const isCheckout = taskType === 'checkout_clean';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none',
        isCheckout
          ? 'bg-orange-100 text-orange-900'
          : 'bg-amber-100 text-amber-900'
      )}
    >
      {isCheckout ? 'Checkout' : 'Mid-stay'}
    </span>
  );
}

function statusClass(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    case 'in_progress':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-green-50 text-green-800 border-green-200';
    case 'skipped':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function LiveTaskRow({ task, emphasize }: { task: LiveTask; emphasize?: boolean }) {
  return (
    <div
      className={cn(
        'border-b border-gray-100 last:border-0 px-2 py-1.5 sm:px-3 sm:py-2',
        emphasize && 'bg-blue-50/50'
      )}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <TaskTypePill taskType={task.task_type} />
            <p className="text-[12px] font-semibold text-gray-900 leading-tight truncate">
              {task.property_name}
            </p>
          </div>
          <p className="mt-0.5 text-[10px] text-gray-500 truncate pl-0.5">
            {task.guest_name ?? 'No guest'}
            {task.nights ? ` · ${task.nights}n` : ''}
            {' · '}
            <span className="capitalize">{task.status.replace(/_/g, ' ')}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          {task.cleaner_name ? (
            <p className="text-[11px] font-medium text-gray-900 leading-tight max-w-[88px] truncate">
              {task.cleaner_name}
            </p>
          ) : (
            <p className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 font-medium">
              <AlertTriangle className="w-3 h-3" />
              Open
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CleaningLiveContent() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = params.token;
  const monthFromUrl = searchParams.get('month');
  const monthKey = monthFromUrl && /^\d{4}-\d{2}$/.test(monthFromUrl)
    ? monthFromUrl
    : getCurrentMonthKey();
  const monthOptions = useMemo(() => buildMonthOptions(1, 2), []);

  const [tasks, setTasks] = useState<LiveTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [monthLabel, setMonthLabel] = useState(() => formatMonthLabel(monthKey));
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [currentMonthKey, setCurrentMonthKey] = useState<string | null>(null);

  useEffect(() => {
    setToday(getTodayIsoDate());
    setCurrentMonthKey(getCurrentMonthKey());
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams({ token, month: monthKey });
      const response = await fetch(`/api/cleaning/live?${qs}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Unable to load schedule');
      }
      setTasks(result.data.tasks ?? []);
      setMonthLabel(result.data.month_label ?? formatMonthLabel(monthKey));
      setUpdatedAt(result.data.generated_at ?? null);
    } catch (err) {
      setTasks([]);
      setError(err instanceof Error ? err.message : 'Unable to load schedule');
    } finally {
      setLoading(false);
    }
  }, [token, monthKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMonthChange = (next: string) => {
    router.replace(`/cleaning/live/${token}?month=${next}`);
  };

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, LiveTask[]>();
    for (const task of tasks) {
      const existing = groups.get(task.scheduled_date) ?? [];
      existing.push(task);
      groups.set(task.scheduled_date, existing);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  const calendarCells = useMemo(() => getCalendarCells(monthKey), [monthKey]);
  const tasksByDate = useMemo(() => {
    const map = new Map<string, LiveTask[]>();
    for (const task of tasks) {
      if (task.is_spillover) continue;
      const list = map.get(task.scheduled_date) ?? [];
      list.push(task);
      map.set(task.scheduled_date, list);
    }
    return map;
  }, [tasks]);

  const spilloverTasks = useMemo(
    () => tasks.filter((t) => t.is_spillover),
    [tasks]
  );

  return (
    <div className="min-h-screen bg-gray-50 -mt-8 -mb-8">
      {/* Compact sticky toolbar */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate leading-tight">
                  Cleaning Schedule
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate leading-tight" suppressHydrationWarning>
                  {monthLabel}
                  {updatedAt ? ` · ${formatClockTime(updatedAt)}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <List className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode('calendar')}
                aria-label="Calendar view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => void load()}
                disabled={loading}
                aria-label="Refresh"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => handleMonthChange(shiftMonthKey(monthKey, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Select value={monthKey} onValueChange={handleMonthChange}>
              <SelectTrigger className="h-8 flex-1 min-w-0 text-sm">
                <SelectValue placeholder={formatMonthLabel(monthKey)} />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                    {currentMonthKey && opt.value === currentMonthKey ? ' (Current)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => handleMonthChange(shiftMonthKey(monthKey, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 px-2 text-xs shrink-0"
              onClick={() => handleMonthChange(getCurrentMonthKey())}
            >
              Today
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-2 sm:px-6 py-3 sm:py-5 pb-8">
        {error ? (
          <Card>
            <CardContent className="py-10 text-center text-red-600 flex flex-col items-center gap-2 text-sm">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            <span className="ml-2 text-sm text-gray-600">Loading…</span>
          </div>
        ) : viewMode === 'calendar' ? (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardContent className="p-1.5 sm:p-4">
                <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-md overflow-hidden border border-gray-200">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div
                      key={`${d}-${i}`}
                      className="bg-gray-50 px-0.5 py-1 text-[10px] font-semibold text-gray-600 text-center sm:text-xs sm:py-2"
                    >
                      <span className="sm:hidden">{d}</span>
                      <span className="hidden sm:inline">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                      </span>
                    </div>
                  ))}
                  {calendarCells.map((cell, index) => {
                    if (!cell.date) {
                      return (
                        <div
                          key={`e-${index}`}
                          className="bg-white min-h-[56px] sm:min-h-[90px]"
                        />
                      );
                    }
                    const dayTasks = tasksByDate.get(cell.date) ?? [];
                    const isToday = Boolean(today && cell.date === today);
                    return (
                      <div
                        key={cell.date}
                        className={cn(
                          'bg-white min-h-[56px] sm:min-h-[90px] p-0.5 sm:p-1.5',
                          isToday && 'ring-2 ring-inset ring-blue-500'
                        )}
                      >
                        <div className="text-[10px] sm:text-xs font-semibold text-gray-700">
                          {cell.dayNumber}
                          {dayTasks.length > 0 && (
                            <span className="ml-0.5 text-gray-400 font-normal">
                              ·{dayTasks.length}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 space-y-0.5 hidden sm:block">
                          {dayTasks.slice(0, 3).map((task) => (
                            <div
                              key={task.id}
                              className={cn(
                                'rounded px-1 py-0.5 text-[9px] border truncate',
                                task.task_type === 'checkout_clean'
                                  ? 'bg-orange-50 border-orange-200 text-orange-900'
                                  : 'bg-amber-50 border-amber-200 text-amber-900'
                              )}
                            >
                              {task.property_name}
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <div className="text-[9px] text-gray-500">
                              +{dayTasks.length - 3}
                            </div>
                          )}
                        </div>
                        {dayTasks.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-0.5 sm:hidden">
                            {dayTasks.slice(0, 4).map((task) => (
                              <span
                                key={task.id}
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  task.task_type === 'checkout_clean'
                                    ? 'bg-orange-500'
                                    : 'bg-amber-500'
                                )}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {spilloverTasks.length > 0 && (
              <section className="rounded-lg border border-indigo-200 bg-white overflow-hidden">
                <div className="px-2.5 py-1.5 bg-indigo-50 text-indigo-900 text-xs font-semibold">
                  Next month · {spilloverTasks.length}
                </div>
                {spilloverTasks.map((task) => (
                  <LiveTaskRow key={task.id} task={task} />
                ))}
              </section>
            )}
          </div>
        ) : groupedByDate.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-500">
              No cleaning tasks for this period.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {groupedByDate.map(([date, dayTasks]) => {
              const isToday = Boolean(today && date === today);
              const isSpillover = dayTasks.some((t) => t.is_spillover);
              return (
                <section
                  key={date}
                  className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm"
                >
                  <div
                    className={cn(
                      'flex items-center justify-between gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2',
                      isToday
                        ? 'bg-blue-600 text-white'
                        : isSpillover
                          ? 'bg-indigo-50 text-indigo-900'
                          : 'bg-gray-100 text-gray-900'
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 text-[13px] font-semibold">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{formatCleaningDate(date, true)}</span>
                      {isToday && (
                        <Badge className="bg-white text-blue-700 hover:bg-white text-[10px] px-1.5 py-0 h-5">
                          Today
                        </Badge>
                      )}
                      {isSpillover && !isToday && (
                        <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 text-[10px] px-1.5 py-0 h-5">
                          Next
                        </Badge>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-[11px] shrink-0',
                        isToday ? 'text-blue-100' : 'text-gray-500'
                      )}
                    >
                      {dayTasks.length}
                    </span>
                  </div>

                  {/* Mobile + tablet: compact rows (no horizontal scroll) */}
                  <div className="md:hidden">
                    {dayTasks.map((task) => (
                      <LiveTaskRow key={task.id} task={task} emphasize={isToday} />
                    ))}
                  </div>

                  {/* Desktop: full table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                            Property
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                            Type
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                            Guest
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                            Nights
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                            Cleaner
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayTasks.map((task) => (
                          <tr
                            key={task.id}
                            className={cn(
                              'border-b last:border-b-0',
                              isToday && 'bg-blue-50/40'
                            )}
                          >
                            <td className="px-3 py-2">
                              <div className="text-sm font-medium text-gray-900">
                                {task.property_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {task.booking_reference ?? 'No booking'}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <TaskTypePill taskType={task.task_type} />
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900">
                              {task.guest_name ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-center text-sm">
                              {task.nights || '—'}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {task.cleaner_name ? (
                                <span className="font-medium text-gray-900">
                                  {task.cleaner_name}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-700">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Unassigned
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  'inline-flex capitalize text-xs font-medium px-2 py-0.5 rounded border',
                                  statusClass(task.status)
                                )}
                              >
                                {task.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CleaningLivePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-2 text-gray-600">Loading schedule…</span>
        </div>
      }
    >
      <CleaningLiveContent />
    </Suspense>
  );
}
