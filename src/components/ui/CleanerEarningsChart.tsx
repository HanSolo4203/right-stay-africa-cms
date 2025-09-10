'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, TrendingUp, Users } from 'lucide-react';

interface CleanerEarningsData {
  cleaner_name: string;
  cleaner_id: string;
  session_count: number;
  total_earnings: number;
  average_earnings_per_session: number;
}

interface CleanerEarningsChartProps {
  data: CleanerEarningsData[];
}

export default function CleanerEarningsChart({ data }: CleanerEarningsChartProps) {
  // Calculate total earnings across all cleaners
  const totalEarnings = data.reduce((sum, cleaner) => sum + cleaner.total_earnings, 0);
  const totalSessions = data.reduce((sum, cleaner) => sum + cleaner.session_count, 0);
  const averageEarningsPerSession = totalSessions > 0 ? totalEarnings / totalSessions : 0;

  // Color palette for bars
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-blue-600">
            <DollarSign className="inline w-4 h-4 mr-1" />
            Total Earnings: R{data.total_earnings.toFixed(2)}
          </p>
          <p className="text-gray-600">
            Sessions: {data.session_count}
          </p>
          <p className="text-gray-600">
            Avg per Session: R{data.average_earnings_per_session.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cleaner Earnings</h3>
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
        <h3 className="text-lg font-semibold text-gray-900">Cleaner Earnings</h3>
        <DollarSign className="w-5 h-5 text-green-600" />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
      </div>

      {/* Chart */}
      <div className="h-80">
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
            <Tooltip content={<CustomTooltip />} />
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

      {/* Top Performers */}
      {data.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Top Earners</h4>
          <div className="space-y-2">
            {data.slice(0, 3).map((cleaner, index) => (
              <div key={cleaner.cleaner_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg space-y-2 sm:space-y-0">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{cleaner.cleaner_name}</p>
                    <p className="text-sm text-gray-600">{cleaner.session_count} sessions</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold text-green-600">R{cleaner.total_earnings.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">R{cleaner.average_earnings_per_session.toFixed(2)}/session</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
