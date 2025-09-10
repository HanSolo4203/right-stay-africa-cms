'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Users } from 'lucide-react';

interface CleanerWorkloadChartProps {
  data: Array<{
    cleaner_name: string;
    session_count: number;
    cleaner_id: string;
  }>;
}

export default function CleanerWorkloadChart({ data }: CleanerWorkloadChartProps) {
  // Prepare data for the pie chart
  const chartData = data.map((cleaner) => ({
    name: cleaner.cleaner_name,
    value: cleaner.session_count,
    cleaner_id: cleaner.cleaner_id,
    percentage: data.length > 0 ? ((cleaner.session_count / data.reduce((sum, c) => sum + c.session_count, 0)) * 100).toFixed(1) : '0'
  }));

  // Color palette for the pie chart
  const COLORS = [
    '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', 
    '#ef4444', '#06b6d4', '#84cc16', '#f97316',
    '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'
  ];

  const CustomTooltip = ({ active, payload }: { 
    active?: boolean; 
    payload?: Array<{ payload: { name: string; value: number; percentage: string } }> 
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-blue-600">
            <span className="font-medium">{data.value}</span> session{data.value !== 1 ? 's' : ''}
          </p>
          <p className="text-gray-500 text-sm">
            {data.percentage}% of total workload
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: { 
    payload?: Array<{ value: string; color: string }> 
  }) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload?.map((entry, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const totalSessions = data.reduce((sum, cleaner) => sum + cleaner.session_count, 0);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Cleaner Workload Distribution</h3>
        </div>
        <div className="text-sm text-gray-500">
          {totalSessions} total sessions
        </div>
      </div>
      
      {chartData.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>No cleaner workload data available for this period</p>
          </div>
        </div>
      )}
      
      {chartData.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-sm">
            <p className="font-medium text-gray-900 mb-2">Workload Summary:</p>
            <ul className="space-y-1">
              {chartData.slice(0, 3).map((cleaner, index) => (
                <li key={index} className="flex justify-between">
                  <span className="text-gray-600">{cleaner.name}:</span>
                  <span className="font-medium">{cleaner.value} sessions</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-900 mb-2">Distribution:</p>
            <ul className="space-y-1">
              {chartData.slice(0, 3).map((cleaner, index) => (
                <li key={index} className="flex justify-between">
                  <span className="text-gray-600">{cleaner.name}:</span>
                  <span className="font-medium">{cleaner.percentage}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
