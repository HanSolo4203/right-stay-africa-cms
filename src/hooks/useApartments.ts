'use client';

import { useState, useEffect, useCallback } from 'react';
import { Apartment, CreateApartmentData, UpdateApartmentData } from '@/lib/types';
import toast from 'react-hot-toast';

interface UseApartmentsReturn {
  apartments: Apartment[];
  loading: boolean;
  error: string | null;
  createApartment: (data: CreateApartmentData) => Promise<Apartment | null>;
  updateApartment: (id: string, data: UpdateApartmentData) => Promise<Apartment | null>;
  deleteApartment: (id: string) => Promise<boolean>;
  refreshApartments: () => Promise<void>;
}

export function useApartments(): UseApartmentsReturn {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApartments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/apartments');
      const result = await response.json();
      
      if (result.success) {
        setApartments(result.data);
      } else {
        setError(result.error || 'Failed to fetch apartments');
        toast.error(result.error || 'Failed to fetch apartments');
      }
    } catch (error) {
      const errorMessage = 'Failed to fetch apartments';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createApartment = useCallback(async (data: CreateApartmentData): Promise<Apartment | null> => {
    try {
      setError(null);
      
      const response = await fetch('/api/apartments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setApartments(prev => [...prev, result.data]);
        toast.success(result.message || 'Apartment created successfully');
        return result.data;
      } else {
        setError(result.error || 'Failed to create apartment');
        toast.error(result.error || 'Failed to create apartment');
        return null;
      }
    } catch (error) {
      const errorMessage = 'Failed to create apartment';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const updateApartment = useCallback(async (id: string, data: UpdateApartmentData): Promise<Apartment | null> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/apartments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setApartments(prev => prev.map(apt => apt.id === id ? result.data : apt));
        toast.success(result.message || 'Apartment updated successfully');
        return result.data;
      } else {
        setError(result.error || 'Failed to update apartment');
        toast.error(result.error || 'Failed to update apartment');
        return null;
      }
    } catch (error) {
      const errorMessage = 'Failed to update apartment';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const deleteApartment = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/apartments/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setApartments(prev => prev.filter(apt => apt.id !== id));
        toast.success(result.message || 'Apartment deleted successfully');
        return true;
      } else {
        setError(result.error || 'Failed to delete apartment');
        toast.error(result.error || 'Failed to delete apartment');
        return false;
      }
    } catch (error) {
      const errorMessage = 'Failed to delete apartment';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, []);

  const refreshApartments = useCallback(async () => {
    await fetchApartments();
  }, [fetchApartments]);

  useEffect(() => {
    fetchApartments();
  }, [fetchApartments]);

  return {
    apartments,
    loading,
    error,
    createApartment,
    updateApartment,
    deleteApartment,
    refreshApartments,
  };
}
