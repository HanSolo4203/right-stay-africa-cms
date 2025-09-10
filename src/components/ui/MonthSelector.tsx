'use client';

import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthSelectorProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  selectedYear?: string;
  onYearChange?: (year: string) => void;
}

export default function MonthSelector({ selectedMonth, onMonthChange, selectedYear, onYearChange }: MonthSelectorProps) {
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  // Generate month options (January 2025 to December 2025)
  const generateMonthOptions = () => {
    const options = [];
    
    // Generate all months from January 2025 to December 2025
    for (let month = 0; month < 12; month++) {
      const date = new Date(2025, month, 1);
      const year = date.getFullYear();
      const monthNum = String(date.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${monthNum}`; // YYYY-MM format
      const monthLabel = date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      options.push({
        value: monthKey,
        label: monthLabel,
        date: date
      });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  // Generate year options
  const generateYearOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    
    // Generate years from 2024 to 2026
    for (let year = 2024; year <= 2026; year++) {
      options.push({
        value: year.toString(),
        label: year.toString(),
        isCurrent: year === currentYear
      });
    }
    
    return options;
  };

  const yearOptions = generateYearOptions();

  const handlePreviousMonth = () => {
    const currentIndex = monthOptions.findIndex(option => option.value === selectedMonth);
    if (currentIndex > 0) {
      onMonthChange(monthOptions[currentIndex - 1].value);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = monthOptions.findIndex(option => option.value === selectedMonth);
    if (currentIndex < monthOptions.length - 1) {
      onMonthChange(monthOptions[currentIndex + 1].value);
    }
  };

  // Check if selected month is in the future (compared to current date)
  const isFutureMonth = () => {
    const selectedDate = new Date(selectedMonth + '-01');
    const currentDate = new Date();
    return selectedDate > currentDate;
  };

  const handleCurrentMonth = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // If current year is 2025, use current month, otherwise default to January 2025
    if (currentYear === 2025) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const currentMonth = `${year}-${month}`;
      onMonthChange(currentMonth);
    } else {
      onMonthChange('2025-01'); // Default to January 2025
    }
  };

  const handlePreviousYear = () => {
    if (selectedYear && onYearChange) {
      const currentIndex = yearOptions.findIndex(option => option.value === selectedYear);
      if (currentIndex > 0) {
        onYearChange(yearOptions[currentIndex - 1].value);
      }
    }
  };

  const handleNextYear = () => {
    if (selectedYear && onYearChange) {
      const currentIndex = yearOptions.findIndex(option => option.value === selectedYear);
      if (currentIndex < yearOptions.length - 1) {
        onYearChange(yearOptions[currentIndex + 1].value);
      }
    }
  };

  const handleCurrentYear = () => {
    if (onYearChange) {
      const currentYear = new Date().getFullYear().toString();
      onYearChange(currentYear);
    }
  };


  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Analytics Period</h2>
            {isFutureMonth() && (
              <p className="text-sm text-blue-600 font-medium">
                📅 Future month selected - No data available yet
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-md p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'month' 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'year' 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Year
            </button>
          </div>

          {viewMode === 'month' ? (
            <>
              <button
                onClick={handlePreviousMonth}
                disabled={monthOptions.findIndex(option => option.value === selectedMonth) >= monthOptions.length - 1}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <select
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {monthOptions.map((option, index) => {
                  const isFuture = new Date(option.value + '-01') > new Date();
                  return (
                    <option key={`${option.value}-${index}`} value={option.value}>
                      {option.label}{isFuture ? ' (Future)' : ''}
                    </option>
                  );
                })}
              </select>
              
              <button
                onClick={handleNextMonth}
                disabled={monthOptions.findIndex(option => option.value === selectedMonth) <= 0}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleCurrentMonth}
                className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                title="Jump to current month"
              >
                Current Month
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handlePreviousYear}
                disabled={selectedYear ? yearOptions.findIndex(option => option.value === selectedYear) >= yearOptions.length - 1 : true}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous year"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <select
                value={selectedYear || ''}
                onChange={(e) => onYearChange?.(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {yearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}{option.isCurrent ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
              
              <button
                onClick={handleNextYear}
                disabled={selectedYear ? yearOptions.findIndex(option => option.value === selectedYear) <= 0 : true}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next year"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleCurrentYear}
                className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                title="Jump to current year"
              >
                Current Year
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
