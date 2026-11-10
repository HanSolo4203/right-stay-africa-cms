'use client';

import { Apartment } from '@/lib/types';
import { Edit, Trash2, Mail, MapPin, Calendar, Power } from 'lucide-react';

interface ApartmentCardProps {
  apartment: Apartment;
  sessionCount?: number;
  onEdit: (apartment: Apartment) => void;
  onDelete: (apartment: Apartment) => void;
  onToggleActive: (apartment: Apartment) => void;
  isToggling?: boolean;
}

export default function ApartmentCard({
  apartment,
  sessionCount = 0,
  onEdit,
  onDelete,
  onToggleActive,
  isToggling = false,
}: ApartmentCardProps) {
  const isActive = apartment.is_active !== false;

  return (
    <div
      className={`rounded-lg shadow-md border p-6 transition-shadow ${
        isActive
          ? 'bg-white border-gray-200 hover:shadow-lg'
          : 'bg-gray-50 border-gray-200 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900">
              Apartment {apartment.apartment_number}
            </h3>
            <span
              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {isActive ? 'Active' : 'Disabled'}
            </span>
            {sessionCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                <Calendar className="w-3 h-3 mr-1" />
                {sessionCount} session{sessionCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium mr-2">Owner:</span>
              <span>{apartment.owner_name}</span>
            </div>
            
            {apartment.owner_email && (
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                <span>{apartment.owner_email}</span>
              </div>
            )}
            
            {apartment.address && (
              <div className="flex items-start text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{apartment.address}</span>
              </div>
            )}

            {!isActive && (
              <p className="text-xs text-gray-500 pt-1">
                Hidden from calendar. Booking and cleaning history kept.
              </p>
            )}
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            Created: {new Date(apartment.created_at).toLocaleDateString()}
          </div>
        </div>
        
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => onToggleActive(apartment)}
            disabled={isToggling}
            className={`p-2 rounded-md transition-colors disabled:opacity-50 ${
              isActive
                ? 'text-amber-600 hover:bg-amber-50'
                : 'text-green-600 hover:bg-green-50'
            }`}
            title={isActive ? 'Disable apartment' : 'Enable apartment'}
          >
            <Power className="w-4 h-4" />
          </button>

          <button
            onClick={() => onEdit(apartment)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Edit apartment"
          >
            <Edit className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onDelete(apartment)}
            className={`p-2 rounded-md transition-colors ${
              sessionCount > 0 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-red-600 hover:bg-red-50'
            }`}
            title={sessionCount > 0 ? 'Cannot delete - has cleaning sessions' : 'Delete apartment'}
            disabled={sessionCount > 0}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
