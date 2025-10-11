'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, User, Users, FileText, Search, RefreshCw, Building2 } from 'lucide-react';

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

export default function UpcomingCleaningsTable() {
  const [upcomingCleanings, setUpcomingCleanings] = useState<UpcomingCleaning[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUpcomingCleanings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/cleaning-sessions?upcoming=true');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.data) {
            // Ensure data is an array and has the expected structure
            const cleanings = Array.isArray(data.data) ? data.data : [];
            // Sort by cleaning_date in ascending order (earliest first)
            const sortedCleanings = cleanings.sort((a: UpcomingCleaning, b: UpcomingCleaning) => {
              const dateA = new Date(a.cleaning_date);
              const dateB = new Date(b.cleaning_date);
              return dateA.getTime() - dateB.getTime();
            });
            setUpcomingCleanings(sortedCleanings);
          } else {
            setUpcomingCleanings([]);
          }
        } else {
          console.error('Failed to fetch upcoming cleanings:', response.status, response.statusText);
          setUpcomingCleanings([]);
        }
      } catch (error) {
        console.error('Error fetching upcoming cleanings:', error);
        setUpcomingCleanings([]);
      } finally {
        setLoading(false);
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
      console.error('Error formatting date:', error);
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
      console.error('Error formatting cleaners:', error);
      return 'N/A';
    }
  };

  const isToday = (dateString: string) => {
    try {
      if (!dateString) return false;
      const cleaningDate = new Date(dateString);
      const today = new Date();
      return cleaningDate.toDateString() === today.toDateString();
    } catch (error) {
      console.error('Error checking if date is today:', error);
      return false;
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
      console.error('Error formatting today date:', error);
      return 'Today';
    }
  };

  // Filter cleanings based on search term
  const filteredCleanings = upcomingCleanings.filter(cleaning =>
    cleaning.apartment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cleaning.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cleaning.cleaner_1_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cleaning.cleaner_2_name && cleaning.cleaner_2_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const refreshData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cleaning-sessions?upcoming=true');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          const cleanings = Array.isArray(data.data) ? data.data : [];
          const sortedCleanings = cleanings.sort((a: UpcomingCleaning, b: UpcomingCleaning) => {
            const dateA = new Date(a.cleaning_date);
            const dateB = new Date(b.cleaning_date);
            return dateA.getTime() - dateB.getTime();
          });
          setUpcomingCleanings(sortedCleanings);
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-0">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Cleanings</h3>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={refreshData}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors shrink-0"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search cleanings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Today's Date Display */}
      <div className="mb-6">
        <div className="text-center">
          <div className="inline-block bg-gradient-to-r from-orange-500 to-red-500 bg-opacity-20 backdrop-blur-sm rounded-2xl px-8 py-4 border border-orange-400 border-opacity-30">
            <div className="text-2xl font-bold text-orange-300 mb-1">
              {formatTodayDate()}
            </div>
            <div className="text-orange-200 text-sm font-medium">
              Today&apos;s Schedule
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading upcoming cleanings...</span>
        </div>
      ) : filteredCleanings.length > 0 ? (
        <>
          {/* Mobile list */}
          <div className="md:hidden">
            <div className="space-y-4">
              {filteredCleanings.map((cleaning) => {
                const isTodayCleaning = isToday(cleaning.cleaning_date);
                return (
                  <div
                    key={cleaning.id}
                    className={`p-4 rounded-lg border ${
                      isTodayCleaning 
                        ? 'bg-orange-50 border-orange-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm font-medium ${
                          isTodayCleaning ? 'text-orange-900' : 'text-gray-900'
                        }`}>
                          {formatDate(cleaning.cleaning_date)}
                        </span>
                        {isTodayCleaning && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500 text-white">
                            TODAY
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${
                        isTodayCleaning ? 'text-orange-900' : 'text-gray-900'
                      }`}>
                        R{cleaning.total_cleaning_fee ? cleaning.total_cleaning_fee.toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm ${
                          isTodayCleaning ? 'text-orange-800' : 'text-gray-700'
                        }`}>
                          Apartment {cleaning.apartment_number}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm ${
                          isTodayCleaning ? 'text-orange-800' : 'text-gray-700'
                        }`}>
                          {cleaning.owner_name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {cleaning.is_multi_cleaner ? (
                          <Users className="w-4 h-4 text-blue-600" />
                        ) : (
                          <User className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={`text-sm ${
                          isTodayCleaning ? 'text-orange-800' : 'text-gray-700'
                        }`}>
                          {formatCleaners(cleaning)}
                        </span>
                        {cleaning.is_multi_cleaner && (
                          <span className="text-xs text-blue-600 font-medium">Multi-cleaner</span>
                        )}
                      </div>
                      {cleaning.notes && (
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className={`text-sm ${
                            isTodayCleaning ? 'text-orange-800' : 'text-gray-700'
                          }`}>
                            {cleaning.notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Apartment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cleaner(s)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCleanings.map((cleaning) => {
                  const isTodayCleaning = isToday(cleaning.cleaning_date);
                  return (
                    <tr 
                      key={cleaning.id} 
                      className={`hover:bg-gray-50 transition-all duration-200 ${
                        isTodayCleaning 
                          ? 'bg-orange-50 border-l-4 border-orange-400' 
                          : ''
                      }`}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        isTodayCleaning ? 'text-orange-900' : 'text-gray-900'
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
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isTodayCleaning ? 'text-orange-900' : 'text-gray-900'
                      }`}>
                        {cleaning.apartment_number}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isTodayCleaning ? 'text-orange-900' : 'text-gray-900'
                      }`}>
                        {cleaning.owner_name}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isTodayCleaning ? 'text-orange-900' : 'text-gray-900'
                      }`}>
                        <div className="flex flex-col">
                          <span>{formatCleaners(cleaning)}</span>
                          {cleaning.is_multi_cleaner && (
                            <span className="text-xs text-blue-600 font-medium">Multi-cleaner</span>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        isTodayCleaning ? 'text-orange-900' : 'text-gray-900'
                      }`}>
                        R{cleaning.total_cleaning_fee ? cleaning.total_cleaning_fee.toFixed(2) : '0.00'}
                      </td>
                      <td className={`px-6 py-4 text-sm max-w-xs truncate ${
                        isTodayCleaning ? 'text-orange-900' : 'text-gray-900'
                      }`}>
                        {cleaning.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-blue-600 font-medium">Total Cleanings</p>
              <p className="text-2xl font-bold text-blue-700">{filteredCleanings.length}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-orange-600 font-medium">Today&apos;s Cleanings</p>
              <p className="text-2xl font-bold text-orange-700">
                {filteredCleanings.filter(cleaning => isToday(cleaning.cleaning_date)).length}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-green-600 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-green-700">
                R{filteredCleanings.reduce((sum, cleaning) => sum + (cleaning.total_cleaning_fee || 0), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium">No upcoming cleanings found</p>
          <p className="text-sm">Check back later for scheduled cleanings</p>
        </div>
      )}
    </div>
  );
}
