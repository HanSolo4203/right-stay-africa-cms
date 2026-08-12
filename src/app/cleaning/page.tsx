'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  Download,
  RefreshCw,
  Settings2,
  Sparkles,
} from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClientComponentClient } from '@/lib/supabase';
import type { CleanerPayoutSummary } from '@/lib/types';
import {
  getCleaningStats,
  getCleaningTaskApartments,
  getCleaningTasksWithDetails,
  getPropertyDisplayName,
  type CleaningStats,
  type CleaningTaskStatus,
  type CleaningTaskType,
  type CleaningTaskWithDetails,
} from '@/lib/queries/cleaning';
import { cn } from '@/lib/utils';
import toast, { Toaster } from 'react-hot-toast';

const STATUS_OPTIONS: { value: CleaningTaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
];

const TASK_TYPE_OPTIONS: { value: CleaningTaskType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'checkout_clean', label: 'Checkout clean' },
  { value: 'midstay_clean', label: 'Mid-stay clean' },
];

function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getTaskTypeBadge(taskType: CleaningTaskType) {
  if (taskType === 'checkout_clean') {
    return (
      <Badge className="bg-orange-100 text-orange-900 border-orange-200 hover:bg-orange-100">
        Checkout Clean
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100">
      Mid-Stay Clean
    </Badge>
  );
}

function getStatusSelectClass(status: CleaningTaskStatus) {
  switch (status) {
    case 'pending':
      return 'border-yellow-300 bg-yellow-50';
    case 'in_progress':
      return 'border-blue-300 bg-blue-50';
    case 'completed':
      return 'border-green-300 bg-green-50';
    case 'skipped':
      return 'border-gray-300 bg-gray-50';
    default:
      return '';
  }
}

function formatZAR(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
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

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

interface CleanerOption {
  id: string;
  name: string;
}

function CleaningContent() {
  const [tasks, setTasks] = useState<CleaningTaskWithDetails[]>([]);
  const [stats, setStats] = useState<CleaningStats | null>(null);
  const [apartments, setApartments] = useState<
    { id: string; apartment_number: string; uplisting_name: string | null }[]
  >([]);
  const [cleaners, setCleaners] = useState<CleanerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutFrom, setPayoutFrom] = useState(getMonthRange().start);
  const [payoutTo, setPayoutTo] = useState(getMonthRange().end);
  const [payoutSummaries, setPayoutSummaries] = useState<CleanerPayoutSummary[]>([]);
  const [payoutGrandTotal, setPayoutGrandTotal] = useState(0);
  const [editingPayoutId, setEditingPayoutId] = useState<string | null>(null);
  const [payoutDraft, setPayoutDraft] = useState<Record<string, string>>({});

  const [dateFrom, setDateFrom] = useState(getTodayIsoDate());
  const [dateTo, setDateTo] = useState('');
  const [propertyId, setPropertyId] = useState('all');
  const [taskType, setTaskType] = useState<CleaningTaskType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<CleaningTaskStatus | 'all'>('pending');

  const today = getTodayIsoDate();

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClientComponentClient();

      const [taskData, statsData, apartmentData, cleanersRes] = await Promise.all([
        getCleaningTasksWithDetails(supabase, {
          fromDate: dateFrom || today,
          ...(dateTo ? { toDate: dateTo } : {}),
          ...(propertyId !== 'all' ? { apartmentId: propertyId } : {}),
          taskType,
          status: statusFilter,
          ...(unassignedOnly ? { unassignedOnly: true } : {}),
        }),
        getCleaningStats(supabase),
        getCleaningTaskApartments(supabase),
        fetch('/api/cleaners'),
      ]);

      const cleanersJson = await cleanersRes.json();
      const cleanerList: CleanerOption[] = cleanersJson.success
        ? cleanersJson.data
        : cleanersJson.data ?? [];

      setTasks(taskData);
      setStats(statsData);
      setApartments(apartmentData);
      setCleaners(cleanerList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load cleaning schedule';
      toast.error(message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, propertyId, taskType, statusFilter, unassignedOnly, today]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, CleaningTaskWithDetails[]>();
    for (const task of tasks) {
      const existing = groups.get(task.scheduled_date) ?? [];
      existing.push(task);
      groups.set(task.scheduled_date, existing);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  const handleAssignCleaner = async (taskId: string, cleanerId: string) => {
    try {
      setAssigningTaskId(taskId);
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
      setTasks((prev) =>
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
      const supabase = createClientComponentClient();
      setStats(await getCleaningStats(supabase));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign cleaner');
    } finally {
      setAssigningTaskId(null);
    }
  };

  const handlePayoutOverride = async (taskId: string, payout: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    try {
      setUpdatingTaskId(taskId);
      const response = await fetch('/api/cleaning/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          status: task.status,
          cleaner_payout: payout,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to update payout');
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, cleaner_payout: payout } : t))
      );
      toast.success('Payout updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update payout');
    } finally {
      setUpdatingTaskId(null);
      setEditingPayoutId(null);
    }
  };

  const loadPayoutReport = async () => {
    try {
      setPayoutLoading(true);
      const params = new URLSearchParams({ from_date: payoutFrom, to_date: payoutTo });
      const response = await fetch(`/api/cleaning/payouts?${params}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to load payout report');
      }
      setPayoutSummaries(result.data.summaries ?? []);
      setPayoutGrandTotal(result.data.grand_total ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payout report');
    } finally {
      setPayoutLoading(false);
    }
  };

  const exportPayoutCsv = () => {
    const rows = [
      ['Cleaner', 'Checkout Cleans', 'Mid-Stay Cleans', 'Total Payout (ZAR)'],
      ...payoutSummaries.map((s) => [
        s.cleaner_name,
        String(s.checkout_count),
        String(s.midstay_count),
        s.total_payout.toFixed(2),
      ]),
      ['Grand Total', '', '', payoutGrandTotal.toFixed(2)],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaner-payouts-${payoutFrom}-to-${payoutTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openPayoutModal = () => {
    setPayoutModalOpen(true);
    void loadPayoutReport();
  };

  const handleStatusChange = async (taskId: string, status: CleaningTaskStatus) => {
    try {
      setUpdatingTaskId(taskId);
      const response = await fetch('/api/cleaning/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, status }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to update status');
      }

      setTasks((prev) =>
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
      toast.success('Status updated');
      const supabase = createClientComponentClient();
      const statsData = await getCleaningStats(supabase);
      setStats(statsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(message);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-blue-600" />
              Cleaning Schedule
            </h1>
            <p className="text-gray-600 mt-2">
              Upcoming cleaning tasks from bookings — grouped by scheduled date
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/settings/cleaners">
              <Button variant="outline" size="sm">
                <Settings2 className="w-4 h-4 mr-2" />
                Cleaner Settings
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={openPayoutModal}>
              <DollarSign className="w-4 h-4 mr-2" />
              Payout Report
            </Button>
            <button
              type="button"
              onClick={refreshData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {/* Payout summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                This week&apos;s payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {formatZAR(stats?.weekPayoutTotal ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                This month&apos;s payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {formatZAR(stats?.monthPayoutTotal ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'cursor-pointer transition-colors',
              unassignedOnly ? 'ring-2 ring-amber-400' : 'hover:bg-amber-50'
            )}
            onClick={() => setUnassignedOnly((v) => !v)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Unassigned tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-700">
                {stats?.unassignedCount ?? (loading ? '—' : 0)}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                {unassignedOnly ? 'Showing unassigned only — click to clear' : 'Click to filter'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending this week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.pendingThisWeek ?? (loading ? '—' : 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming schedule */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Upcoming cleaning schedule
          </h2>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-from">From date</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-to">To date</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property-filter">Property</Label>
                  <Select value={propertyId} onValueChange={setPropertyId}>
                    <SelectTrigger id="property-filter">
                      <SelectValue placeholder="All properties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All properties</SelectItem>
                      {apartments.map((apt) => (
                        <SelectItem key={apt.id} value={apt.id}>
                          {apt.uplisting_name || apt.apartment_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-type-filter">Task type</Label>
                  <Select
                    value={taskType}
                    onValueChange={(v) => setTaskType(v as CleaningTaskType | 'all')}
                  >
                    <SelectTrigger id="task-type-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) =>
                      setStatusFilter(v as CleaningTaskStatus | 'all')
                    }
                  >
                    <SelectTrigger id="status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-2 text-gray-600">Loading cleaning tasks...</span>
            </div>
          ) : groupedByDate.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No cleaning tasks found for the current filters.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {groupedByDate.map(([date, dayTasks]) => {
                const isToday = date === today;
                return (
                  <div key={date}>
                    <div
                      className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-t-lg border',
                        isToday
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                          : 'bg-gray-100 text-gray-900 border-gray-200'
                      )}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <Calendar className="w-4 h-4" />
                        {formatDate(date)}
                        {isToday && (
                          <Badge className="bg-white text-blue-700 hover:bg-white ml-2">
                            Today
                          </Badge>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-sm',
                          isToday ? 'text-blue-100' : 'text-gray-600'
                        )}
                      >
                        {dayTasks.length} task{dayTasks.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <Card className="rounded-t-none border-t-0">
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                  Date
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                  Property
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                  Task type
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                  Booking guest
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                                  Nights
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                  Assigned cleaner
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                  Payout
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                  Status
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {dayTasks.map((task) => (
                                <tr
                                  key={task.id}
                                  className={cn(
                                    'border-b last:border-b-0 hover:bg-gray-50',
                                    isToday && 'bg-blue-50/40'
                                  )}
                                >
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {formatDate(task.scheduled_date)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">
                                      {getPropertyDisplayName(task)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {task.booking_reference ?? 'No booking'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    {getTaskTypeBadge(task.task_type)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {task.guest_name ?? '—'}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm text-gray-900">
                                    {task.nights || '—'}
                                  </td>
                                  <td className="px-4 py-3">
                                    {task.assigned_cleaner_id && task.cleaner_name ? (
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                                          {getCleanerInitials(task.cleaner_name)}
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-gray-900">
                                            {task.cleaner_name}
                                          </span>
                                          {task.auto_assigned && (
                                            <Badge className="ml-1 bg-purple-100 text-purple-800 hover:bg-purple-100 text-[10px] px-1 py-0">
                                              Auto
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-sm text-amber-700">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Unassigned
                                      </span>
                                    )}
                                    <select
                                      value={task.assigned_cleaner_id ?? ''}
                                      disabled={assigningTaskId === task.id}
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleAssignCleaner(task.id, e.target.value);
                                        }
                                      }}
                                      className="mt-1 block w-full text-xs rounded-md border border-gray-200 px-2 py-1 bg-white disabled:opacity-50 max-w-[160px]"
                                      aria-label={`Assign cleaner for ${getPropertyDisplayName(task)}`}
                                    >
                                      <option value="">
                                        {task.assigned_cleaner_id ? 'Reassign…' : 'Assign cleaner…'}
                                      </option>
                                      {cleaners.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-4 py-3">
                                    {editingPayoutId === task.id ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          className="h-7 w-24 text-xs"
                                          value={payoutDraft[task.id] ?? String(task.cleaner_payout ?? '')}
                                          onChange={(e) =>
                                            setPayoutDraft((prev) => ({
                                              ...prev,
                                              [task.id]: e.target.value,
                                            }))
                                          }
                                        />
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2 text-xs"
                                          disabled={updatingTaskId === task.id}
                                          onClick={() =>
                                            handlePayoutOverride(
                                              task.id,
                                              parseFloat(payoutDraft[task.id] ?? '0') || 0
                                            )
                                          }
                                        >
                                          Save
                                        </Button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingPayoutId(task.id);
                                          setPayoutDraft((prev) => ({
                                            ...prev,
                                            [task.id]: String(task.cleaner_payout ?? ''),
                                          }));
                                        }}
                                        className={cn(
                                          'text-sm',
                                          task.cleaner_payout == null
                                            ? 'text-red-600 font-medium'
                                            : 'text-gray-900 hover:underline'
                                        )}
                                      >
                                        {task.cleaner_payout == null
                                          ? 'No rate'
                                          : formatZAR(task.cleaner_payout)}
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm capitalize text-gray-700 block mb-1">
                                      {task.status.replace('_', ' ')}
                                    </span>
                                    <select
                                      value={task.status}
                                      disabled={updatingTaskId === task.id}
                                      onChange={(e) =>
                                        handleStatusChange(
                                          task.id,
                                          e.target.value as CleaningTaskStatus
                                        )
                                      }
                                      className={cn(
                                        'text-sm rounded-md border px-2 py-1.5 min-w-[130px] disabled:opacity-50',
                                        getStatusSelectClass(task.status)
                                      )}
                                      aria-label={`Update status for ${getPropertyDisplayName(task)}`}
                                    >
                                      {STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Cleaning stats */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cleaning stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  Pending this week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.pendingThisWeek ?? (loading ? '—' : 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Completed this month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.completedThisMonth ?? (loading ? '—' : 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  Back-to-back turnovers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.backToBackProperties.length ?? (loading ? '—' : 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Same-day checkout and check-in
                </p>
              </CardContent>
            </Card>
          </div>

          {stats && stats.backToBackProperties.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  Properties with back-to-back bookings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.backToBackProperties.map((item) => (
                  <div
                    key={`${item.apartment_id}-${item.date}-${item.checkout_booking_reference}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0"
                  >
                    <span className="font-medium text-gray-900">
                      {item.property_name} — {formatDate(item.date)}
                    </span>
                    <span className="text-gray-500">
                      Out: {item.checkout_booking_reference} → In:{' '}
                      {item.checkin_booking_reference}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payout Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label htmlFor="payout-from">From</Label>
                <Input
                  id="payout-from"
                  type="date"
                  value={payoutFrom}
                  onChange={(e) => setPayoutFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="payout-to">To</Label>
                <Input
                  id="payout-to"
                  type="date"
                  value={payoutTo}
                  onChange={(e) => setPayoutTo(e.target.value)}
                />
              </div>
              <Button onClick={loadPayoutReport} disabled={payoutLoading}>
                {payoutLoading ? 'Loading…' : 'Load'}
              </Button>
              <Button variant="outline" onClick={exportPayoutCsv} disabled={!payoutSummaries.length}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {payoutLoading ? (
              <p className="text-center text-gray-500 py-8">Loading report…</p>
            ) : payoutSummaries.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No completed tasks in this date range.
              </p>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">Cleaner</th>
                      <th className="text-center px-4 py-2 font-semibold">Checkout</th>
                      <th className="text-center px-4 py-2 font-semibold">Mid-Stay</th>
                      <th className="text-right px-4 py-2 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutSummaries.map((s) => (
                      <tr key={s.cleaner_id} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{s.cleaner_name}</td>
                        <td className="px-4 py-2 text-center">{s.checkout_count}</td>
                        <td className="px-4 py-2 text-center">{s.midstay_count}</td>
                        <td className="px-4 py-2 text-right">{formatZAR(s.total_payout)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-4 py-2" colSpan={3}>
                        Grand Total
                      </td>
                      <td className="px-4 py-2 text-right">{formatZAR(payoutGrandTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" />
    </div>
  );
}

export default function CleaningPage() {
  return (
    <AuthWrapper>
      <CleaningContent />
    </AuthWrapper>
  );
}
