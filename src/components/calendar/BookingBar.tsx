'use client';

import { memo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { BookingWithDetails } from '@/lib/queries/bookings';
import {
  bookingBarStyle,
  BOOKING_BAR_HEIGHT,
  formatDisplayDate,
  getChannelColor,
  getChannelInitial,
  getGuestFullName,
  isCancelled,
} from './calendar-utils';

interface BookingBarProps {
  booking: BookingWithDetails;
  startIdx: number;
  endIdx: number;
  clippedStart: boolean;
  clippedEnd: boolean;
  onSelect: (booking: BookingWithDetails) => void;
}

function BookingBarComponent({
  booking,
  startIdx,
  endIdx,
  clippedStart,
  clippedEnd,
  onSelect,
}: BookingBarProps) {
  const cancelled = isCancelled(booking.booking_status);
  const channelName = booking.booking_channels?.name;
  const bgColor = cancelled ? '#fecdd3' : getChannelColor(channelName);
  const textColor = cancelled ? '#9f1239' : '#ffffff';
  const guestName = getGuestFullName(booking.guests?.name);
  const initial = getChannelInitial(channelName);
  const style = bookingBarStyle(startIdx, endIdx, clippedStart, clippedEnd);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-booking-bar
          onClick={() => onSelect(booking)}
          aria-label={`${guestName}, ${formatDisplayDate(booking.check_in_date)} to ${formatDisplayDate(booking.check_out_date)}${cancelled ? ', cancelled' : ''}`}
          className={cn(
            'absolute z-10 flex items-center gap-1.5 px-1.5 text-[11px] font-medium leading-none cursor-pointer',
            'hover:brightness-95 transition-[filter]',
            cancelled && 'line-through opacity-80'
          )}
          style={{
            left: style.left,
            width: style.width,
            height: BOOKING_BAR_HEIGHT,
            top: 8,
            backgroundColor: bgColor,
            color: textColor,
            clipPath: style.clipPath,
          }}
        >
          <span
            className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full border border-white/90 text-[9px] font-bold bg-black/15"
            aria-hidden
          >
            {initial}
          </span>
          <span className="truncate min-w-0">{guestName}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{guestName}</p>
        <p className="text-muted-foreground">
          {formatDisplayDate(booking.check_in_date)} →{' '}
          {formatDisplayDate(booking.check_out_date)}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export const BookingBar = memo(BookingBarComponent);
