'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Building2, User, Calendar, FileText, Edit, Trash2 } from 'lucide-react';
import { CleaningSessionDetailed, UpdateCleaningSessionData, Apartment, Cleaner } from '@/lib/types';
import toast from 'react-hot-toast';

interface EditMultipleCleaningsModalProps {
  isOpen: boolean;
  sessions: CleaningSessionDetailed[];
  selectedDate: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditMultipleCleaningsModal({ 
  isOpen, 
  sessions, 
  selectedDate, 
  onClose, 
  onSuccess 
}: EditMultipleCleaningsModalProps) {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [editingSession, setEditingSession] = useState<CleaningSessionDetailed | null>(null);
  const [formData, setFormData] = useState<UpdateCleaningSessionData>({
    id: '',
    apartment_id: '',
    cleaner_id: '',
    cleaning_date: '',
    notes: '',
    price: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [visibleSessions, setVisibleSessions] = useState<CleaningSessionDetailed[]>(sessions);

  const loadData = useCallback(async () => {
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
      } else {
        toast.error('Failed to load apartments');
      }

      if (cleanersResult.success) {
        setCleaners(cleanersResult.data);
      } else {
        toast.error('Failed to load cleaners');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setVisibleSessions(sessions);
    }
  }, [isOpen, loadData, sessions]);

  const startEditing = (session: CleaningSessionDetailed) => {
    setEditingSession(session);
    
    // Find the apartment ID from the session's apartment number
    const apartment = apartments.find(apt => apt.apartment_number === session.apartment_number);
    // Find the cleaner ID from the session's cleaner name
    const cleaner = cleaners.find(cleaner => cleaner.name === session.cleaner_name);
    
    setFormData({
      id: session.id,
      apartment_id: apartment?.id || '',
      cleaner_id: cleaner?.id || '',
      cleaning_date: session.cleaning_date,
      notes: session.notes || '',
      price: session.price || undefined,
    });
    setErrors({});
  };

  const cancelEditing = () => {
    setEditingSession(null);
    setFormData({
      id: '',
      apartment_id: '',
      cleaner_id: '',
      cleaning_date: '',
      notes: '',
      price: undefined,
    });
    setErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? (value ? parseFloat(value) : undefined) : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.apartment_id) {
      newErrors.apartment_id = 'Apartment is required';
    }
    if (!formData.cleaner_id) {
      newErrors.cleaner_id = 'Cleaner is required';
    }
    if (!formData.cleaning_date) {
      newErrors.cleaning_date = 'Cleaning date is required';
    }
    if (formData.price !== undefined && formData.price < 0) {
      newErrors.price = 'Price must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !editingSession) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/cleaning-sessions/${editingSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Cleaning session updated successfully');
        cancelEditing();
        onSuccess();
      } else {
        toast.error(result.message || 'Failed to update cleaning session');
      }
    } catch (error) {
      console.error('Error updating cleaning session:', error);
      toast.error('Failed to update cleaning session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (session: CleaningSessionDetailed) => {
    if (!confirm(`Are you sure you want to delete the cleaning for Apartment ${session.apartment_number}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/cleaning-sessions/${session.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Cleaning session deleted successfully');
        setVisibleSessions(prev => prev.filter(s => s.id !== session.id));
        onSuccess();
      } else {
        toast.error(result.message || 'Failed to delete cleaning session');
      }
    } catch (error) {
      console.error('Error deleting cleaning session:', error);
      toast.error('Failed to delete cleaning session');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Cleanings for {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
            <p className="text-sm text-black mt-1">
              {visibleSessions.length} cleaning{visibleSessions.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoadingData ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sessions List */}
              <div className="space-y-4">
                {visibleSessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                    {editingSession?.id === session.id ? (
                          /* Edit Form */
                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Apartment */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  <Building2 className="w-4 h-4 inline mr-1" />
                                  Apartment
                                </label>
                                <select
                                  name="apartment_id"
                                  value={formData.apartment_id}
                                  onChange={handleInputChange}
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.apartment_id ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                >
                                  <option value="">Select apartment</option>
                                  {apartments.map((apartment) => (
                                    <option key={apartment.id} value={apartment.id}>
                                      {apartment.apartment_number} - {apartment.owner_name}
                                    </option>
                                  ))}
                                </select>
                                {errors.apartment_id && (
                                  <p className="text-red-500 text-sm mt-1">{errors.apartment_id}</p>
                                )}
                              </div>

                              {/* Cleaner */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  <User className="w-4 h-4 inline mr-1" />
                                  Cleaner
                                </label>
                                <select
                                  name="cleaner_id"
                                  value={formData.cleaner_id}
                                  onChange={handleInputChange}
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.cleaner_id ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                >
                                  <option value="">Select cleaner</option>
                                  {cleaners.map((cleaner) => (
                                    <option key={cleaner.id} value={cleaner.id}>
                                      {cleaner.name}
                                    </option>
                                  ))}
                                </select>
                                {errors.cleaner_id && (
                                  <p className="text-red-500 text-sm mt-1">{errors.cleaner_id}</p>
                                )}
                              </div>

                              {/* Date */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  <Calendar className="w-4 h-4 inline mr-1" />
                                  Cleaning Date
                                </label>
                                <input
                                  type="date"
                                  name="cleaning_date"
                                  value={formData.cleaning_date}
                                  onChange={handleInputChange}
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.cleaning_date ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                />
                                {errors.cleaning_date && (
                                  <p className="text-red-500 text-sm mt-1">{errors.cleaning_date}</p>
                                )}
                              </div>

                              {/* Price */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Price (R)
                                </label>
                                <input
                                  type="number"
                                  name="price"
                                  value={formData.price || ''}
                                  onChange={handleInputChange}
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.price ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                />
                                {errors.price && (
                                  <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                                )}
                              </div>
                            </div>

                            {/* Notes */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                <FileText className="w-4 h-4 inline mr-1" />
                                Notes
                              </label>
                              <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder="Add any notes about this cleaning session..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isLoading ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                      </form>
                    ) : (
                      /* Session Display (no dropdown) */
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Building2 className="w-4 h-4 text-gray-500" />
                              <span className="font-medium text-black">Apt {session.apartment_number}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="text-black">{session.cleaner_name}</span>
                            </div>
                            {session.price && (
                              <span className="font-semibold text-green-600">R{session.price.toFixed(2)}</span>
                            )}
                          </div>
                          {session.notes && (
                            <p className="text-sm text-black mt-2">{session.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button onClick={() => startEditing(session)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit cleaning">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(session)} className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete cleaning">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
