'use client';

import { useState, useEffect } from 'react';
import { InventoryItem } from '@/lib/types';
import { X, Package, Plus } from 'lucide-react';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddStockData) => Promise<void>;
  items: InventoryItem[];
  loading?: boolean;
}

interface AddStockData {
  item_id: string;
  quantity: number;
  price: number;
}

export default function AddStockModal({ 
  isOpen, 
  onClose, 
  onSave, 
  items,
  loading = false 
}: AddStockModalProps) {
  const [formData, setFormData] = useState<AddStockData>({
    item_id: '',
    quantity: 0,
    price: 0
  });
  const [errors, setErrors] = useState<{ [key in keyof AddStockData]?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        item_id: '',
        quantity: 0,
        price: 0
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof AddStockData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key in keyof AddStockData]?: string } = {};

    if (!formData.item_id) {
      newErrors.item_id = 'Please select an item';
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (formData.price < 0) {
      newErrors.price = 'Price must be 0 or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error adding stock:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedItem = items.find(item => item.id === formData.item_id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Plus className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Add Stock</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Item Selection */}
          <div>
            <label htmlFor="item_id" className="block text-sm font-medium text-gray-700 mb-2">
              Select Item
            </label>
            <select
              id="item_id"
              value={formData.item_id}
              onChange={(e) => handleInputChange('item_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.item_id ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            >
              <option value="">Choose an item...</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.item_type === 'detergent' ? 'Detergent' : 'Welcome Pack'}) - Current: {item.current_stock} {item.unit_of_measure}
                </option>
              ))}
            </select>
            {errors.item_id && (
              <p className="mt-1 text-sm text-red-600">{errors.item_id}</p>
            )}
          </div>

          {/* Current Stock Display */}
          {selectedItem && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Current Stock: {selectedItem.current_stock} {selectedItem.unit_of_measure}
                </span>
              </div>
              {selectedItem.min_stock_level && (
                <p className="text-xs text-blue-600 mt-1">
                  Min. Stock Level: {selectedItem.min_stock_level} {selectedItem.unit_of_measure}
                </p>
              )}
              {(selectedItem.purchase_price || selectedItem.purchase_quantity) && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="text-xs text-blue-600">
                    <span className="font-medium">Current Purchase Total:</span> R{(selectedItem.purchase_price || 0).toFixed(2)} for {(selectedItem.purchase_quantity || 0)} {selectedItem.unit_of_measure}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Quantity to Add */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Add
            </label>
            <input
              type="number"
              id="quantity"
              min="1"
              step="1"
              value={formData.quantity || ''}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.quantity ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter quantity to add"
              disabled={isSubmitting}
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
            )}
          </div>

          {/* Purchase Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Price (This Addition)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R</span>
              </div>
              <input
                type="number"
                id="price"
                min="0"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                className={`w-full pl-8 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.price ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>
            {errors.price && (
              <p className="mt-1 text-sm text-red-600">{errors.price}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Price paid for this specific stock addition (will be added to existing purchase total)
            </p>
          </div>

          {/* New Stock Preview */}
          {selectedItem && formData.quantity > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  New Stock Level: {selectedItem.current_stock + formData.quantity} {selectedItem.unit_of_measure}
                </span>
              </div>
              {formData.price > 0 && (
                <div className="mt-2 pt-2 border-t border-green-200">
                  <p className="text-xs text-green-600">
                    <span className="font-medium">New Purchase Total:</span> R{((selectedItem.purchase_price || 0) + formData.price).toFixed(2)} for {((selectedItem.purchase_quantity || 0) + formData.quantity)} {selectedItem.unit_of_measure}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Adding Stock...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
