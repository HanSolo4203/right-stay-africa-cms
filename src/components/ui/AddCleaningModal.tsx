'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { CreateCleaningSessionData, CreateRSALaundryExpenseData, Cleaner, SchedulableProperty, WelcomePackItem } from '@/lib/types';
import { isRSALaundryAsset, getPropertyDisplayName } from '@/lib/property-utils';
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
  const [dailyPaymentAmount, setDailyPaymentAmount] = useState<number | undefined>(undefined);
  const [schedulableProperties, setSchedulableProperties] = useState<SchedulableProperty[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [welcomePackItems, setWelcomePackItems] = useState<WelcomePackItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedWelcomePackId, setSelectedWelcomePackId] = useState<string>('');
  
  // Multi-cleaner state for apartment properties
  const [additionalCleaners, setAdditionalCleaners] = useState<string[]>([]);
  const [maxCleaners] = useState(2); // Maximum 2 cleaners total

  // Check if selected property is RSA Laundry Room
  const selectedProperty = schedulableProperties.find(p => p.id === formData.apartment_id);
  const isRSALaundryRoom = selectedProperty && isRSALaundryAsset(selectedProperty);
  const isApartment = selectedProperty && !isRSALaundryAsset(selectedProperty);
  
  // Calculate total cleaners selected
  const totalCleanersSelected = 1 + additionalCleaners.length; // Primary cleaner + additional cleaners
  const canAddMoreCleaners = isApartment && totalCleanersSelected < maxCleaners;

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
      
      // Load schedulable properties, cleaners and welcome pack items in parallel
      const [propertiesResponse, cleanersResponse, welcomePackResponse] = await Promise.all([
        fetch('/api/schedulable-properties'),
        fetch('/api/cleaners'),
        fetch('/api/settings/welcome-pack')
      ]);

      const [propertiesResult, cleanersResult, welcomePackResult] = await Promise.all([
        propertiesResponse.json(),
        cleanersResponse.json(),
        welcomePackResponse.json()
      ]);

      if (propertiesResult.success) {
        setSchedulableProperties(propertiesResult.data);
      }

      if (cleanersResult.success) {
        setCleaners(cleanersResult.data);
      }

      if (welcomePackResult?.success) {
        setWelcomePackItems(welcomePackResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load properties and cleaners');
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
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
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

    // Require payment amount for RSA Laundry Room
    if (isRSALaundryRoom && (!dailyPaymentAmount || dailyPaymentAmount <= 0)) {
      newErrors.price = 'Payment amount is required for RSA Laundry Room services';
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
      if (isRSALaundryRoom) {
        // Create RSA Laundry Room expense
        const rsaExpenseData: CreateRSALaundryExpenseData = {
          cleaner_id: formData.cleaner_id,
          service_date: formData.cleaning_date,
          daily_payment_amount: dailyPaymentAmount || 0,
          service_description: 'RSA Laundry Room service',
          notes: formData.notes
        };

        const response = await fetch('/api/rsa-laundry-expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rsaExpenseData),
        });

        const result = await response.json();

        if (result.success) {
          toast.success('RSA Laundry Room service scheduled successfully!');
          setFormData({ apartment_id: '', cleaner_id: '', cleaning_date: '', notes: '', price: undefined });
          setDailyPaymentAmount(undefined);
          setAdditionalCleaners([]);
          setSelectedWelcomePackId('');
          onSuccess();
          onClose();
        } else {
          toast.error(result.error || 'Failed to schedule RSA Laundry Room service');
        }
      } else {
        // Create single cleaning session (with multi-cleaner support)
        const additionalCleanerId = additionalCleaners.find(id => id) || undefined;
        
        // For multi-cleaner sessions, individual fees will be set by the backend
        // based on the apartment's cleaner_payout amount
        // The total price is the amount entered in the popup
        const selectedWelcomePack = welcomePackItems.find(item => item.id === selectedWelcomePackId);
        const requestData = {
          ...formData,
          cleaner_2_id: additionalCleanerId,
          is_multi_cleaner: !!additionalCleanerId,
          include_welcome_pack: !!selectedWelcomePackId, // Include welcome pack if one is selected
          welcome_pack_fee: selectedWelcomePack ? selectedWelcomePack.price : null // Pass the welcome pack price
        };

        const response = await fetch('/api/cleaning-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        const result = await response.json();

        if (result.success) {
          const primaryCleaner = cleaners.find(c => c.id === formData.cleaner_id);
          const additionalCleaner = additionalCleanerId ? cleaners.find(c => c.id === additionalCleanerId) : null;
          
          const message = additionalCleanerId 
            ? `Multi-cleaner session created successfully with ${primaryCleaner?.name} and ${additionalCleaner?.name}!`
            : `Cleaning session created successfully with ${primaryCleaner?.name}!`;
          
          toast.success(message);
          setFormData({ apartment_id: '', cleaner_id: '', cleaning_date: '', notes: '', price: undefined });
          setDailyPaymentAmount(undefined);
          setAdditionalCleaners([]);
          setSelectedWelcomePackId('');
          onSuccess();
          onClose();
        } else {
          toast.error(result.error || 'Failed to create cleaning session');
        }
      }
    } catch (error) {
      console.error('Error creating scheduling:', error);
      toast.error(isRSALaundryRoom ? 'Failed to schedule RSA Laundry Room service' : 'Failed to schedule cleaning session');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get available cleaners (excluding already selected ones)
  const getAvailableCleaners = (excludeCleanerId?: string) => {
    const selectedCleanerIds = [formData.cleaner_id, ...additionalCleaners].filter(Boolean);
    if (excludeCleanerId) {
      selectedCleanerIds.splice(selectedCleanerIds.indexOf(excludeCleanerId), 1);
    }
    return cleaners.filter(cleaner => !selectedCleanerIds.includes(cleaner.id));
  };

  // Helper function to get cleaners for a specific dropdown (includes currently selected cleaner)
  const getCleanersForDropdown = (currentCleanerId?: string) => {
    const selectedCleanerIds = [formData.cleaner_id, ...additionalCleaners].filter(Boolean);
    // Remove the current cleaner from the exclusion list so it shows in its own dropdown
    const otherSelectedIds = selectedCleanerIds.filter(id => id !== currentCleanerId);
    return cleaners.filter(cleaner => !otherSelectedIds.includes(cleaner.id));
  };

  // Add additional cleaner dropdown
  const addAdditionalCleaner = () => {
    if (canAddMoreCleaners) {
      // Get available cleaners (excluding already selected ones)
      const availableCleaners = getAvailableCleaners();
      
      // Auto-select the first available cleaner, or empty string if none available
      const nextCleanerId = availableCleaners.length > 0 ? availableCleaners[0].id : '';
      
      setAdditionalCleaners(prev => [...prev, nextCleanerId]);
    }
  };

  // Remove additional cleaner dropdown
  const removeAdditionalCleaner = (index: number) => {
    setAdditionalCleaners(prev => prev.filter((_, i) => i !== index));
  };

  // Handle additional cleaner selection
  const handleAdditionalCleanerChange = (index: number, cleanerId: string) => {
    setAdditionalCleaners(prev => prev.map((id, i) => i === index ? cleanerId : id));
  };

  const handleClose = () => {
    setFormData({ apartment_id: '', cleaner_id: '', cleaning_date: '', notes: '', price: undefined });
    setDailyPaymentAmount(undefined);
    setAdditionalCleaners([]);
    setSelectedWelcomePackId('');
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isRSALaundryRoom ? 'Create RSA Laundry Session' : 'Schedule Cleaning Session'}
          </h2>
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
            <p className="text-gray-600">Loading properties and cleaners...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="apartment_id" className="block text-sm font-medium text-gray-700 mb-2">
                Property *
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
                <option value="">Select a property</option>
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
                <p className="mt-1 text-sm text-red-600">{errors.apartment_id}</p>
              )}
            </div>

            {/* Primary Cleaner */}
            <div>
              <label htmlFor="cleaner_id" className="block text-sm font-medium text-gray-700 mb-2">
                {isApartment ? 'Primary Cleaner *' : 'Cleaner *'}
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
                {getCleanersForDropdown(formData.cleaner_id).map((cleaner) => (
                  <option key={cleaner.id} value={cleaner.id}>
                    {cleaner.name}
                  </option>
                ))}
              </select>
              {errors.cleaner_id && (
                <p className="mt-1 text-sm text-red-600">{errors.cleaner_id}</p>
              )}
              {isApartment && (
                <p className="mt-1 text-xs text-gray-500">
                  Primary cleaner for this apartment cleaning session.
                </p>
              )}
            </div>

            {/* Additional Cleaners for Apartments */}
            {isApartment && additionalCleaners.map((cleanerId, index) => (
              <div key={index} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Cleaner {index + 1}
                </label>
                <div className="flex gap-2">
                  <select
                    value={cleanerId}
                    onChange={(e) => handleAdditionalCleanerChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    <option value="">Select additional cleaner</option>
                    {getCleanersForDropdown(cleanerId).map((cleaner) => (
                      <option key={cleaner.id} value={cleaner.id}>
                        {cleaner.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeAdditionalCleaner(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    disabled={isLoading}
                    title="Remove cleaner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Selected Cleaners Summary */}
            {isApartment && (formData.cleaner_id || additionalCleaners.some(id => id)) && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Cleaners:</h4>
                <div className="space-y-1">
                  {formData.cleaner_id && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span className="font-medium text-black">Primary:</span>
                      <span className="text-blue-700">
                        {cleaners.find(c => c.id === formData.cleaner_id)?.name}
                      </span>
                    </div>
                  )}
                  {additionalCleaners.map((cleanerId, index) => (
                    cleanerId && (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="font-medium text-black">Additional {index + 1}:</span>
                        <span className="text-blue-700">
                          {cleaners.find(c => c.id === cleanerId)?.name}
                        </span>
                      </div>
                    )
                  ))}
                </div>
                <p className="mt-2 text-xs text-blue-600">
                  Total: {totalCleanersSelected} cleaner{totalCleanersSelected !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}

            {/* Add Another Cleaner Button */}
            {isApartment && (
              <div>
                {canAddMoreCleaners ? (
                  <button
                    type="button"
                    onClick={addAdditionalCleaner}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                    disabled={isLoading}
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Cleaner
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md">
                    <span className="w-4 h-4 flex items-center justify-center text-gray-400">✓</span>
                    Maximum cleaners reached ({maxCleaners} total)
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  For larger apartments requiring multiple cleaners (max {maxCleaners} total).
                </p>
              </div>
            )}

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

            {/* Payment Amount for RSA Laundry Room */}
            {isRSALaundryRoom && (
              <div>
                <label htmlFor="dailyPaymentAmount" className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Payment Amount (R) *
                </label>
                <input
                  type="number"
                  id="dailyPaymentAmount"
                  name="dailyPaymentAmount"
                  value={dailyPaymentAmount || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setDailyPaymentAmount(undefined);
                    } else {
                      const numValue = Number(value);
                      if (!isNaN(numValue)) {
                        setDailyPaymentAmount(numValue);
                      }
                    }
                  }}
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.price ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="200.00"
                  disabled={isLoading}
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Payment amount for the laundry service on this day.</p>
              </div>
            )}

            {/* Welcome Pack Option - only show for non-RSA properties */}
            {!isRSALaundryRoom && welcomePackItems.length > 0 && (
              <div>
                <label htmlFor="welcome_pack" className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Pack (Optional)
                </label>
                <select
                  id="welcome_pack"
                  value={selectedWelcomePackId}
                  onChange={(e) => setSelectedWelcomePackId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="">No welcome pack</option>
                  {welcomePackItems
                    .filter(item => item.is_active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - R{item.price.toFixed(2)}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Select a welcome pack to add to this cleaning session. Manage welcome packs in Settings.
                </p>
              </div>
            )}

            {/* Regular Price Field - only show for non-RSA properties */}
            {!isRSALaundryRoom && (
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
            )}

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
                {isLoading ? 'Scheduling...' : (isRSALaundryRoom ? 'Create Session' : 'Schedule Session')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
