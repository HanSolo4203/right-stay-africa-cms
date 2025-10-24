'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { DollarSign, TrendingUp, Users, FileText, Download } from 'lucide-react';

interface CleanerEarningsData {
  cleaner_name: string;
  cleaner_id: string | null;
  session_count: number;
  total_earnings: number;
  average_earnings_per_session: number;
  primary_sessions: number;
  secondary_sessions: number;
  cleaning_earnings: number;
  rsa_laundry_earnings: number;
  rsa_laundry_sessions: number;
}

interface CleanerEarningsReportProps {
  data: CleanerEarningsData[];
}

export default function CleanerEarningsReport({ data }: CleanerEarningsReportProps) {
  // Calculate summary statistics
  const totalEarnings = data.reduce((sum, cleaner) => sum + cleaner.total_earnings, 0);
  const totalSessions = data.reduce((sum, cleaner) => sum + cleaner.session_count, 0);
  const averageEarningsPerSession = totalSessions > 0 ? totalEarnings / totalSessions : 0;
  const totalPrimarySessions = data.reduce((sum, cleaner) => sum + cleaner.primary_sessions, 0);
  const totalSecondarySessions = data.reduce((sum, cleaner) => sum + cleaner.secondary_sessions, 0);

  // Color palette for charts
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  // Prepare data for pie chart (earnings distribution)
  const pieChartData = data.map((cleaner, index) => ({
    name: cleaner.cleaner_name,
    value: cleaner.total_earnings,
    color: colors[index % colors.length],
    percentage: totalEarnings > 0 ? ((cleaner.total_earnings / totalEarnings) * 100).toFixed(1) : '0'
  }));

  // Export to CSV function
  const exportToCSV = () => {
    const csvContent = [
      ['Cleaner Name', 'Total Sessions', 'Primary Sessions', 'Secondary Sessions', 'Cleaning Earnings (R)', 'RSA Laundry Earnings (R)', 'RSA Laundry Sessions', 'Total Earnings (R)', 'Average per Session (R)', 'Earnings Percentage'],
      ...data.map(cleaner => [
        cleaner.cleaner_name,
        cleaner.session_count,
        cleaner.primary_sessions,
        cleaner.secondary_sessions,
        cleaner.cleaning_earnings.toFixed(2),
        cleaner.rsa_laundry_earnings.toFixed(2),
        cleaner.rsa_laundry_sessions,
        cleaner.total_earnings.toFixed(2),
        cleaner.average_earnings_per_session.toFixed(2),
        totalEarnings > 0 ? ((cleaner.total_earnings / totalEarnings) * 100).toFixed(1) + '%' : '0%'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaner-earnings-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cleaner Earnings Report</h3>
          <DollarSign className="w-5 h-5 text-green-600" />
        </div>
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No earnings data available for the selected period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <DollarSign className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Cleaner Earnings Report</h3>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <DollarSign className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-800">Total Earnings</p>
              <p className="text-2xl font-bold text-green-900">R{totalEarnings.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-800">Avg per Session</p>
              <p className="text-2xl font-bold text-blue-900">R{averageEarningsPerSession.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-purple-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-purple-800">Active Cleaners</p>
              <p className="text-2xl font-bold text-purple-900">{data.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-orange-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-orange-800">Total Sessions</p>
              <p className="text-2xl font-bold text-orange-900">{totalSessions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Earnings Bar Chart */}
        <div className="h-80">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Earnings by Cleaner</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 20,
                right: 10,
                left: 10,
                bottom: 80,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="cleaner_name" 
                stroke="#6b7280"
                fontSize={10}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={10}
                tickFormatter={(value) => `R${value}`}
              />
              <Tooltip 
                formatter={(value: number) => [`R${value.toFixed(2)}`, 'Total Earnings']}
                labelFormatter={(label) => `Cleaner: ${label}`}
              />
              <Bar 
                dataKey="total_earnings" 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Earnings Distribution Pie Chart */}
        <div className="h-80">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Earnings Distribution</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }: { name?: string; value?: string | number }) => {
                  const numValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) || 0 : 0);
                  const percentage = totalEarnings > 0 ? ((numValue / totalEarnings) * 100).toFixed(1) : '0';
                  return `${name || 'Unknown'}: ${percentage}%`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`R${value.toFixed(2)}`, 'Earnings']}
                labelFormatter={(label) => `Cleaner: ${label}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="overflow-x-auto">
        <h4 className="text-md font-semibold text-gray-900 mb-3">Detailed Breakdown</h4>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cleaner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sessions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Primary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Secondary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cleaning Earnings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                RSA Laundry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Earnings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg per Session
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                % of Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((cleaner, index) => (
              <tr key={cleaner.cleaner_id || index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3" 
                      style={{ backgroundColor: colors[index % colors.length] }}
                    ></div>
                    <span className="text-sm font-medium text-gray-900">{cleaner.cleaner_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {cleaner.session_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {cleaner.primary_sessions}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {cleaner.secondary_sessions}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                  R{cleaner.cleaning_earnings.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                  R{cleaner.rsa_laundry_earnings.toFixed(2)}
                  {cleaner.rsa_laundry_sessions > 0 && (
                    <div className="text-xs text-gray-500">
                      ({cleaner.rsa_laundry_sessions} session{cleaner.rsa_laundry_sessions !== 1 ? 's' : ''})
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                  R{cleaner.total_earnings.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  R{cleaner.average_earnings_per_session.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {totalEarnings > 0 ? ((cleaner.total_earnings / totalEarnings) * 100).toFixed(1) : '0'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Session Type Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-3">Session Type Summary</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-800">Primary Sessions</p>
                <p className="text-xl font-bold text-blue-900">{totalPrimarySessions}</p>
                <p className="text-xs text-blue-600">
                  {totalSessions > 0 ? ((totalPrimarySessions / totalSessions) * 100).toFixed(1) : '0'}% of total
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-800">Secondary Sessions</p>
                <p className="text-xl font-bold text-green-900">{totalSecondarySessions}</p>
                <p className="text-xs text-green-600">
                  {totalSessions > 0 ? ((totalSecondarySessions / totalSessions) * 100).toFixed(1) : '0'}% of total
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
