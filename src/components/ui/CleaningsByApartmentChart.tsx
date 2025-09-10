'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2 } from 'lucide-react';

interface CleaningsByApartmentChartProps {
  data: Array<{
    apartment_number: string;
    owner_name: string;
    cleaning_count: number;
    apartment_id: string;
  }>;
}

export default function CleaningsByApartmentChart({ data }: CleaningsByApartmentChartProps) {
  // Prepare data for the chart (limit to top 10 apartments)
  const chartData = data.slice(0, 10).map(apartment => ({
    apartment: `Apt ${apartment.apartment_number}`,
    cleanings: apartment.cleaning_count,
    owner: apartment.owner_name,
    fullLabel: `Apt ${apartment.apartment_number} (${apartment.owner_name})`
  }));

  const CustomTooltip = ({ active, payload }: { 
    active?: boolean; 
    payload?: Array<{ payload: { fullLabel: string; cleaning_count: number } }> 
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.fullLabel}</p>
          <p className="text-blue-600">
            <span className="font-medium">{data.cleaning_count}</span> cleaning{data.cleaning_count !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Building2 className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Cleanings by Apartment</h3>
        </div>
        <div className="text-sm text-gray-500">
          Top {Math.min(10, data.length)} apartments
        </div>
      </div>
      
      {chartData.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="apartment" 
                stroke="#6b7280"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                label={{ value: 'Cleanings', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="cleanings" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                name="Cleanings"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>No cleaning data available for this period</p>
          </div>
        </div>
      )}
      
      {data.length > 10 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Showing top 10 apartments. {data.length - 10} more apartments have cleaning data.
        </div>
      )}
    </div>
  );
}
