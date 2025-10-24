'use client';

import { useState, useEffect } from 'react';
import {
  WelcomePackConfiguration,
  CreateWelcomePackConfigurationData,
  UpdateWelcomePackConfigurationData,
  WelcomePackConfigurationItem,
  CreateWelcomePackConfigurationItemData,
  UpdateWelcomePackConfigurationItemData,
  WelcomePackDistribution,
  CreateWelcomePackDistributionData,
  UpdateWelcomePackDistributionData,
  WelcomePackDistributionItem,
  CreateWelcomePackDistributionItemData,
  UpdateWelcomePackDistributionItemData,
  WelcomePackAlert,
  CreateWelcomePackAlertData,
  UpdateWelcomePackAlertData,
  WelcomePackConsumptionReport,
  WelcomePackCostAnalysis,
} from '@/lib/types';

interface UseWelcomePackReturn {
  // Configurations
  configurations: WelcomePackConfiguration[];
  defaultConfiguration: WelcomePackConfiguration | null;
  loading: boolean;
  error: string | null;
  
  // Configuration methods
  fetchConfigurations: () => Promise<void>;
  fetchDefaultConfiguration: () => Promise<void>;
  createConfiguration: (data: CreateWelcomePackConfigurationData) => Promise<WelcomePackConfiguration>;
  updateConfiguration: (data: UpdateWelcomePackConfigurationData) => Promise<WelcomePackConfiguration>;
  deleteConfiguration: (id: string) => Promise<void>;
  
  // Configuration items
  getConfigurationItems: (configurationId: string) => Promise<WelcomePackConfigurationItem[]>;
  createConfigurationItem: (data: CreateWelcomePackConfigurationItemData) => Promise<WelcomePackConfigurationItem>;
  updateConfigurationItem: (data: UpdateWelcomePackConfigurationItemData) => Promise<WelcomePackConfigurationItem>;
  deleteConfigurationItem: (id: string) => Promise<void>;
  
  // Distributions
  distributions: WelcomePackDistribution[];
  fetchDistributions: (startDate?: string, endDate?: string) => Promise<void>;
  createDistribution: (data: CreateWelcomePackDistributionData) => Promise<WelcomePackDistribution>;
  updateDistribution: (data: UpdateWelcomePackDistributionData) => Promise<WelcomePackDistribution>;
  deleteDistribution: (id: string) => Promise<void>;
  
  // Distribution items
  getDistributionItems: (distributionId: string) => Promise<WelcomePackDistributionItem[]>;
  createDistributionItem: (data: CreateWelcomePackDistributionItemData) => Promise<WelcomePackDistributionItem>;
  updateDistributionItem: (data: UpdateWelcomePackDistributionItemData) => Promise<WelcomePackDistributionItem>;
  deleteDistributionItem: (id: string) => Promise<void>;
  
  // Alerts
  alerts: WelcomePackAlert[];
  unresolvedAlerts: WelcomePackAlert[];
  fetchAlerts: (unresolved?: boolean) => Promise<void>;
  createAlert: (data: CreateWelcomePackAlertData) => Promise<WelcomePackAlert>;
  updateAlert: (data: UpdateWelcomePackAlertData) => Promise<WelcomePackAlert>;
  deleteAlert: (id: string) => Promise<void>;
  
  // Reports
  getConsumptionReport: (startDate: string, endDate: string) => Promise<WelcomePackConsumptionReport>;
  getCostAnalysis: (configurationId: string) => Promise<WelcomePackCostAnalysis>;
  
  refetch: () => Promise<void>;
}

export function useWelcomePack(): UseWelcomePackReturn {
  const [configurations, setConfigurations] = useState<WelcomePackConfiguration[]>([]);
  const [defaultConfiguration, setDefaultConfiguration] = useState<WelcomePackConfiguration | null>(null);
  const [distributions, setDistributions] = useState<WelcomePackDistribution[]>([]);
  const [alerts, setAlerts] = useState<WelcomePackAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const unresolvedAlerts = alerts.filter(alert => !alert.is_resolved);

  // Configuration methods
  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/welcome-pack-configurations');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch welcome pack configurations');
      }
      
      setConfigurations(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching welcome pack configurations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultConfiguration = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/welcome-pack-configurations?default=true');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch default configuration');
      }
      
      setDefaultConfiguration(data.data || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching default configuration:', err);
    }
  };

  const createConfiguration = async (data: CreateWelcomePackConfigurationData): Promise<WelcomePackConfiguration> => {
    try {
      setError(null);
      
      const response = await fetch('/api/welcome-pack-configurations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create welcome pack configuration');
      }
      
      await fetchConfigurations();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error creating welcome pack configuration:', err);
      throw err;
    }
  };

  const updateConfiguration = async (data: UpdateWelcomePackConfigurationData): Promise<WelcomePackConfiguration> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-configurations/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update welcome pack configuration');
      }
      
      await fetchConfigurations();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error updating welcome pack configuration:', err);
      throw err;
    }
  };

  const deleteConfiguration = async (id: string): Promise<void> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-configurations/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete welcome pack configuration');
      }
      
      await fetchConfigurations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error deleting welcome pack configuration:', err);
      throw err;
    }
  };

  // Configuration items methods
  const getConfigurationItems = async (configurationId: string): Promise<WelcomePackConfigurationItem[]> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-configurations/${configurationId}/items`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch configuration items');
      }
      
      return data.data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching configuration items:', err);
      throw err;
    }
  };

  const createConfigurationItem = async (data: CreateWelcomePackConfigurationItemData): Promise<WelcomePackConfigurationItem> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-configurations/${data.configuration_id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create configuration item');
      }
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error creating configuration item:', err);
      throw err;
    }
  };

  const updateConfigurationItem = async (data: UpdateWelcomePackConfigurationItemData): Promise<WelcomePackConfigurationItem> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-configurations/${data.configuration_id}/items/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update configuration item');
      }
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error updating configuration item:', err);
      throw err;
    }
  };

  const deleteConfigurationItem = async (id: string): Promise<void> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-configurations/[id]/items/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete configuration item');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error deleting configuration item:', err);
      throw err;
    }
  };

  // Distribution methods
  const fetchDistributions = async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = '/api/welcome-pack-distributions';
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch welcome pack distributions');
      }
      
      setDistributions(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching welcome pack distributions:', err);
    } finally {
      setLoading(false);
    }
  };

  const createDistribution = async (data: CreateWelcomePackDistributionData): Promise<WelcomePackDistribution> => {
    try {
      setError(null);
      
      const response = await fetch('/api/welcome-pack-distributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create welcome pack distribution');
      }
      
      await fetchDistributions();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error creating welcome pack distribution:', err);
      throw err;
    }
  };

  const updateDistribution = async (data: UpdateWelcomePackDistributionData): Promise<WelcomePackDistribution> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-distributions/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update welcome pack distribution');
      }
      
      await fetchDistributions();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error updating welcome pack distribution:', err);
      throw err;
    }
  };

  const deleteDistribution = async (id: string): Promise<void> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-distributions/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete welcome pack distribution');
      }
      
      await fetchDistributions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error deleting welcome pack distribution:', err);
      throw err;
    }
  };

  // Distribution items methods
  const getDistributionItems = async (distributionId: string): Promise<WelcomePackDistributionItem[]> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-distributions/${distributionId}/items`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch distribution items');
      }
      
      return data.data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching distribution items:', err);
      throw err;
    }
  };

  const createDistributionItem = async (data: CreateWelcomePackDistributionItemData): Promise<WelcomePackDistributionItem> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-distributions/${data.distribution_id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create distribution item');
      }
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error creating distribution item:', err);
      throw err;
    }
  };

  const updateDistributionItem = async (data: UpdateWelcomePackDistributionItemData): Promise<WelcomePackDistributionItem> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-distributions/${data.distribution_id}/items/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update distribution item');
      }
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error updating distribution item:', err);
      throw err;
    }
  };

  const deleteDistributionItem = async (id: string): Promise<void> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-distributions/[id]/items/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete distribution item');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error deleting distribution item:', err);
      throw err;
    }
  };

  // Alert methods
  const fetchAlerts = async (unresolved?: boolean) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = '/api/welcome-pack-alerts';
      if (unresolved) {
        url += '?unresolved=true';
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch welcome pack alerts');
      }
      
      setAlerts(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching welcome pack alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async (data: CreateWelcomePackAlertData): Promise<WelcomePackAlert> => {
    try {
      setError(null);
      
      const response = await fetch('/api/welcome-pack-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create welcome pack alert');
      }
      
      await fetchAlerts();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error creating welcome pack alert:', err);
      throw err;
    }
  };

  const updateAlert = async (data: UpdateWelcomePackAlertData): Promise<WelcomePackAlert> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-alerts/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update welcome pack alert');
      }
      
      await fetchAlerts();
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error updating welcome pack alert:', err);
      throw err;
    }
  };

  const deleteAlert = async (id: string): Promise<void> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-alerts/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete welcome pack alert');
      }
      
      await fetchAlerts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error deleting welcome pack alert:', err);
      throw err;
    }
  };

  // Report methods
  const getConsumptionReport = async (startDate: string, endDate: string): Promise<WelcomePackConsumptionReport> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-reports?type=consumption&startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate consumption report');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error generating consumption report:', err);
      throw err;
    }
  };

  const getCostAnalysis = async (configurationId: string): Promise<WelcomePackCostAnalysis> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/welcome-pack-reports?type=cost-analysis&configurationId=${configurationId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate cost analysis');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error generating cost analysis:', err);
      throw err;
    }
  };

  // Refetch all data
  const refetch = async () => {
    await Promise.all([
      fetchConfigurations(),
      fetchDefaultConfiguration(),
      fetchDistributions(),
      fetchAlerts(),
    ]);
  };

  // Initial fetch
  useEffect(() => {
    refetch();
  }, []);

  return {
    configurations,
    defaultConfiguration,
    loading,
    error,
    fetchConfigurations,
    fetchDefaultConfiguration,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    getConfigurationItems,
    createConfigurationItem,
    updateConfigurationItem,
    deleteConfigurationItem,
    distributions,
    fetchDistributions,
    createDistribution,
    updateDistribution,
    deleteDistribution,
    getDistributionItems,
    createDistributionItem,
    updateDistributionItem,
    deleteDistributionItem,
    alerts,
    unresolvedAlerts,
    fetchAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
    getConsumptionReport,
    getCostAnalysis,
    refetch,
  };
}
