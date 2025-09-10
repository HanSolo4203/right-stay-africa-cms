'use client';

import { useState, useEffect } from 'react';
import MonthSelector from '@/components/ui/MonthSelector';
import SummaryCards from '@/components/ui/SummaryCards';
import CleaningsByApartmentChart from '@/components/ui/CleaningsByApartmentChart';
import CleanerWorkloadChart from '@/components/ui/CleanerWorkloadChart';
import MonthlyTrendsChart from '@/components/ui/MonthlyTrendsChart';
import InvoicingTable from '@/components/ui/InvoicingTable';
import { Toaster } from 'react-hot-toast';

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`; // YYYY-MM format in local timezone
  });
  
  const [selectedYear, setSelectedYear] = useState<string | undefined>(undefined);
  const [analyticsData, setAnalyticsData] = useState<{
    summary: {
      total_cleanings: number;
      total_revenue: number;
      active_cleaners: number;
      active_apartments: number;
    };
    invoicing_data: Array<{
      apartment_number: string;
      owner_name: string;
      cleaning_count: number;
      total_amount: number;
      apartment_id: string;
    }>;
    insights: {
      top_cleaner: string;
      busiest_apartment: string;
      average_cleaning_duration: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalyticsData = async (month?: string, year?: string) => {
    try {
      setLoading(true);
      let url = '/api/analytics?';
      if (month) {
        url += `month=${month}`;
      }
      if (year) {
        url += month ? `&year=${year}` : `year=${year}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        console.error('Failed to load analytics data:', result.error);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYear) {
      loadAnalyticsData(undefined, selectedYear);
    } else {
      loadAnalyticsData(selectedMonth);
    }
  }, [selectedMonth, selectedYear]);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth(''); // Clear month selection when year is selected
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setSelectedYear(undefined); // Clear year selection when month is selected
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive insights into your cleaning operations
          </p>
        </div>

        {/* Month/Year Selector */}
        <div className="mb-8">
          <MonthSelector 
            selectedMonth={selectedMonth} 
            onMonthChange={handleMonthChange}
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
          />
        </div>

        {/* Summary Cards */}
        {analyticsData && (
          <div className="mb-8">
            <SummaryCards data={analyticsData.summary} />
          </div>
        )}

        {/* Charts Grid */}
        {analyticsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <CleaningsByApartmentChart data={analyticsData.cleanings_by_apartment} />
            <CleanerWorkloadChart data={analyticsData.cleaner_workload} />
          </div>
        )}

        {/* Monthly Trends */}
        {analyticsData && (
          <div className="mb-8">
            <MonthlyTrendsChart data={analyticsData.monthly_trends} />
          </div>
        )}

        {/* Invoicing Table */}
        {analyticsData && (
          <div className="mb-8">
            <InvoicingTable 
              data={analyticsData.invoicing_data} 
              month={selectedMonth}
              year={selectedYear}
            />
          </div>
        )}

        {/* Insights Section */}
        {analyticsData && analyticsData.insights && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {analyticsData.insights.most_active_apartment && (
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Most Active Apartment</h4>
                  <p className="text-2xl font-bold text-blue-700">
                    Apt {analyticsData.insights.most_active_apartment.apartment_number}
                  </p>
                  <p className="text-sm text-blue-600">
                    {analyticsData.insights.most_active_apartment.cleaning_count} cleanings
                  </p>
                </div>
              )}
              
              {analyticsData.insights.top_cleaner && (
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Top Performer</h4>
                  <p className="text-2xl font-bold text-green-700">
                    {analyticsData.insights.top_cleaner.cleaner_name}
                  </p>
                  <p className="text-sm text-green-600">
                    {analyticsData.insights.top_cleaner.session_count} sessions
                  </p>
                </div>
              )}
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Average per Apartment</h4>
                <p className="text-2xl font-bold text-purple-700">
                  {analyticsData.summary.average_cleanings_per_apartment}
                </p>
                <p className="text-sm text-purple-600">cleanings this month</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}
