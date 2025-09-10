'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Users } from 'lucide-react';
import { Cleaner } from '@/lib/types';
import CleanerCard from './CleanerCard';
import AddCleanerModal from './AddCleanerModal';
import EditCleanerModal from './EditCleanerModal';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyCleanersState, EmptySearchState } from './EmptyState';
import ConfirmationDialog from './ConfirmationDialog';
import NetworkErrorHandler, { useNetworkError } from './NetworkErrorHandler';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';

interface CleanersListProps {
  onCleanerCountChange?: (count: number) => void;
}

export default function CleanersList({ onCleanerCountChange }: CleanersListProps) {
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [filteredCleaners, setFilteredCleaners] = useState<Cleaner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cleanerToDelete, setCleanerToDelete] = useState<Cleaner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use debounced search
  const { searchValue, debouncedSearchValue, setSearchValue, clearSearch } = useDebouncedSearch();
  
  // Use network error handling
  const { error, isRetrying, handleError, retry, clearError } = useNetworkError();

  // Load cleaners from API
  const loadCleaners = useCallback(async () => {
    try {
      setIsLoading(true);
      clearError();
      const response = await fetch('/api/cleaners');
      const result = await response.json();

      if (result.success) {
        setCleaners(result.data);
        setFilteredCleaners(result.data);
        onCleanerCountChange?.(result.data.length);
      } else {
        throw new Error(result.error || 'Failed to load cleaners');
      }
    } catch (error) {
      console.error('Error loading cleaners:', error);
      handleError(error as Error);
      toast.error('Failed to load cleaners');
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  useEffect(() => {
    loadCleaners();
  }, [loadCleaners]);

  // Filter cleaners based on debounced search term
  useEffect(() => {
    if (!debouncedSearchValue.trim()) {
      setFilteredCleaners(cleaners);
    } else {
      const filtered = cleaners.filter(cleaner =>
        cleaner.name.toLowerCase().includes(debouncedSearchValue.toLowerCase()) ||
        (cleaner.email && cleaner.email.toLowerCase().includes(debouncedSearchValue.toLowerCase())) ||
        (cleaner.phone && cleaner.phone.includes(debouncedSearchValue))
      );
      setFilteredCleaners(filtered);
    }
  }, [debouncedSearchValue, cleaners]);

  const handleAddSuccess = () => {
    loadCleaners();
  };

  const handleEdit = (cleaner: Cleaner) => {
    setSelectedCleaner(cleaner);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    loadCleaners();
  };

  const handleDelete = (cleaner: Cleaner) => {
    setCleanerToDelete(cleaner);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!cleanerToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/cleaners/${cleanerToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Cleaner deleted successfully!');
        loadCleaners();
        setDeleteConfirmOpen(false);
        setCleanerToDelete(null);
      } else {
        throw new Error(result.error || 'Failed to delete cleaner');
      }
    } catch (error) {
      console.error('Error deleting cleaner:', error);
      toast.error('Failed to delete cleaner');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <LoadingSkeleton className="h-8 w-32 mb-2" />
            <LoadingSkeleton className="h-4 w-48" />
          </div>
          <LoadingSkeleton className="h-10 w-36" />
        </div>
        <LoadingSkeleton className="h-10 w-full" />
        <LoadingSkeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <LoadingSkeleton className="h-4 w-24" />
                <div className="flex space-x-2">
                  <LoadingSkeleton className="h-8 w-16" />
                  <LoadingSkeleton className="h-8 w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <LoadingSkeleton className="h-3 w-full" />
                <LoadingSkeleton className="h-3 w-2/3" />
                <LoadingSkeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Network Error Handler */}
      <NetworkErrorHandler 
        error={error} 
        onRetry={() => retry(loadCleaners)} 
        isRetrying={isRetrying} 
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cleaners</h2>
          <p className="text-gray-600">Manage your cleaning staff</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors min-h-[44px] min-w-[44px]"
          aria-label="Add new cleaner"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Cleaner
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search cleaners by name, email, or phone..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          aria-label="Search cleaners"
        />
      </div>

      {/* Results count */}
      <div className="flex items-center text-sm text-gray-600">
        <Users className="w-4 h-4 mr-2" />
        {filteredCleaners.length} cleaner{filteredCleaners.length !== 1 ? 's' : ''} found
        {searchValue && (
          <span className="ml-2">
            (filtered from {cleaners.length} total)
          </span>
        )}
      </div>

      {/* Cleaners Grid */}
      {filteredCleaners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCleaners.map((cleaner) => (
            <CleanerCard
              key={cleaner.id}
              cleaner={cleaner}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        searchValue ? (
          <EmptySearchState 
            searchTerm={searchValue}
            onClearSearch={clearSearch}
          />
        ) : (
          <EmptyCleanersState onAddCleaner={() => setIsAddModalOpen(true)} />
        )
      )}

      {/* Modals */}
      <AddCleanerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <EditCleanerModal
        isOpen={isEditModalOpen}
        cleaner={selectedCleaner}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCleaner(null);
        }}
        onSuccess={handleEditSuccess}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCleanerToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Cleaner"
        message={`Are you sure you want to delete ${cleanerToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
