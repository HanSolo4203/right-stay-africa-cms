'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { getPropertyDisplayName } from '@/lib/queries/cleaning';
import type {
  CleaningTaskStatus,
  CleaningTaskType,
  CleaningTaskWithDetails,
} from '@/lib/queries/cleaning';
import {
  CLEANING_STATUS_OPTIONS,
  clampPopoverPosition,
  formatDisplayDate,
  formatZAR,
  getCleaningStatusBadgeClass,
  getTaskTypeLabel,
  type CleaningPopoverAnchor,
} from './calendar-utils';
import { useMatchMedia } from './useViewportMetrics';

interface CleaningPopoverProps {
  task: CleaningTaskWithDetails;
  anchor: CleaningPopoverAnchor;
  cleaners: { id: string; name: string }[];
  updatingStatusId: string | null;
  assigningId: string | null;
  savingId: string | null;
  deletingId: string | null;
  onClose: () => void;
  onStatusChange: (taskId: string, status: CleaningTaskStatus) => void;
  onAssign: (taskId: string, cleanerId: string | null) => void;
  onUpdate: (
    taskId: string,
    payload: {
      scheduled_date?: string;
      task_type?: CleaningTaskType;
      booking_id?: string | null;
    }
  ) => void;
  onDelete: (taskId: string) => void;
}

function CleaningForm({
  task,
  cleaners,
  updatingStatusId,
  assigningId,
  savingId,
  deletingId,
  pendingDate,
  onPendingDateChange,
  onStatusChange,
  onAssign,
  onUpdate,
  onRequestDelete,
}: {
  task: CleaningTaskWithDetails;
  cleaners: { id: string; name: string }[];
  updatingStatusId: string | null;
  assigningId: string | null;
  savingId: string | null;
  deletingId: string | null;
  pendingDate: string;
  onPendingDateChange: (value: string) => void;
  onStatusChange: (taskId: string, status: CleaningTaskStatus) => void;
  onAssign: (taskId: string, cleanerId: string | null) => void;
  onUpdate: CleaningPopoverProps['onUpdate'];
  onRequestDelete: () => void;
}) {
  const dateDirty = pendingDate !== task.scheduled_date;

  return (
    <div className="space-y-3 text-sm" data-cleaning-popover>
      <div>
        <p className="font-semibold text-gray-900">{getTaskTypeLabel(task.task_type)}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDisplayDate(task.scheduled_date)}
        </p>
      </div>

      <dl className="space-y-1.5 text-xs">
        <div>
          <dt className="text-gray-500">Property</dt>
          <dd className="font-medium text-gray-900">{getPropertyDisplayName(task)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Guest</dt>
          <dd className="font-medium text-gray-900">{task.guest_name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Cleaner</dt>
          <dd className="font-medium text-gray-900">
            {task.cleaner_name ?? <span className="text-amber-700">Unassigned</span>}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Payout</dt>
          <dd className="font-medium text-gray-900">
            {task.cleaner_payout == null ? (
              <span className="text-red-600">No rate</span>
            ) : (
              formatZAR(task.cleaner_payout)
            )}
          </dd>
        </div>
        {task.assigned_cleaner_id && (
          <div>
            <dt className="text-gray-500">Assignment</dt>
            <dd className="font-medium text-gray-900">
              {task.auto_assigned ? 'Auto-assigned' : 'Manually assigned'}
            </dd>
          </div>
        )}
      </dl>

      <div className="space-y-1 border-t border-gray-100 pt-2">
        <Label className="text-xs text-gray-500">Date</Label>
        <div className="flex gap-2">
          <input
            type="date"
            value={pendingDate}
            disabled={savingId === task.id}
            onChange={(e) => onPendingDateChange(e.target.value)}
            className="flex-1 text-xs rounded-md border border-gray-200 px-2 py-2 bg-white disabled:opacity-50 min-h-10"
            aria-label="Reschedule cleaning day"
          />
          <Button
            type="button"
            size="sm"
            className="h-10"
            disabled={!dateDirty || !pendingDate || savingId === task.id}
            onClick={() => {
              if (pendingDate && pendingDate !== task.scheduled_date) {
                onUpdate(task.id, { scheduled_date: pendingDate });
              }
            }}
          >
            {savingId === task.id ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Type</Label>
        <select
          value={task.task_type}
          disabled={savingId === task.id}
          onChange={(e) =>
            onUpdate(task.id, { task_type: e.target.value as CleaningTaskType })
          }
          className="w-full text-xs rounded-md border border-gray-200 px-2 py-2 bg-white disabled:opacity-50 min-h-10"
          aria-label="Cleaning type"
        >
          <option value="midstay_clean">Mid-Stay Clean</option>
          <option value="checkout_clean">Checkout Clean</option>
        </select>
      </div>

      <div className="space-y-1 border-t border-gray-100 pt-2">
        <Label className="text-xs text-gray-500">Assign cleaner</Label>
        <select
          value={task.assigned_cleaner_id ?? ''}
          disabled={assigningId === task.id}
          onChange={(e) => {
            const value = e.target.value;
            onAssign(task.id, value === '' ? null : value);
          }}
          className="w-full text-xs rounded-md border border-gray-200 px-2 py-2 bg-white disabled:opacity-50 min-h-10"
        >
          <option value="">Unassign</option>
          {cleaners.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {task.task_type === 'midstay_clean' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">
          Includes linen change
        </p>
      )}

      <div className="space-y-2 border-t border-gray-100 pt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500">Status</span>
          <Badge variant="outline" className={getCleaningStatusBadgeClass(task.status)}>
            {task.status.replace('_', ' ')}
          </Badge>
        </div>
        <select
          value={task.status}
          disabled={updatingStatusId === task.id}
          onChange={(e) =>
            onStatusChange(task.id, e.target.value as CleaningTaskStatus)
          }
          className="w-full text-xs rounded-md border border-gray-200 px-2 py-2 bg-white disabled:opacity-50 min-h-10"
          aria-label={`Update status for ${getTaskTypeLabel(task.task_type)}`}
        >
          {CLEANING_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {task.status !== 'completed' && (
          <Button
            type="button"
            size="sm"
            className="w-full h-10 text-xs"
            disabled={updatingStatusId === task.id}
            onClick={() => onStatusChange(task.id, 'completed')}
          >
            Mark complete
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full h-10 text-xs text-red-700 border-red-200 hover:bg-red-50"
          disabled={deletingId === task.id}
          onClick={onRequestDelete}
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}

export function CleaningPopover({
  task,
  anchor,
  cleaners,
  updatingStatusId,
  assigningId,
  savingId,
  deletingId,
  onClose,
  onStatusChange,
  onAssign,
  onUpdate,
  onDelete,
}: CleaningPopoverProps) {
  const isNarrow = useMatchMedia('(max-width: 639px)');
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: anchor.x, top: anchor.y });
  const [pendingDate, setPendingDate] = useState(task.scheduled_date);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const pendingDateRef = useRef(pendingDate);

  useEffect(() => {
    setPendingDate(task.scheduled_date);
  }, [task.id, task.scheduled_date]);

  useEffect(() => {
    pendingDateRef.current = pendingDate;
  }, [pendingDate]);

  // Flush pending date before closing so mousedown-outside doesn't drop edits
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest('[data-cleaning-indicator]') ||
        target.closest('[data-cleaning-popover]') ||
        target.closest('[data-slot="alert-dialog-content"]') ||
        target.closest('[data-slot="sheet-content"]')
      ) {
        return;
      }

      const nextDate = pendingDateRef.current;
      if (nextDate && nextDate !== task.scheduled_date) {
        onUpdate(task.id, { scheduled_date: nextDate });
      }
      onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [onClose, onUpdate, task.id, task.scheduled_date]);

  useLayoutEffect(() => {
    if (isNarrow) return;
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clamped = clampPopoverPosition(anchor.x, anchor.y, rect.width, rect.height);
    setPosition({ left: clamped.left, top: clamped.top });
  }, [anchor.x, anchor.y, isNarrow, task.id]);

  const form = (
    <CleaningForm
      task={task}
      cleaners={cleaners}
      updatingStatusId={updatingStatusId}
      assigningId={assigningId}
      savingId={savingId}
      deletingId={deletingId}
      pendingDate={pendingDate}
      onPendingDateChange={setPendingDate}
      onStatusChange={onStatusChange}
      onAssign={onAssign}
      onUpdate={onUpdate}
      onRequestDelete={() => setConfirmDeleteOpen(true)}
    />
  );

  const deleteDialog = (
    <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this cleaning day?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the cleaning task for {formatDisplayDate(task.scheduled_date)}. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={() => onDelete(task.id)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isNarrow) {
    return (
      <>
        <Sheet
          open
          onOpenChange={(open) => {
            if (!open) {
              const nextDate = pendingDateRef.current;
              if (nextDate && nextDate !== task.scheduled_date) {
                onUpdate(task.id, { scheduled_date: nextDate });
              }
              onClose();
            }
          }}
        >
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl">
            <SheetHeader>
              <SheetTitle>{getTaskTypeLabel(task.task_type)}</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">{form}</div>
          </SheetContent>
        </Sheet>
        {deleteDialog}
      </>
    );
  }

  if (typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <div
          ref={panelRef}
          data-cleaning-popover
          className="fixed z-[100] w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-xl"
          style={{ left: position.left, top: position.top }}
          onClick={(event) => event.stopPropagation()}
        >
          {form}
        </div>,
        document.body
      )}
      {deleteDialog}
    </>
  );
}
