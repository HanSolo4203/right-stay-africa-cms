'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface AnalyticsData {
  summary: {
    total_cleanings: number;
    active_apartments: number;
    active_cleaners: number;
    average_cleanings_per_apartment: string;
    total_revenue: number;
  };
  cleanings_by_apartment: Array<{
    apartment_number: string;
    owner_name: string;
    cleaning_count: number;
    apartment_id: string;
  }>;
  cleaner_workload: Array<{
    cleaner_name: string;
    session_count: number;
    cleaner_id: string;
  }>;
  monthly_trends: Array<{
    month: string;
    month_key: string;
    cleaning_count: number;
    unique_apartments: number;
    unique_cleaners: number;
  }>;
  insights: {
    most_active_apartment: string;
    least_active_apartment: string;
    top_cleaner: string;
  };
  invoicing_data: Array<{
    apartment_number: string;
    owner_name: string;
    cleaning_count: number;
    total_amount: number;
    apartment_id: string;
  }>;
  date_range: {
    month?: string;
    year?: string;
    total_sessions: number;
  };
}

interface UseAnalyticsReturn {
  analyticsData: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  fetchAnalytics: (month?: string, year?: string) => Promise<AnalyticsData | null>;
  refreshAnalytics: () => Promise<void>;
}

export function useAnalytics(): UseAnalyticsReturn {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (month?: string, year?: string): Promise<AnalyticsData | null> => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (month) params.append('month', month);
      if (year) params.append('year', year);
      
      const queryString = params.toString();
      const url = `/api/analytics${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setAnalyticsData(result.data);
        return result.data;
      } else {
        setError(result.error || 'Failed to fetch analytics data');
        toast.error(result.error || 'Failed to fetch analytics data');
        return null;
      }
    } catch (error) {
      const errorMessage = 'Failed to fetch analytics data';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    // Get current month as default
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}-${month}`; // YYYY-MM format
    await fetchAnalytics(currentMonth);
  }, [fetchAnalytics]);

  return {
    analyticsData,
    loading,
    error,
    fetchAnalytics,
    refreshAnalytics,
  };
}
