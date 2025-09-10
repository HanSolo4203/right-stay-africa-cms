'use client';

import { useState, useEffect, useCallback } from 'react';
import { CleaningSessionDetailed, CreateCleaningSessionData, UpdateCleaningSessionData } from '@/lib/types';
import toast from 'react-hot-toast';

interface UseCleaningSessionsReturn {
  sessions: CleaningSessionDetailed[];
  loading: boolean;
  error: string | null;
  createSession: (data: CreateCleaningSessionData) => Promise<CleaningSessionDetailed | null>;
  updateSession: (id: string, data: UpdateCleaningSessionData) => Promise<CleaningSessionDetailed | null>;
  deleteSession: (id: string) => Promise<boolean>;
  refreshSessions: () => Promise<void>;
  getSessionsByDateRange: (startDate: string, endDate: string) => Promise<CleaningSessionDetailed[]>;
  getSessionsByApartment: (apartmentId: string) => Promise<CleaningSessionDetailed[]>;
  getSessionsByCleaner: (cleanerId: string) => Promise<CleaningSessionDetailed[]>;
}

export function useCleaningSessions(): UseCleaningSessionsReturn {
  const [sessions, setSessions] = useState<CleaningSessionDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/cleaning-sessions');
      const result = await response.json();
      
      if (result.success) {
        setSessions(result.data);
      } else {
        setError(result.error || 'Failed to fetch cleaning sessions');
        toast.error(result.error || 'Failed to fetch cleaning sessions');
      }
    } catch (error) {
      const errorMessage = 'Failed to fetch cleaning sessions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async (data: CreateCleaningSessionData): Promise<CleaningSessionDetailed | null> => {
    try {
      setError(null);
      
      const response = await fetch('/api/cleaning-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSessions(prev => [...prev, result.data]);
        toast.success(result.message || 'Cleaning session created successfully');
        return result.data;
      } else {
        setError(result.error || 'Failed to create cleaning session');
        toast.error(result.error || 'Failed to create cleaning session');
        return null;
      }
    } catch (error) {
      const errorMessage = 'Failed to create cleaning session';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const updateSession = useCallback(async (id: string, data: UpdateCleaningSessionData): Promise<CleaningSessionDetailed | null> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/cleaning-sessions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSessions(prev => prev.map(session => session.id === id ? result.data : session));
        toast.success(result.message || 'Cleaning session updated successfully');
        return result.data;
      } else {
        setError(result.error || 'Failed to update cleaning session');
        toast.error(result.error || 'Failed to update cleaning session');
        return null;
      }
    } catch (error) {
      const errorMessage = 'Failed to update cleaning session';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const deleteSession = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/cleaning-sessions/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSessions(prev => prev.filter(session => session.id !== id));
        toast.success(result.message || 'Cleaning session deleted successfully');
        return true;
      } else {
        setError(result.error || 'Failed to delete cleaning session');
        toast.error(result.error || 'Failed to delete cleaning session');
        return false;
      }
    } catch (error) {
      const errorMessage = 'Failed to delete cleaning session';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    await fetchSessions();
  }, [fetchSessions]);

  const getSessionsByDateRange = useCallback(async (startDate: string, endDate: string): Promise<CleaningSessionDetailed[]> => {
    try {
      const response = await fetch(`/api/cleaning-sessions?start_date=${startDate}&end_date=${endDate}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        toast.error(result.error || 'Failed to fetch sessions by date range');
        return [];
      }
    } catch (error) {
      toast.error('Failed to fetch sessions by date range');
      return [];
    }
  }, []);

  const getSessionsByApartment = useCallback(async (apartmentId: string): Promise<CleaningSessionDetailed[]> => {
    try {
      const response = await fetch(`/api/cleaning-sessions?apartment_id=${apartmentId}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        toast.error(result.error || 'Failed to fetch sessions by apartment');
        return [];
      }
    } catch (error) {
      toast.error('Failed to fetch sessions by apartment');
      return [];
    }
  }, []);

  const getSessionsByCleaner = useCallback(async (cleanerId: string): Promise<CleaningSessionDetailed[]> => {
    try {
      const response = await fetch(`/api/cleaning-sessions?cleaner_id=${cleanerId}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        toast.error(result.error || 'Failed to fetch sessions by cleaner');
        return [];
      }
    } catch (error) {
      toast.error('Failed to fetch sessions by cleaner');
      return [];
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    createSession,
    updateSession,
    deleteSession,
    refreshSessions,
    getSessionsByDateRange,
    getSessionsByApartment,
    getSessionsByCleaner,
  };
}
