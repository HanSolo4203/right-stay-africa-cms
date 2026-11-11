'use client';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BookingWithDetails } from '@/lib/queries/bookings';
import {
  formatCurrency,
  formatDisplayDate,
  getChannelDisplayName,
  getPropertyDisplayName,
  getStatusBadgeClass,
} from './calendar-utils';

interface BookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingWithDetails | null;
}

export function BookingDetailsDialog({
  open,
  onOpenChange,
  booking,
}: BookingDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={() => onOpenChange(false)}
        onInteractOutside={() => onOpenChange(false)}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        {booking && (
          <>
            <DialogHeader>
              <DialogTitle className="text-left">
                {getPropertyDisplayName(booking.apartments)}
              </DialogTitle>
              <p className="text-sm text-gray-600 text-left">
                {booking.guests?.name ?? 'Guest'}
              </p>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={getStatusBadgeClass(booking.booking_status)}
                >
                  {booking.booking_status}
                </Badge>
                <Badge variant="outline">
                  {getChannelDisplayName(booking.booking_channels?.name)}
                </Badge>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <dt className="text-gray-500">Guest phone</dt>
                  <dd className="font-medium text-gray-900">
                    {booking.guests?.phone || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Booking reference</dt>
                  <dd className="font-medium text-gray-900 break-all">
                    {booking.booking_reference}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Check-in</dt>
                  <dd className="font-medium text-gray-900">
                    {formatDisplayDate(booking.check_in_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Check-out</dt>
                  <dd className="font-medium text-gray-900">
                    {formatDisplayDate(booking.check_out_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Nights</dt>
                  <dd className="font-medium text-gray-900">{booking.nights}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Channel</dt>
                  <dd className="font-medium text-gray-900">
                    {getChannelDisplayName(booking.booking_channels?.name)}
                  </dd>
                </div>
              </dl>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <h4 className="font-semibold text-gray-900">Financials (ZAR)</h4>
                <dl className="space-y-2">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Accommodation total</dt>
                    <dd className="font-medium text-gray-900">
                      {formatCurrency(Number(booking.accommodation_total))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Cleaning fee</dt>
                    <dd className="font-medium text-gray-900">
                      {formatCurrency(Number(booking.cleaning_fee))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Discounts</dt>
                    <dd className="font-medium text-gray-900">
                      {formatCurrency(Number(booking.discount_amount))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Commission</dt>
                    <dd className="font-medium text-gray-900">
                      {formatCurrency(Number(booking.channel_commission))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-gray-100 pt-2">
                    <dt className="font-semibold text-gray-900">Total payout</dt>
                    <dd className="font-semibold text-gray-900">
                      {formatCurrency(Number(booking.total_payout))}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
