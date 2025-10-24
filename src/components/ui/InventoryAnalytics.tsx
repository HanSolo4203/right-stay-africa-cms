'use client';

import { InventoryItem } from '@/lib/types';
import { TrendingUp, TrendingDown, AlertTriangle, Package, BarChart3, DollarSign } from 'lucide-react';

interface InventoryAnalyticsProps {
  detergents: InventoryItem[];
  welcomePacks: InventoryItem[];
  lowStockItems: InventoryItem[];
}

export default function InventoryAnalytics({ detergents, welcomePacks, lowStockItems }: InventoryAnalyticsProps) {
  // Calculate analytics for detergents
  const detergentStats = {
    totalItems: detergents.length,
    totalStock: detergents.reduce((sum, item) => sum + item.current_stock, 0),
    averageStock: detergents.length > 0 ? detergents.reduce((sum, item) => sum + item.current_stock, 0) / detergents.length : 0,
    lowStockCount: detergents.filter(item => item.min_stock_level && item.current_stock <= item.min_stock_level).length,
    outOfStock: detergents.filter(item => item.current_stock === 0).length,
    wellStocked: detergents.filter(item => item.min_stock_level && item.current_stock > item.min_stock_level * 2).length,
    totalValue: detergents.reduce((sum, item) => {
      if (item.purchase_price && item.purchase_quantity && item.purchase_quantity > 0) {
        const costPerUnit = item.purchase_price / item.purchase_quantity;
        return sum + (item.current_stock * costPerUnit);
      }
      return sum;
    }, 0),
    averageCostPerUnit: detergents.length > 0 ? detergents.reduce((sum, item) => {
      if (item.purchase_price && item.purchase_quantity && item.purchase_quantity > 0) {
        return sum + (item.purchase_price / item.purchase_quantity);
      }
      return sum;
    }, 0) / detergents.filter(item => item.purchase_price && item.purchase_quantity).length : 0
  };

  // Calculate analytics for welcome packs
  const welcomePackStats = {
    totalItems: welcomePacks.length,
    totalStock: welcomePacks.reduce((sum, item) => sum + item.current_stock, 0),
    averageStock: welcomePacks.length > 0 ? welcomePacks.reduce((sum, item) => sum + item.current_stock, 0) / welcomePacks.length : 0,
    lowStockCount: welcomePacks.filter(item => item.min_stock_level && item.current_stock <= item.min_stock_level).length,
    outOfStock: welcomePacks.filter(item => item.current_stock === 0).length,
    wellStocked: welcomePacks.filter(item => item.min_stock_level && item.current_stock > item.min_stock_level * 2).length,
    totalValue: welcomePacks.reduce((sum, item) => {
      if (item.purchase_price && item.purchase_quantity && item.purchase_quantity > 0) {
        const costPerUnit = item.purchase_price / item.purchase_quantity;
        return sum + (item.current_stock * costPerUnit);
      }
      return sum;
    }, 0),
    averageCostPerUnit: welcomePacks.length > 0 ? welcomePacks.reduce((sum, item) => {
      if (item.purchase_price && item.purchase_quantity && item.purchase_quantity > 0) {
        return sum + (item.purchase_price / item.purchase_quantity);
      }
      return sum;
    }, 0) / welcomePacks.filter(item => item.purchase_price && item.purchase_quantity).length : 0
  };

  // Overall analytics
  const overallStats = {
    totalItems: detergentStats.totalItems + welcomePackStats.totalItems,
    totalStock: detergentStats.totalStock + welcomePackStats.totalStock,
    lowStockCount: detergentStats.lowStockCount + welcomePackStats.lowStockCount,
    outOfStock: detergentStats.outOfStock + welcomePackStats.outOfStock,
    wellStocked: detergentStats.wellStocked + welcomePackStats.wellStocked,
    totalValue: detergentStats.totalValue + welcomePackStats.totalValue
  };

  const getStockStatusColor = (item: InventoryItem) => {
    if (item.current_stock === 0) return 'text-red-600';
    if (item.min_stock_level && item.current_stock <= item.min_stock_level) return 'text-yellow-600';
    if (item.min_stock_level && item.current_stock > item.min_stock_level * 2) return 'text-green-600';
    return 'text-gray-600';
  };

  const getStockStatusIcon = (item: InventoryItem) => {
    if (item.current_stock === 0) return <AlertTriangle className="h-4 w-4" />;
    if (item.min_stock_level && item.current_stock <= item.min_stock_level) return <TrendingDown className="h-4 w-4" />;
    if (item.min_stock_level && item.current_stock > item.min_stock_level * 2) return <TrendingUp className="h-4 w-4" />;
    return <Package className="h-4 w-4" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center space-x-2 mb-6">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Stock Analytics</h2>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Total Items</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-1">{overallStats.totalItems}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Well Stocked</span>
          </div>
          <p className="text-2xl font-bold text-green-900 mt-1">{overallStats.wellStocked}</p>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900 mt-1">{overallStats.lowStockCount}</p>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">Out of Stock</span>
          </div>
          <p className="text-2xl font-bold text-red-900 mt-1">{overallStats.outOfStock}</p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Total Value</span>
          </div>
          <p className="text-2xl font-bold text-purple-900 mt-1">R{overallStats.totalValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detergents Analytics */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Detergents</span>
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Stock</span>
              <span className="font-semibold text-gray-900">{detergentStats.totalStock.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average per Item</span>
              <span className="font-semibold text-gray-900">{detergentStats.averageStock.toFixed(1)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Well Stocked</span>
              <span className="font-semibold text-green-600">{detergentStats.wellStocked}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Low Stock</span>
              <span className="font-semibold text-yellow-600">{detergentStats.lowStockCount}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Out of Stock</span>
              <span className="font-semibold text-red-600">{detergentStats.outOfStock}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Value</span>
              <span className="font-semibold text-gray-900">R{detergentStats.totalValue.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Cost/Unit</span>
              <span className="font-semibold text-gray-900">R{detergentStats.averageCostPerUnit.toFixed(2)}</span>
            </div>
          </div>

          {/* Top Low Stock Detergents */}
          {detergents.filter(item => item.min_stock_level && item.current_stock <= item.min_stock_level).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Low Stock Items</h4>
              <div className="space-y-1">
                {detergents
                  .filter(item => item.min_stock_level && item.current_stock <= item.min_stock_level)
                  .slice(0, 3)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-medium text-yellow-600">{item.current_stock}/{item.min_stock_level}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Welcome Pack Analytics */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Welcome Pack Items</span>
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Stock</span>
              <span className="font-semibold text-gray-900">{welcomePackStats.totalStock.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average per Item</span>
              <span className="font-semibold text-gray-900">{welcomePackStats.averageStock.toFixed(1)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Well Stocked</span>
              <span className="font-semibold text-green-600">{welcomePackStats.wellStocked}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Low Stock</span>
              <span className="font-semibold text-yellow-600">{welcomePackStats.lowStockCount}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Out of Stock</span>
              <span className="font-semibold text-red-600">{welcomePackStats.outOfStock}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Value</span>
              <span className="font-semibold text-gray-900">R{welcomePackStats.totalValue.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Cost/Unit</span>
              <span className="font-semibold text-gray-900">R{welcomePackStats.averageCostPerUnit.toFixed(2)}</span>
            </div>
          </div>

          {/* Top Low Stock Welcome Pack Items */}
          {welcomePacks.filter(item => item.min_stock_level && item.current_stock <= item.min_stock_level).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Low Stock Items</h4>
              <div className="space-y-1">
                {welcomePacks
                  .filter(item => item.min_stock_level && item.current_stock <= item.min_stock_level)
                  .slice(0, 3)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-medium text-yellow-600">{item.current_stock}/{item.min_stock_level}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Status Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Stock Status Legend</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Well Stocked (2x+ minimum)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">Low Stock (at or below minimum)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Out of Stock (0 items)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
