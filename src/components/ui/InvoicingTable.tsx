'use client';

import React, { useState } from 'react';
import { Download, Printer, FileText, Search, ChevronDown, ChevronRight, Calendar, User, DollarSign, FileText as NoteIcon, Receipt } from 'lucide-react';
import { CleaningSessionDetailed } from '@/lib/types';
import InvoiceGenerator from './InvoiceGenerator';

interface InvoicingTableProps {
  data: Array<{
    apartment_number: string;
    owner_name: string;
    cleaning_count: number;
    total_amount: number;
    apartment_id: string;
  }>;
  month?: string;
  year?: string;
}

export default function InvoicingTable({ data, month, year }: InvoicingTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'apartment_number' | 'owner_name' | 'cleaning_count' | 'total_amount'>('apartment_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedApartment, setExpandedApartment] = useState<string | null>(null);
  const [cleaningDetails, setCleaningDetails] = useState<Record<string, CleaningSessionDetailed[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [invoiceApartment, setInvoiceApartment] = useState<{
    apartment: {
      apartment_number: string;
      owner_name: string;
      cleaning_count: number;
      total_amount: number;
      apartment_id: string;
    };
    sessions: CleaningSessionDetailed[];
  } | null>(null);
  const [welcomePackFee, setWelcomePackFee] = useState<number>(0);

  // Filter and sort data
  const filteredData = data
    .filter(apartment => 
      apartment.apartment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const totalAmount = filteredData.reduce((sum, apt) => sum + apt.total_amount, 0);
  const totalCleanings = filteredData.reduce((sum, apt) => sum + apt.cleaning_count, 0);

  // Fetch cleaning details for a specific apartment
  const fetchCleaningDetails = async (apartmentNumber: string) => {
    // Create a unique key that includes both apartment number and filter type
    const cacheKey = `${apartmentNumber}-${month || year || 'all'}`;
    
    if (cleaningDetails[cacheKey]) {
      return; // Already loaded
    }

    setLoadingDetails(apartmentNumber);
    try {
      let url = `/api/cleaning-sessions?apartment=${apartmentNumber}`;
      if (month) {
        url += `&month=${month}`;
      } else if (year) {
        url += `&year=${year}`;
      }
      
      const [sessionsRes, settingsRes] = await Promise.all([
        fetch(url),
        fetch('/api/analytics?welcomePackFee=1')
      ]);
      const result = await sessionsRes.json();
      // Try to read welcome pack fee from settings API if provided; falls back to per-session values
      try {
        const settingsData = await settingsRes.json();
        if (typeof settingsData?.data?.welcome_pack_fee === 'number') {
          setWelcomePackFee(Number(settingsData.data.welcome_pack_fee));
        }
      } catch {
        // ignore settings errors; session-level welcome_pack_fee will still be used if present
      }
      
      if (result.success) {
        setCleaningDetails(prev => ({
          ...prev,
          [cacheKey]: result.data
        }));
      }
    } catch (error) {
      console.error('Error fetching cleaning details:', error);
    } finally {
      setLoadingDetails(null);
    }
  };

  // Toggle apartment details
  const toggleApartmentDetails = async (apartmentNumber: string) => {
    if (expandedApartment === apartmentNumber) {
      setExpandedApartment(null);
    } else {
      setExpandedApartment(apartmentNumber);
      await fetchCleaningDetails(apartmentNumber);
    }
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Generate invoice for a specific apartment
  const generateInvoice = async (apartment: {
    apartment_number: string;
    owner_name: string;
    cleaning_count: number;
    total_amount: number;
    apartment_id: string;
  }) => {
    const cacheKey = `${apartment.apartment_number}-${month || year || 'all'}`;
    
    // If we already have the cleaning details, use them
    if (cleaningDetails[cacheKey]) {
      setInvoiceApartment({
        apartment,
        sessions: cleaningDetails[cacheKey]
      });
      return;
    }

    // Otherwise, fetch the details first
    setLoadingDetails(apartment.apartment_number);
    try {
      let url = `/api/cleaning-sessions?apartment=${apartment.apartment_number}`;
      if (month) {
        url += `&month=${month}`;
      } else if (year) {
        url += `&year=${year}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setCleaningDetails(prev => ({
          ...prev,
          [cacheKey]: result.data
        }));
        setInvoiceApartment({
          apartment,
          sessions: result.data
        });
      }
    } catch (error) {
      console.error('Error fetching cleaning details for invoice:', error);
    } finally {
      setLoadingDetails(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Apartment Number', 'Owner Name', 'Cleaning Count', 'Total Amount (R)'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(apt => [
        apt.apartment_number,
        `"${apt.owner_name}"`,
        apt.cleaning_count,
        apt.total_amount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaning-invoice-${month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const printInvoice = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const monthName = new Date(month + '-01').toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Cleaning Invoice - ${monthName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { color: #1f2937; margin-bottom: 5px; }
              .header p { color: #6b7280; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #d1d5db; padding: 12px; text-align: left; }
              th { background-color: #f9fafb; font-weight: bold; }
              .total { font-weight: bold; background-color: #f3f4f6; }
              .summary { margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Right Stay Africa</h1>
              <p>Cleaning Services Invoice - ${monthName}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Apartment</th>
                  <th>Owner</th>
                  <th>Cleanings</th>
                  <th>Amount (R)</th>
                </tr>
              </thead>
              <tbody>
                ${filteredData.map(apt => `
                  <tr>
                    <td>${apt.apartment_number}</td>
                    <td>${apt.owner_name}</td>
                    <td>${apt.cleaning_count}</td>
                    <td>${apt.total_amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr class="total">
                  <td colspan="3">Total</td>
                  <td>R${totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            <div class="summary">
              <p><strong>Summary:</strong></p>
              <p>Total Cleanings: ${totalCleanings}</p>
              <p>Total Amount: R${totalAmount.toLocaleString()}</p>
              <p>Average per Apartment: R${filteredData.length > 0 ? (totalAmount / filteredData.length).toFixed(2) : '0'}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center space-x-3 mb-4 sm:mb-0">
          <FileText className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Invoicing Summary</h3>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search apartments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </button>
          
          <button
            onClick={printInvoice}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('apartment_number')}
              >
                Apartment {sortBy === 'apartment_number' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('owner_name')}
              >
                Owner {sortBy === 'owner_name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('cleaning_count')}
              >
                Cleanings {sortBy === 'cleaning_count' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_amount')}
              >
                Amount {sortBy === 'total_amount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((apartment) => (
              <React.Fragment key={apartment.apartment_id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <button
                      onClick={() => toggleApartmentDetails(apartment.apartment_number)}
                      className="flex items-center space-x-2 hover:text-blue-600 transition-colors"
                    >
                      {expandedApartment === apartment.apartment_number ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span>Apartment {apartment.apartment_number}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {apartment.owner_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {apartment.cleaning_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    R{apartment.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => generateInvoice(apartment)}
                      disabled={loadingDetails === apartment.apartment_number}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingDetails === apartment.apartment_number ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          <Receipt className="w-3 h-3 mr-1" />
                          Invoice
                        </>
                      )}
                    </button>
                  </td>
                </tr>
                
                {/* Expanded details row */}
                {expandedApartment === apartment.apartment_number && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Cleaning Details for Apartment {apartment.apartment_number}
                        </h4>
                        
                        {loadingDetails === apartment.apartment_number ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-sm text-gray-600">Loading details...</span>
                          </div>
                        ) : cleaningDetails[`${apartment.apartment_number}-${month || year || 'all'}`]?.length > 0 ? (
                          <div className="space-y-4">
                            {/* Sessions list */}
                            {cleaningDetails[`${apartment.apartment_number}-${month || year || 'all'}`].map((session) => (
                              <div key={session.id} className="bg-white p-3 rounded-lg border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium text-gray-900">
                                      {new Date(session.cleaning_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600">{session.cleaner_name}</span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <DollarSign className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium text-green-600">
                                      R{session.price ? session.price.toFixed(2) : '150.00'}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <NoteIcon className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600">
                                      {session.notes || 'No notes'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Welcome Pack Summary */}
                            {(() => {
                              const sessions = cleaningDetails[`${apartment.apartment_number}-${month || year || 'all'}`];
                              const usedCount = sessions.filter(s => (s.welcome_pack_fee && Number(s.welcome_pack_fee) > 0) || (!s.welcome_pack_fee && welcomePackFee > 0)).length;
                              const totalWelcomeAmount = sessions.reduce((sum, s) => {
                                const fee = Number(s.welcome_pack_fee);
                                if (!isNaN(fee) && fee > 0) return sum + fee;
                                return sum + (welcomePackFee > 0 ? welcomePackFee : 0);
                              }, 0);
                              return (
                                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-yellow-900">Welcome Packs Used</p>
                                      <p className="text-xs text-yellow-700">Count and total for the selected period</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xl font-bold text-yellow-900">{usedCount}</p>
                                      <p className="text-sm font-semibold text-yellow-800">R{totalWelcomeAmount.toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm">No cleaning sessions found for this month</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900" colSpan={2}>
                Total
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                {totalCleanings}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                R{totalAmount.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p>No apartments found matching your search</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-blue-600 font-medium">Total Cleanings</p>
          <p className="text-2xl font-bold text-blue-700">{totalCleanings}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-green-600 font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-green-700">R{totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <p className="text-purple-600 font-medium">Avg per Apartment</p>
          <p className="text-2xl font-bold text-purple-700">
            R{filteredData.length > 0 ? (totalAmount / filteredData.length).toFixed(0) : '0'}
          </p>
        </div>
      </div>

      {/* Invoice Generator Modal */}
      {invoiceApartment && (
        <InvoiceGenerator
          apartment={invoiceApartment.apartment}
          cleaningSessions={invoiceApartment.sessions}
          month={month}
          year={year}
          onClose={() => setInvoiceApartment(null)}
        />
      )}
    </div>
  );
}
