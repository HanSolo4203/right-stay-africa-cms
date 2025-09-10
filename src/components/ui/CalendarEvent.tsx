'use client';

import { CleaningSessionDetailed } from '@/lib/types';

interface CalendarEventProps {
  events: CleaningSessionDetailed[];
  isGrouped: boolean;
}

export default function CalendarEvent({ events, isGrouped }: CalendarEventProps) {
  // Generate a consistent color based on apartment number
  const getApartmentColor = (apartmentNumber: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-red-100 text-red-800 border-red-200',
    ];
    
    const hash = apartmentNumber.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  if (isGrouped && events.length > 1) {
    // Display multiple events in a compact format
    return (
      <div className="p-1 rounded border-l-4 bg-gray-100 text-gray-800 border-gray-300 text-xs">
        <div className="font-medium truncate">
          {events.length} Cleanings
        </div>
        <div className="space-y-1 mt-1">
          {events.slice(0, 3).map((event) => (
            <div key={event.id} className="flex items-center justify-between">
              <span className="truncate">
                Apt {event.apartment_number} - {event.cleaner_name}
              </span>
              {event.price && (
                <span className="font-semibold ml-1">
                  R{event.price.toFixed(0)}
                </span>
              )}
            </div>
          ))}
          {events.length > 3 && (
            <div className="text-gray-600 font-medium">
              +{events.length - 3} more...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Display single event
  const event = events[0];
  const colorClass = getApartmentColor(String(event.apartment_number));

  return (
    <div className={`p-2 rounded border-l-4 ${colorClass} text-xs`}>
      <div className="font-medium truncate">
        Apt {event.apartment_number}
      </div>
      <div className="truncate opacity-90">
        {event.cleaner_name}
      </div>
      {event.price && (
        <div className="font-semibold opacity-90">
          R{event.price.toFixed(2)}
        </div>
      )}
      {event.notes && (
        <div className="truncate opacity-75 mt-1">
          {event.notes}
        </div>
      )}
    </div>
  );
}
