'use client';

import { useState, useEffect } from 'react';
import { InventoryItem, CreateInventoryItemData, UpdateInventoryItemData, StockTakeWithItem, UsageAnalytics } from '@/lib/types';

interface UseInventoryReturn {
  items: InventoryItem[];
  detergents: InventoryItem[];
  welcomePacks: InventoryItem[];
  lowStockItems: InventoryItem[];
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  fetchByType: (type: 'detergent' | 'welcome_pack') => Promise<void>;
  createItem: (data: CreateInventoryItemData) => Promise<InventoryItem>;
  updateItem: (id: string, data: UpdateInventoryItemData) => Promise<InventoryItem>;
  deleteItem: (id: string) => Promise<void>;
  addStock: (id: string, data: { quantity: number; price: number }) => Promise<InventoryItem>;
  performStockTake: (id: string, newStock: number, notes?: string) => Promise<void>;
  getStockTakeHistory: (itemId?: string, startDate?: string, endDate?: string) => Promise<StockTakeWithItem[]>;
  getUsageAnalytics: (itemId: string, startDate: string, endDate: string) => Promise<UsageAnalytics>;
  refetch: () => Promise<void>;
}

export function useInventory(): UseInventoryReturn {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const detergents = items.filter(item => item.item_type === 'detergent');
  const welcomePacks = items.filter(item => item.item_type === 'welcome_pack');
  const lowStockItems = items.filter(item => 
    item.min_stock_level && item.current_stock <= item.min_stock_level
  );

  // Fetch all items
  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/inventory');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch inventory items');
      }
      
      setItems(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching inventory items:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch items by type
  const fetchByType = async (type: 'detergent' | 'welcome_pack') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/inventory?type=${type}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch inventory items');
      }
      
      setItems(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching inventory items by type:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create new item
  const createItem = async (data: CreateInventoryItemData): Promise<InventoryItem> => {
    try {
      setError(null);
      
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create inventory item');
      }
      
      // Refresh the items list
      await fetchItems();
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error creating inventory item:', err);
      throw err;
    }
  };

  // Update item
  const updateItem = async (id: string, data: UpdateInventoryItemData): Promise<InventoryItem> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update inventory item');
      }
      
      // Refresh the items list
      await fetchItems();
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error updating inventory item:', err);
      throw err;
    }
  };

  // Delete item
  const deleteItem = async (id: string): Promise<void> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete inventory item');
      }
      
      // Refresh the items list
      await fetchItems();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error deleting inventory item:', err);
      throw err;
    }
  };

  // Add stock to existing item
  const addStock = async (id: string, data: { quantity: number; price: number }): Promise<InventoryItem> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/inventory/${id}/add-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add stock to inventory item');
      }
      
      // Refresh the items list
      await fetchItems();
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error adding stock to inventory item:', err);
      throw err;
    }
  };

  // Perform stock take
  const performStockTake = async (id: string, newStock: number, notes?: string): Promise<void> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/inventory/${id}/stock-take`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_stock: newStock, notes }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to perform stock take');
      }
      
      // Refresh the items list
      await fetchItems();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error performing stock take:', err);
      throw err;
    }
  };

  // Get stock take history
  const getStockTakeHistory = async (
    itemId?: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<StockTakeWithItem[]> => {
    try {
      setError(null);
      
      const params = new URLSearchParams();
      if (itemId) params.append('item_id', itemId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const response = await fetch(`/api/inventory/stock-takes?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stock take history');
      }
      
      return data.data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching stock take history:', err);
      throw err;
    }
  };

  // Get usage analytics
  const getUsageAnalytics = async (
    itemId: string, 
    startDate: string, 
    endDate: string
  ): Promise<UsageAnalytics> => {
    try {
      setError(null);
      
      const params = new URLSearchParams({
        item_id: itemId,
        start_date: startDate,
        end_date: endDate
      });
      
      const response = await fetch(`/api/inventory/usage-analytics?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch usage analytics');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching usage analytics:', err);
      throw err;
    }
  };

  // Refetch all data
  const refetch = async () => {
    await fetchItems();
  };

  // Initial fetch
  useEffect(() => {
    fetchItems();
  }, []);

  return {
    items,
    detergents,
    welcomePacks,
    lowStockItems,
    loading,
    error,
    fetchItems,
    fetchByType,
    createItem,
    updateItem,
    deleteItem,
    addStock,
    performStockTake,
    getStockTakeHistory,
    getUsageAnalytics,
    refetch,
  };
}
