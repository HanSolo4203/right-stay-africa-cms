'use client';

import { useEffect, useState } from 'react';
import LoadingImage from '@/components/ui/LoadingImage';

interface UpcomingCleaning {
  id: string;
  cleaning_date: string;
  cleaner_1_name: string;
  cleaner_2_name: string | null;
  is_multi_cleaner: boolean;
  total_cleaning_fee: number;
  apartment_number: string;
  owner_name: string;
  notes: string;
  property_category: string;
  // Additional fields from API response
  cleaner_1_fee?: number;
  cleaner_2_fee?: number | null;
  cleaner_count?: number;
  price?: number | null;
}

interface LoginLoadingAnimationProps {
  onComplete: () => void;
}

export default function LoginLoadingAnimation({ onComplete }: LoginLoadingAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [upcomingCleanings, setUpcomingCleanings] = useState<UpcomingCleaning[]>([]);
  const [cleaningsLoading, setCleaningsLoading] = useState(true);

  useEffect(() => {
    const loadingSteps = [
      { text: 'Initializing...', duration: 500 },
      { text: 'Authenticating...', duration: 800 },
      { text: 'Loading Dashboard...', duration: 1000 },
      { text: 'Almost Ready...', duration: 700 }
    ];

    let currentStep = 0;
    let totalTime = 0;

    // Start immediately with no delay
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        setLoadingText(loadingSteps[currentStep].text);
        totalTime += loadingSteps[currentStep].duration;
        setProgress((totalTime / 3000) * 100);
        currentStep++;
      } else {
        setProgress(100);
        setLoadingText('Welcome to Right Stay Africa!');
        setLoadingComplete(true);
        clearInterval(interval);
      }
    }, 0); // Start immediately

    return () => clearInterval(interval);
  }, [onComplete]);

  // Fetch upcoming cleanings
  useEffect(() => {
    const fetchUpcomingCleanings = async () => {
      try {
        console.log('[LOGIN LOADING] Fetching upcoming cleanings...');
        const response = await fetch('/api/cleaning-sessions?upcoming=true');
        console.log('[LOGIN LOADING] Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[LOGIN LOADING] Response data:', data);
          
          if (data.success && data.data) {
            // Ensure data is an array and has the expected structure
            const cleanings = Array.isArray(data.data) ? data.data : [];
            // Sort by cleaning_date in ascending order (earliest first)
            const sortedCleanings = cleanings.sort((a: UpcomingCleaning, b: UpcomingCleaning) => {
              const dateA = new Date(a.cleaning_date);
              const dateB = new Date(b.cleaning_date);
              return dateA.getTime() - dateB.getTime();
            });
            console.log('[LOGIN LOADING] Processed cleanings:', sortedCleanings);
            setUpcomingCleanings(sortedCleanings);
          } else {
            console.warn('[LOGIN LOADING] No data or unsuccessful response:', data);
            setUpcomingCleanings([]);
          }
        } else {
          console.error('[LOGIN LOADING] Response not ok:', response.status, response.statusText);
          setUpcomingCleanings([]);
        }
      } catch (error) {
        console.error('[LOGIN LOADING] Error fetching upcoming cleanings:', error);
        setUpcomingCleanings([]);
      } finally {
        setCleaningsLoading(false);
      }
    };

    fetchUpcomingCleanings();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('[LOGIN LOADING] Error formatting date:', error);
      return 'N/A';
    }
  };

  const formatCleaners = (cleaning: UpcomingCleaning) => {
    try {
      if (!cleaning) return 'N/A';
      if (cleaning.is_multi_cleaner && cleaning.cleaner_2_name) {
        return `${cleaning.cleaner_1_name || 'Unknown'} + ${cleaning.cleaner_2_name}`;
      }
      return cleaning.cleaner_1_name || 'Unknown';
    } catch (error) {
      console.error('[LOGIN LOADING] Error formatting cleaners:', error);
      return 'N/A';
    }
  };

  const formatTodayDate = () => {
    try {
      const today = new Date();
      return today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('[LOGIN LOADING] Error formatting today date:', error);
      return 'Today';
    }
  };

  const isToday = (dateString: string) => {
    try {
      if (!dateString) return false;
      const cleaningDate = new Date(dateString);
      const today = new Date();
      return cleaningDate.toDateString() === today.toDateString();
    } catch (error) {
      console.error('[LOGIN LOADING] Error checking if date is today:', error);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="text-center mb-8">
        {/* Loading image */}
        <div className="mb-6">
          <div className="relative inline-block">
            <LoadingImage size={40} fullScreen={false} alt="Loading" />
          </div>
        </div>

        {/* Enter Dashboard Button - only show when loading is complete */}
        {loadingComplete && (
          <div className="mb-6">
            <button
              onClick={onComplete}
              className="px-8 py-3 bg-white text-black font-bold text-lg rounded-lg hover:bg-gray-200 transition-colors duration-200 shadow-lg"
            >
              Enter Dashboard
            </button>
          </div>
        )}
        
        {/* Loading text */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white mb-2">
            {loadingText}
          </h2>
          <p className="text-white text-sm">
            Please wait while we prepare your dashboard...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-80 mx-auto mb-4">
          <div className="bg-gray-700 border border-white rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-white to-gray-300 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Progress Percentage */}
        <div className="text-white text-sm font-mono">
          {Math.round(progress)}%
        </div>
      </div>

      {/* Today's Date Display */}
      <div className="w-full max-w-4xl mb-6">
        <div className="text-center">
          <div className="inline-block bg-gradient-to-r from-orange-500 to-red-500 bg-opacity-20 backdrop-blur-sm rounded-2xl px-8 py-4 border border-orange-400 border-opacity-30">
            <div className="text-3xl font-bold text-orange-300 mb-1">
              {formatTodayDate()}
            </div>
            <div className="text-orange-200 text-sm font-medium">
              Today&apos;s Schedule
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Cleanings Table */}
      <div className="w-full max-w-4xl mb-8">
        <h3 className="text-xl font-semibold text-white mb-4 text-center">
          This Week&apos;s Cleaning Schedule
        </h3>
        
        {cleaningsLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : upcomingCleanings.length > 0 ? (
          <div className="bg-gray-800 bg-opacity-90 backdrop-blur-sm rounded-lg border border-gray-600 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">
                      Apartment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">
                      Cleaner(s)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">
                      Fee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-100 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-600">
                  {upcomingCleanings.map((cleaning) => {
                    const isTodayCleaning = isToday(cleaning.cleaning_date);
                    return (
                      <tr 
                        key={cleaning.id} 
                        className={`hover:bg-gray-700 hover:bg-opacity-50 transition-all duration-200 ${
                          isTodayCleaning 
                            ? 'bg-orange-500 bg-opacity-20 border-l-4 border-orange-400 shadow-lg' 
                            : ''
                        }`}
                      >
                        <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                          isTodayCleaning ? 'text-orange-200' : 'text-gray-100'
                        }`}>
                          <div className="flex items-center">
                            {formatDate(cleaning.cleaning_date)}
                            {isTodayCleaning && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500 text-white">
                                TODAY
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${
                          isTodayCleaning ? 'text-orange-200' : 'text-gray-100'
                        }`}>
                          {cleaning.apartment_number}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${
                          isTodayCleaning ? 'text-orange-200' : 'text-gray-100'
                        }`}>
                          {cleaning.owner_name}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${
                          isTodayCleaning ? 'text-orange-200' : 'text-gray-100'
                        }`}>
                          <div className="flex flex-col">
                            <span>{formatCleaners(cleaning)}</span>
                            {cleaning.is_multi_cleaner && (
                              <span className={`text-xs font-medium ${
                                isTodayCleaning ? 'text-yellow-300' : 'text-yellow-400'
                              }`}>Multi-cleaner</span>
                            )}
                          </div>
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                          isTodayCleaning ? 'text-orange-200' : 'text-gray-100'
                        }`}>
                          R{cleaning.total_cleaning_fee ? cleaning.total_cleaning_fee.toFixed(2) : '0.00'}
                        </td>
                        <td className={`px-4 py-3 text-sm max-w-xs truncate ${
                          isTodayCleaning ? 'text-orange-200' : 'text-gray-100'
                        }`}>
                          {cleaning.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-white text-opacity-70">No upcoming cleanings scheduled for this week.</p>
          </div>
        )}
      </div>

    </div>
  );
}
