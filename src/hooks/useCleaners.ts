'use client';

import { useState, useEffect, useCallback } from 'react';
import { Cleaner, CreateCleanerData, UpdateCleanerData } from '@/lib/types';
import toast from 'react-hot-toast';

interface UseCleanersReturn {
  cleaners: Cleaner[];
  loading: boolean;
  error: string | null;
  createCleaner: (data: CreateCleanerData) => Promise<Cleaner | null>;
  updateCleaner: (id: string, data: UpdateCleanerData) => Promise<Cleaner | null>;
  deleteCleaner: (id: string) => Promise<boolean>;
  refreshCleaners: () => Promise<void>;
}

export function useCleaners(): UseCleanersReturn {
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCleaners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/cleaners');
      const result = await response.json();
      
      if (result.success) {
        setCleaners(result.data);
      } else {
        setError(result.error || 'Failed to fetch cleaners');
        toast.error(result.error || 'Failed to fetch cleaners');
      }
    } catch (err) {
      const errorMessage = 'Failed to fetch cleaners';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCleaner = useCallback(async (data: CreateCleanerData): Promise<Cleaner | null> => {
    try {
      setError(null);
      
      const response = await fetch('/api/cleaners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCleaners(prev => [...prev, result.data]);
        toast.success(result.message || 'Cleaner created successfully');
        return result.data;
      } else {
        setError(result.error || 'Failed to create cleaner');
        toast.error(result.error || 'Failed to create cleaner');
        return null;
      }
    } catch (err) {
      const errorMessage = 'Failed to create cleaner';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const updateCleaner = useCallback(async (id: string, data: UpdateCleanerData): Promise<Cleaner | null> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/cleaners/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCleaners(prev => prev.map(cleaner => cleaner.id === id ? result.data : cleaner));
        toast.success(result.message || 'Cleaner updated successfully');
        return result.data;
      } else {
        setError(result.error || 'Failed to update cleaner');
        toast.error(result.error || 'Failed to update cleaner');
        return null;
      }
    } catch (err) {
      const errorMessage = 'Failed to update cleaner';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const deleteCleaner = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/cleaners/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCleaners(prev => prev.filter(cleaner => cleaner.id !== id));
        toast.success(result.message || 'Cleaner deleted successfully');
        return true;
      } else {
        setError(result.error || 'Failed to delete cleaner');
        toast.error(result.error || 'Failed to delete cleaner');
        return false;
      }
    } catch (err) {
      const errorMessage = 'Failed to delete cleaner';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, []);

  const refreshCleaners = useCallback(async () => {
    await fetchCleaners();
  }, [fetchCleaners]);

  useEffect(() => {
    fetchCleaners();
  }, [fetchCleaners]);

  return {
    cleaners,
    loading,
    error,
    createCleaner,
    updateCleaner,
    deleteCleaner,
    refreshCleaners,
  };
}
