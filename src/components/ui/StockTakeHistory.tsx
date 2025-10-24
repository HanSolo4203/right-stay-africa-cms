'use client';

import { useState, useEffect } from 'react';
import { StockTakeWithItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, TrendingDown, TrendingUp, Package } from 'lucide-react';

interface StockTakeHistoryProps {
  items: { id: string; name: string; item_type: string }[];
  getStockTakeHistory: (itemId?: string, startDate?: string, endDate?: string) => Promise<StockTakeWithItem[]>;
  refreshTrigger?: number; // Add a refresh trigger prop
}

export default function StockTakeHistory({ items, getStockTakeHistory, refreshTrigger }: StockTakeHistoryProps) {
  const [stockTakes, setStockTakes] = useState<StockTakeWithItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    itemId: 'all',
    startDate: '2025-01-01', // Start from beginning of 2025 to capture all data
    endDate: '2025-12-31'    // End at end of 2025 to capture all data
  });
  
  const fetchStockTakes = async () => {
    setLoading(true);
    try {
      const history = await getStockTakeHistory(
        filters.itemId && filters.itemId !== 'all' ? filters.itemId : undefined,
        filters.startDate,
        filters.endDate
      );
      setStockTakes(history);
    } catch (error) {
      console.error('Error fetching stock take history:', error);
      setStockTakes([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchStockTakes();
  }, [filters, refreshTrigger]);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getAdjustmentColor = (amount: number) => {
    if (amount > 0) return 'text-green-600 bg-green-50 border-green-200';
    if (amount < 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };
  
  const getAdjustmentIcon = (amount: number) => {
    if (amount > 0) return <TrendingUp className="h-4 w-4" />;
    if (amount < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Stock Take History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="itemFilter">Filter by Item</Label>
              <Select 
                value={filters.itemId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, itemId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All items</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
          
          <Button onClick={fetchStockTakes} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
            {loading ? 'Loading...' : 'Refresh History'}
          </Button>
        </CardContent>
      </Card>
      
      {stockTakes.length === 0 && !loading ? (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No stock take history found for the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stockTakes.map((stockTake) => (
            <Card key={stockTake.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {stockTake.inventory_items.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(stockTake.take_date)}
                      </p>
                    </div>
                  </div>
                  
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getAdjustmentColor(stockTake.adjustment_amount)}`}>
                    {getAdjustmentIcon(stockTake.adjustment_amount)}
                    <span className="ml-1">
                      {stockTake.adjustment_amount > 0 ? '+' : ''}{stockTake.adjustment_amount.toFixed(1)} {stockTake.inventory_items.unit_of_measure}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Previous Stock:</span>
                    <p className="font-medium">{stockTake.previous_stock} {stockTake.inventory_items.unit_of_measure}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">New Stock:</span>
                    <p className="font-medium">{stockTake.new_stock} {stockTake.inventory_items.unit_of_measure}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Adjustment:</span>
                    <p className={`font-medium ${stockTake.adjustment_amount > 0 ? 'text-green-600' : stockTake.adjustment_amount < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {stockTake.adjustment_amount > 0 ? '+' : ''}{stockTake.adjustment_amount.toFixed(1)} {stockTake.inventory_items.unit_of_measure}
                    </p>
                  </div>
                </div>
                
                {stockTake.notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Notes:</span> {stockTake.notes}
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
