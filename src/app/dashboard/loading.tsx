'use client';

import { useState, useEffect } from 'react';

interface UpcomingCleaning {
  cleaning_date: string;
  cleaner_1_name: string;
  cleaner_2_name: string | null;
  is_multi_cleaner: boolean;
  total_cleaning_fee: string;
  apartment_number: string;
  owner_name: string;
  notes: string;
  property_category: string;
}

export default function Loading() {
  const [upcomingCleanings, setUpcomingCleanings] = useState<UpcomingCleaning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingCleanings = async () => {
      try {
        const response = await fetch('/api/cleaning-sessions?upcoming=true');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUpcomingCleanings(data.data || []);
          }
        }
      } catch (error) {
        console.error('Error fetching upcoming cleanings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingCleanings();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCleaners = (cleaning: UpcomingCleaning) => {
    if (cleaning.is_multi_cleaner && cleaning.cleaner_2_name) {
      return `${cleaning.cleaner_1_name} + ${cleaning.cleaner_2_name}`;
    }
    return cleaning.cleaner_1_name;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
        <p className="text-lg text-gray-600">Loading your dashboard...</p>
      </div>

      {/* Upcoming Cleanings Table */}
      <div className="w-full max-w-4xl">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
          This Week&apos;s Cleaning Schedule
        </h2>
        
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : upcomingCleanings.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Apartment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cleaner(s)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {upcomingCleanings.map((cleaning, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDate(cleaning.cleaning_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {cleaning.apartment_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {cleaning.owner_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span>{formatCleaners(cleaning)}</span>
                          {cleaning.is_multi_cleaner && (
                            <span className="text-xs text-blue-600 font-medium">Multi-cleaner</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                        R{parseFloat(cleaning.total_cleaning_fee).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {cleaning.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No upcoming cleanings scheduled for this week.</p>
          </div>
        )}
      </div>
    </div>
  );
}


