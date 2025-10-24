'use client';

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { InventoryItem } from '@/lib/types';

interface DashboardInventoryAnalyticsProps {
  className?: string;
}

export default function DashboardInventoryAnalytics({ className = '' }: DashboardInventoryAnalyticsProps) {
  const [inventoryData, setInventoryData] = useState<{
    detergents: InventoryItem[];
    welcomePacks: InventoryItem[];
    lowStockItems: InventoryItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/inventory');
        if (!response.ok) {
          throw new Error('Failed to fetch inventory data');
        }
        const data = await response.json();
        
        // Structure the data correctly
        const items: InventoryItem[] = data.data || [];
        const detergents = items.filter(item => item.item_type === 'detergent');
        const welcomePacks = items.filter(item => item.item_type === 'welcome_pack');
        const lowStockItems = items.filter(item => 
          item.min_stock_level && item.current_stock <= item.min_stock_level
        );
        
        setInventoryData({
          detergents,
          welcomePacks,
          lowStockItems
        });
      } catch (err) {
        console.error('Error fetching inventory data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryData();
  }, []);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !inventoryData) {
    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm">Failed to load inventory data</span>
        </div>
      </div>
    );
  }

  // Calculate analytics with safe access
  const detergentStats = {
    totalItems: inventoryData.detergents?.length || 0,
    totalStock: inventoryData.detergents?.reduce((sum, item) => sum + item.current_stock, 0) || 0,
    lowStockCount: inventoryData.detergents?.filter(item => item.min_stock_level && item.current_stock <= item.min_stock_level).length || 0,
    outOfStock: inventoryData.detergents?.filter(item => item.current_stock === 0).length || 0,
  };

  const welcomePackStats = {
    totalItems: inventoryData.welcomePacks?.length || 0,
    totalStock: inventoryData.welcomePacks?.reduce((sum, item) => sum + item.current_stock, 0) || 0,
    lowStockCount: inventoryData.welcomePacks?.filter(item => item.min_stock_level && item.current_stock <= item.min_stock_level).length || 0,
    outOfStock: inventoryData.welcomePacks?.filter(item => item.current_stock === 0).length || 0,
  };

  const overallStats = {
    totalItems: detergentStats.totalItems + welcomePackStats.totalItems,
    totalStock: detergentStats.totalStock + welcomePackStats.totalStock,
    lowStockCount: detergentStats.lowStockCount + welcomePackStats.lowStockCount,
    outOfStock: detergentStats.outOfStock + welcomePackStats.outOfStock,
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-6">
        <Package className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Inventory Stock Overview</h3>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center space-x-1 mb-2">
            <Package className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Total Items</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{overallStats.totalItems}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center space-x-1 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Total Stock</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{overallStats.totalStock.toLocaleString()}</p>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center space-x-1 mb-2">
            <TrendingDown className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900">{overallStats.lowStockCount}</p>
        </div>

        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center space-x-1 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">Out of Stock</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{overallStats.outOfStock}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detergents */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Detergents</span>
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Items</span>
              <span className="font-semibold text-gray-900">{detergentStats.totalItems}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total Stock</span>
              <span className="font-semibold text-gray-900">{detergentStats.totalStock}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Low Stock</span>
              <span className="font-semibold text-yellow-600">{detergentStats.lowStockCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Out of Stock</span>
              <span className="font-semibold text-red-600">{detergentStats.outOfStock}</span>
            </div>
          </div>
        </div>

        {/* Welcome Pack Items */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Welcome Pack Items</span>
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Items</span>
              <span className="font-semibold text-gray-900">{welcomePackStats.totalItems}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total Stock</span>
              <span className="font-semibold text-gray-900">{welcomePackStats.totalStock}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Low Stock</span>
              <span className="font-semibold text-yellow-600">{welcomePackStats.lowStockCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Out of Stock</span>
              <span className="font-semibold text-red-600">{welcomePackStats.outOfStock}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-2">
          <a 
            href="/inventory" 
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Package className="h-4 w-4 mr-1" />
            View Full Inventory
          </a>
          {overallStats.lowStockCount > 0 && (
            <span className="inline-flex items-center px-3 py-2 border border-yellow-300 text-sm font-medium rounded-md text-yellow-800 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 mr-1" />
              {overallStats.lowStockCount} items need restocking
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
