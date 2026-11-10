'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BookingWithDetails, PropertyWithBookings } from '@/lib/queries/bookings';
import type { CleaningTaskType } from '@/lib/queries/cleaning';
import {
  formatDisplayDate,
  getGuestFirstName,
  getPropertyDisplayName,
} from './calendar-utils';

interface AddCleaningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  apartments: PropertyWithBookings[];
  onPropertyChange?: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  taskType: CleaningTaskType;
  onTaskTypeChange: (value: CleaningTaskType) => void;
  bookingId: string;
  onBookingIdChange: (value: string) => void;
  cleanerId: string;
  onCleanerIdChange: (value: string) => void;
  overlappingBookings: BookingWithDetails[];
  cleaners: { id: string; name: string }[];
  adding: boolean;
  onSubmit: () => void;
}

export function AddCleaningDialog({
  open,
  onOpenChange,
  propertyId,
  apartments,
  onPropertyChange,
  date,
  onDateChange,
  taskType,
  onTaskTypeChange,
  bookingId,
  onBookingIdChange,
  cleanerId,
  onCleanerIdChange,
  overlappingBookings,
  cleaners,
  adding,
  onSubmit,
}: AddCleaningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add cleaning day</DialogTitle>
          <DialogDescription>
            {propertyId
              ? getPropertyDisplayName(
                  apartments.find((apt) => apt.id === propertyId) ?? null
                )
              : 'Property'}
            {date ? ` · ${formatDisplayDate(date)}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {onPropertyChange && (
            <div className="space-y-1">
              <Label>Property</Label>
              <select
                value={propertyId ?? ''}
                onChange={(e) => onPropertyChange(e.target.value)}
                className="w-full text-sm rounded-md border border-gray-200 px-2 py-2 bg-white min-h-10"
              >
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {getPropertyDisplayName(apt)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <select
              value={taskType}
              onChange={(e) => onTaskTypeChange(e.target.value as CleaningTaskType)}
              className="w-full text-sm rounded-md border border-gray-200 px-2 py-2 bg-white min-h-10"
            >
              <option value="midstay_clean">Mid-Stay Clean</option>
              <option value="checkout_clean">Checkout Clean</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Booking</Label>
            <select
              value={bookingId}
              onChange={(e) => onBookingIdChange(e.target.value)}
              className="w-full text-sm rounded-md border border-gray-200 px-2 py-2 bg-white min-h-10"
            >
              <option value="">No booking (property only)</option>
              {overlappingBookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {getGuestFirstName(booking.guests?.name)} ·{' '}
                  {formatDisplayDate(booking.check_in_date)} →{' '}
                  {formatDisplayDate(booking.check_out_date)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Cleaner (optional)</Label>
            <select
              value={cleanerId}
              onChange={(e) => onCleanerIdChange(e.target.value)}
              className="w-full text-sm rounded-md border border-gray-200 px-2 py-2 bg-white min-h-10"
            >
              <option value="">Unassigned</option>
              {cleaners.map((cleaner) => (
                <option key={cleaner.id} value={cleaner.id}>
                  {cleaner.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={adding}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={adding || !date}>
            {adding ? 'Adding…' : 'Add cleaning day'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
