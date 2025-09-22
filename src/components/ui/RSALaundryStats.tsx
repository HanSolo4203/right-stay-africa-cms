'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, DollarSign, Users, TrendingUp, BarChart3 } from 'lucide-react';
import MonthSelector from './MonthSelector';

interface RSALaundryStatsData {
  currentMonth: {
    totalExpenses: number;
    totalDays: number;
    averageDailyPayment: number;
  };
  monthlyBreakdown: Array<{
    month: string;
    totalExpenses: number;
    totalDays: number;
    averagePayment: number;
  }>;
  cleanerPerformance: Array<{
    cleaner_id: string;
    cleaner_name: string;
    totalDays: number;
    totalPayments: number;
    averagePayment: number;
  }>;
  yearToDate: {
    totalExpenses: number;
    totalDays: number;
    averageDailyPayment: number;
  };
}

interface RSALaundryStatsProps {
  selectedMonth?: string;
}

export default function RSALaundryStats({ selectedMonth: propSelectedMonth }: RSALaundryStatsProps) {
  const [stats, setStats] = useState<RSALaundryStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Use prop month if provided, otherwise default to current month
    return propSelectedMonth || new Date().toISOString().slice(0, 7);
  });

  // Update selectedMonth when prop changes
  useEffect(() => {
    if (propSelectedMonth && propSelectedMonth !== selectedMonth) {
      setSelectedMonth(propSelectedMonth);
    }
  }, [propSelectedMonth, selectedMonth]);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/rsa-laundry-stats?month=${selectedMonth}`);
      const result = await response.json();

      if (result.success) {
        console.log('RSA Laundry Stats received:', result.data);
        setStats(result.data);
      } else {
        console.error('Failed to load RSA laundry stats:', result.error);
      }
    } catch (error) {
      console.error('Error loading RSA laundry stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadStats();
  }, [selectedMonth, loadStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">RSA Laundry Service Statistics</h2>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-0">RSA Laundry Service Statistics</h2>
        {!propSelectedMonth && (
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        )}
      </div>

      {/* Current Month Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-600">Monthly Total</p>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(stats.currentMonth.totalExpenses)}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Service Days</p>
              <p className="text-2xl font-bold text-blue-900">{stats.currentMonth.totalDays}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Avg Daily Payment</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.currentMonth.averageDailyPayment)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Year-to-Date Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Year-to-Date Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.yearToDate.totalExpenses)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Days</p>
            <p className="text-xl font-bold text-gray-900">{stats.yearToDate.totalDays}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Average Daily Payment</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.yearToDate.averageDailyPayment)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Breakdown */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Monthly Breakdown
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.monthlyBreakdown.map((month, index) => (
                    <tr key={month.month || `month-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{formatMonth(month.month || '')}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{month.totalDays || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(month.totalExpenses || 0)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(month.averagePayment || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cleaner Performance */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Cleaner Performance
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cleaner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.cleanerPerformance.map((cleaner, index) => (
                    <tr key={cleaner.cleaner_id || `cleaner-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{cleaner.cleaner_name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{cleaner.totalDays || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(cleaner.totalPayments || 0)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(cleaner.averagePayment || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
