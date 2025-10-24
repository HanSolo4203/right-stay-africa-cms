'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, History, Plus, Minus, User, Calendar } from 'lucide-react';

interface HistoryItem {
  id: string;
  type: 'addition' | 'usage';
  date: string;
  previousStock: number;
  newStock: number;
  adjustment: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  costPerUnit?: number | null;
  totalCost?: number | null;
}

interface ItemHistoryDropdownProps {
  itemId: string;
  itemName: string;
}

export default function ItemHistoryDropdown({ itemId, itemName }: ItemHistoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    if (history.length > 0) return; // Don't fetch if already loaded
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/inventory/${itemId}/history`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch history');
      }
      
      setHistory(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching item history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchHistory();
    }
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: 'addition' | 'usage') => {
    return type === 'addition' ? (
      <Plus className="h-4 w-4 text-green-600" />
    ) : (
      <Minus className="h-4 w-4 text-red-600" />
    );
  };

  const getTypeColor = (type: 'addition' | 'usage') => {
    return type === 'addition' 
      ? 'text-green-700 bg-green-50 border-green-200' 
      : 'text-red-700 bg-red-50 border-red-200';
  };

  const getTypeLabel = (type: 'addition' | 'usage') => {
    return type === 'addition' ? 'Stock Added' : 'Stock Used';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        title="View item history"
      >
        <History className="h-4 w-4 mr-2" />
        History
        {isOpen ? (
          <ChevronUp className="h-4 w-4 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-2" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[28rem] bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[32rem] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <History className="h-5 w-5 mr-2 text-blue-600" />
                {itemName} - History
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-80">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <span className="text-sm text-gray-600">Loading history...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-center py-8 px-4">
                <div className="text-red-500 mb-3">
                  <History className="h-8 w-8 mx-auto" />
                </div>
                <p className="text-sm text-red-600 mb-3">{error}</p>
                <button
                  onClick={fetchHistory}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && history.length === 0 && (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No history available</p>
                <p className="text-xs text-gray-400 mt-1">Stock operations will appear here</p>
              </div>
            )}

            {!loading && !error && history.length > 0 && (
              <div className="divide-y divide-gray-100">
                {history.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      index === 0 ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${getTypeColor(item.type)}`}>
                          {getTypeIcon(item.type)}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-gray-900">
                            {getTypeLabel(item.type)}
                          </h4>
                          <p className="text-xs text-gray-500 flex items-center mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(item.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {item.adjustment > 0 ? '+' : ''}{item.adjustment}
                        </div>
                        <div className="text-xs text-gray-500">units</div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-gray-50 rounded-md p-2">
                        <div className="text-xs text-gray-500 mb-1">Previous Stock</div>
                        <div className="font-medium text-sm">{item.previousStock}</div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2">
                        <div className="text-xs text-gray-500 mb-1">New Stock</div>
                        <div className="font-medium text-sm text-green-600">{item.newStock}</div>
                      </div>
                    </div>

                    {/* Cost Information */}
                    {(item.totalCost || item.costPerUnit) && (
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {item.totalCost && (
                          <div className="bg-green-50 rounded-md p-2">
                            <div className="text-xs text-green-600 mb-1">Total Cost</div>
                            <div className="font-medium text-sm text-green-700">
                              R{item.totalCost.toFixed(2)}
                            </div>
                          </div>
                        )}
                        {item.costPerUnit && (
                          <div className="bg-blue-50 rounded-md p-2">
                            <div className="text-xs text-blue-600 mb-1">Cost/Unit</div>
                            <div className="font-medium text-sm text-blue-700">
                              R{item.costPerUnit.toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes and User */}
                    <div className="space-y-2">
                      {item.notes && (
                        <div className="bg-gray-50 rounded-md p-2">
                          <div className="text-xs text-gray-500 mb-1">Notes</div>
                          <div className="text-sm text-gray-700">{item.notes}</div>
                        </div>
                      )}
                      
                      {item.createdBy && (
                        <div className="flex items-center text-xs text-gray-500">
                          <User className="h-3 w-3 mr-1" />
                          <span>By: {item.createdBy}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && !error && history.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                Showing {history.length} operation{history.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
