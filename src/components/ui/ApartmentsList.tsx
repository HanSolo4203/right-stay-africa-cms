'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Building2 } from 'lucide-react';
import { Apartment } from '@/lib/types';
import ApartmentCard from './ApartmentCard';
import AddApartmentModal from './AddApartmentModal';
import EditApartmentModal from './EditApartmentModal';
import toast from 'react-hot-toast';

interface ApartmentsListProps {
  onApartmentCountChange?: (count: number) => void;
}

export default function ApartmentsList({ onApartmentCountChange }: ApartmentsListProps) {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
  const [apartmentSessionCounts, setApartmentSessionCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);

  // Load apartments from API
  const loadApartments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/apartments');
      const result = await response.json();

      if (result.success) {
        setApartments(result.data);
        setFilteredApartments(result.data);
        onApartmentCountChange?.(result.data.length);
        
        // Load session counts for each apartment
        await loadSessionCounts(result.data);
      } else {
        toast.error('Failed to load apartments');
      }
    } catch (error) {
      console.error('Error loading apartments:', error);
      toast.error('Failed to load apartments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load session counts for apartments
  const loadSessionCounts = async (apartmentsData: Apartment[]) => {
    try {
      const sessionCounts: Record<string, number> = {};
      
      // Get all cleaning sessions
      const sessionsResponse = await fetch('/api/cleaning-sessions');
      if (sessionsResponse.ok) {
        const sessionsResult = await sessionsResponse.json();
        if (sessionsResult.success) {
          // Count sessions per apartment
          apartmentsData.forEach(apartment => {
            const count = sessionsResult.data.filter((session: { apartment_number: string }) => 
              session.apartment_number === apartment.apartment_number
            ).length;
            sessionCounts[apartment.id] = count;
          });
        }
      }
      
      setApartmentSessionCounts(sessionCounts);
    } catch (error) {
      console.error('Error loading session counts:', error);
    }
  }, []);

  useEffect(() => {
    loadApartments();
  }, [loadApartments]);

  // Filter apartments based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredApartments(apartments);
    } else {
      const filtered = apartments.filter(apartment =>
        apartment.apartment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apartment.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (apartment.owner_email && apartment.owner_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (apartment.address && apartment.address.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredApartments(filtered);
    }
  }, [searchTerm, apartments]);

  const handleAddSuccess = () => {
    loadApartments();
  };

  const handleEdit = (apartment: Apartment) => {
    setSelectedApartment(apartment);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    loadApartments();
  };

  const handleDelete = async (apartment: Apartment) => {
    const sessionCount = apartmentSessionCounts[apartment.id] || 0;
    
    if (sessionCount > 0) {
      toast.error(`Cannot delete apartment. It has ${sessionCount} cleaning session(s). Please delete the sessions first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete Apartment ${apartment.apartment_number}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/apartments/${apartment.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Apartment deleted successfully!');
        loadApartments();
      } else {
        toast.error(result.error || 'Failed to delete apartment');
      }
    } catch (error) {
      console.error('Error deleting apartment:', error);
      toast.error('Failed to delete apartment');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading apartments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Apartments</h2>
          <p className="text-gray-600">Manage your rental properties</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Apartment
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search apartments by number, owner, email, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Results count */}
      <div className="flex items-center text-sm text-gray-600">
        <Building2 className="w-4 h-4 mr-2" />
        {filteredApartments.length} apartment{filteredApartments.length !== 1 ? 's' : ''} found
        {searchTerm && (
          <span className="ml-2">
            (filtered from {apartments.length} total)
          </span>
        )}
      </div>

      {/* Apartments Grid */}
      {filteredApartments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApartments.map((apartment) => (
            <ApartmentCard
              key={apartment.id}
              apartment={apartment}
              sessionCount={apartmentSessionCounts[apartment.id] || 0}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No apartments found' : 'No apartments yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Get started by adding your first apartment'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Apartment
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <AddApartmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <EditApartmentModal
        isOpen={isEditModalOpen}
        apartment={selectedApartment}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedApartment(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
