'use client';

import { useState } from 'react';
import { InventoryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

interface StockTakeModalProps {
  item: InventoryItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  performStockTake: (id: string, newStock: number, notes?: string) => Promise<void>;
}

export default function StockTakeModal({ 
  item, 
  isOpen, 
  onClose, 
  onSuccess, 
  performStockTake 
}: StockTakeModalProps) {
  const [newStock, setNewStock] = useState(item.current_stock);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    if (newStock < 0) {
      return;
    }
    
    setLoading(true);
    try {
      await performStockTake(item.id, newStock, notes);
      onSuccess();
      onClose();
      // Reset form
      setNewStock(item.current_stock);
      setNotes('');
    } catch (error) {
      console.error('Error performing stock take:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      // Reset form
      setNewStock(item.current_stock);
      setNotes('');
    }
  };

  const usageAmount = item.current_stock - newStock;
  const isUsage = usageAmount > 0;
  const isAddition = usageAmount < 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stock Take - {item.name}</DialogTitle>
          <DialogDescription>
            Record the current physical stock level for this item.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Current Stock:</span>
              <span className="text-lg font-semibold text-gray-900">
                {item.current_stock} {item.unit_of_measure}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newStock">New Stock Level</Label>
            <Input
              id="newStock"
              type="number"
              value={newStock}
              onChange={(e) => setNewStock(Number(e.target.value))}
              min="0"
              step="0.1"
              placeholder="Enter new stock level"
            />
          </div>
          
          {usageAmount !== 0 && (
            <div className={`p-3 border rounded-md ${
              isUsage 
                ? 'bg-red-50 border-red-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center space-x-2">
                {isUsage ? (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                )}
                <span className={`text-sm font-medium ${
                  isUsage ? 'text-red-800' : 'text-green-800'
                }`}>
                  {isUsage ? 'Usage Detected' : 'Stock Addition'}
                </span>
              </div>
              <p className={`text-sm mt-1 ${
                isUsage ? 'text-red-700' : 'text-green-700'
              }`}>
                {Math.abs(usageAmount).toFixed(1)} {item.unit_of_measure} {isUsage ? 'used' : 'added'}
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Weekly stock take, cleaning session usage..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || newStock < 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Recording...' : 'Record Stock Take'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
