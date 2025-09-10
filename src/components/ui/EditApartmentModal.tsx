'use client';

import { useState, useEffect } from 'react';
import { X, Building2, User, Mail, MapPin } from 'lucide-react';
import { Apartment, UpdateApartmentData } from '@/lib/types';
import toast from 'react-hot-toast';

interface EditApartmentModalProps {
  isOpen: boolean;
  apartment: Apartment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditApartmentModal({ isOpen, apartment, onClose, onSuccess }: EditApartmentModalProps) {
  const [formData, setFormData] = useState<UpdateApartmentData>({
    id: '',
    apartment_number: '',
    owner_name: '',
    owner_email: '',
    address: '',
    cleaner_payout: undefined,
  });
  const [errors, setErrors] = useState<Partial<UpdateApartmentData>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (apartment) {
      setFormData({
        id: apartment.id,
        apartment_number: apartment.apartment_number,
        owner_name: apartment.owner_name,
        owner_email: apartment.owner_email || '',
        address: apartment.address || '',
        cleaner_payout: (apartment as any).cleaner_payout ?? undefined,
      });
    }
  }, [apartment]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'cleaner_payout') {
      const num = value === '' ? undefined : parseFloat(value);
      setFormData(prev => ({ ...prev, [name]: num }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name as keyof UpdateApartmentData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<UpdateApartmentData> = {};

    if (!formData.apartment_number?.trim()) {
      newErrors.apartment_number = 'Apartment number is required';
    }

    if (!formData.owner_name?.trim()) {
      newErrors.owner_name = 'Owner name is required';
    }

    if (formData.owner_email && formData.owner_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.owner_email)) {
        newErrors.owner_email = 'Invalid email format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/apartments/${formData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Apartment updated successfully!');
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Failed to update apartment');
      }
    } catch (error) {
      console.error('Error updating apartment:', error);
      toast.error('Failed to update apartment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!isOpen || !apartment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Apartment</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="apartment_number" className="block text-sm font-medium text-gray-700 mb-2">
              Apartment Number *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="apartment_number"
                name="apartment_number"
                value={formData.apartment_number}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.apartment_number ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., 101, 2A, etc."
                disabled={isLoading}
              />
            </div>
            {errors.apartment_number && (
              <p className="mt-1 text-sm text-red-600">{errors.apartment_number}</p>
            )}
          </div>

          <div>
            <label htmlFor="cleaner_payout" className="block text-sm font-medium text-gray-700 mb-2">
              Cleaner Payout (R)
            </label>
            <input
              type="number"
              id="cleaner_payout"
              name="cleaner_payout"
              value={formData.cleaner_payout ?? ''}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 200"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="owner_name" className="block text-sm font-medium text-gray-700 mb-2">
              Owner Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="owner_name"
                name="owner_name"
                value={formData.owner_name}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.owner_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter owner name"
                disabled={isLoading}
              />
            </div>
            {errors.owner_name && (
              <p className="mt-1 text-sm text-red-600">{errors.owner_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="owner_email" className="block text-sm font-medium text-gray-700 mb-2">
              Owner Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                id="owner_email"
                name="owner_email"
                value={formData.owner_email}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.owner_email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter email address"
                disabled={isLoading}
              />
            </div>
            {errors.owner_email && (
              <p className="mt-1 text-sm text-red-600">{errors.owner_email}</p>
            )}
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter property address"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Apartment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
