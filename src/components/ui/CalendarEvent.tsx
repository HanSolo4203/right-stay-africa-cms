'use client';

import { CleaningSessionDetailed } from '@/lib/types';

interface CalendarEventProps {
  event: CleaningSessionDetailed;
}

export default function CalendarEvent({ event }: CalendarEventProps) {
  // Generate a consistent color based on cleaner name
  const getCleanerColor = (cleanerName: string) => {
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
    
    const hash = cleanerName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const colorClass = getCleanerColor(event.cleaner_name);

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
