'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface MonthlyTrendsChartProps {
  data: Array<{
    month: string;
    month_key: string;
    cleaning_count: number;
    unique_apartments: number;
    unique_cleaners: number;
  }>;
}

export default function MonthlyTrendsChart({ data }: MonthlyTrendsChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              <span className="font-medium">{entry.value}</span> {entry.dataKey === 'cleaning_count' ? 'cleanings' : 
                entry.dataKey === 'unique_apartments' ? 'apartments' : 'cleaners'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <TrendingUp className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
        </div>
        <div className="text-sm text-gray-500">
          Last 6 months
        </div>
      </div>
      
      {data.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                fontSize={12}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cleaning_count" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                name="Cleanings"
              />
              <Line 
                type="monotone" 
                dataKey="unique_apartments" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                name="Active Apartments"
              />
              <Line 
                type="monotone" 
                dataKey="unique_cleaners" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                name="Active Cleaners"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>No trend data available</p>
          </div>
        </div>
      )}
      
      {data.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="text-gray-600">Average Cleanings</p>
            <p className="font-semibold text-blue-600">
              {(data.reduce((sum, month) => sum + month.cleaning_count, 0) / data.length).toFixed(1)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Peak Month</p>
            <p className="font-semibold text-green-600">
              {data.reduce((max, month) => month.cleaning_count > max.cleaning_count ? month : max, data[0])?.month}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Growth Trend</p>
            <p className="font-semibold text-purple-600">
              {data.length >= 2 ? 
                (data[data.length - 1].cleaning_count > data[0].cleaning_count ? '↗️ Growing' : '↘️ Declining') : 
                '—'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
