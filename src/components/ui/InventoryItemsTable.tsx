'use client';

import { InventoryItem } from '@/lib/types';
import { Edit, Trash2, AlertTriangle, ClipboardCheck } from 'lucide-react';
import ItemHistoryDropdown from './ItemHistoryDropdown';

interface InventoryItemsTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onStockTake?: (item: InventoryItem) => void;
}

export default function InventoryItemsTable({ 
  items, 
  onEdit, 
  onDelete,
  onStockTake 
}: InventoryItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-8 text-center">
          <div className="text-gray-500">
            <p>No items found.</p>
            <p className="text-sm mt-1">Add your first item to get started.</p>
          </div>
        </div>
      </div>
    );
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.min_stock_level && item.current_stock <= item.min_stock_level) {
      return {
        status: 'low',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: <AlertTriangle className="h-4 w-4" />
      };
    }
    return {
      status: 'good',
      color: 'text-gray-900',
      bgColor: 'bg-gray-50',
      icon: null
    };
  };

  const getCostPerUnit = (item: InventoryItem) => {
    if (item.purchase_price && item.purchase_quantity && item.purchase_quantity > 0) {
      return (item.purchase_price / item.purchase_quantity).toFixed(2);
    }
    return null;
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-1/5 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Stock
              </th>
              <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min Level
              </th>
              <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purchase Price
              </th>
              <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purchase Qty
              </th>
              <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost/Unit
              </th>
              <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="w-1/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th className="w-32 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => {
              const stockStatus = getStockStatus(item);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900 break-words">
                      {item.name}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={`text-sm font-medium ${stockStatus.color}`}>
                      {item.current_stock}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {item.unit_of_measure}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {item.min_stock_level || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {item.purchase_price ? `R${item.purchase_price.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {item.purchase_quantity || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {getCostPerUnit(item) ? `R${getCostPerUnit(item)}` : '-'}
                  </td>
                  <td className="px-4 py-4">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.color}`}>
                      {stockStatus.icon && (
                        <span className="mr-1">
                          {stockStatus.icon}
                        </span>
                      )}
                      {stockStatus.status === 'low' ? 'Low Stock' : 'In Stock'}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    <div className="break-words">
                      {item.notes || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <ItemHistoryDropdown 
                        itemId={item.id} 
                        itemName={item.name}
                      />
                      {onStockTake && item.item_type === 'detergent' && (
                        <button
                          onClick={() => onStockTake(item)}
                          className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50"
                          title="Record stock take"
                        >
                          <ClipboardCheck className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(item)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
                        title="Edit item"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(item)}
                        className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                        title="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
    </div>
  );
}
