'use client';

import { InventoryItem } from '@/lib/types';
import { AlertTriangle, Package, ShoppingCart } from 'lucide-react';

interface LowStockItemsProps {
  items: InventoryItem[];
  onAddStock?: (item: InventoryItem) => void;
}

export default function LowStockItems({ items, onAddStock }: LowStockItemsProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8 text-center">
          <div className="text-green-600 mb-2">
            <Package className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Good!</h3>
          <p className="text-gray-500">No items are currently low on stock.</p>
        </div>
      </div>
    );
  }

  const getStockStatus = (item: InventoryItem) => {
    if (!item.min_stock_level) return 'unknown';
    
    const stockRatio = item.current_stock / item.min_stock_level;
    if (stockRatio <= 0.5) return 'critical';
    if (stockRatio <= 1) return 'low';
    return 'warning';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'low':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'critical':
        return 'Critical';
      case 'low':
        return 'Low Stock';
      case 'warning':
        return 'Getting Low';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Low Stock Items</h3>
          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {items.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Items that need restocking based on minimum stock levels
        </p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {items.map((item) => {
          const status = getStockStatus(item);
          const statusColor = getStatusColor(status);
          const statusText = getStatusText(status);
          
          return (
            <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusColor}`}>
                          {statusText}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>
                          Current: <span className="font-medium">{item.current_stock}</span> {item.unit_of_measure}
                        </span>
                        <span>
                          Min Level: <span className="font-medium">{item.min_stock_level}</span> {item.unit_of_measure}
                        </span>
                        {item.purchase_price && (
                          <span>
                            Last Price: <span className="font-medium">R{item.purchase_price.toFixed(2)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {onAddStock && (
                  <div className="flex-shrink-0 ml-4">
                    <button
                      onClick={() => onAddStock(item)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Add Stock
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
