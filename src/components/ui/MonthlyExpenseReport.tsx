'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Download, 
  Filter, 
  TrendingUp, 
  Users, 
  DollarSign,
  BarChart3,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
// import MonthSelector from './MonthSelector';

interface MonthlyExpenseData {
  month_year: string;
  total_expenses: number;
  total_days: number;
  average_daily_payment: number;
  cleaner_count: number;
  expenses: Array<{
    id: string;
    service_date: string;
    daily_payment_amount: number;
    cleaner_name: string;
    cleaner_id: string;
    is_paid: boolean;
    payment_date: string | null;
    notes: string;
  }>;
}

interface RunningTotal {
  month_year: string;
  monthly_total: number;
  running_total: number;
  year_to_date_total: number;
  monthly_average: number;
  year_to_date_average: number;
}

interface CleanerPerformance {
  cleaner_id: string;
  cleaner_name: string;
  month_year: string;
  total_payments: number;
  total_days: number;
  average_daily_payment: number;
  is_paid_count: number;
  unpaid_count: number;
}

interface ExpenseSummary {
  total_expenses: number;
  total_days: number;
  average_daily_payment: number;
  unique_cleaners: number;
  paid_expenses: number;
  unpaid_expenses: number;
  paid_days: number;
  unpaid_days: number;
}

interface MonthlyExpenseReportData {
  monthlyExpenses: MonthlyExpenseData[];
  runningTotals: RunningTotal[];
  cleanerPerformance: CleanerPerformance[];
  summary: ExpenseSummary | null;
  params: unknown;
  generatedAt: string;
}

export default function MonthlyExpenseReport() {
  const [data, setData] = useState<MonthlyExpenseReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedCleaner, setSelectedCleaner] = useState('');
  const [includeDetails, setIncludeDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [cleaners, setCleaners] = useState<Array<{id: string; name: string}>>([]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      if (selectedCleaner) params.append('cleanerId', selectedCleaner);
      if (includeDetails) params.append('includeDetails', 'true');

      const response = await fetch(`/api/rsa-laundry-monthly-expenses?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        console.log('Monthly expense data received:', result.data);
        setData(result.data);
      } else {
        console.error('Failed to load monthly expense data:', result.error);
        // Set empty data structure to prevent crashes
        setData({
          monthlyExpenses: [],
          runningTotals: [],
          cleanerPerformance: [],
          summary: null,
          params: {},
          generatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading monthly expense data:', error);
      // Set empty data structure to prevent crashes
      setData({
        monthlyExpenses: [],
        runningTotals: [],
        cleanerPerformance: [],
        summary: null,
        params: {},
        generatedAt: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, selectedCleaner, includeDetails]);

  const loadCleaners = async () => {
    try {
      const response = await fetch('/api/cleaners');
      const result = await response.json();
      if (result.success) {
        setCleaners(result.data);
      }
    } catch (error) {
      console.error('Error loading cleaners:', error);
    }
  };

  useEffect(() => {
    loadData();
    loadCleaners();
  }, [dateRange, selectedCleaner, includeDetails, loadData]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      if (selectedCleaner) params.append('cleanerId', selectedCleaner);
      if (includeDetails) params.append('includeDetails', 'true');
      params.append('format', format);

      const response = await fetch(`/api/rsa-laundry-monthly-expenses?${params.toString()}`);
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rsa-laundry-expenses-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const result = await response.json();
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rsa-laundry-expenses-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-0">Monthly Expense Report</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </button>
          <button
            onClick={loadData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cleaner</label>
              <select
                value={selectedCleaner}
                onChange={(e) => setSelectedCleaner(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Cleaners</option>
                {cleaners.map(cleaner => (
                  <option key={cleaner.id} value={cleaner.id}>{cleaner.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={includeDetails}
                onChange={(e) => setIncludeDetails(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Include detailed expense breakdown</span>
            </label>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total Expenses</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(data.summary.total_expenses)}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Total Days</p>
                <p className="text-2xl font-bold text-green-900">{data.summary.total_days}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-600">Avg Daily Payment</p>
                <p className="text-2xl font-bold text-purple-900">{formatCurrency(data.summary.average_daily_payment)}</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-600">Unique Cleaners</p>
                <p className="text-2xl font-bold text-orange-900">{data.summary.unique_cleaners}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Expenses Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Monthly Expenses
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Expenses</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Daily</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cleaners</th>
                  {includeDetails && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.monthlyExpenses.map((month) => (
                  <tr key={month.month_year} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{formatMonth(month.month_year)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(month.total_expenses)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{month.total_days}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(month.average_daily_payment)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{month.cleaner_count}</td>
                    {includeDetails && (
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:text-blue-800">View Details</summary>
                          <div className="mt-2 max-h-32 overflow-y-auto">
                            {month.expenses.map((expense) => (
                              <div key={expense.id} className="text-xs border-b border-gray-100 py-1">
                                <div className="flex justify-between">
                                  <span>{expense.cleaner_name}</span>
                                  <span>{formatCurrency(expense.daily_payment_amount)}</span>
                                </div>
                                <div className="text-gray-500">{expense.service_date}</div>
                              </div>
                            ))}
                          </div>
                        </details>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Running Totals */}
      {data?.runningTotals && data.runningTotals.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Running Totals</h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Running Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">YTD Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Avg</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">YTD Avg</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.runningTotals.map((total) => (
                    <tr key={total.month_year} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{formatMonth(total.month_year)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(total.monthly_total)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(total.running_total)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(total.year_to_date_total)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(total.monthly_average)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(total.year_to_date_average)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cleaner Performance */}
      {data?.cleanerPerformance && data.cleanerPerformance.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cleaner Performance</h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cleaner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Payments</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Daily</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unpaid</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.cleanerPerformance.map((cleaner) => (
                    <tr key={`${cleaner.cleaner_id}-${cleaner.month_year}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{cleaner.cleaner_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatMonth(cleaner.month_year)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(cleaner.total_payments)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{cleaner.total_days}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(cleaner.average_daily_payment)}</td>
                      <td className="px-4 py-3 text-sm text-green-600">{cleaner.is_paid_count}</td>
                      <td className="px-4 py-3 text-sm text-red-600">{cleaner.unpaid_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Generated At */}
      {data?.generatedAt && (
        <div className="mt-6 text-sm text-gray-500 text-center">
          Report generated at: {new Date(data.generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
