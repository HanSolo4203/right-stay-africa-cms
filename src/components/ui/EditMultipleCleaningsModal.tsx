'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Building2, User, Calendar, FileText, Edit, Trash2, Users } from 'lucide-react';
import WelcomePackToggle from './WelcomePackToggle';
import { CleaningSessionDetailed, UpdateCleaningSessionData, Cleaner, SchedulableProperty } from '@/lib/types';
import { isRSALaundryAsset, getPropertyDisplayName } from '@/lib/property-utils';
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
  const [schedulableProperties, setSchedulableProperties] = useState<SchedulableProperty[]>([]);
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
  const [cleaner2Id, setCleaner2Id] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [visibleSessions, setVisibleSessions] = useState<CleaningSessionDetailed[]>(sessions);
  const [welcomePackFee, setWelcomePackFee] = useState<number>(0);
  const [includeWelcomePack, setIncludeWelcomePack] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      
      // Load schedulable properties, cleaners, and welcome pack fee in parallel
      const [propertiesResponse, cleanersResponse, welcomePackResponse] = await Promise.all([
        fetch('/api/schedulable-properties'),
        fetch('/api/cleaners'),
        fetch('/api/analytics?welcomePackFee=1')
      ]);

      const [propertiesResult, cleanersResult, welcomePackResult] = await Promise.all([
        propertiesResponse.json(),
        cleanersResponse.json(),
        welcomePackResponse.json()
      ]);

      if (propertiesResult.success) {
        setSchedulableProperties(propertiesResult.data);
      } else {
        toast.error('Failed to load properties');
      }

      if (cleanersResult.success) {
        setCleaners(cleanersResult.data);
      } else {
        toast.error('Failed to load cleaners');
      }

      if (welcomePackResult.success) {
        setWelcomePackFee(Number(welcomePackResult.data.welcome_pack_fee));
      } else {
        console.warn('Failed to load welcome pack fee');
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
    
    // Find the property ID from the session's apartment number
    const property = schedulableProperties.find(prop => prop.property_name === session.apartment_number);
    // Find the cleaner ID from the session's cleaner name
    const cleaner = cleaners.find(cleaner => cleaner.name === session.cleaner_name);
    // Find the second cleaner ID if it exists
    const cleaner2 = session.cleaner_2_name ? cleaners.find(cleaner => cleaner.name === session.cleaner_2_name) : null;
    
    setFormData({
      id: session.id,
      apartment_id: property?.id || '',
      cleaner_id: cleaner?.id || '',
      cleaning_date: session.cleaning_date,
      notes: session.notes || '',
      price: session.price || undefined,
    });
    setCleaner2Id(cleaner2?.id || '');
    // Set welcome pack status based on database record
    setIncludeWelcomePack(!!(session.welcome_pack_fee && Number(session.welcome_pack_fee) > 0));
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
    setCleaner2Id('');
    setIncludeWelcomePack(false);
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

  const handleCleaner2Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCleaner2Id(e.target.value);
    // Clear error when user starts typing
    if (errors.cleaner_2_id) {
      setErrors(prev => ({ ...prev, cleaner_2_id: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.apartment_id) {
      newErrors.apartment_id = 'Property is required';
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
      const updateData = {
        ...formData,
        cleaner_2_id: cleaner2Id || null,
        is_multi_cleaner: !!cleaner2Id,
        cleaner_count: cleaner2Id ? 2 : 1,
        include_welcome_pack: includeWelcomePack,
      };

      const response = await fetch(`/api/cleaning-sessions/${editingSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Cleaning session updated successfully');
        
        // Update the session in the visible sessions list with the new data
        setVisibleSessions(prev => prev.map(session => 
          session.id === editingSession.id 
            ? { ...session, ...result.data }
            : session
        ));
        
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
    // Detect if this is an RSA Laundry Room expense
    const isRSAExpense = session.apartment_number === 'RSA Laundry Room' || 
                         session.property_category === 'internal_asset' ||
                         session.property_category === 'rsa_asset';

    const confirmMessage = isRSAExpense 
      ? `Are you sure you want to delete the RSA Laundry Room service?`
      : `Are you sure you want to delete the cleaning for Apartment ${session.apartment_number}?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const apiEndpoint = isRSAExpense 
        ? `/api/rsa-laundry-expenses/${session.id}`
        : `/api/cleaning-sessions/${session.id}`;

      const response = await fetch(apiEndpoint, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${isRSAExpense ? 'RSA Laundry Room service' : 'Cleaning session'} deleted successfully`);
        // Remove the deleted session from the visible sessions list
        setVisibleSessions(prev => prev.filter(s => s.id !== session.id));
        onSuccess();
      } else {
        toast.error(result.message || `Failed to delete ${isRSAExpense ? 'RSA Laundry Room service' : 'cleaning session'}`);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error(`Failed to delete ${isRSAExpense ? 'RSA Laundry Room service' : 'cleaning session'}`);
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
                              {/* Property */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  <Building2 className="w-4 h-4 inline mr-1" />
                                  Property
                                </label>
                                <select
                                  name="apartment_id"
                                  value={formData.apartment_id}
                                  onChange={handleInputChange}
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.apartment_id ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                >
                                  <option value="">Select property</option>
                                  {schedulableProperties.map((property) => (
                                    <option key={property.id} value={property.id}>
                                      {isRSALaundryAsset(property) 
                                        ? `🏢 ${getPropertyDisplayName(property)} - ${property.owner_name} (Internal)`
                                        : `🏠 ${getPropertyDisplayName(property)} - ${property.owner_name}`
                                      }
                                    </option>
                                  ))}
                                </select>
                                {errors.apartment_id && (
                                  <p className="text-red-500 text-sm mt-1">{errors.apartment_id}</p>
                                )}
                              </div>

                              {/* Primary Cleaner */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  <User className="w-4 h-4 inline mr-1" />
                                  Primary Cleaner
                                </label>
                                <select
                                  name="cleaner_id"
                                  value={formData.cleaner_id}
                                  onChange={handleInputChange}
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.cleaner_id ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                >
                                  <option value="">Select primary cleaner</option>
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

                              {/* Secondary Cleaner */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  <Users className="w-4 h-4 inline mr-1 text-blue-600" />
                                  Secondary Cleaner (Optional)
                                </label>
                                <select
                                  value={cleaner2Id}
                                  onChange={handleCleaner2Change}
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.cleaner_2_id ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                >
                                  <option value="">No secondary cleaner</option>
                                  {cleaners
                                    .filter(cleaner => cleaner.id !== formData.cleaner_id)
                                    .map((cleaner) => (
                                      <option key={cleaner.id} value={cleaner.id}>
                                        {cleaner.name}
                                      </option>
                                    ))}
                                </select>
                                {errors.cleaner_2_id && (
                                  <p className="text-red-500 text-sm mt-1">{errors.cleaner_2_id}</p>
                                )}
                                {cleaner2Id && (
                                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                    <div className="flex items-center space-x-2">
                                      <Users className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm text-blue-800">
                                        Multi-cleaner session: {cleaners.find(c => c.id === formData.cleaner_id)?.name} & {cleaners.find(c => c.id === cleaner2Id)?.name}
                                      </span>
                                    </div>
                                  </div>
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

                            {/* Welcome Pack Option - only show for non-RSA properties */}
                            {(() => {
                              const isRSALaundryRoom = editingSession?.apartment_number === 'RSA Laundry Room';
                              const isRSAExpense = editingSession?.property_category === 'internal_asset';
                              return !(isRSALaundryRoom || isRSAExpense) && (
                                <WelcomePackToggle fee={welcomePackFee} checked={includeWelcomePack} disabled={isLoading} onChange={setIncludeWelcomePack} />
                              );
                            })()}

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
                              {session.is_multi_cleaner && session.cleaner_2_name ? (
                                <Users className="w-4 h-4 text-blue-600" />
                              ) : (
                                <User className="w-4 h-4 text-gray-500" />
                              )}
                              <span className="text-black">
                                {session.is_multi_cleaner && session.cleaner_2_name 
                                  ? `${session.cleaner_name} & ${session.cleaner_2_name}`
                                  : session.cleaner_name
                                }
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {session.price && (
                                <span className="font-semibold text-green-600">R{session.price.toFixed(2)}</span>
                              )}
                              {session.welcome_pack_fee && Number(session.welcome_pack_fee) > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Welcome Pack: R{Number(session.welcome_pack_fee).toFixed(2)}
                                </span>
                              )}
                            </div>
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
