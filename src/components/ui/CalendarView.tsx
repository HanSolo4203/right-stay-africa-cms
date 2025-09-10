'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar as BigCalendar, momentLocalizer, Views, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CleaningSessionDetailed } from '@/lib/types';
import CalendarEvent from './CalendarEvent';
import AddCleaningModal from './AddCleaningModal';
import EditCleaningModal from './EditCleaningModal';
import EditMultipleCleaningsModal from './EditMultipleCleaningsModal';
import { CalendarSkeleton } from './LoadingSkeleton';
import toast from 'react-hot-toast';

// Setup moment localizer
const localizer = momentLocalizer(moment);

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CalendarViewProps {
  // No props needed for this component
}

export default function CalendarView({}: CalendarViewProps) {
  const [events, setEvents] = useState<CleaningSessionDetailed[]>([]);
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMultipleEditModalOpen, setIsMultipleEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CleaningSessionDetailed | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedMultipleCleanings, setSelectedMultipleCleanings] = useState<CleaningSessionDetailed[]>([]);
  const [selectedMultipleDate, setSelectedMultipleDate] = useState<string>('');


  // Load cleaning sessions
  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/cleaning-sessions');
      const result = await response.json();

      if (result.success) {
        setEvents(result.data);
      } else {
        toast.error('Failed to load cleaning sessions');
      }
    } catch (error) {
      console.error('Error loading cleaning sessions:', error);
      toast.error('Failed to load cleaning sessions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Group events by date and convert to calendar events
  const groupedEvents = events.reduce((acc, event) => {
    const dateKey = event.cleaning_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, CleaningSessionDetailed[]>);

  const calendarEvents = Object.entries(groupedEvents).map(([dateKey, dayEvents]) => {
    // Create date in local timezone to avoid timezone issues
    const [year, month, day] = dateKey.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(year, month - 1, day);
    
    // Create title based on number of events
    const eventCount = dayEvents.length;
    const title = eventCount === 1 
      ? `Apt ${dayEvents[0].apartment_number} - ${dayEvents[0].cleaner_name}`
      : `${eventCount} Cleanings`;
    
    return {
      id: `grouped-${dateKey}`,
      title,
      start: startDate,
      end: endDate,
      resource: {
        date: dateKey,
        events: dayEvents,
        isGrouped: eventCount > 1
      },
    };
  });

  // Handle date selection (for adding new events)
  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    setSelectedDate(start);
    setIsAddModalOpen(true);
  }, []);

  // Handle event selection (for editing)
  const handleSelectEvent = useCallback((event: { resource: { events: CleaningSessionDetailed[], isGrouped: boolean } }) => {
    if (event.resource.events.length > 0) {
      if (event.resource.isGrouped && event.resource.events.length > 1) {
        // Multiple cleanings - open the multiple edit modal
        setSelectedMultipleCleanings(event.resource.events);
        setSelectedMultipleDate(event.resource.events[0].cleaning_date);
        setIsMultipleEditModalOpen(true);
      } else {
        // Single cleaning - open the regular edit modal
        setSelectedEvent(event.resource.events[0]);
        setIsEditModalOpen(true);
      }
    }
  }, []);

  // Handle view change
  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  // Handle date change
  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };

  // Custom event component
  const EventComponent = ({ event }: { event: { resource: { events: CleaningSessionDetailed[], isGrouped: boolean } } }) => (
    <CalendarEvent events={event.resource.events} isGrouped={event.resource.isGrouped} />
  );

  // Custom toolbar
  const CustomToolbar = ({ label, onNavigate, onView }: { 
    label: string; 
    onNavigate: (direction: 'PREV' | 'NEXT' | 'TODAY') => void; 
    onView: (view: string) => void; 
  }) => (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 p-3 sm:p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Left: Month label and navigation */}
      <div className="flex items-center justify-between sm:justify-start">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mr-3 sm:mr-4">{label}</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('PREV')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('TODAY')}
            className="px-3 py-1 text-xs sm:text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors whitespace-nowrap"
          >
            Today
          </button>
          <button
            onClick={() => onNavigate('NEXT')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right: View switcher + Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center bg-gray-100 rounded-md p-1 overflow-x-auto whitespace-nowrap gap-1">
          {[
            { view: Views.MONTH, label: 'Month' },
            { view: Views.WEEK, label: 'Week' },
            { view: Views.DAY, label: 'Day' },
          ].map(({ view, label }) => (
            <button
              key={view}
              onClick={() => onView(view)}
              className={`px-3 py-1 text-xs sm:text-sm rounded transition-colors ${
                currentView === view
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex justify-center items-center w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Session
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
        </div>
        <CalendarSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cleaning Calendar</h1>
            <p className="text-gray-600">Schedule and manage cleaning sessions</p>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2 sm:p-4">
          {/* @ts-expect-error - react-big-calendar types are complex and don't match our usage */}
          <BigCalendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ 
              height: 600,
              minHeight: 400
            }}
            view={currentView}
            date={currentDate}
            onView={handleViewChange}
            onNavigate={handleNavigate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
          components={{
            event: EventComponent,
            toolbar: CustomToolbar,
          }}
          eventPropGetter={(event) => {
            // Generate consistent colors based on first apartment number or use special color for grouped events
            const colors = [
              { backgroundColor: '#dbeafe', borderColor: '#3b82f6', color: '#1e40af' },
              { backgroundColor: '#dcfce7', borderColor: '#22c55e', color: '#166534' },
              { backgroundColor: '#f3e8ff', borderColor: '#a855f7', color: '#7c3aed' },
              { backgroundColor: '#fed7aa', borderColor: '#f97316', color: '#ea580c' },
              { backgroundColor: '#fce7f3', borderColor: '#ec4899', color: '#be185d' },
              { backgroundColor: '#e0e7ff', borderColor: '#6366f1', color: '#4338ca' },
              { backgroundColor: '#fef3c7', borderColor: '#eab308', color: '#a16207' },
              { backgroundColor: '#fee2e2', borderColor: '#ef4444', color: '#dc2626' },
            ];
            
            // Special color for grouped events (multiple cleanings on same day)
            if (event.resource.isGrouped) {
              return { backgroundColor: '#f3f4f6', borderColor: '#6b7280', color: '#374151' };
            }
            
            // Use first apartment's color for single events
            const firstEvent = event.resource.events[0];
            const key = String(firstEvent.apartment_number);
            const hash = key.split('').reduce((a: number, b: string) => {
              a = ((a << 5) - a) + b.charCodeAt(0);
              return a & a;
            }, 0);
            
            return colors[Math.abs(hash) % colors.length];
          }}
          popup
          showMultiDayTimes
        />
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Apartment Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from(new Set(events.map(e => String(e.apartment_number)))).map((apartment) => {
            const colors = [
              { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
              { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
              { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
              { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
              { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' },
              { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800' },
              { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
              { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
            ];
            
            const hash = apartment.split('').reduce((a, b) => {
              a = ((a << 5) - a) + b.charCodeAt(0);
              return a & a;
            }, 0);
            
            const colorClass = colors[Math.abs(hash) % colors.length];
            
            return (
              <div key={apartment} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded border ${colorClass.bg} ${colorClass.border}`}></div>
                <span className="text-sm text-gray-600">Apt {apartment}</span>
              </div>
            );
          })}
        </div>
      </div>

        {/* Modals */}
        <AddCleaningModal
          isOpen={isAddModalOpen}
          selectedDate={selectedDate}
          onClose={() => {
            setIsAddModalOpen(false);
            setSelectedDate(undefined);
          }}
          onSuccess={loadEvents}
        />

        <EditCleaningModal
          isOpen={isEditModalOpen}
          session={selectedEvent}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEvent(null);
          }}
          onSuccess={loadEvents}
        />

        <EditMultipleCleaningsModal
          isOpen={isMultipleEditModalOpen}
          sessions={selectedMultipleCleanings}
          selectedDate={selectedMultipleDate}
          onClose={() => {
            setIsMultipleEditModalOpen(false);
            setSelectedMultipleCleanings([]);
            setSelectedMultipleDate('');
          }}
          onSuccess={loadEvents}
        />
      </div>
    );
  }
