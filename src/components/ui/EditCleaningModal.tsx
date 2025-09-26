'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { CleaningSessionDetailed, UpdateCleaningSessionData, UpdateRSALaundryExpenseData, Cleaner, SchedulableProperty, WelcomePackItem } from '@/lib/types';
import { isRSALaundryAsset, getPropertyDisplayName } from '@/lib/property-utils';
import toast from 'react-hot-toast';

interface EditCleaningModalProps {
  isOpen: boolean;
  session: CleaningSessionDetailed | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditCleaningModal({ isOpen, session, onClose, onSuccess }: EditCleaningModalProps) {
  const [formData, setFormData] = useState<UpdateCleaningSessionData>({
    id: '',
    apartment_id: '',
    cleaner_id: '',
    cleaning_date: '',
    notes: '',
    price: undefined,
    cleaner_1_fee: undefined,
    cleaner_2_fee: undefined,
    total_cleaning_fee: undefined,
  });
  const [dailyPaymentAmount, setDailyPaymentAmount] = useState<number | undefined>(undefined);
  const [schedulableProperties, setSchedulableProperties] = useState<SchedulableProperty[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [welcomePackItems, setWelcomePackItems] = useState<WelcomePackItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRSAExpense, setIsRSAExpense] = useState(false);
  const [selectedWelcomePackId, setSelectedWelcomePackId] = useState<string>('');
  
  // Multi-cleaner functionality for apartments
  const [additionalCleaners, setAdditionalCleaners] = useState<string[]>([]);
  const maxCleaners = 2;

  // Check if selected property is RSA Laundry Room
  const selectedProperty = schedulableProperties.find(p => p.id === formData.apartment_id);
  const isRSALaundryRoom = selectedProperty && isRSALaundryAsset(selectedProperty);

  
  // Multi-cleaner derived states
  const isApartment = selectedProperty && !isRSALaundryAsset(selectedProperty);
  const canAddMoreCleaners = isApartment && (formData.cleaner_id || additionalCleaners.some(id => id)) && additionalCleaners.length < maxCleaners - 1;
  const totalCleanersSelected = (formData.cleaner_id ? 1 : 0) + additionalCleaners.filter(id => id).length;


  // Note: additionalCleaners will be populated by loadData function when session changes

  // Clear cleaner_2_fee when additional cleaners are removed
  useEffect(() => {
    const hasSecondCleaner = additionalCleaners.some(id => id);
    if (!hasSecondCleaner && formData.cleaner_2_fee) {
      setFormData(prev => ({ ...prev, cleaner_2_fee: undefined }));
    }
  }, [additionalCleaners, formData.cleaner_2_fee]);

  const loadData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      
      // Reset additional cleaners at the start
      setAdditionalCleaners([]);
      
      // Load schedulable properties, cleaners, and welcome pack items in parallel
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
        
        // Find the property ID from the session's apartment number
        if (session) {
          const property = propertiesResult.data.find((prop: SchedulableProperty) => 
            prop.property_name === session.apartment_number
          );
          if (property) {
            setFormData(prev => ({ ...prev, apartment_id: property.id }));
          }
        }
      }

      if (cleanersResult.success) {
        setCleaners(cleanersResult.data);
        
        // Find the cleaner ID from the session
        if (session) {
          if (session.cleaner_id) {
            // Use the cleaner_id directly from the session
            setFormData(prev => ({ ...prev, cleaner_id: session.cleaner_id }));
          } else if (session.cleaner_name) {
            // Fallback: try to find by name if ID is not available
            const cleaner = cleanersResult.data.find((cleaner: Cleaner) => 
              cleaner.name === session.cleaner_name
            );
            if (cleaner) {
              setFormData(prev => ({ ...prev, cleaner_id: cleaner.id }));
            }
          }
          
          // Handle second cleaner if it exists
          if (session.cleaner_2_id) {
            // Use the cleaner_2_id directly from the session
            setAdditionalCleaners([session.cleaner_2_id]);
          } else if (session.cleaner_2_name) {
            // Fallback: try to find by name if ID is not available
            const cleaner2 = cleanersResult.data.find((cleaner: Cleaner) => 
              cleaner.name === session.cleaner_2_name
            );
            if (cleaner2) {
              setAdditionalCleaners([cleaner2.id]);
            }
          }
        }
      }

      // Load welcome pack items
      if (welcomePackResult.success) {
        setWelcomePackItems(welcomePackResult.data);
        
        // Set the selected welcome pack based on the session's welcome_pack_fee
        if (session && session.welcome_pack_fee) {
          const matchingWelcomePack = welcomePackResult.data.find((item: WelcomePackItem) => 
            item.price === session.welcome_pack_fee && item.is_active
          );
          if (matchingWelcomePack) {
            setSelectedWelcomePackId(matchingWelcomePack.id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load apartments and cleaners');
    } finally {
      setIsLoadingData(false);
    }
  }, [session]);

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
    
    // If this was the last additional cleaner, clear the cleaner_2_fee and any validation errors
    const currentAdditionalCleaners = additionalCleaners.filter((_, i) => i !== index);
    if (currentAdditionalCleaners.length === 0) {
      setFormData(prev => ({ ...prev, cleaner_2_fee: undefined }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.cleaner_2_fee;
        return newErrors;
      });
    }
  };

  // Handle additional cleaner selection change
  const handleAdditionalCleanerChange = (index: number, cleanerId: string) => {
    setAdditionalCleaners(prev => prev.map((id, i) => i === index ? cleanerId : id));
  };

  useEffect(() => {
    if (isOpen && session) {
      loadData();
      
      // Detect if this is an RSA Laundry Room expense
      const isRSA = session.apartment_number === 'RSA Laundry Room' || 
                   session.property_category === 'internal_asset';
      setIsRSAExpense(isRSA);
      
      setFormData({
        id: session.id,
        apartment_id: '', // We'll need to find the apartment ID from the apartment_number
        cleaner_id: '', // We'll need to find the cleaner ID from the cleaner_name
        cleaning_date: session.cleaning_date,
        notes: session.notes || '',
        price: session.price,
        cleaner_1_fee: session.cleaner_1_fee,
        cleaner_2_fee: session.cleaner_2_fee,
        total_cleaning_fee: session.total_cleaning_fee,
      });

      // Welcome pack state is set in loadData function when welcome pack items are loaded
      
      // Set daily payment amount for RSA Laundry Room sessions
      if (isRSA && session.price) {
        setDailyPaymentAmount(session.price);
      }
    }
  }, [isOpen, session, loadData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    
    // Handle numeric fields
    if (name === 'price' || name === 'cleaner_1_fee' || name === 'cleaner_2_fee') {
      const numValue = value === '' ? undefined : parseFloat(value);
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name as keyof UpdateCleaningSessionData]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof typeof newErrors];
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

    // Validate cleaner_2 field consistency for multi-cleaner sessions
    const hasSecondCleaner = additionalCleaners.some(id => id);
    if (hasSecondCleaner) {
      if (!formData.cleaner_2_fee || formData.cleaner_2_fee <= 0) {
        newErrors.cleaner_2_fee = 'Second cleaner fee is required when second cleaner is selected';
      }
    } else {
      // Clear cleaner_2_fee validation error if no second cleaner is selected
      if (newErrors.cleaner_2_fee) {
        delete newErrors.cleaner_2_fee;
      }
    }

    // Validate cleaner_1_fee for multi-cleaner sessions
    if (isApartment && (formData.cleaner_id || hasSecondCleaner)) {
      if (!formData.cleaner_1_fee || formData.cleaner_1_fee <= 0) {
        newErrors.cleaner_1_fee = 'Primary cleaner fee is required';
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
      if (isRSAExpense) {
        // Update RSA Laundry Room expense
        const rsaExpenseData: UpdateRSALaundryExpenseData = {
          id: formData.id,
          cleaner_id: formData.cleaner_id,
          service_date: formData.cleaning_date,
          daily_payment_amount: dailyPaymentAmount || 0,
          service_description: 'RSA Laundry Room service',
          notes: formData.notes
        };

        const response = await fetch(`/api/rsa-laundry-expenses/${formData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rsaExpenseData),
        });

        const result = await response.json();

        if (result.success) {
          toast.success('RSA Laundry Room service updated successfully!');
          onSuccess();
          onClose();
        } else {
          toast.error(result.error || 'Failed to update RSA Laundry Room service');
        }
      } else if (isApartment && (formData.cleaner_id || additionalCleaners.some(id => id))) {
        // Handle multiple cleaners for apartment properties - update single record
        const additionalCleanerId = additionalCleaners.find(id => id) || null;
        
        // Get cleaner names for the request
        const primaryCleaner = cleaners.find(c => c.id === formData.cleaner_id);
        const additionalCleaner = additionalCleanerId ? cleaners.find(c => c.id === additionalCleanerId) : null;
        
        // For multi-cleaner sessions, include individual fees and calculate total
        const selectedWelcomePack = welcomePackItems.find(item => item.id === selectedWelcomePackId);
        const multiCleanerRequestData = {
          ...formData,
          cleaner_2_id: additionalCleanerId, // This will be null if no additional cleaner
          cleaner_1_name: primaryCleaner?.name || session?.cleaner_name,
          cleaner_2_name: additionalCleaner?.name || null,
          is_multi_cleaner: !!additionalCleanerId,
          cleaner_count: additionalCleanerId ? 2 : 1,
          include_welcome_pack: !!selectedWelcomePackId,
          welcome_pack_fee: selectedWelcomePack ? selectedWelcomePack.price : null,
        };

        // Only include cleaning fees if they were explicitly provided
        if (formData.cleaner_1_fee !== undefined && formData.cleaner_1_fee !== null) {
          multiCleanerRequestData.cleaner_1_fee = formData.cleaner_1_fee;
        }
        if (additionalCleanerId && formData.cleaner_2_fee !== undefined && formData.cleaner_2_fee !== null) {
          multiCleanerRequestData.cleaner_2_fee = formData.cleaner_2_fee;
        }

        // Calculate total cleaning fee only if individual fees were provided
        if (formData.cleaner_1_fee !== undefined && formData.cleaner_1_fee !== null) {
          if (additionalCleanerId && formData.cleaner_2_fee !== undefined && formData.cleaner_2_fee !== null) {
            multiCleanerRequestData.total_cleaning_fee = formData.cleaner_1_fee + formData.cleaner_2_fee;
          } else {
            multiCleanerRequestData.total_cleaning_fee = formData.cleaner_1_fee;
          }
        }

        // Remove empty strings from UUID fields to prevent validation errors
        if (multiCleanerRequestData.apartment_id === '') {
          delete multiCleanerRequestData.apartment_id;
        }
        if (multiCleanerRequestData.cleaner_id === '') {
          delete multiCleanerRequestData.cleaner_id;
        }

        console.log(`[AUDIT] Sending multi-cleaner update request for session ${formData.id}:`, JSON.stringify(multiCleanerRequestData, null, 2));


        const response = await fetch(`/api/cleaning-sessions/${formData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(multiCleanerRequestData),
        });

        const result = await response.json();

        if (result.success) {
          const successMessage = additionalCleanerId 
            ? `Multi-cleaner session updated successfully with ${primaryCleaner?.name} and ${additionalCleaner?.name}!`
            : `Cleaning session updated successfully with ${primaryCleaner?.name}!`;
          toast.success(successMessage);
          
          // Update local state to reflect the changes
          if (result.data) {
            setFormData(prev => ({
              ...prev,
              cleaner_1_fee: result.data.cleaner_1_fee,
              cleaner_2_fee: result.data.cleaner_2_fee,
              total_cleaning_fee: result.data.total_cleaning_fee,
              is_multi_cleaner: result.data.is_multi_cleaner,
              cleaner_count: result.data.cleaner_count
            }));
            
            // Update additional cleaners state based on the response
            if (result.data.cleaner_2_id) {
              setAdditionalCleaners([result.data.cleaner_2_id]);
            } else {
              setAdditionalCleaners([]);
            }
          }
          
          onSuccess();
          onClose();
        } else {
          toast.error(result.error || 'Failed to update cleaning session');
        }
      } else {
        // Update regular cleaning session (single cleaner)
        const selectedWelcomePack = welcomePackItems.find(item => item.id === selectedWelcomePackId);
        const requestData = {
          ...formData,
          price: formData.price,
          include_welcome_pack: !!selectedWelcomePackId,
          welcome_pack_fee: selectedWelcomePack ? selectedWelcomePack.price : null,
        };

        console.log(`[AUDIT] Sending update request for session ${formData.id}:`, JSON.stringify(requestData, null, 2));

        const response = await fetch(`/api/cleaning-sessions/${formData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        const result = await response.json();

        if (result.success) {
          toast.success('Cleaning session updated successfully!');
          
          // Update local state to reflect the changes
          if (result.data) {
            setFormData(prev => ({
              ...prev,
              cleaner_1_fee: result.data.cleaner_1_fee,
              cleaner_2_fee: result.data.cleaner_2_fee,
              total_cleaning_fee: result.data.total_cleaning_fee,
              is_multi_cleaner: result.data.is_multi_cleaner,
              cleaner_count: result.data.cleaner_count
            }));
            
            // Update additional cleaners state based on the response
            if (result.data.cleaner_2_id) {
              setAdditionalCleaners([result.data.cleaner_2_id]);
            } else {
              setAdditionalCleaners([]);
            }
          }
          
          onSuccess();
          onClose();
        } else {
          toast.error(result.error || 'Failed to update cleaning session');
        }
      }
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error(isRSAExpense ? 'Failed to update RSA Laundry Room service' : 'Failed to update cleaning session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    
    // Create detailed confirmation message
    let confirmMessage = `Are you sure you want to delete this ${isRSAExpense ? 'RSA Laundry Room service' : 'cleaning session'}?\n\n`;
    confirmMessage += `Date: ${session.cleaning_date}\n`;
    confirmMessage += `Property: ${session.apartment_number}\n`;
    
    if (isRSAExpense) {
      confirmMessage += `Cleaner: ${session.cleaner_name}\n`;
      confirmMessage += `Payment: R${session.price || 0}\n`;
    } else {
      if (session.is_multi_cleaner && session.cleaner_2_name) {
        confirmMessage += `Cleaners: ${session.cleaner_1_name || session.cleaner_name} & ${session.cleaner_2_name}\n`;
        confirmMessage += `Total Fee: R${session.total_cleaning_fee || 0}\n`;
        confirmMessage += `Customer Price: R${session.price || 0}\n`;
      } else {
        confirmMessage += `Cleaner: ${session.cleaner_1_name || session.cleaner_name}\n`;
        confirmMessage += `Fee: R${session.cleaner_1_fee || 0}\n`;
        confirmMessage += `Customer Price: R${session.price || 0}\n`;
      }
    }
    
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
        toast.success(`${isRSAExpense ? 'RSA Laundry Room service' : 'Cleaning session'} deleted successfully!`);
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || `Failed to delete ${isRSAExpense ? 'RSA Laundry Room service' : 'cleaning session'}`);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error(`Failed to delete ${isRSAExpense ? 'RSA Laundry Room service' : 'cleaning session'}`);
    }
  };

  const handleClose = () => {
    setErrors({});
    setAdditionalCleaners([]);
    onClose();
  };

  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isRSAExpense ? 'Edit RSA Laundry Room Service' : 'Edit Cleaning Session'}
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
            <p className="text-gray-600">Loading session data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* First Row: Property and Primary Cleaner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="apartment_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Property *
                </label>
                <div>
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
                          ? `${getPropertyDisplayName(property)} - ${property.owner_name} (Internal)`
                          : `${getPropertyDisplayName(property)} - ${property.owner_name}`}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.apartment_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.apartment_id}</p>
                )}
              </div>

              {/* Primary Cleaner Selection */}
              <div>
                <label htmlFor="cleaner_id" className="block text-sm font-medium text-gray-700 mb-2">
                  {isApartment ? 'Primary Cleaner *' : 'Cleaner *'}
                </label>
                <div>
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
                </div>
                {errors.cleaner_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.cleaner_id}</p>
                )}
                {isApartment && (
                  <p className="mt-1 text-xs text-gray-500">
                    Primary cleaner for this apartment cleaning session.
                  </p>
                )}
              </div>
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
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add Another Cleaner Button */}
            {isApartment && canAddMoreCleaners && (
              <div>
                <button
                  type="button"
                  onClick={addAdditionalCleaner}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
                  disabled={isLoading}
                >
                  <Plus className="w-4 h-4" />
                  Add Another Cleaner
                </button>
                <p className="mt-1 text-xs text-gray-500">
                  For larger apartments requiring multiple cleaners (max {maxCleaners} total)
                </p>
              </div>
            )}

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
                        {cleaners.find(c => c.id === formData.cleaner_id)?.name || session?.cleaner_name}
                      </span>
                    </div>
                  )}
                  {additionalCleaners.map((cleanerId, index) => (
                    cleanerId && (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="font-medium text-black">Additional {index + 1}:</span>
                        <span className="text-blue-700">
                          {cleaners.find(c => c.id === cleanerId)?.name || session?.cleaner_2_name}
                        </span>
                      </div>
                    )
                  ))}
                </div>
                <p className="mt-2 text-xs text-blue-600">
                  Total: {totalCleanersSelected} cleaner{totalCleanersSelected !== 1 ? 's' : ''} selected
                </p>
                
                {/* Show individual fees for multi-cleaner sessions */}
                {totalCleanersSelected > 1 && session && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <h5 className="text-xs font-medium text-gray-900 mb-2">Individual Fees:</h5>
                    <div className="space-y-1 text-xs">
                      {session.cleaner_1_fee && (
                        <div className="flex justify-between">
                          <span className="text-gray-700">
                            {session.cleaner_name}: 
                          </span>
                          <span className="font-medium text-gray-900">R{session.cleaner_1_fee}</span>
                        </div>
                      )}
                      {session.cleaner_2_fee && session.cleaner_2_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-700">
                            {session.cleaner_2_name}: 
                          </span>
                          <span className="font-medium text-gray-900">R{session.cleaner_2_fee}</span>
                        </div>
                      )}
                      {session.total_cleaning_fee && (
                        <div className="flex justify-between pt-1 border-t border-gray-200">
                          <span className="font-medium text-gray-900">Total:</span>
                          <span className="font-bold text-gray-900">R{session.total_cleaning_fee}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Second Row: Cleaning Date and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="cleaning_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Cleaning Date *
                </label>
                <div>
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
                </div>
                {errors.cleaning_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.cleaning_date}</p>
                )}
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <div>
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
              </div>
            </div>

            {/* Payment Amount for RSA Laundry Room */}
            {(isRSALaundryRoom || isRSAExpense) && (
              <div>
                <label htmlFor="dailyPaymentAmount" className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Payment Amount (R) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                  <input
                    type="number"
                    id="dailyPaymentAmount"
                    name="dailyPaymentAmount"
                    value={dailyPaymentAmount || ''}
                    onChange={(e) => setDailyPaymentAmount(Number(e.target.value))}
                    min="0"
                    step="0.01"
                    className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.price ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="200.00"
                    disabled={isLoading}
                  />
                </div>
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Payment amount for the laundry service on this day.</p>
              </div>
            )}

            {/* Third Row: Welcome Pack and Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Welcome Pack Option - only show for apartment properties */}
              {isApartment && welcomePackItems.length > 0 && (
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

              {/* Regular Price Field - only show for apartment properties */}
              {isApartment && (
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    Price (R)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.price ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                  )}
                </div>
              )}
            </div>

            {/* Individual Cleaner Payment Fields for Multi-Cleaner Sessions */}
            {isApartment && totalCleanersSelected > 1 && (
              <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Individual Cleaner Payments</h4>
                
                {/* Primary Cleaner Payment */}
                {formData.cleaner_id && (
                  <div>
                    <label htmlFor="cleaner_1_fee" className="block text-sm font-medium text-gray-700 mb-2">
                      {cleaners.find(c => c.id === formData.cleaner_id)?.name || session?.cleaner_name || 'Primary Cleaner'} Payment (R)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                      <input
                        type="number"
                        id="cleaner_1_fee"
                        name="cleaner_1_fee"
                        value={formData.cleaner_1_fee || ''}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.cleaner_1_fee ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="200.00"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.cleaner_1_fee && (
                      <p className="mt-1 text-sm text-red-600">{errors.cleaner_1_fee}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Payment amount for the primary cleaner.</p>
                  </div>
                )}

                {/* Additional Cleaner Payments */}
                {additionalCleaners.map((cleanerId, index) => (
                  cleanerId && (
                    <div key={index}>
                      <label htmlFor={`cleaner_2_fee_${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                        {cleaners.find(c => c.id === cleanerId)?.name || session?.cleaner_2_name || 'Additional Cleaner'} Payment (R)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R</span>
                        <input
                          type="number"
                          id={`cleaner_2_fee_${index}`}
                          name="cleaner_2_fee"
                          value={formData.cleaner_2_fee || ''}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.cleaner_2_fee ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="200.00"
                          disabled={isLoading}
                        />
                      </div>
                      {errors.cleaner_2_fee && (
                        <p className="mt-1 text-sm text-red-600">{errors.cleaner_2_fee}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">Payment amount for the additional cleaner.</p>
                    </div>
                  )
                ))}

                {/* Total Payment Display */}
                <div className="pt-3 border-t border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Total Cleaner Payments:</span>
                    <span className="text-lg font-bold text-green-600">
                      R{((formData.cleaner_1_fee || 0) + (formData.cleaner_2_fee || 0)).toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    This total will be automatically calculated and stored in the database.
                  </p>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                disabled={isLoading}
              >
                Delete
              </button>
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
                {isLoading ? 'Updating...' : (isRSAExpense ? 'Update Service' : 'Update Session')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
