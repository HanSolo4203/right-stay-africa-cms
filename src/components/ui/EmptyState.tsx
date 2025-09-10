'use client';

import { ReactNode } from 'react';
import { Plus, Search, Calendar, Users, Building2, BarChart3 } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'calendar' | 'cleaners' | 'apartments' | 'analytics';
}

const iconMap = {
  default: Plus,
  search: Search,
  calendar: Calendar,
  cleaners: Users,
  apartments: Building2,
  analytics: BarChart3
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default'
}: EmptyStateProps) {
  const IconComponent = iconMap[variant];

  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        {icon || <IconComponent className="w-8 h-8 text-gray-400" />}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}

// Predefined empty states for common scenarios
export function EmptyCleanersState({ onAddCleaner }: { onAddCleaner: () => void }) {
  return (
    <EmptyState
      variant="cleaners"
      title="No cleaners found"
      description="Get started by adding your first cleaner to the system."
      action={{
        label: "Add Cleaner",
        onClick: onAddCleaner
      }}
    />
  );
}

export function EmptyApartmentsState({ onAddApartment }: { onAddApartment: () => void }) {
  return (
    <EmptyState
      variant="apartments"
      title="No apartments found"
      description="Add apartments to start managing cleaning schedules."
      action={{
        label: "Add Apartment",
        onClick: onAddApartment
      }}
    />
  );
}

export function EmptyCleaningSessionsState({ onAddSession }: { onAddSession: () => void }) {
  return (
    <EmptyState
      variant="calendar"
      title="No cleaning sessions scheduled"
      description="Start by scheduling your first cleaning session."
      action={{
        label: "Schedule Cleaning",
        onClick: onAddSession
      }}
    />
  );
}

export function EmptyAnalyticsState({ selectedMonth }: { selectedMonth: string }) {
  const isFutureMonth = new Date(selectedMonth + '-01') > new Date();
  
  if (isFutureMonth) {
    return (
      <EmptyState
        variant="analytics"
        title="No data for future month"
        description={`Analytics data will be available once cleaning sessions are scheduled for ${selectedMonth}.`}
      />
    );
  }

  return (
    <EmptyState
      variant="analytics"
      title="No analytics data"
      description={`No cleaning sessions found for ${selectedMonth}. Schedule some cleanings to see analytics.`}
    />
  );
}

export function EmptySearchState({ searchTerm, onClearSearch }: { searchTerm: string; onClearSearch: () => void }) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description={`No items match your search for "${searchTerm}". Try adjusting your search terms.`}
      action={{
        label: "Clear Search",
        onClick: onClearSearch
      }}
    />
  );
}
