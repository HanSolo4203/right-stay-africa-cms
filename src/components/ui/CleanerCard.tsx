'use client';

import { Cleaner } from '@/lib/types';
import { Edit, Trash2, Phone, Mail } from 'lucide-react';

interface CleanerCardProps {
  cleaner: Cleaner;
  onEdit: (cleaner: Cleaner) => void;
  onDelete: (cleaner: Cleaner) => void;
}

export default function CleanerCard({ cleaner, onEdit, onDelete }: CleanerCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{cleaner.name}</h3>
          
          <div className="space-y-2">
            {cleaner.phone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                <span>{cleaner.phone}</span>
              </div>
            )}
            
            {cleaner.email && (
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                <span>{cleaner.email}</span>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            Created: {new Date(cleaner.created_at).toLocaleDateString()}
          </div>
        </div>
        
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => onEdit(cleaner)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Edit cleaner"
          >
            <Edit className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onDelete(cleaner)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Delete cleaner"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
