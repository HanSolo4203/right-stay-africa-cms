'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CreateCleaningSessionData, Apartment, Cleaner } from '@/lib/types';
import toast from 'react-hot-toast';

interface AddCleaningModalProps {
  isOpen: boolean;
  selectedDate?: Date;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCleaningModal({ isOpen, selectedDate, onClose, onSuccess }: AddCleaningModalProps) {
  const [formData, setFormData] = useState<CreateCleaningSessionData>({
    apartment_id: '',
    cleaner_id: '',
    cleaning_date: '',
    notes: '',
    price: undefined,
  });
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [errors, setErrors] = useState<Partial<CreateCleaningSessionData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (selectedDate) {
        // Format date in local timezone to avoid timezone issues
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const localDateString = `${year}-${month}-${day}`;
        
        setFormData(prev => ({
          ...prev,
          cleaning_date: localDateString
        }));
      }
    }
  }, [isOpen, selectedDate]);

  const loadData = async () => {
    try {
      setIsLoadingData(true);
      
      // Load apartments and cleaners in parallel
      const [apartmentsResponse, cleanersResponse] = await Promise.all([
        fetch('/api/apartments'),
        fetch('/api/cleaners')
      ]);

      const [apartmentsResult, cleanersResult] = await Promise.all([
        apartmentsResponse.json(),
        cleanersResponse.json()
      ]);

      if (apartmentsResult.success) {
        setApartments(apartmentsResult.data);
      }

      if (cleanersResult.success) {
        setCleaners(cleanersResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load apartments and cleaners');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle price as a number
    if (name === 'price') {
      const numValue = value === '' ? undefined : parseFloat(value);
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name as keyof CreateCleaningSessionData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateCleaningSessionData> = {};

    if (!formData.apartment_id) {
      newErrors.apartment_id = 'Apartment is required';
    }

    if (!formData.cleaner_id) {
      newErrors.cleaner_id = 'Cleaner is required';
    }

    if (!formData.cleaning_date) {
      newErrors.cleaning_date = 'Cleaning date is required';
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
      const response = await fetch('/api/cleaning-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Cleaning session scheduled successfully!');
        setFormData({ apartment_id: '', cleaner_id: '', cleaning_date: '', notes: '', price: undefined });
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Failed to schedule cleaning session');
      }
    } catch (error) {
      console.error('Error creating cleaning session:', error);
      toast.error('Failed to schedule cleaning session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ apartment_id: '', cleaner_id: '', cleaning_date: '', notes: '', price: undefined });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Schedule Cleaning Session</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoadingData ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading apartments and cleaners...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="apartment_id" className="block text-sm font-medium text-gray-700 mb-2">
                Apartment *
              </label>
              <select
                id="apartment_id"
                name="apartment_id"
                value={formData.apartment_id}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.apartment_id ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading}
              >
                <option value="">Select an apartment</option>
                {apartments.map((apartment) => (
                  <option key={apartment.id} value={apartment.id}>
                    Apartment {apartment.apartment_number} - {apartment.owner_name}
                  </option>
                ))}
              </select>
              {errors.apartment_id && (
                <p className="mt-1 text-sm text-red-600">{errors.apartment_id}</p>
              )}
            </div>

            <div>
              <label htmlFor="cleaner_id" className="block text-sm font-medium text-gray-700 mb-2">
                Cleaner *
              </label>
              <select
                id="cleaner_id"
                name="cleaner_id"
                value={formData.cleaner_id}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.cleaner_id ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading}
              >
                <option value="">Select a cleaner</option>
                {cleaners.map((cleaner) => (
                  <option key={cleaner.id} value={cleaner.id}>
                    {cleaner.name}
                  </option>
                ))}
              </select>
              {errors.cleaner_id && (
                <p className="mt-1 text-sm text-red-600">{errors.cleaner_id}</p>
              )}
            </div>

            <div>
              <label htmlFor="cleaning_date" className="block text-sm font-medium text-gray-700 mb-2">
                Cleaning Date *
              </label>
              <input
                type="date"
                id="cleaning_date"
                name="cleaning_date"
                value={formData.cleaning_date}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.cleaning_date ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.cleaning_date && (
                <p className="mt-1 text-sm text-red-600">{errors.cleaning_date}</p>
              )}
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any special instructions or notes..."
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Price (R)
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price || ''}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={isLoading}
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price}</p>
              )}
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
                {isLoading ? 'Scheduling...' : 'Schedule Session'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
