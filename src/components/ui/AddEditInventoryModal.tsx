'use client';

import { useState, useEffect } from 'react';
import { InventoryItem } from '@/lib/types';
import { X } from 'lucide-react';

interface AddEditInventoryModalProps {
  item: InventoryItem | null;
  itemType: 'detergent' | 'welcome_pack';
  onSave: (data: Partial<InventoryItem>) => void;
  onClose: () => void;
}

export default function AddEditInventoryModal({
  item,
  itemType,
  onSave,
  onClose
}: AddEditInventoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    current_stock: 0,
    unit_of_measure: '',
    min_stock_level: '',
    purchase_price: '',
    purchase_quantity: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        current_stock: item.current_stock,
        unit_of_measure: item.unit_of_measure,
        min_stock_level: item.min_stock_level?.toString() || '',
        purchase_price: item.purchase_price?.toString() || '',
        purchase_quantity: item.purchase_quantity?.toString() || '',
        notes: item.notes || ''
      });
    } else {
      setFormData({
        name: '',
        current_stock: 0,
        unit_of_measure: '',
        min_stock_level: '',
        purchase_price: '',
        purchase_quantity: '',
        notes: ''
      });
    }
  }, [item]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.current_stock < 0) {
      newErrors.current_stock = 'Stock cannot be negative';
    }

    if (!formData.unit_of_measure.trim()) {
      newErrors.unit_of_measure = 'Unit of measure is required';
    }

    if (formData.min_stock_level && parseFloat(formData.min_stock_level) < 0) {
      newErrors.min_stock_level = 'Min stock level cannot be negative';
    }

    if (formData.purchase_price && parseFloat(formData.purchase_price) < 0) {
      newErrors.purchase_price = 'Purchase price cannot be negative';
    }

    if (formData.purchase_quantity && parseFloat(formData.purchase_quantity) <= 0) {
      newErrors.purchase_quantity = 'Purchase quantity must be greater than 0';
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
      const data = {
        name: formData.name.trim(),
        current_stock: formData.current_stock,
        unit_of_measure: formData.unit_of_measure.trim(),
        min_stock_level: formData.min_stock_level ? parseFloat(formData.min_stock_level) : undefined,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : undefined,
        purchase_quantity: formData.purchase_quantity ? parseFloat(formData.purchase_quantity) : undefined,
        notes: formData.notes.trim() || undefined
      };

      await onSave(data);
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getItemTypeLabel = () => {
    return itemType === 'detergent' ? 'Detergent' : 'Welcome Pack Item';
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {item ? `Edit ${getItemTypeLabel()}` : `Add New ${getItemTypeLabel()}`}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.name ? 'border-red-300' : ''
                }`}
                placeholder={`Enter ${getItemTypeLabel().toLowerCase()} name`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Current Stock */}
            <div>
              <label htmlFor="current_stock" className="block text-sm font-medium text-gray-700">
                Current Stock *
              </label>
              <input
                type="number"
                id="current_stock"
                min="0"
                value={formData.current_stock === 0 ? '' : formData.current_stock}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    handleInputChange('current_stock', '');
                  } else {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue)) {
                      handleInputChange('current_stock', numValue);
                    }
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    handleInputChange('current_stock', 0);
                  }
                }}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.current_stock ? 'border-red-300' : ''
                }`}
                placeholder="0"
              />
              {errors.current_stock && (
                <p className="mt-1 text-sm text-red-600">{errors.current_stock}</p>
              )}
            </div>

            {/* Unit of Measure */}
            <div>
              <label htmlFor="unit_of_measure" className="block text-sm font-medium text-gray-700">
                Unit of Measure *
              </label>
              <input
                type="text"
                id="unit_of_measure"
                value={formData.unit_of_measure}
                onChange={(e) => handleInputChange('unit_of_measure', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.unit_of_measure ? 'border-red-300' : ''
                }`}
                placeholder="e.g., bottles, boxes, packs"
              />
              {errors.unit_of_measure && (
                <p className="mt-1 text-sm text-red-600">{errors.unit_of_measure}</p>
              )}
            </div>

            {/* Min Stock Level */}
            <div>
              <label htmlFor="min_stock_level" className="block text-sm font-medium text-gray-700">
                Min Stock Level (Optional)
              </label>
              <input
                type="number"
                id="min_stock_level"
                min="0"
                value={formData.min_stock_level}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    handleInputChange('min_stock_level', '');
                  } else {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue)) {
                      handleInputChange('min_stock_level', numValue.toString());
                    }
                  }
                }}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.min_stock_level ? 'border-red-300' : ''
                }`}
                placeholder="Leave empty for no minimum"
              />
              {errors.min_stock_level && (
                <p className="mt-1 text-sm text-red-600">{errors.min_stock_level}</p>
              )}
            </div>

            {/* Purchase Price */}
            <div>
              <label htmlFor="purchase_price" className="block text-sm font-medium text-gray-700">
                Purchase Price (Optional)
              </label>
              <input
                type="number"
                id="purchase_price"
                min="0"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    handleInputChange('purchase_price', '');
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      handleInputChange('purchase_price', numValue.toString());
                    }
                  }
                }}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.purchase_price ? 'border-red-300' : ''
                }`}
                placeholder="Total price paid for this purchase"
              />
              {errors.purchase_price && (
                <p className="mt-1 text-sm text-red-600">{errors.purchase_price}</p>
              )}
            </div>

            {/* Purchase Quantity */}
            <div>
              <label htmlFor="purchase_quantity" className="block text-sm font-medium text-gray-700">
                Purchase Quantity (Optional)
              </label>
              <input
                type="number"
                id="purchase_quantity"
                min="0"
                step="0.01"
                value={formData.purchase_quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    handleInputChange('purchase_quantity', '');
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      handleInputChange('purchase_quantity', numValue.toString());
                    }
                  }
                }}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.purchase_quantity ? 'border-red-300' : ''
                }`}
                placeholder="Total quantity purchased in this batch"
              />
              {errors.purchase_quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.purchase_quantity}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Additional notes about this item"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : (item ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
