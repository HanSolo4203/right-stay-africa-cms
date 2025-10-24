'use client';

import { useState, useEffect, useCallback } from 'react';
import { InventoryItem, UsageAnalytics } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, TrendingDown, Calendar, Package } from 'lucide-react';

interface DetergentUsageAnalyticsProps {
  detergents: InventoryItem[];
  getUsageAnalytics: (itemId: string, startDate: string, endDate: string) => Promise<UsageAnalytics>;
  refreshTrigger?: number; // Add a refresh trigger prop
}

export default function DetergentUsageAnalytics({ 
  detergents, 
  getUsageAnalytics,
  refreshTrigger 
}: DetergentUsageAnalyticsProps) {
  const [usageData, setUsageData] = useState<UsageAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: '2025-01-01', // Start from beginning of 2025 to capture all data
    end: '2025-12-31'    // End at end of 2025 to capture all data
  });
  
  // Fetch usage data for the selected period
  const fetchUsageData = useCallback(async () => {
    if (detergents.length === 0) return;
    
    setLoading(true);
    try {
      const promises = detergents.map(async (detergent) => {
        try {
          const analytics = await getUsageAnalytics(
            detergent.id, 
            dateRange.start, 
            dateRange.end
          );
          
          return {
            item: detergent,
            totalUsage: analytics.totalUsage,
            remainingStock: detergent.current_stock,
            usageRate: analytics.usageRate,
            daysRemaining: analytics.usageRate > 0 
              ? Math.floor(detergent.current_stock / analytics.usageRate) 
              : Infinity
          };
        } catch (error) {
          console.warn(`Error fetching analytics for ${detergent.name}:`, error);
          // Return default values if analytics fail
          return {
            item: detergent,
            totalUsage: 0,
            remainingStock: detergent.current_stock,
            usageRate: 0,
            daysRemaining: Infinity
          };
        }
      });
      
      const results = await Promise.all(promises);
      setUsageData(results);
    } catch (error) {
      console.error('Error fetching usage data:', error);
      setUsageData([]);
    } finally {
      setLoading(false);
    }
  }, [detergents, dateRange.start, dateRange.end, getUsageAnalytics]);
  
  useEffect(() => {
    fetchUsageData();
  }, [detergents, dateRange, refreshTrigger, fetchUsageData]);
  
  const getDaysRemainingColor = (days: number) => {
    if (days === Infinity) return 'text-gray-600';
    if (days <= 7) return 'text-red-600';
    if (days <= 14) return 'text-orange-600';
    return 'text-green-600';
  };
  
  const getDaysRemainingIcon = (days: number) => {
    if (days === Infinity) return null;
    if (days <= 7) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <Label className="text-sm font-medium">Date Range:</Label>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="w-auto"
          />
          <span className="text-gray-500">to</span>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="w-auto"
          />
        </div>
        <Button 
          onClick={fetchUsageData} 
          disabled={loading}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Loading...' : 'Refresh Data'}
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading usage analytics...</p>
        </div>
      ) : usageData.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No detergent usage data available for the selected period.</p>
          <p className="text-sm text-gray-400 mt-2">Perform some stock takes to see usage analytics.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {usageData.map((data) => (
            <Card key={data.item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>{data.item.name}</span>
                  {getDaysRemainingIcon(data.daysRemaining)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <p className="text-sm font-medium text-red-700">Total Usage</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      {data.totalUsage.toFixed(1)}
                    </p>
                    <p className="text-xs text-red-600">{data.item.unit_of_measure}</p>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <Package className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-medium text-green-700">Remaining Stock</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {data.remainingStock}
                    </p>
                    <p className="text-xs text-green-600">{data.item.unit_of_measure}</p>
                  </div>
                  
                  <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <TrendingDown className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-700">Daily Usage Rate</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {data.usageRate.toFixed(1)}
                    </p>
                    <p className="text-xs text-blue-600">{data.item.unit_of_measure}/day</p>
                  </div>
                  
                  <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <p className="text-sm font-medium text-orange-700">Days Remaining</p>
                    </div>
                    <p className={`text-2xl font-bold ${getDaysRemainingColor(data.daysRemaining)}`}>
                      {data.daysRemaining === Infinity ? '∞' : data.daysRemaining}
                    </p>
                    <p className="text-xs text-orange-600">days</p>
                  </div>
                </div>
                
                {data.daysRemaining <= 7 && data.daysRemaining !== Infinity && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <p className="text-sm font-medium text-red-800">
                        Low Stock Alert: Only {data.daysRemaining} days remaining
                      </p>
                    </div>
                    <p className="text-xs text-red-700 mt-1">
                      Consider reordering soon to avoid stockouts.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
