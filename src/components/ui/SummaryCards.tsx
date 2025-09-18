'use client';

import { Building2, Users, TrendingUp, DollarSign } from 'lucide-react';

interface SummaryCardsProps {
  data: {
    total_cleanings: number;
    active_apartments: number;
    active_cleaners: number;
    average_cleanings_per_apartment: string;
    total_revenue: number;
    net_revenue: number;
  };
}

export default function SummaryCards({ data }: SummaryCardsProps) {
  const cards = [
    {
      title: 'Active Apartments',
      value: data.active_apartments,
      icon: Building2,
      color: 'green',
      change: 'Properties managed',
      format: 'number'
    },
    {
      title: 'Active Cleaners',
      value: data.active_cleaners,
      icon: Users,
      color: 'purple',
      change: 'Staff members',
      format: 'number'
    },
    {
      title: 'Avg per Apartment',
      value: data.average_cleanings_per_apartment,
      icon: TrendingUp,
      color: 'orange',
      change: 'Cleanings per property',
      format: 'decimal'
    },
    {
      title: 'Net Revenue',
      value: data.net_revenue,
      icon: DollarSign,
      color: 'emerald',
      change: 'Revenue minus cleaner payouts',
      format: 'currency'
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'green':
        return 'bg-green-100 text-green-600';
      case 'purple':
        return 'bg-purple-100 text-purple-600';
      case 'orange':
        return 'bg-orange-100 text-orange-600';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatValue = (value: number | string, format: string) => {
    if (format === 'currency') {
      return `R${Number(value).toLocaleString()}`;
    } else if (format === 'decimal') {
      return value;
    } else {
      return Number(value).toLocaleString();
    }
  };

  return (
    <div className="inline-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {formatValue(card.value, card.format)}
              </p>
              <p className="text-sm text-gray-500">{card.change}</p>
            </div>
            <div className={`p-3 rounded-full ${getColorClasses(card.color)}`}>
              <card.icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
