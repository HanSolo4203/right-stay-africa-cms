'use client';

import { ReactNode } from 'react';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: unknown, item: T) => ReactNode;
  className?: string;
  mobileHidden?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T) => void;
}

export default function ResponsiveTable<T extends Record<string, unknown>>({
  data,
  columns,
  emptyMessage = 'No data available',
  className = '',
  onRowClick
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center ${className}`}>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden ${className}`}>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr
                key={index}
                onClick={() => onRowClick?.(item)}
                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}
                  >
                    {column.render 
                      ? column.render(item[column.key], item)
                      : item[column.key]
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        {data.map((item, index) => (
          <div
            key={index}
            onClick={() => onRowClick?.(item)}
            className={`p-4 border-b border-gray-200 last:border-b-0 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
          >
            <div className="space-y-2">
              {columns
                .filter(column => !column.mobileHidden)
                .map((column) => (
                  <div key={String(column.key)} className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-500">
                      {column.label}:
                    </span>
                    <span className="text-sm text-gray-900 text-right flex-1 ml-2">
                      {column.render 
                        ? column.render(item[column.key], item)
                        : item[column.key]
                      }
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Specialized table for invoicing data
interface InvoicingRow {
  apartment_number: string;
  owner_name: string;
  cleaning_count: number;
  total_amount: number;
}

export function InvoicingTable({ data }: { data: InvoicingRow[] }) {
  const columns: Column<InvoicingRow>[] = [
    {
      key: 'apartment_number',
      label: 'Apartment',
      className: 'font-medium'
    },
    {
      key: 'owner_name',
      label: 'Owner',
      mobileHidden: true
    },
    {
      key: 'cleaning_count',
      label: 'Cleanings',
      render: (value) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {value}
        </span>
      )
    },
    {
      key: 'total_amount',
      label: 'Total',
      render: (value) => (
        <span className="font-semibold text-green-600">
          R{value.toFixed(2)}
        </span>
      ),
      className: 'text-right'
    }
  ];

  return (
    <ResponsiveTable
      data={data}
      columns={columns}
      emptyMessage="No invoicing data available for this period"
    />
  );
}
