'use client';

import { CleaningSessionDetailed } from '@/lib/types';
import { isRSALaundryRoom } from '@/lib/property-utils';
import { Users } from 'lucide-react';
import {
  getApartmentTailwindColor,
  parseLocalDate,
} from '@/components/calendar/calendar-utils';

interface CalendarEventProps {
  events: CleaningSessionDetailed[];
  isGrouped: boolean;
}

function formatLocalCleaningDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString();
}

export default function CalendarEvent({ events, isGrouped }: CalendarEventProps) {
  const generateTooltipContent = (event: CleaningSessionDetailed) => {
    const isRSA = isRSALaundryRoom(event.apartment_number);
    const propertyName = isRSA ? event.apartment_number : `Apartment ${event.apartment_number}`;
    const cleanerInfo =
      event.is_multi_cleaner && event.cleaner_2_name
        ? `${event.cleaner_name} & ${event.cleaner_2_name}`
        : event.cleaner_name;

    let tooltip = `${propertyName}\n`;
    tooltip += `Cleaner: ${cleanerInfo}\n`;
    tooltip += `Date: ${formatLocalCleaningDate(event.cleaning_date)}\n`;
    tooltip += `Price: R${event.price ?? 0}\n`;

    if (event.is_multi_cleaner && event.cleaner_2_name) {
      tooltip += `Type: Multi-cleaner session\n`;
      if (event.cleaner_1_fee && event.cleaner_2_fee) {
        tooltip += `Cleaner 1 Fee: R${event.cleaner_1_fee}\n`;
        tooltip += `Cleaner 2 Fee: R${event.cleaner_2_fee}\n`;
        tooltip += `Total Fee: R${event.total_cleaning_fee || 0}\n`;
      }
    }

    if (event.welcome_pack_fee && event.welcome_pack_fee > 0) {
      tooltip += `Welcome Pack: R${event.welcome_pack_fee}\n`;
    }

    if (event.notes && event.notes.trim()) {
      tooltip += `Notes: ${event.notes}\n`;
    }

    if (isRSA) {
      tooltip += `Type: RSA Laundry Service`;
    }

    return tooltip.trim();
  };

  if (isGrouped && events.length > 1) {
    return (
      <div
        className="p-1 rounded border-l-4 bg-gray-100 text-gray-800 border-gray-300 text-xs cursor-pointer"
        title={`${events.length} cleaning sessions on ${formatLocalCleaningDate(events[0].cleaning_date)}\n\nClick to view details`}
      >
        <div className="font-medium truncate">{events.length} Cleanings</div>
        <div className="space-y-1 mt-1">
          {events.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between"
              title={generateTooltipContent(event)}
            >
              <span className="truncate flex items-center gap-1">
                {isRSALaundryRoom(event.apartment_number)
                  ? event.apartment_number
                  : `Apt ${event.apartment_number}`}{' '}
                -{' '}
                {event.is_multi_cleaner && event.cleaner_2_name
                  ? `${event.cleaner_name} & ${event.cleaner_2_name}`
                  : event.cleaner_name}
                {event.is_multi_cleaner && event.cleaner_2_name && (
                  <Users className="w-3 h-3 text-blue-600" />
                )}
              </span>
              {event.price != null && (
                <span className="font-semibold ml-1">R{event.price.toFixed(0)}</span>
              )}
            </div>
          ))}
          {events.length > 3 && (
            <div className="text-gray-600 font-medium">+{events.length - 3} more...</div>
          )}
        </div>
      </div>
    );
  }

  const event = events[0];
  const isMultiCleaner = event.is_multi_cleaner && event.cleaner_2_name;

  const colorClass = isMultiCleaner
    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-900 border-blue-300'
    : getApartmentTailwindColor(String(event.apartment_number));

  const tooltipContent = generateTooltipContent(event);

  return (
    <div
      className={`p-2 rounded border-l-4 ${colorClass} text-xs relative cursor-pointer hover:shadow-md transition-shadow`}
      title={tooltipContent}
    >
      <div className="font-medium truncate flex items-center gap-1">
        {isRSALaundryRoom(event.apartment_number)
          ? event.apartment_number
          : `Apt ${event.apartment_number}`}
        {isMultiCleaner && <Users className="w-3 h-3 text-blue-600" />}
      </div>
      <div className="truncate opacity-90">
        {isMultiCleaner
          ? `${event.cleaner_name} & ${event.cleaner_2_name}`
          : event.cleaner_name}
      </div>
      {event.price != null && (
        <div className="font-semibold opacity-90">
          R{event.price.toFixed(2)}
          {isMultiCleaner && (
            <span className="text-xs opacity-75 ml-1">
              (
              {event.cleaner_1_fee && event.cleaner_2_fee
                ? `R${event.cleaner_1_fee} + R${event.cleaner_2_fee}`
                : 'split'}
              )
            </span>
          )}
        </div>
      )}
      {event.notes && <div className="truncate opacity-75 mt-1">{event.notes}</div>}
    </div>
  );
}
