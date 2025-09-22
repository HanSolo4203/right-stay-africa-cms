'use client';

import { CleaningSessionDetailed } from '@/lib/types';
import { isRSALaundryRoom } from '@/lib/property-utils';
import { Users } from 'lucide-react';

interface CalendarEventProps {
  events: CleaningSessionDetailed[];
  isGrouped: boolean;
}

export default function CalendarEvent({ events, isGrouped }: CalendarEventProps) {
  // Generate detailed tooltip content for an event
  const generateTooltipContent = (event: CleaningSessionDetailed) => {
    const isRSA = isRSALaundryRoom(event.apartment_number);
    const propertyName = isRSA ? event.apartment_number : `Apartment ${event.apartment_number}`;
    const cleanerInfo = event.is_multi_cleaner && event.cleaner_2_name 
      ? `${event.cleaner_name} & ${event.cleaner_2_name}`
      : event.cleaner_name;
    
    let tooltip = `${propertyName}\n`;
    tooltip += `Cleaner: ${cleanerInfo}\n`;
    tooltip += `Date: ${new Date(event.cleaning_date).toLocaleDateString()}\n`;
    tooltip += `Price: R${event.price || 0}\n`;
    
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
      <div 
        className="p-1 rounded border-l-4 bg-gray-100 text-gray-800 border-gray-300 text-xs cursor-pointer"
        title={`${events.length} cleaning sessions on ${new Date(events[0].cleaning_date).toLocaleDateString()}\n\nClick to view details`}
      >
        <div className="font-medium truncate">
          {events.length} Cleanings
        </div>
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
                  : `Apt ${event.apartment_number}`} - {event.is_multi_cleaner && event.cleaner_2_name ? `${event.cleaner_name} & ${event.cleaner_2_name}` : event.cleaner_name}
                {event.is_multi_cleaner && event.cleaner_2_name && (
                  <Users className="w-3 h-3 text-blue-600" />
                )}
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
  const isMultiCleaner = event.is_multi_cleaner && event.cleaner_2_name;
  
  // Use special styling for multi-cleaner sessions
  const colorClass = isMultiCleaner 
    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-900 border-blue-300' 
    : getApartmentColor(String(event.apartment_number));

  // Use the comprehensive tooltip function
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
        {isMultiCleaner && (
          <Users className="w-3 h-3 text-blue-600" />
        )}
      </div>
      <div className="truncate opacity-90">
        {isMultiCleaner ? `${event.cleaner_name} & ${event.cleaner_2_name}` : event.cleaner_name}
      </div>
      {event.price && (
        <div className="font-semibold opacity-90">
          R{event.price.toFixed(2)}
          {isMultiCleaner && (
            <span className="text-xs opacity-75 ml-1">
              ({event.cleaner_1_fee && event.cleaner_2_fee ? `R${event.cleaner_1_fee} + R${event.cleaner_2_fee}` : 'split'})
            </span>
          )}
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
